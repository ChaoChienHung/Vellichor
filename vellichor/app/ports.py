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
    title: str
    encrypted: EncryptedBlob


@dataclass(frozen=True)
class EntryMetaRow:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    title: str


class EntryRepo(Protocol):
    def create(self, *, title: str, entry_date: Optional[str], encrypted: EncryptedBlob) -> str: ...

    def update(
        self,
        *,
        entry_id: str,
        title: str,
        entry_date: Optional[str],
        encrypted: EncryptedBlob,
    ) -> None: ...

    def delete(self, *, entry_id: str) -> None: ...

    def list_rows(self, *, limit: int = 200) -> Iterable[EntryRow]: ...

    def get_row(self, *, entry_id: str) -> EntryRow: ...

    def count(self) -> int: ...

    def latest_meta(self) -> Optional[EntryMetaRow]: ...


class MetaRepo(Protocol):
    def get(self, key: str) -> Optional[bytes]: ...

    def set(self, key: str, value: bytes) -> None: ...

