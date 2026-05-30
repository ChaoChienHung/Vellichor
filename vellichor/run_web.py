from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional

import uvicorn

from . import core, web


def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="vellichor-web")
    p.add_argument("--db", type=Path, default=Path("vellichor.db"))
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8000)
    args = p.parse_args(argv)

    ctx = core.open_context(db_path=args.db)
    app = web.create_app(ctx=ctx)

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
