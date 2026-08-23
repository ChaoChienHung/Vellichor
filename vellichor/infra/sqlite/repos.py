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

    def create(
        self,
        *,
        user_id: str,
        title: str,
        entry_date: Optional[str],
        encrypted: EncryptedBlob,
        signed_by_pen_name: str,
    ) -> str:
        entry_id = str(uuid.uuid4())
        now = utc_now_iso()
        self.conn.execute(
            """
            INSERT INTO entries(
                id, created_at, updated_at, entry_date, title,
                content_nonce, content_ciphertext, is_encrypted,
                user_id, signed_by_pen_name, signed_at
            )
            VALUES(?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """,
            (entry_id, now, now, entry_date, title, encrypted.nonce, encrypted.ciphertext, user_id, signed_by_pen_name, now),
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
        signed_by_pen_name: str,
    ) -> None:
        now = utc_now_iso()
        cur = self.conn.execute(
            """
            UPDATE entries
            SET updated_at = ?, entry_date = ?, title = ?, content_nonce = ?, content_ciphertext = ?, is_encrypted = 1,
                signed_by_pen_name = ?, signed_at = ?
            WHERE id = ?
            """,
            (now, entry_date, title, encrypted.nonce, encrypted.ciphertext, signed_by_pen_name, now, entry_id),
        )
        if cur.rowcount == 0:
            raise KeyError(entry_id)
        self.conn.commit()

    def delete(self, *, entry_id: str) -> None:
        self.conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
        self.conn.commit()

    def list_rows(self, *, user_id: str, limit: int = 200) -> Iterable[EntryRow]:
        rows = self.conn.execute(
            """
            SELECT id, created_at, updated_at, entry_date, user_id, title, content_nonce, content_ciphertext, signed_by_pen_name, signed_at
            FROM entries
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        for r in rows:
            yield EntryRow(
                id=r["id"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                entry_date=r["entry_date"],
                user_id=r["user_id"],
                title=r["title"],
                encrypted=EncryptedBlob(nonce=r["content_nonce"], ciphertext=r["content_ciphertext"]),
                signed_by_pen_name=r["signed_by_pen_name"],
                signed_at=r["signed_at"],
            )

    def get_row(self, *, user_id: str, entry_id: str) -> EntryRow:
        r = self.conn.execute(
            """
            SELECT id, created_at, updated_at, entry_date, user_id, title, content_nonce, content_ciphertext, signed_by_pen_name, signed_at
            FROM entries
            WHERE user_id = ? AND id = ?
            """,
            (user_id, entry_id),
        ).fetchone()
        if r is None:
            raise KeyError(entry_id)
        return EntryRow(
            id=r["id"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            entry_date=r["entry_date"],
            user_id=r["user_id"],
            title=r["title"],
            encrypted=EncryptedBlob(nonce=r["content_nonce"], ciphertext=r["content_ciphertext"]),
            signed_by_pen_name=r["signed_by_pen_name"],
            signed_at=r["signed_at"],
        )

    def count(self, *, user_id: str) -> int:
        r = self.conn.execute("SELECT COUNT(1) AS c FROM entries WHERE user_id = ?", (user_id,)).fetchone()
        return int(r["c"])

    def latest_meta(self, *, user_id: str) -> Optional[EntryMetaRow]:
        r = self.conn.execute(
            """
            SELECT id, created_at, updated_at, entry_date, user_id, title, signed_by_pen_name, signed_at
            FROM entries
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """
        ,
            (user_id,),
        ).fetchone()
        if r is None:
            return None
        return EntryMetaRow(
            id=r["id"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            entry_date=r["entry_date"],
            user_id=r["user_id"],
            title=r["title"],
            signed_by_pen_name=r["signed_by_pen_name"],
            signed_at=r["signed_at"],
        )
