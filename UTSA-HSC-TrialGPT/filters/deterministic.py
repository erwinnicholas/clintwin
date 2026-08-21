"""
filters/deterministic.py — Pure Function SQL Trial Constraints Filter
=====================================================================
Reads standard CSV trial inclusion/exclusion criteria and compiles 
them dynamically into an executable SQLite query to pre-filter the cohort.
"""

import sqlite3
import pandas as pd
from typing import List

from core.database import get_db_connection


def build_sql_from_rules(db_path: str, trial_id: str) -> str:
    """
    Reads trial clinical rules from the database and compiles them into a single 
    deterministic SQL WHERE clause.
    """
    with get_db_connection(db_path) as conn:
        rules = conn.execute(
            "SELECT * FROM trial_criteria WHERE trial_id = ?", 
            (trial_id,)
        ).fetchall()
        
    if not rules:
        raise ValueError(f"No rules found for trial_id: {trial_id}")

    sql_conditions = []

    for row in rules:
        field = row['field_name']
        op = row['operator']
        val_min = row['value_min']
        val_max = row['value_max']

        # Determine Inclusion vs Exclusion Logic
        if row['rule_type'].upper() == "INCLUSION":
            if op == "BETWEEN":
                condition = f"({field} >= {val_min} AND {field} <= {val_max})"
            elif op == ">=":
                condition = f"({field} >= {val_min})"
            elif op == "<=":
                condition = f"({field} <= {val_min})"
            elif op == ">":
                condition = f"({field} > {val_min})"
            elif op == "<":
                condition = f"({field} < {val_min})"
            elif op == "==":
                condition = f"({field} == {val_min})"
            else:
                raise ValueError(f"Unsupported operator {op} in INCLUSION rule.")
        
        elif row['rule_type'].upper() == "EXCLUSION":
            # For exclusion, we want the condition where they are NOT excluded
            if op == "BETWEEN":
                condition = f"NOT ({field} >= {val_min} AND {field} <= {val_max})"
            elif op == ">=":
                condition = f"({field} < {val_min})"
            elif op == "<=":
                condition = f"({field} > {val_min})"
            elif op == ">":
                condition = f"({field} <= {val_min})"
            elif op == "<":
                condition = f"({field} >= {val_min})"
            elif op == "==":
                condition = f"({field} != {val_min})"
            else:
                raise ValueError(f"Unsupported operator {op} in EXCLUSION rule.")

        sql_conditions.append(condition)

    # Combine all rules with AND (patient must satisfy ALL gates)
    final_where_clause = " AND ".join(sql_conditions)
    
    query = f"""
    SELECT patient_id 
    FROM patient_vitals_baseline 
    WHERE {final_where_clause}
    """
    
    return query


def execute_filter(db_path: str, trial_id: str) -> List[str]:
    """
    Executes the dynamic SQL query against the SQLite database and returns
    a list of patient IDs that pass the deterministic Phase 1 filter.
    """
    query = build_sql_from_rules(db_path, trial_id)
    
    passed_patients = []
    
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        for r in rows:
            passed_patients.append(r['patient_id'])
            
    return passed_patients
