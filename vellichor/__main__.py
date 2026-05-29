from __future__ import annotations

import argparse

from . import cli, run_web


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m vellichor")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_web = sub.add_parser("web")
    p_web.add_argument("args", nargs=argparse.REMAINDER)
    p_web.set_defaults(func=lambda a: run_web.main(a.args))

    p_cli = sub.add_parser("cli")
    p_cli.add_argument("args", nargs=argparse.REMAINDER)
    p_cli.set_defaults(func=lambda a: cli.main(a.args))

    args = p.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
