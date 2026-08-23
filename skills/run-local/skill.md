# Run Locally

## Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m vellichor.run_web --port 8000
```

Open:

- `http://127.0.0.1:8000/` (redirects to `/app`)
- `http://127.0.0.1:8000/app`

## Frontend (build SPA)

```bash
cd frontend
npm install
npm run build
```

The build output is written to `vellichor/static/app/` and served at `/app`.

