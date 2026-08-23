from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

try:
    from vellichor import crypto
except ModuleNotFoundError:
    crypto = None  # type: ignore[assignment]
from vellichor.infra.sqlite import conn as sqlite_conn
try:
    from vellichor.infra.sqlite.repos import SqliteEntryRepo
except ModuleNotFoundError:
    SqliteEntryRepo = None  # type: ignore[assignment]


class TestSqliteEntryRepo(unittest.TestCase):
    def test_entry_repo_crud(self) -> None:
        if crypto is None or SqliteEntryRepo is None:
            self.skipTest("cryptography dependency not installed")
        with TemporaryDirectory() as td:
            db_path = Path(td) / "vellichor.db"
            conn = sqlite_conn.connect(db_path)
            sqlite_conn.init_db(conn)
            try:
                repo = SqliteEntryRepo(conn)
                key = b"x" * 32
                blob = crypto.encrypt("content", key=key)

                entry_id = repo.create(user_id="u1", title="t", entry_date="2026-05-30", encrypted=blob, signed_by_pen_name="p1")
                row = repo.get_row(user_id="u1", entry_id=entry_id)
                self.assertEqual(row.entry_date, "2026-05-30")

                blob2 = crypto.encrypt("content2", key=key)
                repo.update(entry_id=entry_id, title="t2", entry_date=None, encrypted=blob2, signed_by_pen_name="p1")
                row2 = repo.get_row(user_id="u1", entry_id=entry_id)
                self.assertEqual(row2.title, "t2")
                self.assertIsNone(row2.entry_date)

                repo.delete(entry_id=entry_id)
                with self.assertRaises(KeyError):
                    repo.get_row(user_id="u1", entry_id=entry_id)
            finally:
                conn.close()
