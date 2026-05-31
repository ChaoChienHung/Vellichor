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

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            pen_name TEXT NOT NULL,
            kdf_salt BLOB NOT NULL,
            pw_check_nonce BLOB NOT NULL,
            pw_check_ciphertext BLOB NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            entry_date TEXT,
            title TEXT NOT NULL,
            content_nonce BLOB NOT NULL,
            content_ciphertext BLOB NOT NULL,
            is_encrypted INTEGER NOT NULL,
            user_id TEXT,
            signed_by_pen_name TEXT,
            signed_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
        """
    )

    cols = {r["name"] for r in conn.execute("PRAGMA table_info(entries)").fetchall()}
    if "entry_date" not in cols:
        conn.execute("ALTER TABLE entries ADD COLUMN entry_date TEXT")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date)")
    if "user_id" not in cols:
        conn.execute("ALTER TABLE entries ADD COLUMN user_id TEXT")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entries_user_id_created_at ON entries(user_id, created_at)")
    else:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_entries_user_id_created_at ON entries(user_id, created_at)")
    if "signed_by_pen_name" not in cols:
        conn.execute("ALTER TABLE entries ADD COLUMN signed_by_pen_name TEXT")
    if "signed_at" not in cols:
        conn.execute("ALTER TABLE entries ADD COLUMN signed_at TEXT")

    conn.commit()
