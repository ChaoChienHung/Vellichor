# Project Goal

Vellichor is a local-first diary with encrypt-before-save.

## Core Modules

- `vellichor/crypto.py`: PBKDF2 key derivation + AES-GCM encrypt/decrypt
- `vellichor/infra/sqlite/conn.py`: SQLite schema
- `vellichor/infra/sqlite/repos.py`: repositories
- `vellichor/core.py`: domain API (create/update/list/get/search + re-key)
- `vellichor/web.py`: FastAPI app (serves `/app` SPA + legacy Jinja pages)

