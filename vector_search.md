1. How to Guarantee Metadata & ID PreservationFAISS standard indexes (IndexHNSWFlat) only store floating-point vectors. They do not store text, Patient IDs, or Trial IDs natively. If you just throw vectors into FAISS, you will get back a vector distance score but have no idea which trial or patient it belongs to.The Solution: FAISS IndexIDMap + SQLiteYou must decouple the mathematical index from the metadata payload.The FAISS ID: When you add a vector to FAISS, you assign it a unique 64-bit integer ID (e.g., 1045).The SQLite Registry: You store the exact mapping in your SQLite database:faiss_id = 1045 $\rightarrow$ trial_id = NCT04567, criterion_type = INCLUSION, raw_text = "Patient must have EGFR Exon 19 deletion."The Retrieval: When FAISS returns ID 1045 as a match, you instantly execute a $O(1)$ SQL lookup to pull the exact protocol text and Trial ID. No LLM required.2. The Unified Hybrid Retrieval PipelineThis is how the entire system executes before TrialGPT is ever invoked.Phase A: Offline Indexing (Trial Preparation)When a new trial is downloaded, it must be chunked and indexed.Semantic Chunking: The trial protocol is split.Bad: Vectorizing the whole document.Good: Chunking it into atomic rules.Result: Chunk 1 (Age requirements), Chunk 2 (Biomarker requirements), Chunk 3 (Prior therapies).Dense Embedding: A lightweight embedding model (e.g., BGE-small-en-v1.5) converts each chunk into a vector.HNSW + ID Mapping: The vector is added to the FAISS IndexHNSWFlat wrapped in an IndexIDMap. The raw text and Trial ID are saved to SQLite.Phase B: Online Patient Matching (The Hybrid Search)When a new patient enters the system, we execute a two-pronged search to find the best trials.Prong 1: Sparse Keyword Search (BM25 + scispaCy)Action: Pass the patient's unstructured clinical note through en_core_sci_sm (a lightweight, non-LLM spaCy model).Extraction: It deterministically extracts exact medical entities: ["Carboplatin", "EGFR T790M", "Adenocarcinoma"].Search: These exact terms are fed into BM25 (a classic search algorithm like Elasticsearch) to find trial chunks that contain these exact medical words.Prong 2: Dense Semantic Search (FAISS HNSW)Action: The patient's clinical summary is embedded into a dense vector.Search: FAISS traverses the multi-layered HNSW graph in $O(\log N)$ time to find trials that match the contextual meaning (e.g., matching "renal impairment" to "kidney failure").The Merger: Reciprocal Rank Fusion (RRF)You now have two lists of top trial chunks (one from BM25, one from FAISS). You combine them using RRF:$$\text{RRF\_Score} = \frac{1}{k + \text{Rank}_{\text{Sparse}}} + \frac{1}{k + \text{Rank}_{\text{Dense}}}$$(where $k$ is typically 60).This mathematically guarantees that a trial chunk rises to the top if it matches both the exact medical keywords and the broader semantic context.3. The Final Architecture FlowPlaintext[ Patient Unstructured Clinical Note ]
                 │
                 ├──> (Prong 1) scispaCy NER ──> BM25 Sparse Search ──┐
                 │                                                    │
                 └──> (Prong 2) BGE-Small ──> FAISS HNSW Dense Search ┼──> [ Reciprocal Rank Fusion (RRF) ]
                                                                      │
                                                                      ▼
                                                       [ Top 5 Highly Relevant Trial Chunks ]
                                                       (IDs retrieved from SQLite $O(1)$)
                                                                      │
                                                                      ▼
                                              [ UTSA-HSC-TrialGPT (Final MET / NOT_MET Evaluation) ]
By enforcing this pipeline, you restrict your hardware-intensive LLMs strictly to the final step (TrialGPT). Your 3070 Ti only evaluates the top 5 highly relevant chunks, rather than hallucinating over 50,000 trials, ensuring massive scalability.





### Mathematical Architecture: The 3-Tier Deterministic Semantic Pipeline

```
[ Trial Criterion Q ] ──┐
                         ├──> [ Stage 1: Hybrid Filter (FAISS HNSW + BM25 + RRF) ] ──> Top-K1 Candidate Sentences
[ Patient Sentences D ] ─┘                                │
                                                          ▼
                                    [ Stage 2: ColBERT Late Interaction (MaxSim) ] ──> Top-K2 Ranked Pairs + Token Heatmaps
                                                          │
                                                          ▼
                                    [ Stage 3: Cross-Encoder NLI Classification ]  ──> Deterministic Label (MET / NOT_MET)
                                                          │                                + Exact Saliency Gradient Offsets
                                                          ▼
                                    [ Stage 4: Deterministic Policy & UI Highlight ]

```

