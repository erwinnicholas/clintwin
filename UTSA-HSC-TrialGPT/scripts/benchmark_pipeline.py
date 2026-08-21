import os
import sys
import time
import psutil
import numpy as np
import google.genai as genai

# Adjust path so we can import from core and filters
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from filters.hybrid_search import get_hybrid_index

def get_memory_mb():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

def benchmark_adversarial():
    print("Initializing Hybrid Index for Benchmark...")
    t0 = time.perf_counter()
    mem_before = get_memory_mb()
    index = get_hybrid_index()
    t1 = time.perf_counter()
    mem_after = get_memory_mb()
    
    print(f"[METRIC] Index Initialization Latency: {t1 - t0:.4f} seconds")
    print(f"[METRIC] Memory footprint for BGE+scispacy+FAISS: {mem_after - mem_before:.2f} MB")
    
    criterion = "Active autoimmune disease such as rheumatoid arthritis (RA), systemic lupus erythematosus (SLE), or multiple sclerosis (MS)"
    print(f"\n[CRITERION]: {criterion}\n")
    
    adversarial_cases = [
        # 1. True Positive (Standard)
        "Patient is currently diagnosed with severe rheumatoid arthritis and requires ongoing treatment.",
        # 2. Simple Negation (Adversarial FP)
        "No history of rheumatoid arthritis or lupus.",
        # 3. Family History (Adversarial FP)
        "Patient's mother suffered from severe rheumatoid arthritis, but the patient does not.",
        # 4. Acronyms / Abbreviations (Adversarial FN)
        "Pt presents with active RA and SLE.",
        # 5. Temporal / Resolved History
        "Patient had juvenile rheumatoid arthritis 20 years ago, currently completely resolved and off meds.",
        # 6. Hypotheticals / Warnings
        "If the patient develops symptoms of multiple sclerosis, we will immediately discontinue the trial drug.",
        # 7. Double Negation / Hedging
        "It cannot be definitively stated that the patient is free from a history of rheumatoid arthritis.",
        # 8. Rule-out Diagnosis
        "Symptoms are suggestive of Lyme disease; currently ruling out rheumatoid arthritis.",
        # 9. Patient Fear / Questions
        "Patient expressed fear that she might be developing lupus like her sister, but labs are negative."
    ]
    
    # Load into index
    sentences_meta = []
    for i, text in enumerate(adversarial_cases):
        sentences_meta.append({
            "patient_id": f"PT_ADV_{i+1}",
            "sentence": text,
            "note_id": f"NOTE_{i+1}"
        })
    
    t_idx_start = time.perf_counter()
    index.add_sentences(sentences_meta)
    t_idx_end = time.perf_counter()
    print(f"[METRIC] Phase A: Time to Index {len(adversarial_cases)} sentences: {(t_idx_end - t_idx_start)*1000:.2f} ms")
    
    # Query index
    print("Running Search...")
    t_search_start = time.perf_counter()
    
    # We want to see the scores for ALL cases, so we'll bypass the RRF filtering 
    # to print the raw metrics for the benchmark.
    
    # 1. BM25
    query_doc = index.nlp(criterion)
    query_tokens = [ent.text.lower() for ent in query_doc.ents if not ent._.negex]
    if not query_tokens:
        query_tokens = [t.text.lower() for t in query_doc if not t.is_stop and t.is_alpha]
    
    bm25_scores = index.bm25.get_scores(query_tokens)
    bm25_ranks = np.argsort(bm25_scores)[::-1]
    
    # 2. FAISS
    query_emb = index.model.encode([criterion], normalize_embeddings=True)
    dense_scores, dense_ids = index.index.search(query_emb, len(adversarial_cases))
    
    # 3. RRF
    k = 60
    rrf_scores = {i: 0.0 for i in range(len(adversarial_cases))}
    for rank, doc_id in enumerate(bm25_ranks):
        rrf_scores[doc_id] += 1.0 / (k + rank + 1)
    for rank, doc_id in enumerate(dense_ids[0]):
        if doc_id != -1:
            rrf_scores[int(doc_id)] += 1.0 / (k + rank + 1)
            
    t_search_end = time.perf_counter()
    print(f"[METRIC] Phase B: Time to run BM25+FAISS+RRF Search: {(t_search_end - t_search_start)*1000:.2f} ms")
            
    # Compile Results
    print(f"{'ID':<4} | {'RRF':<7} | {'FAISS(Dist)':<11} | {'BM25 Score':<10} | {'LLM Dec.':<8} | {'Sentence'}")
    print("-" * 120)
    
    # Check if Gemini is available
    api_key = os.environ.get("GEMINI_API_KEY")
    client = None
    if api_key:
        client = genai.Client()
    else:
        print("WARNING: GEMINI_API_KEY not found. LLM Decision will show Mock results.\n")

    for i, text in enumerate(adversarial_cases):
        # Find RRF
        rrf = rrf_scores[i]
        
        # Find BM25
        bm25_score = bm25_scores[i]
        
        # Find FAISS distance (L2 or Inner Product depending on faiss setup, here we used normalize so IP ~ L2)
        # Wait, FAISS IndexHNSWFlat computes L2 distance by default. Lower is better.
        # find rank of i in dense_ids
        try:
            dense_idx = np.where(dense_ids[0] == i)[0][0]
            dense_dist = dense_scores[0][dense_idx]
        except:
            dense_dist = -1
            
        # Get Extracted Entities for debug
        doc = index.nlp(text)
        entities = [ent.text for ent in doc.ents if not ent._.negex]
        negated = [ent.text for ent in doc.ents if ent._.negex]
        
        # LLM Evaluator
        llm_decision = "MOCK_FAIL"
        if client:
            prompt = f"""
Does the following text explicitly state the patient violates this exclusion criterion?
Exclusion Criterion: "{criterion}"

Patient Chart Snippet:
- {text}

Reply with ONLY the word "MET" if the patient clearly violates the criterion, or "NOT_MET" otherwise.
"""
            try:
                resp = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
                res = resp.text.strip().upper()
                llm_decision = "MET" if "MET" in res and "NOT_MET" not in res else "NOT_MET"
            except Exception as e:
                llm_decision = "ERR"
        
        print(f"[{i+1}] | {rrf:.5f} | {dense_dist:<11.5f} | {bm25_score:<10.5f} | {llm_decision:<8} | {text[:50]}...")
        print(f"      Sparse Extracted: {entities}")
        if negated:
            print(f"      Negated Dropped : {negated}")
        print()

if __name__ == "__main__":
    benchmark_adversarial()
