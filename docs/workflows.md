# Workflows

本文件列出 Vellichor 的常用工作流（高層版）。更細的「一步一步操作」請看 `skills/`。

## Run Web（本機啟動）

```bash
python -m vellichor web --db vellichor.db --port 8000
```

打開：
- `/`：導向 `/app`
- `/app`：新前端 SPA
- `/desk`：舊 Jinja 桌面（保留）

## Frontend Build（產出 `/app` 靜態檔）

```bash
cd frontend
npm install
npm run build
```

產物會輸出到：
- `vellichor/static/app/`

## Tests

```bash
python3 -m pytest -q
```

```bash
cd frontend
npm run lint
npm run build
```

## Re-key（修改主密碼）

CLI：

```bash
python -m vellichor cli change-password --db vellichor.db
```

Web：
- 於 `/app` 的帳號/安全設定內操作（會觸發後端全量重加密）