---

### 1. Stage 1: Hybrid First-Stage Retrieval (Dense + Sparse RRF)

Let $Q$ be the trial eligibility criterion and $\mathcal{D} = \{D_1, D_2, \dots, D_N\}$ be the universe of sentence chunks across all patient records.

#### A. Dense Bi-Encoder Search (FAISS HNSW)

We compute single dense vectors $\mathbf{u}_Q, \mathbf{v}_{D} \in \mathbb{R}^{d_1}$ using an embedding encoder $f_{\text{dense}}$:


$$\mathbf{u}_Q = \frac{f_{\text{dense}}(Q)}{\Vert{}f_{\text{dense}}(Q)\Vert{}_2}, \quad \mathbf{v}_{D} = \frac{f_{\text{dense}}(D)}{\Vert{}f_{\text{dense}}(D)\Vert{}_2}$$

Cosine similarity in FAISS HNSW yields dense score and rank:


$$S_{\text{dense}}(Q, D) = \mathbf{u}_Q^\top \mathbf{v}_D \in [-1, 1]$$

$$\text{Rank}_{\text{dense}}(D) = \text{argsort}_{D \in \mathcal{D}} (-S_{\text{dense}}(Q, D))$$

#### B. Sparse Lexical Search (BM25 with Negation Masking)

Let $T(Q)$ and $T(D)$ be non-negated medical entity token bags extracted via `scispacy` + `negspacy`. For query token frequencies $q_i \in T(Q)$:


$$S_{\text{sparse}}(Q, D) = \sum_{t \in T(Q) \cap T(D)} \text{IDF}(t) \cdot \frac{f(t, D) \cdot (k_1 + 1)}{f(t, D) + k_1 \cdot \left(1 - b + b \cdot \frac{\vert{}D\vert{}}{\text{avgdl}}\right)}$$

$$\text{Rank}_{\text{sparse}}(D) = \text{argsort}_{D \in \mathcal{D}} (-S_{\text{sparse}}(Q, D))$$

#### C. Reciprocal Rank Fusion (RRF)

Candidates are merged into subset $\mathcal{D}_{K_1} \subset \mathcal{D}$ (where $\vert{}\mathcal{D}_{K_1}\vert{} = K_1$, e.g., $K_1 = 20$):


$$\text{RRF}(Q, D) = \frac{w_{\text{dense}}}{k_{\text{rrf}} + \text{Rank}_{\text{dense}}(D)} + \frac{w_{\text{sparse}}}{k_{\text{rrf}} + \text{Rank}_{\text{sparse}}(D)}$$

$$\mathcal{D}_{K_1} = \text{Top-}K_1 \left( \text{RRF}(Q, D) \right), \quad k_{\text{rrf}} = 60$$

---

### 2. Stage 2: ColBERT Late Interaction (MaxSim Operator)

For each candidate sentence $D \in \mathcal{D}_{K_1}$, we compute multi-vector token embeddings rather than a single collapsed vector.

#### Token Multi-Vector Encoding

Let the tokenized sequence lengths be $\vert{}Q\vert{} = m$ and $\vert{}D\vert{} = n$. The ColBERT encoder $f_{\text{colbert}}$ produces $L_2$-normalized token matrices:


$$\mathbf{E}_Q = f_{\text{colbert}}(Q) \in \mathbb{R}^{m \times d_2}, \quad \Vert{}\mathbf{E}_{Q}[i, :]\Vert{}_2 = 1 \quad \forall i \in \{1, \dots, m\}$$

$$\mathbf{E}_D = f_{\text{colbert}}(D) \in \mathbb{R}^{n \times d_2}, \quad \Vert{}\mathbf{E}_{D}[j, :]\Vert{}_2 = 1 \quad \forall j \in \{1, \dots, n\}$$

#### The MaxSim Operator

Compute the full pairwise token cosine similarity matrix $\mathbf{M} \in \mathbb{R}^{m \times n}$:


$$M_{i, j} = \mathbf{E}_Q[i, :] \cdot \mathbf{E}_D[j, :]^\top$$

