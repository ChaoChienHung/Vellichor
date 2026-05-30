from __future__ import annotations

import sqlite3
from pathlib import Path


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value BLOB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            entry_date TEXT,
            title TEXT NOT NULL,
            content_nonce BLOB NOT NULL,
            content_ciphertext BLOB NOT NULL,
            is_encrypted INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
        CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date);
        """
    )

    cols = {r["name"] for r in conn.execute("PRAGMA table_info(entries)").fetchall()}
    if "entry_date" not in cols:
        conn.execute("ALTER TABLE entries ADD COLUMN entry_date TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date)")

    conn.commit()

