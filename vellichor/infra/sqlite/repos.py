from __future__ import annotations

import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Optional

from ...crypto import EncryptedBlob
from ...app.ports import EntryMetaRow, EntryRepo, EntryRow, MetaRepo


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass(frozen=True)
class SqliteMetaRepo(MetaRepo):
    conn: sqlite3.Connection

    def get(self, key: str) -> Optional[bytes]:
        row = self.conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        if row is None:
            return None
        return row["value"]

    def set(self, key: str, value: bytes) -> None:
        self.conn.execute(
            "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        self.conn.commit()


@dataclass(frozen=True)
class SqliteEntryRepo(EntryRepo):
    conn: sqlite3.Connection

    def create(self, *, title: str, entry_date: Optional[str], encrypted: EncryptedBlob) -> str:
        entry_id = str(uuid.uuid4())
        now = utc_now_iso()
        self.conn.execute(
            """
            INSERT INTO entries(
                id, created_at, updated_at, entry_date, title,
                content_nonce, content_ciphertext, is_encrypted
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (entry_id, now, now, entry_date, title, encrypted.nonce, encrypted.ciphertext),
        )
        self.conn.commit()
        return entry_id

    def update(
        self,
        *,
        entry_id: str,
        title: str,
        entry_date: Optional[str],
        encrypted: EncryptedBlob,
    ) -> None:
        now = utc_now_iso()
        cur = self.conn.execute(
            """
            UPDATE entries
            SET updated_at = ?, entry_date = ?, title = ?, content_nonce = ?, content_ciphertext = ?, is_encrypted = 1
            WHERE id = ?
            """,
            (now, entry_date, title, encrypted.nonce, encrypted.ciphertext, entry_id),
        )
        if cur.rowcount == 0:
            raise KeyError(entry_id)
        self.conn.commit()

    def delete(self, *, entry_id: str) -> None:
        self.conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
        self.conn.commit()

    def list_rows(self, *, limit: int = 200) -> Iterable[EntryRow]:
        rows = self.conn.execute(
            """
            SELECT id, created_at, updated_at, entry_date, title, content_nonce, content_ciphertext
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
                entry_date=r["entry_date"],
                title=r["title"],
                encrypted=EncryptedBlob(nonce=r["content_nonce"], ciphertext=r["content_ciphertext"]),
            )

    def get_row(self, *, entry_id: str) -> EntryRow:
        r = self.conn.execute(
            """
            SELECT id, created_at, updated_at, entry_date, title, content_nonce, content_ciphertext
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
            entry_date=r["entry_date"],
            title=r["title"],
            encrypted=EncryptedBlob(nonce=r["content_nonce"], ciphertext=r["content_ciphertext"]),
        )

    def count(self) -> int:
        r = self.conn.execute("SELECT COUNT(1) AS c FROM entries").fetchone()
        return int(r["c"])

    def latest_meta(self) -> Optional[EntryMetaRow]:
        r = self.conn.execute(
            """
            SELECT id, created_at, updated_at, entry_date, title
            FROM entries
            ORDER BY created_at DESC
            LIMIT 1
            """
        ).fetchone()
        if r is None:
            return None
        return EntryMetaRow(
            id=r["id"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            entry_date=r["entry_date"],
            title=r["title"],
        )

