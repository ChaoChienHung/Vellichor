from __future__ import annotations

import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

from .crypto import EncryptedBlob


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass(frozen=True)
class Entry:
    id: str
    created_at: str
    updated_at: str
    title: str
    content: str


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
            title TEXT NOT NULL,
            content_nonce BLOB NOT NULL,
            content_ciphertext BLOB NOT NULL,
            is_encrypted INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
        """
    )
    conn.commit()


def get_meta(conn: sqlite3.Connection, key: str) -> Optional[bytes]:
    row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    if row is None:
        return None
    return row["value"]


def set_meta(conn: sqlite3.Connection, key: str, value: bytes) -> None:
    conn.execute(
        "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )
    conn.commit()


def create_entry(
    conn: sqlite3.Connection,
    *,
    title: str,
    encrypted: EncryptedBlob,
) -> str:
    entry_id = str(uuid.uuid4())
    now = utc_now_iso()
    conn.execute(
        """
        INSERT INTO entries(id, created_at, updated_at, title, content_nonce, content_ciphertext, is_encrypted)
        VALUES(?, ?, ?, ?, ?, ?, 1)
        """,
        (entry_id, now, now, title, encrypted.nonce, encrypted.ciphertext),
    )
    conn.commit()
    return entry_id


def update_entry(
    conn: sqlite3.Connection,
    *,
    entry_id: str,
    title: str,
    encrypted: EncryptedBlob,
) -> None:
    now = utc_now_iso()
    cur = conn.execute(
        """
        UPDATE entries
        SET updated_at = ?, title = ?, content_nonce = ?, content_ciphertext = ?, is_encrypted = 1
        WHERE id = ?
        """,
        (now, title, encrypted.nonce, encrypted.ciphertext, entry_id),
    )
    if cur.rowcount == 0:
        raise KeyError(entry_id)
    conn.commit()


def delete_entry(conn: sqlite3.Connection, *, entry_id: str) -> None:
    conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()


@dataclass(frozen=True)
class EntryRow:
    id: str
    created_at: str
    updated_at: str
    title: str
    encrypted: EncryptedBlob


def list_entry_rows(conn: sqlite3.Connection, *, limit: int = 200) -> Iterable[EntryRow]:
    rows = conn.execute(
        """
        SELECT id, created_at, updated_at, title, content_nonce, content_ciphertext
        FROM entries
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    for r in rows:
        yield EntryRow(
            id=r["id"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            title=r["title"],
            encrypted=EncryptedBlob(nonce=r["content_nonce"], ciphertext=r["content_ciphertext"]),
        )


def get_entry_row(conn: sqlite3.Connection, *, entry_id: str) -> EntryRow:
    r = conn.execute(
        """
        SELECT id, created_at, updated_at, title, content_nonce, content_ciphertext
        FROM entries
        WHERE id = ?
        """,
        (entry_id,),
    ).fetchone()
    if r is None:
        raise KeyError(entry_id)
    return EntryRow(
        id=r["id"],
        created_at=r["created_at"],
        updated_at=r["updated_at"],
        title=r["title"],
        encrypted=EncryptedBlob(nonce=r["content_nonce"], ciphertext=r["content_ciphertext"]),
    )


@dataclass(frozen=True)
class EntryMeta:
    id: str
    created_at: str
    updated_at: str
    title: str


def count_entries(conn: sqlite3.Connection) -> int:
    r = conn.execute("SELECT COUNT(1) AS c FROM entries").fetchone()
    return int(r["c"])


def latest_entry_meta(conn: sqlite3.Connection) -> Optional[EntryMeta]:
    r = conn.execute(
        """
        SELECT id, created_at, updated_at, title
        FROM entries
        ORDER BY created_at DESC
        LIMIT 1
        """
    ).fetchone()
    if r is None:
        return None
    return EntryMeta(id=r["id"], created_at=r["created_at"], updated_at=r["updated_at"], title=r["title"])