The Late Interaction score sums the maximum similarity for each query token across all document tokens:


$$S_{\text{ColBERT}}(Q, D) = \sum_{i=1}^{m} \max_{j \in \{1, \dots, n\}} M_{i, j}$$

#### Token-Level Alignment Mapping

The document token index $j^*(i)$ that best matches query token $i$ is deterministically identified:


$$j^*(i) = \arg\max_{j \in \{1, \dots, n\}} M_{i, j}$$

$$A_{i} = \left( q_i, \, d_{j^*(i)}, \, M_{i, j^*(i)} \right)$$

This filters $\mathcal{D}_{K_1}$ down to $\mathcal{D}_{K_2}$ (where $K_2 = 3\text{--}5$):


$$\mathcal{D}_{K_2} = \text{Top-}K_2 \left( S_{\text{ColBERT}}(Q, D) \right)$$

---

### 3. Stage 3: Cross-Encoder NLI (Natural Language Inference)

The top $K_2$ candidates are passed to a Cross-Encoder Transformer (e.g., `DeBERTa-v3-NLI`).

#### Full Cross-Attention Processing

The criterion $Q$ and patient sentence $D$ are concatenated with boundary tokens:


$$\mathbf{x} = \text{[CLS]} \circ q_1 \circ \dots \circ q_m \circ \text{[SEP]} \circ d_1 \circ \dots \circ d_n \circ \text{[SEP]}$$

All tokens attend to all other tokens across all layers $L$:


$$\mathbf{H} = \text{Transformer}(\mathbf{x}) \in \mathbb{R}^{(m + n + 3) \times d_{\text{model}}}$$

#### Classification Logits & Softmax Probabilities

The classification head projects the $\text{[CLS]}$ pooled embedding $\mathbf{h}_{\text{[CLS]}}$:


$$\mathbf{z} = \mathbf{W}_{\text{nli}} \mathbf{h}_{\text{[CLS]}} + \mathbf{b}_{\text{nli}} \in \mathbb{R}^3$$

$$\mathbf{z} = \begin{bmatrix} z_{\text{Contradiction}} \\ z_{\text{Entailment}} \\ z_{\text{Neutral}} \end{bmatrix}$$

Applying the Softmax operator yields exact, deterministic probabilities:


$$P(c \mid Q, D) = \frac{e^{z_c}}{\sum_{k \in \{\text{Contra}, \text{Entail}, \text{Neut}\}} e^{z_k}}$$

---

### 4. Stage 4: Deterministic Decision Policy & Token Saliency

#### A. Decision Boundary Rule Engine

Let $Q$ be an **Inclusion Criterion**:


$$\mathcal{D}_{\text{inclusion}}(Q, D) = \begin{cases}  \text{MET} & \text{if } P(\text{Entailment}) \ge 0.70 \\ \text{NOT\_MET} & \text{if } P(\text{Contradiction}) \ge 0.70 \\ \text{INSUFFICIENT\_EVIDENCE} & \text{otherwise} \end{cases}$$

Let $Q$ be an **Exclusion Criterion**:


$$\mathcal{D}_{\text{exclusion}}(Q, D) = \begin{cases}  \text{EXCLUDED} & \text{if } P(\text{Entailment}) \ge 0.70 \quad (\text{Patient has prohibited condition}) \\ \text{PASSED} & \text{if } P(\text{Contradiction}) \ge 0.70 \quad (\text{Negation confirmed}) \\ \text{SAFE\_NEUTRAL} & \text{otherwise} \end{cases}$$

#### B. Exact Saliency Gradient for UI Text Highlighting

To extract exact word-level attribution without generative LLM text processing, compute the Gradient $\times$ Input attribution with respect to the predicted class logit $z^*$:

$$w_j = \left\Vert{} \mathbf{e}(d_j) \odot \left. \frac{\partial z^*}{\partial \mathbf{e}(d_j)} \right\vert{}_{\mathbf{e}(d_j)} \right\Vert{}_2$$

Normalize $w_j$ across document tokens $j \in \{1, \dots, n\}$ to obtain exact character-span highlighting weights in $[0, 1]$:


$$\bar{w}_j = \frac{w_j - \min(\mathbf{w})}{\max(\mathbf{w}) - \min(\mathbf{w}) + 10^{-8}}$$

---

### 5. Production Python Implementation

