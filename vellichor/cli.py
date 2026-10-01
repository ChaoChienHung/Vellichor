from __future__ import annotations

import argparse
import json
import os
import sys
from getpass import getpass
from pathlib import Path
from typing import Optional

from . import core, crypto, export_import
from .infra.sqlite.repos import SqliteEntryRepo


DEFAULT_DB_PATH = Path(os.environ.get("VELLICHOR_DB", "vellichor.db"))


def _read_stdin_text() -> str:
    return sys.stdin.read()


def _get_password(*, prompt: str = "Password: ") -> str:
    pw = os.environ.get("VELLICHOR_PASSWORD")
    if pw:
        return pw
    try:
        return getpass(prompt)
    except Exception:
        return input(prompt)


def cmd_init(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    core.create_user(ctx=ctx, username=args.username, password=_get_password(prompt="Password: "), pen_name=args.pen_name)
    return 0


def cmd_new(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user = core.authenticate_user(ctx=ctx, username=args.username, password=_get_password(prompt="Password: "))
    content = args.content if args.content is not None else _read_stdin_text()
    entry_id = core.create_entry(ctx, user=user, title=args.title, content=content)
    print(entry_id)
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user = core.authenticate_user(ctx=ctx, username=args.username, password=_get_password(prompt="Password: "))
    for e in core.list_entries(ctx, user=user, limit=args.limit):
        print(f"{e.created_at}\t{e.id}\t{e.title}")
    return 0


def cmd_view(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user = core.authenticate_user(ctx=ctx, username=args.username, password=_get_password(prompt="Password: "))
    e = core.get_entry(ctx, user=user, entry_id=args.id)
    print(e.title)
    print(f"created_at: {e.created_at}")
    print(f"updated_at: {e.updated_at}")
    print()
    print(e.content)
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user = core.authenticate_user(ctx=ctx, username=args.username, password=_get_password(prompt="Password: "))
    for e in core.search_entries(ctx, user=user, query=args.query, limit=args.limit):
        print(f"{e.created_at}\t{e.id}\t{e.title}\t{e.preview}")
    return 0


def cmd_edit(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user = core.authenticate_user(ctx=ctx, username=args.username, password=_get_password(prompt="Password: "))
    content = args.content if args.content is not None else _read_stdin_text()
    core.update_entry(ctx, user=user, entry_id=args.id, title=args.title, content=content)
    return 0


def cmd_delete(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user = core.authenticate_user(ctx=ctx, username=args.username, password=_get_password(prompt="Password: "))
    core.delete_entry(ctx, user=user, entry_id=args.id)
    return 0


def cmd_change_password(args: argparse.Namespace) -> int:
    raise SystemExit("not supported")


def cmd_export(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user_pass = getattr(args, "password", None) or _get_password(prompt="Password: ")
    user = core.authenticate_user(ctx=ctx, username=args.username, password=user_pass)
    repo = SqliteEntryRepo(ctx.conn)
    if getattr(args, "id", None):
        row = repo.get_row(user_id=user.user_id, entry_id=args.id)
        rows = [row] if row else []
    else:
        rows = list(repo.list_rows(user_id=user.user_id, limit=10_000))
    entries_data = []
    for r in rows:
        content = crypto.decrypt(r.encrypted, key=user.key)
        entries_data.append(
            {
                "id": r.id,
                "title": r.title,
                "date": r.entry_date or (r.created_at[:10] if r.created_at else ""),
                "content": content,
                "mood": "reflective",
                "tags": [],
                "signature": r.signed_by_pen_name or user.pen_name,
                "createdAt": r.created_at,
                "updatedAt": r.updated_at,
            }
        )
    user_info = {"username": user.username, "penName": user.pen_name}
    mode = getattr(args, "mode", "encrypted")
    fmt = (getattr(args, "format", "zip") or "zip").lower()
    enc_password = getattr(args, "password", None) or user.key

    # Directory-based export: each entry as an individual file
    if getattr(args, "dir", None):
        target_dir = Path(args.dir)
        exported_count = export_import.export_to_directory(
            entries_data,
            target_dir=target_dir,
            mode=mode,
            password=enc_password,
            format=fmt,
        )
        print(f"Exported {exported_count} entries to directory: {target_dir} ({mode} mode)")
        return 0

    if mode == "encrypted":
        if fmt == "json" or (args.output and args.output.endswith((".json", ".vellichor"))):
            if len(entries_data) == 1:
                enc_data = export_import.encrypt_entry_data(entries_data[0], enc_password)
                data = json.dumps(enc_data, ensure_ascii=False, indent=2)
            else:
                enc_list = [export_import.encrypt_entry_data(e, enc_password) for e in entries_data]
                data = json.dumps({"format": export_import.ENCRYPTED_BACKUP_TAG, "entries": enc_list}, ensure_ascii=False, indent=2)
            if args.output:
                Path(args.output).write_text(data, encoding="utf-8")
                print(f"Exported {len(entries_data)} encrypted entries to {args.output}")
            else:
                print(data)
        else:
            zip_bytes = export_import.export_to_zip(entries_data, user_info=user_info, mode="encrypted", password=enc_password)
            out_path = Path(args.output) if args.output else Path(f"vellichor-backup-{user.username}-encrypted.zip")
            out_path.write_bytes(zip_bytes)
            print(f"Exported {len(entries_data)} encrypted entries to {out_path}")
        return 0

    # Plaintext mode
    if fmt == "json":
        data = export_import.export_to_json(entries_data, user_info=user_info)
        if args.output:
            Path(args.output).write_text(data, encoding="utf-8")
            print(f"Exported {len(entries_data)} entries to {args.output}")
        else:
            print(data)
    elif fmt in ("md", "markdown"):
        data = export_import.export_to_markdown(entries_data)
        if args.output:
            Path(args.output).write_text(data, encoding="utf-8")
            print(f"Exported {len(entries_data)} entries to {args.output}")
        else:
            print(data)
    else:
        zip_bytes = export_import.export_to_zip(entries_data, user_info=user_info, mode="plaintext")
        out_path = Path(args.output) if args.output else Path(f"vellichor-backup-{user.username}.zip")
        out_path.write_bytes(zip_bytes)
        print(f"Exported {len(entries_data)} entries to {out_path}")
    return 0


def cmd_import(args: argparse.Namespace) -> int:
    ctx = core.open_context(db_path=args.db)
    user_pass = getattr(args, "password", None) or _get_password(prompt="Password: ")
    user = core.authenticate_user(ctx=ctx, username=args.username, password=user_pass)
    password = getattr(args, "file_password", None) or getattr(args, "password", None) or user.key

    # Directory-based import: import all individual diary files in directory
    if getattr(args, "dir", None):
        target_dir = Path(args.dir)
        if not target_dir.is_dir():
            print(f"Not a directory: {target_dir}", file=sys.stderr)
            return 1
        entries = export_import.import_from_directory(target_dir, password=password)
        if not entries:
            print(f"No valid entries found in directory {target_dir}", file=sys.stderr)
            return 1
        res = core.import_entries(ctx, user=user, entries_data=entries)
        print(f"Imported {res['imported']} / {res['total']} entries from {target_dir} into database.")
        if res["errors"]:
            for err in res["errors"]:
                print(f"  - {err}", file=sys.stderr)
        return 0

    if not getattr(args, "input", None):
        print("Error: must specify either --input <file> or --dir <directory>", file=sys.stderr)
        return 1

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"File not found: {in_path}", file=sys.stderr)
        return 1
    raw = in_path.read_bytes()
    try:
        entries = export_import.parse_import_payload(in_path.name, raw, password=password)
    except ValueError as e:
        print(f"Decryption error: {e}", file=sys.stderr)
        return 1

    if not entries:
        print(f"No valid entries found in {in_path}", file=sys.stderr)
        return 1
    res = core.import_entries(ctx, user=user, entries_data=entries)
    print(f"Imported {res['imported']} / {res['total']} entries into database.")
    if res["errors"]:
        for err in res["errors"]:
            print(f"  - {err}", file=sys.stderr)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="vellichor")
    sub = p.add_subparsers(dest="cmd", required=True)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    common.add_argument("--username", required=True)

    p_init = sub.add_parser("init", parents=[common])
    p_init.add_argument("--pen-name", required=True)
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

    p_cp = sub.add_parser("change-password", parents=[common])
    p_cp.set_defaults(func=cmd_change_password)

    p_export = sub.add_parser("export", parents=[common])
    p_export.add_argument("--mode", choices=["encrypted", "plaintext"], default="encrypted", help="Security mode: encrypted (default) or plaintext")
    p_export.add_argument("--format", choices=["zip", "json", "markdown"], default="zip")
    p_export.add_argument("--id", help="Export a specific entry by ID")
    p_export.add_argument("--dir", help="Export each entry as an individual file into this directory")
    p_export.add_argument("--output", "-o", help="Destination file path")
    p_export.add_argument("--password", help="Encryption password (defaults to master key)")
    p_export.set_defaults(func=cmd_export)

    p_import = sub.add_parser("import", parents=[common])
    p_import.add_argument("--input", "-i", help="Input file path (.zip, .json, .md, .vellichor)")
    p_import.add_argument("--dir", help="Directory containing individual diary files to import")
    p_import.add_argument("--password", help="User account password (if not prompted)")
    p_import.add_argument("--file-password", "--decrypt-password", help="Decryption password if files are encrypted with another password")
    p_import.set_defaults(func=cmd_import)

    return p


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
