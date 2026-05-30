from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

from ... import crypto
from ...domain.errors import EntryNotFound
from ...domain.models import EntryDetail, EntrySummary
from ..ports import EntryRepo


def _preview(text: str, *, limit: int = 120) -> str:
    s = " ".join(text.split())
    if len(s) <= limit:
        return s
    return s[: limit - 1] + "…"


@dataclass(frozen=True)
class EntriesService:
    repo: EntryRepo
    key: bytes

    def list_entries(self, *, limit: int = 200) -> Iterable[EntrySummary]:
        for r in self.repo.list_rows(limit=limit):
            content = crypto.decrypt(r.encrypted, key=self.key)
            yield EntrySummary(
                id=r.id,
                created_at=r.created_at,
                updated_at=r.updated_at,
                entry_date=r.entry_date,
                title=r.title,
                preview=_preview(content),
            )

    def get_entry(self, *, entry_id: str) -> EntryDetail:
        try:
            r = self.repo.get_row(entry_id=entry_id)
        except KeyError as e:
            raise EntryNotFound(entry_id) from e
        content = crypto.decrypt(r.encrypted, key=self.key)
        return EntryDetail(
            id=r.id,
            created_at=r.created_at,
            updated_at=r.updated_at,
            entry_date=r.entry_date,
            title=r.title,
            content=content,
        )

    def create_entry(self, *, title: str, content: str, entry_date: Optional[str]) -> str:
        encrypted = crypto.encrypt(content, key=self.key)
        return self.repo.create(title=title, entry_date=entry_date, encrypted=encrypted)

    def update_entry(
        self,
        *,
        entry_id: str,
        title: str,
        content: str,
        entry_date: Optional[str],
    ) -> None:
        encrypted = crypto.encrypt(content, key=self.key)
        try:
            self.repo.update(entry_id=entry_id, title=title, entry_date=entry_date, encrypted=encrypted)
        except KeyError as e:
            raise EntryNotFound(entry_id) from e

    def delete_entry(self, *, entry_id: str) -> None:
        self.repo.delete(entry_id=entry_id)

    def search_entries(self, *, query: str, limit: int = 200) -> Iterable[EntrySummary]:
        q = query.strip().lower()
        if not q:
            yield from self.list_entries(limit=limit)
            return
        for s in self.list_entries(limit=limit):
            hay = f"{s.title}\n{s.preview}".lower()
            if q in hay:
                yield s

