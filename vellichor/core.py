from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import sqlite3

from . import crypto, storage


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

    salt = storage.get_meta(conn, META_SALT_KEY)
    if salt is None:
        salt = crypto.new_salt()
        storage.set_meta(conn, META_SALT_KEY, salt)

    key = crypto.derive_key(password, salt=salt)

    check_nonce = storage.get_meta(conn, META_PW_CHECK_NONCE_KEY)
    check_ciphertext = storage.get_meta(conn, META_PW_CHECK_CIPHERTEXT_KEY)
    if check_nonce is None or check_ciphertext is None:
        blob = crypto.encrypt(PW_CHECK_PLAINTEXT, key=key)
        storage.set_meta(conn, META_PW_CHECK_NONCE_KEY, blob.nonce)
        storage.set_meta(conn, META_PW_CHECK_CIPHERTEXT_KEY, blob.ciphertext)
    else:
        blob = crypto.EncryptedBlob(nonce=check_nonce, ciphertext=check_ciphertext)
        try:
            check = crypto.decrypt(blob, key=key)
        except Exception as e:
            raise ValueError("Invalid master password") from e
        if check != PW_CHECK_PLAINTEXT:
            raise ValueError("Invalid master password")

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
            title=r.title,
            preview=_preview(content),
        )


@dataclass(frozen=True)
class EntryDetail:
    id: str
    created_at: str
    updated_at: str
    title: str
    content: str


def get_entry(ctx: Context, *, entry_id: str) -> EntryDetail:
    r = storage.get_entry_row(ctx.conn, entry_id=entry_id)
    content = crypto.decrypt(r.encrypted, key=ctx.key)
    return EntryDetail(
        id=r.id,
        created_at=r.created_at,
        updated_at=r.updated_at,
        title=r.title,
        content=content,
    )


def create_entry(ctx: Context, *, title: str, content: str) -> str:
    encrypted = crypto.encrypt(content, key=ctx.key)
    return storage.create_entry(ctx.conn, title=title, encrypted=encrypted)


def update_entry(ctx: Context, *, entry_id: str, title: str, content: str) -> None:
    encrypted = crypto.encrypt(content, key=ctx.key)
    storage.update_entry(ctx.conn, entry_id=entry_id, title=title, encrypted=encrypted)


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
