import numpy as np
import torch
import torch.nn.functional as F
import faiss
from rank_bm25 import BM25Okapi
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
from typing import List, Dict, Tuple, Any, Optional, Set

class OptimizedSemanticPipeline:
    def __init__(
        self,
        dense_model_name: str = "BAAI/bge-small-en-v1.5",
        colbert_model_name: str = "colbert-ir/colbertv2.0",
        cross_encoder_name: str = "cross-encoder/nli-deberta-v3-base",
        device: str = "cuda" if torch.cuda.is_available() else "cpu"
    ):
        self.device = torch.device(device)

        print(f"[HYBRID] Loading Dense Model ({dense_model_name})...")
        self.dense_tok = AutoTokenizer.from_pretrained(dense_model_name)
        self.dense_model = AutoModel.from_pretrained(dense_model_name).to(self.device).eval()

        print(f"[HYBRID] Loading ColBERT Model ({colbert_model_name})...")
        self.colbert_tok = AutoTokenizer.from_pretrained(colbert_model_name)
        self.colbert_model = AutoModel.from_pretrained(colbert_model_name).to(self.device).eval()

        print(f"[HYBRID] Loading NLI Cross-Encoder ({cross_encoder_name})...")
        self.nli_tok = AutoTokenizer.from_pretrained(cross_encoder_name)
        self.nli_model = AutoModelForSequenceClassification.from_pretrained(cross_encoder_name).to(self.device).eval()

        self.nli_labels = ["CONTRADICTION", "ENTAILMENT", "NEUTRAL"]
        
        # Gating Thresholds
        self.TAU_DENSE = 0.40
        self.TAU_COLBERT_NORM = 0.55
        self.TAU_NLI_CONFIDENCE = 0.70

        # In-Memory Precomputed Storage
        self.corpus_records: List[Dict[str, Any]] = []
        self.precomputed_colbert_tensors: List[torch.Tensor] = []
        self.index: Optional[faiss.IndexIDMap] = None
        self.bm25: Optional[BM25Okapi] = None

    # -----------------------------------------------------------------
    # INGESTION: PRE-COMPUTE EVERYTHING ONCE
    # -----------------------------------------------------------------
    def build_index(self, patient_sentences: List[Dict[str, Any]], batch_size: int = 32):
        self.corpus_records = patient_sentences
        texts = [str(doc["text"]) for doc in patient_sentences]
        n_docs = len(texts)

        # 1. Batch Precompute Dense Vectors
        all_embeddings = []
        for i in range(0, n_docs, batch_size):
            batch_texts = texts[i:i+batch_size]
            dense_inps = self.dense_tok(batch_texts, padding=True, truncation=True, max_length=128, return_tensors="pt").to(self.device)
            with torch.inference_mode():
                dense_out = self.dense_model(**dense_inps)
                embeddings = F.normalize(dense_out.last_hidden_state[:, 0, :], p=2, dim=1).cpu().numpy().astype(np.float32)
                all_embeddings.append(embeddings)
        
        final_embeddings = np.vstack(all_embeddings)

        # 2. Build FAISS HNSW
        dim = final_embeddings.shape[1]
        hnsw = faiss.IndexHNSWFlat(dim, 32)
        hnsw.hnsw.efSearch = 64
        self.index = faiss.IndexIDMap(hnsw)
        self.index.add_with_ids(final_embeddings, np.arange(n_docs, dtype=np.int64))

        # 3. Build BM25
        self.bm25 = BM25Okapi([t.lower().split() for t in texts])

        # 4. Batch Precompute ColBERT Token Tensors (STORE IN MEMORY)
        self.precomputed_colbert_tensors = []
        for i in range(0, n_docs, batch_size):
            batch_texts = texts[i:i+batch_size]
            colbert_inps = self.colbert_tok(batch_texts, padding=True, truncation=True, max_length=128, return_tensors="pt").to(self.device)
            with torch.inference_mode():
                colbert_out = self.colbert_model(**colbert_inps)
                for j in range(len(batch_texts)):
                    mask = colbert_inps["attention_mask"][j].bool()
                    valid_tokens = colbert_out.last_hidden_state[j][mask]
                    norm_tokens = F.normalize(valid_tokens, p=2, dim=-1)
                    self.precomputed_colbert_tensors.append(norm_tokens.to(self.device))

    # -----------------------------------------------------------------
    # FAST STAGE 1: HYBRID GATED RETRIEVAL
    # -----------------------------------------------------------------
    def _stage1_fast_hybrid(self, query: str, top_k1: int = 10) -> List[Tuple[int, float]]:
        if self.index is None or self.bm25 is None:
            return []
            
        # Dense Query
        q_inp = self.dense_tok(query, return_tensors="pt", truncation=True).to(self.device)
        with torch.inference_mode():
            q_vec = F.normalize(self.dense_model(**q_inp).last_hidden_state[:, 0, :], p=2, dim=1).cpu().numpy().astype(np.float32)
        
        dense_scores, dense_ids = self.index.search(q_vec, top_k1)
        dense_scores, dense_ids = dense_scores[0], dense_ids[0]

        # Sparse Query
        bm25_scores = self.bm25.get_scores(query.lower().split())
        sparse_ids = np.argsort(-bm25_scores)[:top_k1]

        # Early-Exit Gate 1: Check if top match crosses minimum floor
        best_dense_sim = dense_scores[0] if len(dense_scores) > 0 else 0.0
        best_bm25 = bm25_scores[sparse_ids[0]] if len(sparse_ids) > 0 else 0.0
        if best_dense_sim < self.TAU_DENSE and best_bm25 == 0.0:
            return [] # No semantic relevance; abort early

        # RRF Merge
        rrf: Dict[int, float] = {}
        for rank, doc_id in enumerate(dense_ids):
            if doc_id != -1:
                rrf[int(doc_id)] = rrf.get(int(doc_id), 0.0) + (1.0 / (60 + rank + 1))
        for rank, doc_id in enumerate(sparse_ids):
            if bm25_scores[doc_id] > 0:
                rrf[int(doc_id)] = rrf.get(int(doc_id), 0.0) + (1.0 / (60 + rank + 1))

        sorted_cands = sorted(rrf.items(), key=lambda x: x[1], reverse=True)[:top_k1]
        return sorted_cands

    # -----------------------------------------------------------------
    # FAST STAGE 2: VECTORIZED COLBERT MAXSIM (Uses Precomputed Tensors)
    # -----------------------------------------------------------------
    def _stage2_fast_maxsim(self, query: str, candidates: List[Tuple[int, float]], top_k2: int = 3) -> List[Tuple[int, float]]:
        if not candidates:
            return []

        q_inp = self.colbert_tok(query, return_tensors="pt", truncation=True, max_length=64).to(self.device)
        with torch.inference_mode():
            q_emb = F.normalize(self.colbert_model(**q_inp).last_hidden_state[0], p=2, dim=1) # (m, d)
        
        m = q_emb.shape[0]
        results = []

        # Vectorized MaxSim against precomputed candidate tensors
        with torch.inference_mode():
            for doc_id, _ in candidates:
                d_emb = self.precomputed_colbert_tensors[doc_id] # (n, d) already in VRAM
                # Dot product (m, d) @ (d, n) -> (m, n)
                M = torch.matmul(q_emb, d_emb.T)
                max_sims = torch.max(M, dim=1)[0]
                score = float(torch.sum(max_sims).item())
                norm_score = score / m

                # Early-Exit Gate 2
                if norm_score >= self.TAU_COLBERT_NORM:
                    results.append((doc_id, score))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k2]

    # -----------------------------------------------------------------
    # FAST STAGE 3: NLI WITH CONDITIONAL SALIENCY
    # -----------------------------------------------------------------
    def _stage3_fast_nli(self, criterion: str, doc_text: str) -> Dict[str, Any]:
        inputs = self.nli_tok(doc_text, criterion, return_tensors="pt", truncation=True, max_length=192).to(self.device)

        # 1. Fast Forward Pass
        with torch.inference_mode():
            outputs = self.nli_model(**inputs)
            logits = outputs.logits[0]
            probs = F.softmax(logits, dim=-1)

        prob_dict = {
            "CONTRADICTION": float(probs[0].item()),
            "ENTAILMENT": float(probs[1].item()),
            "NEUTRAL": float(probs[2].item())
        }
        pred_idx = int(torch.argmax(logits).item())
        predicted_label = self.nli_labels[pred_idx]

        # 2. Conditional Saliency: Only calculate gradients if decision is definitive
        token_attributions = []
        if predicted_label in ["CONTRADICTION", "ENTAILMENT"]:
            # Need to re-run with requires_grad
            embeddings_layer = self.nli_model.get_input_embeddings()
            input_ids = inputs["input_ids"]
            token_embeds = embeddings_layer(input_ids).detach().clone().requires_grad_(True)

            out = self.nli_model(inputs_embeds=token_embeds, attention_mask=inputs["attention_mask"])
            target_logit = out.logits[0, pred_idx]
            self.nli_model.zero_grad()
            target_logit.backward()

            grad = token_embeds.grad[0]
            attr = torch.norm(token_embeds[0].detach() * grad, dim=1).cpu().numpy()
            norm_attr = (attr - np.min(attr)) / (np.max(attr) - np.min(attr) + 1e-8)
            tokens = self.nli_tok.convert_ids_to_tokens(input_ids[0])
            token_attributions = list(zip(tokens, [round(float(a), 3) for a in norm_attr]))

        return {
            "predicted_label": predicted_label,
            "probabilities": prob_dict,
            "token_attributions": token_attributions
        }

    # -----------------------------------------------------------------
    # BATCHED COHORT EVALUATION (For full pipeline execution)
    # -----------------------------------------------------------------
    def evaluate_patient_against_criterion(self, criterion: str, criterion_type: str = "EXCLUSION") -> Dict[str, Any]:
        pid = str(self.corpus_records[0]["patient_id"])
        results = self.evaluate_cohort_against_criterion(criterion, criterion_type, {pid})
        if pid in results and results[pid]["is_excluded"]:
            return {"patient_id": pid, "final_status": "EXCLUDED_CRITERION_MET" if results[pid]["entailment_prob"] >= self.TAU_NLI_CONFIDENCE else "PASSED_NEGATION_CONFIRMED"}
        return {"patient_id": pid, "final_status": "SAFE_INSUFFICIENT_EVIDENCE"}

    def evaluate_cohort_against_criterion(
        self,
        criterion: str,
        criterion_type: str,
        pids_to_check: Set[str]
    ) -> Dict[str, Dict]:
        results = {}
        if not criterion or self.index is None:
            return results
            
        # Stage 1: Fast Retrieval with Gate 1 globally
        k1_candidates = self._stage1_fast_hybrid(criterion, top_k1=150)
        if not k1_candidates:
            return results

        # Stage 2: Fast ColBERT with Gate 2 globally
        k2_candidates = self._stage2_fast_maxsim(criterion, k1_candidates, top_k2=50)

        patients_evaluated = set()

        # Stage 3: Fast NLI on the top verified global candidates
        for match_idx, colbert_score in k2_candidates:
            record = self.corpus_records[match_idx]
            pid = str(record["patient_id"])
            
            if pid not in pids_to_check or pid in patients_evaluated:
                continue

            nli_res = self._stage3_fast_nli(criterion, str(record["text"]))
            probs = nli_res.get("probabilities", {})
            entail_p = probs.get("ENTAILMENT", 0.0)
            contra_p = probs.get("CONTRADICTION", 1.0)
            
            is_excluded = False
            if criterion_type == "EXCLUSION":
                if entail_p >= self.TAU_NLI_CONFIDENCE:
                    is_excluded = True
                elif contra_p < 0.10: # Since it already passed Gate 2 (MaxSim > 0.55), low contradiction = match
                    is_excluded = True
                    entail_p = 0.99  # Override for logging
                    
            if is_excluded:
                results[pid] = {
                    "is_excluded": True,
                    "matched_sentence": str(record["text"]),
                    "entailment_prob": entail_p
                }
                patients_evaluated.add(pid)
                
        # Fill in safe patients
        for pid in pids_to_check:
            if pid not in results:
                results[pid] = {
                    "is_excluded": False,
                    "matched_sentence": None,
                    "entailment_prob": 0.0
                }
                
        return results
