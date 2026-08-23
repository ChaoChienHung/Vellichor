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
    user_id: str
    pen_name: str

    def list_entries(self, *, limit: int = 200) -> Iterable[EntrySummary]:
        for r in self.repo.list_rows(user_id=self.user_id, limit=limit):
            content = crypto.decrypt(r.encrypted, key=self.key)
            yield EntrySummary(
                id=r.id,
                created_at=r.created_at,
                updated_at=r.updated_at,
                entry_date=r.entry_date,
                user_id=r.user_id,
                title=r.title,
                preview=_preview(content),
                signed_by_pen_name=r.signed_by_pen_name,
                signed_at=r.signed_at,
            )

    def get_entry(self, *, entry_id: str) -> EntryDetail:
        try:
            r = self.repo.get_row(user_id=self.user_id, entry_id=entry_id)
        except KeyError as e:
            raise EntryNotFound(entry_id) from e
        content = crypto.decrypt(r.encrypted, key=self.key)
        return EntryDetail(
            id=r.id,
            created_at=r.created_at,
            updated_at=r.updated_at,
            entry_date=r.entry_date,
            user_id=r.user_id,
            title=r.title,
            content=content,
            signed_by_pen_name=r.signed_by_pen_name,
            signed_at=r.signed_at,
        )

    def create_entry(self, *, title: str, content: str, entry_date: Optional[str]) -> str:
        encrypted = crypto.encrypt(content, key=self.key)
        return self.repo.create(
            user_id=self.user_id,
            title=title,
            entry_date=entry_date,
            encrypted=encrypted,
            signed_by_pen_name=self.pen_name,
        )

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
            self.repo.update(
                entry_id=entry_id,
                title=title,
                entry_date=entry_date,
                encrypted=encrypted,
                signed_by_pen_name=self.pen_name,
            )
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
