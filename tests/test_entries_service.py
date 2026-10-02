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
                svc = EntriesService(repo=repo, key=b"x" * 32, user_id="u1", pen_name="p1")
                entry_id = svc.create_entry(title="t", content="hello", entry_date="2026-05-30")
                e = svc.get_entry(entry_id=entry_id)
                self.assertEqual(e.entry_date, "2026-05-30")
                self.assertEqual(e.content, "hello")

                # Test update
                svc.update_entry(entry_id=entry_id, title="Updated Title", content="updated content", entry_date="2026-06-01")
                updated = svc.get_entry(entry_id=entry_id)
                self.assertEqual(updated.title, "Updated Title")
                self.assertEqual(updated.content, "updated content")
                self.assertEqual(updated.entry_date, "2026-06-01")

                # Test user isolation: another user cannot update or delete this entry
                from vellichor.domain.errors import EntryNotFound
                other_svc = EntriesService(repo=repo, key=b"y" * 32, user_id="u2", pen_name="p2")
                with self.assertRaises(EntryNotFound):
                    other_svc.update_entry(entry_id=entry_id, title="Hacked", content="hacked", entry_date=None)
                with self.assertRaises(EntryNotFound):
                    other_svc.delete_entry(entry_id=entry_id)
            finally:
                conn.close()

    def test_create_user_prevents_duplicate_username(self) -> None:
        from vellichor import core
        with TemporaryDirectory() as td:
            db_path = Path(td) / "vellichor.db"
            ctx = core.open_context(db_path=db_path)
            try:
                # First registration succeeds
                uid1 = core.create_user(ctx=ctx, username="Ludwig", password="password123", pen_name="Ludwig C.")
                self.assertTrue(bool(uid1))

                # Second registration with same username (even different case) fails
                with self.assertRaises(ValueError) as ctx_err:
                    core.create_user(ctx=ctx, username="ludwig", password="different_password", pen_name="Impostor")
                self.assertIn("已經存在", str(ctx_err.exception))

                # Original user still authenticates with original password
                auth = core.authenticate_user(ctx=ctx, username="Ludwig", password="password123")
                self.assertEqual(auth.user_id, uid1)
            finally:
                ctx.conn.close()
