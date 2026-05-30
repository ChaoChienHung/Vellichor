from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

try:
    from vellichor.app.services.entries import EntriesService
except ModuleNotFoundError:
    EntriesService = None  # type: ignore[assignment]
from vellichor.infra.sqlite import conn as sqlite_conn
try:
    from vellichor.infra.sqlite.repos import SqliteEntryRepo
except ModuleNotFoundError:
    SqliteEntryRepo = None  # type: ignore[assignment]


class TestEntriesService(unittest.TestCase):
    def test_create_get_includes_entry_date(self) -> None:
        if EntriesService is None or SqliteEntryRepo is None:
            self.skipTest("cryptography dependency not installed")
        with TemporaryDirectory() as td:
            db_path = Path(td) / "vellichor.db"
            conn = sqlite_conn.connect(db_path)
            sqlite_conn.init_db(conn)
            try:
                repo = SqliteEntryRepo(conn)
                svc = EntriesService(repo=repo, key=b"x" * 32)
                entry_id = svc.create_entry(title="t", content="hello", entry_date="2026-05-30")
                e = svc.get_entry(entry_id=entry_id)
                self.assertEqual(e.entry_date, "2026-05-30")
                self.assertEqual(e.content, "hello")
            finally:
                conn.close()
