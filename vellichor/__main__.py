from __future__ import annotations

import sys

from . import cli, run_web


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv or argv[0] in ("-h", "--help"):
        print("usage: python -m vellichor {web,cli} ...")
        print()
        print("commands:")
        print("  web   start local web UI")
        print("  cli   run CLI commands")
        print()
        print("examples:")
        print("  python -m vellichor web --db vellichor.db --port 8000")
        print("  python -m vellichor cli list --db vellichor.db")
        return 0

    cmd, rest = argv[0], argv[1:]
    if cmd == "web":
        return int(run_web.main(rest))
    if cmd == "cli":
        return int(cli.main(rest))
    print("unknown command", cmd, file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