```python
import numpy as np
import torch
import torch.nn.functional as F
import faiss
from rank_bm25 import BM25Okapi
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
from typing import List, Dict, Tuple, Any

# =====================================================================
# UNIFIED DETERMINISTIC SEMANTIC ENGINE (No Generative LLMs)
# =====================================================================

class DeterministicSemanticPipeline:
    def __init__(
        self,
        dense_model_name: str = "BAAI/bge-small-en-v1.5",
        colbert_model_name: str = "colbert-ir/colbertv2.0",
        cross_encoder_name: str = "cross-encoder/nli-deberta-v3-base",
        device: str = "cuda" if torch.cuda.is_available() else "cpu"
    ):
        self.device = device

        # 1. Dense Retriever Model
        self.dense_tok = AutoTokenizer.from_pretrained(dense_model_name)
        self.dense_model = AutoModel.from_pretrained(dense_model_name).to(self.device).eval()

        # 2. ColBERT Late Interaction Model
        self.colbert_tok = AutoTokenizer.from_pretrained(colbert_model_name)
        self.colbert_model = AutoModel.from_pretrained(colbert_model_name).to(self.device).eval()

        # 3. Cross-Encoder NLI Model
        self.nli_tok = AutoTokenizer.from_pretrained(cross_encoder_name)
        self.nli_model = AutoModelForSequenceClassification.from_pretrained(cross_encoder_name).to(self.device).eval()

        # NLI Label Map (deberta-v3-nli standard: 0=Contradiction, 1=Entailment, 2=Neutral)
        self.nli_labels = ["CONTRADICTION", "ENTAILMENT", "NEUTRAL"]

        # Vector Index and Document Storage
        self.index: faiss.IndexIDMap = None
        self.bm25: BM25Okapi = None
        self.corpus_records: List[Dict[str, Any]] = []

    # -----------------------------------------------------------------
    # INGESTION & INDEXING (FAISS HNSW + BM25)
    # -----------------------------------------------------------------
    def build_index(self, patient_sentences: List[Dict[str, Any]]):
        """
        patient_sentences = [
          {"patient_id": "PT-01", "sentence_id": 0, "text": "Patient has Stage IIIA NSCLC.", "char_span": (0, 31)},
          ...
        ]
        """
        self.corpus_records = patient_sentences
        texts = [doc["text"] for doc in patient_sentences]
        n_docs = len(texts)

        # 1. Compute Dense Vectors
        inputs = self.dense_tok(texts, padding=True, truncation=True, max_length=128, return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.dense_model(**inputs)
            # CLS pooling + L2 Normalize
            embeddings = F.normalize(out.last_hidden_state[:, 0, :], p=2, dim=1).cpu().numpy().astype(np.float32)

        # 2. Build FAISS HNSW Index
        dim = embeddings.shape[1]
        hnsw = faiss.IndexHNSWFlat(dim, 32)
        hnsw.hnsw.efSearch = 64
        self.index = faiss.IndexIDMap(hnsw)
        ids = np.arange(n_docs, dtype=np.int64)
        self.index.add_with_ids(embeddings, ids)

        # 3. Build BM25 Sparse Index
        tokenized_corpus = [t.lower().split() for t in texts]
        self.bm25 = BM25Okapi(tokenized_corpus)

    # -----------------------------------------------------------------
    # STAGE 1: HYBRID RETRIEVAL (FAISS + BM25 + RRF)
    # -----------------------------------------------------------------
    def _stage1_hybrid_retrieval(self, query: str, top_k1: int = 15, k_rrf: int = 60) -> List[int]:
        # A. Dense Search
        q_inp = self.dense_tok(query, return_tensors="pt", truncation=True).to(self.device)
        with torch.no_grad():
            q_vec = F.normalize(self.dense_model(**q_inp).last_hidden_state[:, 0, :], p=2, dim=1).cpu().numpy().astype(np.float32)
        _, dense_ids = self.index.search(q_vec, top_k1)
        dense_ids = dense_ids[0]

        # B. Sparse BM25 Search
        q_tokens = query.lower().split()
        bm25_scores = self.bm25.get_scores(q_tokens)
        sparse_ids = np.argsort(-bm25_scores)[:top_k1]

        # C. Reciprocal Rank Fusion
        rrf_scores = {}
        for rank, doc_id in enumerate(dense_ids):
            if doc_id != -1:
                rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (k_rrf + rank + 1))
        for rank, doc_id in enumerate(sparse_ids):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (k_rrf + rank + 1))

        # Sort candidate indices
        sorted_candidates = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        return sorted_candidates[:top_k1]

    # -----------------------------------------------------------------
    # STAGE 2: COLBERT LATE INTERACTION (MaxSim Matrix Operator)
    # -----------------------------------------------------------------
    def _stage2_colbert_maxsim(self, query: str, candidate_ids: List[int], top_k2: int = 3) -> List[Tuple[int, float, Dict[str, Any]]]:
        # Encode Query Tokens
        q_tok = self.colbert_tok(query, return_tensors="pt", truncation=True, max_length=64).to(self.device)
        with torch.no_grad():
            q_emb = F.normalize(self.colbert_model(**q_tok).last_hidden_state[0], p=2, dim=1) # (m, d)

        colbert_results = []

        for cid in candidate_ids:
            doc_text = self.corpus_records[cid]["text"]
            d_tok = self.colbert_tok(doc_text, return_tensors="pt", truncation=True, max_length=128).to(self.device)
            with torch.no_grad():
                d_emb = F.normalize(self.colbert_model(**d_tok).last_hidden_state[0], p=2, dim=1) # (n, d)

            # Pairwise Token Cosine Matrix: M = Q x D^T (m x n)
            M = torch.matmul(q_emb, d_emb.T)

            # MaxSim Reduction: Sum over query tokens of max(doc tokens)
            max_sims, argmax_j = torch.max(M, dim=1)
            score = float(torch.sum(max_sims).item())

            # Token alignment data for visualization
            q_tokens_str = self.colbert_tok.convert_ids_to_tokens(q_tok["input_ids"][0])
            d_tokens_str = self.colbert_tok.convert_ids_to_tokens(d_tok["input_ids"][0])
            alignment = [
                (q_tokens_str[i], d_tokens_str[argmax_j[i]], round(float(max_sims[i]), 3))
                for i in range(len(q_tokens_str))
            ]

            colbert_results.append((cid, score, {"token_alignment": alignment}))

        # Rank by ColBERT score
        colbert_results.sort(key=lambda x: x[1], reverse=True)
        return colbert_results[:top_k2]

    # -----------------------------------------------------------------
    # STAGE 3: DETERMINISTIC CROSS-ENCODER NLI + ATTRIBUTION
    # -----------------------------------------------------------------
    def _stage3_cross_encoder_nli(self, criterion: str, doc_text: str) -> Dict[str, Any]:
        inputs = self.nli_tok(criterion, doc_text, return_tensors="pt", truncation=True, max_length=256).to(self.device)
        inputs.requires_grad = False

        # Get Embeddings Layer for Input x Gradient calculation
        embeddings_layer = self.nli_model.get_input_embeddings()
        input_ids = inputs["input_ids"]
        token_embeds = embeddings_layer(input_ids).detach().clone().requires_grad_(True)

        # Forward pass using inputs_embeds
        outputs = self.nli_model(
            inputs_embeds=token_embeds,
            attention_mask=inputs["attention_mask"],
            token_type_ids=inputs.get("token_type_ids", None)
        )
        logits = outputs.logits[0]
        probs = F.softmax(logits, dim=-1)

        # Probabilities
        prob_dict = {
            "CONTRADICTION": float(probs[0].item()),
            "ENTAILMENT": float(probs[1].item()),
            "NEUTRAL": float(probs[2].item())
        }

        # Deterministic Label
        pred_idx = int(torch.argmax(logits).item())
        predicted_label = self.nli_labels[pred_idx]

        # Compute Exact Token Attribution via Gradient
        pred_logit = logits[pred_idx]
        self.nli_model.zero_grad()
        pred_logit.backward()

        # Attribution = L2-Norm(Embedding * Gradient)
        grad = token_embeds.grad[0]
        attr = torch.norm(token_embeds[0].detach() * grad, dim=1).cpu().numpy()

        # Normalize Attribution to [0, 1]
        min_v, max_v = np.min(attr), np.max(attr)
        norm_attr = ((attr - min_v) / (max_v - min_v + 1e-8)).tolist()

        tokens = self.nli_tok.convert_ids_to_tokens(input_ids[0])
        token_attributions = list(zip(tokens, [round(float(a), 4) for a in norm_attr]))

        return {
            "predicted_label": predicted_label,
            "probabilities": prob_dict,
            "token_attributions": token_attributions
        }

    # -----------------------------------------------------------------
    # PIPELINE EXECUTION INTERFACE
    # -----------------------------------------------------------------
    def evaluate_patient_against_criterion(
        self,
        criterion: str,
        criterion_type: str = "EXCLUSION"
    ) -> Dict[str, Any]:
        """
        Executes Stage 1 -> Stage 2 -> Stage 3 with strict deterministic evaluation.
        """
        # Step 1: Hybrid Retrieval
        k1_candidates = self._stage1_hybrid_retrieval(criterion, top_k1=10)

        # Step 2: ColBERT Re-ranking
        k2_candidates = self._stage2_colbert_maxsim(criterion, k1_candidates, top_k2=3)

        # Step 3: Evaluate Top-1 using Cross-Encoder NLI
        top_match_idx, colbert_score, alignment_meta = k2_candidates[0]
        top_record = self.corpus_records[top_match_idx]

        nli_res = self._stage3_cross_encoder_nli(criterion, top_record["text"])

        # Step 4: Decision Policy
        contra_p = nli_res["probabilities"]["CONTRADICTION"]
        entail_p = nli_res["probabilities"]["ENTAILMENT"]

        if criterion_type == "EXCLUSION":
            if entail_p >= 0.70:
                final_status = "EXCLUDED_CRITERION_MET"
                decision_reason = "Evidence strictly entails prohibited criterion."
            elif contra_p >= 0.70:
                final_status = "PASSED_NEGATION_CONFIRMED"
                decision_reason = "Evidence contradicts prohibited condition (Negation verified)."
            else:
                final_status = "SAFE_INSUFFICIENT_EVIDENCE"
                decision_reason = "No conclusive evidence found."
        else: # INCLUSION
            if entail_p >= 0.70:
                final_status = "PASSED_INCLUSION_MET"
                decision_reason = "Evidence satisfies requirement."
            elif contra_p >= 0.70:
                final_status = "REJECTED_INCLUSION_NOT_MET"
                decision_reason = "Evidence contradicts inclusion requirement."
            else:
                final_status = "REJECTED_MISSING_DATA"
                decision_reason = "Inconclusive evidence."

        return {
            "criterion": criterion,
            "criterion_type": criterion_type,
            "patient_id": top_record["patient_id"],
            "matched_sentence": top_record["text"],
            "char_span": top_record["char_span"],
            "final_status": final_status,
            "decision_reason": decision_reason,
            "colbert_score": round(colbert_score, 4),
            "nli_probabilities": nli_res["probabilities"],
            "token_alignments": alignment_meta["token_alignment"][:8],
            "token_saliency": [t for t in nli_res["token_attributions"] if not t[0].startswith("[")][:8]
        }

```

