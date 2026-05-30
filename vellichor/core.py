from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import sqlite3
import uuid

from . import crypto, storage
from .app.services.entries import EntriesService
from .domain.models import EntryDetail, EntrySummary
from .infra.sqlite.repos import SqliteEntryRepo


PW_CHECK_PLAINTEXT = "vellichor_pw_check_v1"


@dataclass(frozen=True)
class Context:
    db_path: Path
    conn: sqlite3.Connection


def open_context(*, db_path: Path) -> Context:
    conn = storage.connect(db_path)
    storage.init_db(conn)
    return Context(db_path=db_path, conn=conn)


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    username: str
    pen_name: str
    key: bytes


def create_user(*, ctx: Context, username: str, password: str, pen_name: str) -> str:
    now = storage.utc_now_iso()
    user_id = str(uuid.uuid4())
    salt = crypto.new_salt()
    key = crypto.derive_key(password, salt=salt)
    check = crypto.encrypt(PW_CHECK_PLAINTEXT, key=key)

    ctx.conn.execute(
        """
        INSERT INTO users(
            id, username, pen_name,
            kdf_salt, pw_check_nonce, pw_check_ciphertext,
            created_at, updated_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, username, pen_name, salt, check.nonce, check.ciphertext, now, now),
    )
    ctx.conn.commit()
    return user_id


def authenticate_user(*, ctx: Context, username: str, password: str) -> AuthenticatedUser:
    r = ctx.conn.execute(
        """
        SELECT id, username, pen_name, kdf_salt, pw_check_nonce, pw_check_ciphertext
        FROM users
        WHERE username = ?
        """,
        (username,),
    ).fetchone()
    if r is None:
        raise ValueError("Invalid username or password")

    key = crypto.derive_key(password, salt=r["kdf_salt"])
    blob = crypto.EncryptedBlob(nonce=r["pw_check_nonce"], ciphertext=r["pw_check_ciphertext"])
    try:
        check = crypto.decrypt(blob, key=key)
    except Exception as e:
        raise ValueError("Invalid username or password") from e
    if check != PW_CHECK_PLAINTEXT:
        raise ValueError("Invalid username or password")

    return AuthenticatedUser(user_id=r["id"], username=r["username"], pen_name=r["pen_name"], key=key)


def update_pen_name(*, ctx: Context, user_id: str, pen_name: str) -> None:
    now = storage.utc_now_iso()
    cur = ctx.conn.execute(
        "UPDATE users SET pen_name = ?, updated_at = ? WHERE id = ?",
        (pen_name, now, user_id),
    )
    if cur.rowcount == 0:
        raise KeyError(user_id)
    ctx.conn.commit()


def _entries_service(*, ctx: Context, user: AuthenticatedUser) -> EntriesService:
    return EntriesService(repo=SqliteEntryRepo(ctx.conn), key=user.key, user_id=user.user_id, pen_name=user.pen_name)


def list_entries(ctx: Context, *, user: AuthenticatedUser, limit: int = 200) -> Iterable[EntrySummary]:
    yield from _entries_service(ctx=ctx, user=user).list_entries(limit=limit)


def count_entries(ctx: Context, *, user: AuthenticatedUser) -> int:
    return SqliteEntryRepo(ctx.conn).count(user_id=user.user_id)


@dataclass(frozen=True)
class LatestEntry:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    user_id: Optional[str]
    title: str
    signed_by_pen_name: Optional[str]
    signed_at: Optional[str]


def latest_entry(ctx: Context, *, user: AuthenticatedUser) -> Optional[LatestEntry]:
    m = SqliteEntryRepo(ctx.conn).latest_meta(user_id=user.user_id)
    if m is None:
        return None
    return LatestEntry(
        id=m.id,
        created_at=m.created_at,
        updated_at=m.updated_at,
        entry_date=m.entry_date,
        user_id=m.user_id,
        title=m.title,
        signed_by_pen_name=m.signed_by_pen_name,
        signed_at=m.signed_at,
    )


def get_entry(ctx: Context, *, user: AuthenticatedUser, entry_id: str) -> EntryDetail:
    return _entries_service(ctx=ctx, user=user).get_entry(entry_id=entry_id)


def create_entry(
    ctx: Context, *, user: AuthenticatedUser, title: str, content: str, entry_date: Optional[str] = None
) -> str:
    return _entries_service(ctx=ctx, user=user).create_entry(title=title, content=content, entry_date=entry_date)


def update_entry(
    ctx: Context,
    *,
    user: AuthenticatedUser,
    entry_id: str,
    title: str,
    content: str,
    entry_date: Optional[str] = None,
) -> None:
    _entries_service(ctx=ctx, user=user).update_entry(
        entry_id=entry_id, title=title, content=content, entry_date=entry_date
    )


def delete_entry(ctx: Context, *, user: AuthenticatedUser, entry_id: str) -> None:
    _entries_service(ctx=ctx, user=user).delete_entry(entry_id=entry_id)


def search_entries(ctx: Context, *, user: AuthenticatedUser, query: str, limit: int = 200) -> Iterable[EntrySummary]:
    yield from _entries_service(ctx=ctx, user=user).search_entries(query=query, limit=limit)

