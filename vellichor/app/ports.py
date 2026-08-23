from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Protocol

from ..crypto import EncryptedBlob


@dataclass(frozen=True)
class EntryRow:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    user_id: Optional[str]
    title: str
    encrypted: EncryptedBlob
    signed_by_pen_name: Optional[str]
    signed_at: Optional[str]


@dataclass(frozen=True)
class EntryMetaRow:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    user_id: Optional[str]
    title: str
    signed_by_pen_name: Optional[str]
    signed_at: Optional[str]


class EntryRepo(Protocol):
    def create(
        self,
        *,
        user_id: str,
        title: str,
        entry_date: Optional[str],
        encrypted: EncryptedBlob,
        signed_by_pen_name: str,
    ) -> str: ...

    def update(
        self,
        *,
        entry_id: str,
        title: str,
        entry_date: Optional[str],
        encrypted: EncryptedBlob,
        signed_by_pen_name: str,
    ) -> None: ...

    def delete(self, *, entry_id: str) -> None: ...

    def list_rows(self, *, user_id: str, limit: int = 200) -> Iterable[EntryRow]: ...

    def get_row(self, *, user_id: str, entry_id: str) -> EntryRow: ...

    def count(self, *, user_id: str) -> int: ...

    def latest_meta(self, *, user_id: str) -> Optional[EntryMetaRow]: ...


class MetaRepo(Protocol):
    def get(self, key: str) -> Optional[bytes]: ...

    def set(self, key: str, value: bytes) -> None: ...
