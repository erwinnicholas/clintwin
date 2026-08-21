"""
tests/test_filters.py — Tests for Deterministic and Semantic Filters
======================================================================
Tests the SQL compiler for Trial rules and the LLM wrapper.
"""

import os
import sqlite3
import pandas as pd
import pytest

from core.database import initialize_database
from filters.deterministic import build_sql_from_rules, execute_filter


class TestDeterministicFilter:
    
    @pytest.fixture(autouse=True)
    def setup_db(self, tmpdir):
        self.db_path = str(tmpdir.join("test.db"))
        self.csv_path = str(tmpdir.join("rules.csv"))
        
        # Init schema
        initialize_database(self.db_path)
        
        # Populate test data
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            """INSERT INTO patient_vitals_baseline (patient_id, age, egfr) 
               VALUES ('P1', 45, 90), ('P2', 85, 90), ('P3', 45, 20)"""
        )
        conn.commit()
        conn.close()

    def test_sql_compiler(self):
        # Create rules
        df = pd.DataFrame([
            {"trial_id": "T1", "criterion_id": "INC1", "rule_type": "INCLUSION", 
             "field_name": "age", "operator": "BETWEEN", "value_min": 18, "value_max": 80},
            {"trial_id": "T1", "criterion_id": "EXC1", "rule_type": "EXCLUSION", 
             "field_name": "egfr", "operator": "<", "value_min": 45, "value_max": None}
        ])
        df.to_csv(self.csv_path, index=False)
        
        sql = build_sql_from_rules(self.csv_path, "T1")
        assert "age >= 18" in sql
        assert "age <= 80" in sql
        assert "egfr >= 45" in sql  # Exclusion of < 45 means inclusion of >= 45

    def test_execute_filter(self):
        df = pd.DataFrame([
            {"trial_id": "T1", "criterion_id": "INC1", "rule_type": "INCLUSION", 
             "field_name": "age", "operator": "BETWEEN", "value_min": 18, "value_max": 80},
            {"trial_id": "T1", "criterion_id": "EXC1", "rule_type": "EXCLUSION", 
             "field_name": "egfr", "operator": "<", "value_min": 45, "value_max": None}
        ])
        df.to_csv(self.csv_path, index=False)
        
        passed = execute_filter(self.db_path, self.csv_path, "T1")
        
        assert "P1" in passed
        assert "P2" not in passed  # Age > 80
        assert "P3" not in passed  # eGFR < 45
        assert len(passed) == 1
