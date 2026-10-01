from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from vellichor import core, export_import


class TestCoreExportImport(unittest.TestCase):
    def test_core_export_import(self):
        with TemporaryDirectory() as td:
            db_path = Path(td) / "test.db"
            ctx = core.open_context(db_path=db_path)
            core.create_user(ctx=ctx, username="alice", password="Password123!", pen_name="AliceInWonderland")
            user = core.authenticate_user(ctx=ctx, username="alice", password="Password123!")

            core.create_entry(ctx, user=user, title="First Entry", content="Hello world", entry_date="2026-10-01")
            core.create_entry(ctx, user=user, title="Second Entry", content="Another day", entry_date="2026-10-02")

            # 1. Test core.import_entries
            new_entries = [
                {
                    "title": "Imported Entry 1",
                    "content": "Imported content",
                    "date": "2026-10-03",
                },
                {
                    "title": "Imported Entry 2",
                    "content": "Second imported content",
                    "date": "2026-10-04",
                },
            ]
            res = core.import_entries(ctx, user=user, entries_data=new_entries)
            assert res["imported"] == 2
            assert res["total"] == 2
            assert len(res["errors"]) == 0

            # 2. Check all entries in DB
            all_entries = list(core.list_entries(ctx, user=user, limit=100))
            assert len(all_entries) == 4
            titles = {e.title for e in all_entries}
            assert "Imported Entry 1" in titles
            assert "Imported Entry 2" in titles

            # 3. Roundtrip encrypted zip export & import
            entries_dicts = [
                {"id": e.id, "title": e.title, "content": "sample content", "date": e.entry_date}
                for e in all_entries
            ]
            zip_enc = export_import.export_to_zip(entries_dicts, mode="encrypted", password="Password123!")
            parsed_from_zip = export_import.parse_zip_entries(zip_enc, password="Password123!")
            assert len(parsed_from_zip) == 4

            # 4. Roundtrip plaintext zip export & import
            zip_plain = export_import.export_to_zip(entries_dicts, mode="plaintext")
            parsed_from_plain_zip = export_import.parse_zip_entries(zip_plain)
            assert len(parsed_from_plain_zip) == 4

