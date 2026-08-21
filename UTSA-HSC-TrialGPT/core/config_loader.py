import json
from pathlib import Path
from typing import Dict
from core.schemas import DrugProfile

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / "config"
CLINICAL_RULES_PATH = CONFIG_DIR / "clinical_rules.json"
DRUG_PROFILES_PATH = CONFIG_DIR / "drug_profiles.json"

_clinical_rules_cache = None
_drug_profiles_cache = None

def load_clinical_rules(force_reload: bool = False) -> dict:
    global _clinical_rules_cache
    if _clinical_rules_cache is None or force_reload:
        with open(CLINICAL_RULES_PATH, 'r') as f:
            _clinical_rules_cache = json.load(f)
    return _clinical_rules_cache

def load_drug_profiles(force_reload: bool = False) -> Dict[str, DrugProfile]:
    global _drug_profiles_cache
    if _drug_profiles_cache is None or force_reload:
        with open(DRUG_PROFILES_PATH, 'r') as f:
            raw = json.load(f)
            profiles = {}
            for key, data in raw.items():
                profiles[key] = DrugProfile(**data)
            _drug_profiles_cache = profiles
    return _drug_profiles_cache