---

### Verification and Test Execution

```python
if __name__ == "__main__":
    # Test Data: 3 Distinct Patient Scenarios
    test_data = [
        {
            "patient_id": "PT-001",
            "sentence_id": 1,
            "text": "Patient has confirmed Stage IIIA Non-Small Cell Lung Cancer and active Rheumatoid Arthritis.",
            "char_span": (0, 92)
        },
        {
            "patient_id": "PT-002",
            "sentence_id": 1,
            "text": "Patient has Stage IIIA NSCLC with no history of autoimmune disease or Rheumatoid Arthritis.",
            "char_span": (0, 91)
        },
        {
            "patient_id": "PT-003",
            "sentence_id": 1,
            "text": "Patient is treated for routine primary hypertension with Lisinopril. No malignancy.",
            "char_span": (0, 83)
        }
    ]

    pipeline = DeterministicSemanticPipeline()
    pipeline.build_index(test_data)

    criterion = "Active autoimmune disorder including Rheumatoid Arthritis."

    print("\n" + "=" * 90)
    print("DETERMINISTIC HYBRID RETRIEVAL & NLI VERIFICATION RUN")
    print("=" * 90)

    # 1. Test Positive Match (Should EXCLUDE)
    res_pos = pipeline.evaluate_patient_against_criterion(criterion, criterion_type="EXCLUSION")
    print(f"Matched Patient : {res_pos['patient_id']}")
    print(f"Matched Text    : {res_pos['matched_sentence']}")
    print(f"ColBERT MaxSim  : {res_pos['colbert_score']}")
    print(f"NLI Distribution: {res_pos['nli_probabilities']}")
    print(f"Decision Status : {res_pos['final_status']} -> {res_pos['decision_reason']}")
    print(f"Token Saliency  : {res_pos['token_saliency'][:4]}")

```