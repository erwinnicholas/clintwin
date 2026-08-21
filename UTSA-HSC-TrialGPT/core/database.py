"""
core/database.py — SQLite Database Initialization & Management
==============================================================
Provides a centralized connection context manager and initializes
the entire schema (Phase 1 + Phase 3 + Phase 4) in one shot.
"""

import sqlite3
import os
from contextlib import contextmanager
from typing import Generator
from core.config import DB_PATH, ensure_directories

@contextmanager
def get_db_connection(db_path: str = None) -> Generator[sqlite3.Connection, None, None]:
    """Provides a safe SQLite connection context."""
    ensure_directories()
    if db_path is None:
        from core.config import DB_PATH
        db_path = str(DB_PATH)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Return dict-like rows
    try:
        yield conn
    finally:
        conn.close()

def initialize_database(db_path: str = None) -> None:
    """Executes the full combined schema to set up the DB."""
    if db_path is None:
        from core.config import DB_PATH
        db_path = str(DB_PATH)
    
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path, 'r') as f:
        full_schema = f.read()
        
    with get_db_connection(db_path) as conn:
        conn.executescript(full_schema)
        conn.commit()
