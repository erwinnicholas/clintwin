# Benchmark Results: Hybrid Semantic Pipeline

After running the `benchmark_pipeline.py` script against adversarial edge cases using the criterion *"Active autoimmune disease such as rheumatoid arthritis, systemic lupus, or multiple sclerosis"*, we have identified several empirical limitations and formulated recommendations for pipeline tuning.

## 1. Metric Breakdown

| Test Case | RRF Score | FAISS L2 Dist | BM25 Score | Sparse Extraction Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **1. True Positive** | `0.03175` | `0.53856` | `0.54852` | Correctly extracted `rheumatoid arthritis`. |
| **2. Simple Negation** | `0.03012` | `0.60499` | `0.00000` | **Success:** `negspacy` successfully dropped `rheumatoid arthritis`, tanking the BM25 score. |
| **3. Family History** | `0.03102` | `0.69069` | `0.59976` | Extracted `mother` and `rheumatoid arthritis`. High retrieval risk. LLM is required to catch family context. |
| **4. Acronyms (RA, SLE)** | `0.03110` | **`0.48511`** | `0.00000` | **Success:** BM25 failed (0.0) due to lack of exact word match, but FAISS easily linked "RA/SLE" to the full words (distance `0.48`, the strongest dense match). |
| **5. Temporal/Resolved** | `0.03031` | `0.64371` | `0.00000` | Extracted `juvenile rheumatoid arthritis`. BM25 failed to match the exact phrase. Retrieval relies mostly on Dense. |
| **6. Hypotheticals** | `0.03110` | `0.85396` | **`1.68058`** | **Risk:** Dense FAISS properly flagged this as dissimilar (`0.85`), but BM25 matched exactly (`1.68`), forcing retrieval. LLM handles rejection. |
| **7. Double Negation** | `0.02964` | `0.86059` | `0.00000` | **FAILURE:** `"free from a history of..."` triggered `negspacy` to drop the entity. FAISS also scored it poorly (`0.86`). This is a **False Negative**. |
| **8. Rule-out Diagnosis** | `0.03200` | `0.54629` | `0.73758` | Strong retrieval on both fronts. LLM must understand "ruling out" to reject. |

## 2. Empirical Limitations Discovered

> [!WARNING]
> **1. The Double-Negation "Hedging" Trap**
> (e.g., *"It cannot be definitively stated that the patient is free from a history of rheumatoid arthritis."*)
> The pipeline suffers a critical False Negative here. Because `negspacy` sees "free from" and drops the entity, the BM25 score goes to 0. Because the sentence structure is so complex, FAISS `BGE-small` fails to map it semantically to the criterion (Distance 0.86). The sentence will **never be retrieved** and thus the LLM will never evaluate it.

> [!WARNING]
> **2. Acronym Brittleness in Sparse Search**
> (e.g., `"Pt presents with active RA and SLE."`)
> BM25 completely misses medical acronyms if the trial criterion uses full words. Fortunately, the Dense FAISS retriever saves the day by associating the acronyms with the full disease names.

> [!IMPORTANT]
> **3. Family History Over-Retrieval**
> Sentences describing a family member's disease (e.g., *"mother suffered from severe rheumatoid arthritis"*) will almost always be retrieved by both BM25 and FAISS. You are 100% reliant on the Gemini LLM step to accurately reason that the patient is not the subject.

## 3. Recommendations & Optimal Prompting

To smooth out these limitations in a production environment, implement the following:

**1. Expand Trial Criteria to include common Acronyms:**
*   *Current:* "Active autoimmune disease such as rheumatoid arthritis, systemic lupus, or multiple sclerosis"
*   *Optimal:* "Active autoimmune disease such as rheumatoid arthritis (RA), systemic lupus erythematosus (SLE), or multiple sclerosis (MS)"
*   *Why:* This ensures BM25 catches the acronyms, preventing you from relying solely on FAISS for acronym mapping.

**2. Tune `negspacy` Rules:**
*   If complex hedging ("cannot rule out", "not free from") is common in your specific hospital's notes, you may need to write custom `spacy` patterns that prevent `negspacy` from triggering on double negatives.

**3. Optimize the Gemini LLM Prompt:**
The LLM prompt must be incredibly robust to handle the noise retrieved by BM25. Ensure it looks like this:
```text
Does the following patient chart explicitly state the PATIENT (not a family member) 
currently violates this exclusion criterion? 
Ensure you account for resolved temporal conditions (e.g., '10 years ago') 
and hypotheticals (e.g., 'If the patient develops').
```

## 4. Hardware & Performance Benchmarks

The hybrid search pipeline relies on heavy models (`BGE-small-en-v1.5` and `en_core_sci_sm`). We profiled the system to identify potential memory and latency bottlenecks during live execution.

| Operation | Metric | Notes |
| :--- | :--- | :--- |
| **Index Initialization** | `~12.3 seconds` | One-time startup cost. Loads PyTorch, SentenceTransformer, and SciSpacy into memory. |
| **Model Memory Footprint** | `~190.24 MB` | Extremely efficient. Fits comfortably within the constraints of an 8GB VRAM GPU (or CPU RAM) without causing out-of-memory errors. |
| **Phase A Indexing (Per Sentence)**| `~18.3 ms` | Encoding + Tokenizing + FAISS insertion. Indexing a 2000-sentence cohort takes roughly 36 seconds. |
| **Phase B Retrieval (Querying)** | `~21.28 ms` | Blisteringly fast. Executing the RRF fusion of Dense + Sparse queries takes just 21 milliseconds before handing off to the LLM. |

**Performance Verdict:** The system is heavily optimized. The primary bottleneck in production will strictly be the API latency to Gemini 2.5 Flash, not the local semantic retrieval engine.
