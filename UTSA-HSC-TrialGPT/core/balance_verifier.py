import pandas as pd
from scipy import stats
import random
from typing import List, Dict, Any
from core.config_loader import load_clinical_rules

def get_strata_vars(n_patients: int) -> List[str]:
    rules = load_clinical_rules()
    strat_cfg = rules.get("stratification", {})
    if n_patients > strat_cfg.get("large_n_threshold", 50):
        return strat_cfg.get("strata_vars_large_n", ["age_bracket", "sex", "ecog_score"])
    return strat_cfg.get("strata_vars_small_n", ["age_bracket", "sex"])

def add_derived_vars(df: pd.DataFrame) -> pd.DataFrame:
    rules = load_clinical_rules()
    cutoff = rules.get("stratification", {}).get("age_bracket_cutoff", 65)
    if "age" in df.columns:
        df["age_bracket"] = df["age"].apply(lambda x: f">={cutoff}" if x >= cutoff else f"<{cutoff}")
    return df

def stratified_randomize(patients: List[Dict[str, Any]], arms: List[str], seed: int = 42) -> Dict[str, str]:
    """Assigns patients to arms using block stratification."""
    random.seed(seed)
    if not patients:
        return {}

    df = pd.DataFrame(patients)
    df = add_derived_vars(df)
    strata_vars = get_strata_vars(len(patients))
    
    assignments = {}
    missing = [col for col in strata_vars if col not in df.columns]
    
    if missing:
        # Fallback to simple round-robin
        shuffled = list(patients)
        random.shuffle(shuffled)
        for i, p in enumerate(shuffled):
            assignments[p["patient_id"]] = arms[i % len(arms)]
        return assignments

    # Stratified
    groups = df.groupby(strata_vars)
    for _, group in groups:
        shuffled = group.to_dict('records')
        random.shuffle(shuffled)
        for i, p in enumerate(shuffled):
            assignments[p["patient_id"]] = arms[i % len(arms)]
            
    return assignments

def verify_cohort_balance(patients: List[Dict[str, Any]], assignments: Dict[str, str]) -> Dict[str, Any]:
    """Computes Table 1 balance stats using ANOVA and Chi-Square."""
    if not patients:
        return {}
        
    df = pd.DataFrame(patients)
    df["arm_id"] = df["patient_id"].map(assignments)
    df = add_derived_vars(df)
    
    report = {}
    arms = df["arm_id"].unique()
    
    # Continuous vars
    for col in ["age", "bmi"]:
        if col in df.columns:
            groups = [df[df["arm_id"] == arm][col].dropna() for arm in arms]
            if all(len(g) > 1 for g in groups):
                f_stat, p_val = stats.f_oneway(*groups)
                report[col] = {"p_value": float(p_val), "test": "ANOVA", "balanced": bool(p_val > 0.05)}
                
    # Categorical vars
    for col in ["sex", "ecog_score", "age_bracket"]:
        if col in df.columns:
            contingency = pd.crosstab(df["arm_id"], df[col])
            # Chi-square requires expected frequencies > 5, but we calculate it anyway for the report
            if contingency.size > 0 and contingency.shape[0] > 1 and contingency.shape[1] > 1:
                chi2, p_val, dof, expected = stats.chi2_contingency(contingency)
                report[col] = {"p_value": float(p_val), "test": "Chi-Square", "balanced": bool(p_val > 0.05)}
                
    return report
