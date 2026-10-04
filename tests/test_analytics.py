from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory

from vellichor import core


def test_analytics_includes_all_entries_and_isolates_users() -> None:
    with TemporaryDirectory() as td:
        ctx = core.open_context(db_path=Path(td) / "analytics.db")
        try:
            core.create_user(ctx=ctx, username="alice", password="password123", pen_name="Alice")
            core.create_user(ctx=ctx, username="bob", password="password123", pen_name="Bob")
            alice = core.authenticate_user(ctx=ctx, username="alice", password="password123")
            bob = core.authenticate_user(ctx=ctx, username="bob", password="password123")

            for _ in range(201):
                core.create_entry(
                    ctx, user=alice, title="Test", content="Encrypted body",
                    entry_date="2026-10-04", tags=json.dumps(["閱讀", "閱讀"]), mood="peaceful",
                )
            core.create_entry(
                ctx, user=bob, title="Private", content="Bob's body",
                entry_date="2026-10-03", tags=json.dumps(["私人"]), mood="joyful",
            )

            result = core.list_entry_analytics(ctx=ctx, user=alice)
            assert len(result) == 201
            assert result[0] == {"date": "2026-10-04", "mood": "peaceful", "tags": ["閱讀", "閱讀"]}
            assert all("content" not in entry for entry in result)
            assert all("私人" not in entry["tags"] for entry in result)
            assert len(core.list_entry_analytics(ctx=ctx, user=bob)) == 1
        finally:
            ctx.conn.close()
