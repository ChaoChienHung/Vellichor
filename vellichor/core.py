from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import sqlite3

from . import crypto, storage
from .app.services.auth import AuthService
from .domain.errors import InvalidMasterPassword
from .infra.sqlite.repos import SqliteMetaRepo


META_SALT_KEY = "kdf_salt"
META_PW_CHECK_NONCE_KEY = "pw_check_nonce"
META_PW_CHECK_CIPHERTEXT_KEY = "pw_check_ciphertext"
PW_CHECK_PLAINTEXT = "vellichor_pw_check_v1"


@dataclass(frozen=True)
class Context:
    db_path: Path
    conn: sqlite3.Connection
    key: bytes


def open_context(*, db_path: Path, password: str) -> Context:
    conn = storage.connect(db_path)
    storage.init_db(conn)
    meta = SqliteMetaRepo(conn)
    auth = AuthService(meta)
    try:
        key = auth.derive_or_init_key(password=password)
    except InvalidMasterPassword as e:
        raise ValueError("Invalid master password") from e

    return Context(db_path=db_path, conn=conn, key=key)


def change_master_password(*, db_path: Path, old_password: str, new_password: str) -> None:
    ctx = open_context(db_path=db_path, password=old_password)
    conn = ctx.conn
    old_key = ctx.key

    new_salt = crypto.new_salt()
    new_key = crypto.derive_key(new_password, salt=new_salt)
    new_check = crypto.encrypt(PW_CHECK_PLAINTEXT, key=new_key)

    def upsert_meta(key: str, value: bytes) -> None:
        conn.execute(
            "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )

    try:
        conn.execute("BEGIN IMMEDIATE")
        rows = conn.execute(
            "SELECT id, content_nonce, content_ciphertext FROM entries ORDER BY created_at ASC"
        ).fetchall()
        for r in rows:
            blob = crypto.EncryptedBlob(nonce=r["content_nonce"], ciphertext=r["content_ciphertext"])
            plaintext = crypto.decrypt(blob, key=old_key)
            encrypted = crypto.encrypt(plaintext, key=new_key)
            conn.execute(
                "UPDATE entries SET content_nonce = ?, content_ciphertext = ? WHERE id = ?",
                (encrypted.nonce, encrypted.ciphertext, r["id"]),
            )

        upsert_meta(META_SALT_KEY, new_salt)
        upsert_meta(META_PW_CHECK_NONCE_KEY, new_check.nonce)
        upsert_meta(META_PW_CHECK_CIPHERTEXT_KEY, new_check.ciphertext)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


@dataclass(frozen=True)
class EntrySummary:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    title: str
    preview: str


def _preview(text: str, *, limit: int = 120) -> str:
    s = " ".join(text.split())
    if len(s) <= limit:
        return s
    return s[: limit - 1] + "…"


def list_entries(ctx: Context, *, limit: int = 200) -> Iterable[EntrySummary]:
    for r in storage.list_entry_rows(ctx.conn, limit=limit):
        content = crypto.decrypt(r.encrypted, key=ctx.key)
        yield EntrySummary(
            id=r.id,
            created_at=r.created_at,
            updated_at=r.updated_at,
            entry_date=r.entry_date,
            title=r.title,
            preview=_preview(content),
        )


def count_entries(ctx: Context) -> int:
    return storage.count_entries(ctx.conn)


@dataclass(frozen=True)
class LatestEntry:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    title: str


def latest_entry(ctx: Context) -> LatestEntry | None:
    m = storage.latest_entry_meta(ctx.conn)
    if m is None:
        return None
    return LatestEntry(
        id=m.id,
        created_at=m.created_at,
        updated_at=m.updated_at,
        entry_date=m.entry_date,
        title=m.title,
    )


@dataclass(frozen=True)
class EntryDetail:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    title: str
    content: str


def get_entry(ctx: Context, *, entry_id: str) -> EntryDetail:
    r = storage.get_entry_row(ctx.conn, entry_id=entry_id)
    content = crypto.decrypt(r.encrypted, key=ctx.key)
    return EntryDetail(
        id=r.id,
        created_at=r.created_at,
        updated_at=r.updated_at,
        entry_date=r.entry_date,
        title=r.title,
        content=content,
    )


def create_entry(ctx: Context, *, title: str, content: str, entry_date: Optional[str] = None) -> str:
    encrypted = crypto.encrypt(content, key=ctx.key)
    return storage.create_entry(ctx.conn, title=title, entry_date=entry_date, encrypted=encrypted)


def update_entry(
    ctx: Context,
    *,
    entry_id: str,
    title: str,
    content: str,
    entry_date: Optional[str] = None,
) -> None:
    encrypted = crypto.encrypt(content, key=ctx.key)
    storage.update_entry(ctx.conn, entry_id=entry_id, title=title, entry_date=entry_date, encrypted=encrypted)


def delete_entry(ctx: Context, *, entry_id: str) -> None:
    storage.delete_entry(ctx.conn, entry_id=entry_id)


def search_entries(ctx: Context, *, query: str, limit: int = 200) -> Iterable[EntrySummary]:
    q = query.strip().lower()
    if not q:
        yield from list_entries(ctx, limit=limit)
        return

    for s in list_entries(ctx, limit=limit):
        hay = f"{s.title}\n{s.preview}".lower()
        if q in hay:
            yield s


def validate_password(ctx: Context) -> bool:
    return True
