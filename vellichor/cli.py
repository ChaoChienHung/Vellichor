from __future__ import annotations

import argparse
import os
import sys
from getpass import getpass
from pathlib import Path

from . import core


DEFAULT_DB_PATH = Path(os.environ.get("VELLICHOR_DB", "vellichor.db"))


def _read_stdin_text() -> str:
    return sys.stdin.read()


def _get_password() -> str:
    pw = os.environ.get("VELLICHOR_PASSWORD")
    if pw:
        return pw
    return getpass("Master password: ")


def cmd_init(args: argparse.Namespace) -> int:
    _ = core.open_context(db_path=args.db, password=_get_password())
    return 0


def cmd_new(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db, password=_get_password())
    content = args.content if args.content is not None else _read_stdin_text()
    entry_id = core.create_entry(ctx, title=args.title, content=content)
    print(entry_id)
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db, password=_get_password())
    for e in core.list_entries(ctx, limit=args.limit):
        print(f"{e.created_at}\t{e.id}\t{e.title}")
    return 0


def cmd_view(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db, password=_get_password())
    e = core.get_entry(ctx, entry_id=args.id)
    print(e.title)
    print(f"created_at: {e.created_at}")
    print(f"updated_at: {e.updated_at}")
    print()
    print(e.content)
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db, password=_get_password())
    for e in core.search_entries(ctx, query=args.query, limit=args.limit):
        print(f"{e.created_at}\t{e.id}\t{e.title}\t{e.preview}")
    return 0


def cmd_edit(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db, password=_get_password())
    content = args.content if args.content is not None else _read_stdin_text()
    core.update_entry(ctx, entry_id=args.id, title=args.title, content=content)
    return 0


def cmd_delete(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db, password=_get_password())
    core.delete_entry(ctx, entry_id=args.id)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="vellichor")
    sub = p.add_subparsers(dest="cmd", required=True)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)

    p_init = sub.add_parser("init", parents=[common])
    p_init.set_defaults(func=cmd_init)

    p_new = sub.add_parser("new", parents=[common])
    p_new.add_argument("--title", required=True)
    p_new.add_argument("--content")
    p_new.set_defaults(func=cmd_new)

    p_list = sub.add_parser("list", parents=[common])
    p_list.add_argument("--limit", type=int, default=200)
    p_list.set_defaults(func=cmd_list)

    p_view = sub.add_parser("view", parents=[common])
    p_view.add_argument("id")
    p_view.set_defaults(func=cmd_view)

    p_search = sub.add_parser("search", parents=[common])
    p_search.add_argument("query")
    p_search.add_argument("--limit", type=int, default=200)
    p_search.set_defaults(func=cmd_search)

    p_edit = sub.add_parser("edit", parents=[common])
    p_edit.add_argument("id")
    p_edit.add_argument("--title", required=True)
    p_edit.add_argument("--content")
    p_edit.set_defaults(func=cmd_edit)

    p_delete = sub.add_parser("delete", parents=[common])
    p_delete.add_argument("id")
    p_delete.set_defaults(func=cmd_delete)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
