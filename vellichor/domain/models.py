from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class EntrySummary:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    title: str
    preview: str


@dataclass(frozen=True)
class EntryDetail:
    id: str
    created_at: str
    updated_at: str
    entry_date: Optional[str]
    title: str
    content: str

