# Frontend Build

Build the Vite+React SPA into the backend static directory.

## Steps

```bash
cd frontend
npm install
npm run build
```

## Notes

- `frontend/vite.config.ts` sets `base: "/app/"` and `outDir: "vellichor/static/app"`.
- The backend serves the SPA at `/app` and falls back to `index.html` for client routing.

