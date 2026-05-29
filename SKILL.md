# Vellichor Agent Notes

## Goal

Build an offline-first diary with:

- Local SQLite as source of truth
- Encrypt-before-save (AES-256 via AES-GCM)
- Optional future sync (encrypted replicas only)

## Current Implementation (MVP)

Python package: `vellichor/`

- `crypto.py`: PBKDF2 key derivation + AESGCM encrypt/decrypt
- `storage.py`: SQLite schema + CRUD for encrypted entry rows
- `core.py`: domain API (create/update/list/get/search) that decrypts in memory
- `web.py`: FastAPI + Jinja2 templates UI
- `run_web.py`: prompts master password then starts local web server
- `cli.py`: CLI that reuses `core.py`

## How to Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m vellichor web --db vellichor.db
```

## Next Good Tasks

- Add SQLite FTS (search without decrypting everything)
- Add tags/mood schema + UI filters
- Add export/import (Markdown or JSON)
- Add sync abstraction layer (local-first + encrypted replica)
