import faiss
import spacy
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
import numpy as np

def test_pipeline():
    print("Loading SentenceTransformer...")
    model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    print("Loading scispacy...")
    nlp = spacy.load("en_core_sci_sm")
    nlp.add_pipe("negex", config={"ent_types": ["ENTITY"]})
    print("Loaded successfully!")
    
    sentences = [
        "Patient has a history of severe rheumatoid arthritis.",
        "No history of autoimmune disease.",
        "Patient received 6 cycles of pembrolizumab last year.",
        "Patient is currently healthy."
    ]
    
    print("Testing tokenization and negspacy...")
    for s in sentences:
        doc = nlp(s)
        entities = [ent.text for ent in doc.ents]
        negated = [ent.text for ent in doc.ents if ent._.negex]
        valid = [ent.text for ent in doc.ents if not ent._.negex]
        print(f"[{s}] -> ALL: {entities} | NEG: {negated} | VALID: {valid}")

if __name__ == "__main__":
    test_pipeline()
