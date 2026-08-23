# Checklist（交付驗收清單）

## PR Checklist

- [ ] 不引入明文落盤（SQLite/檔案/日誌）
- [ ] 不引入 secrets（token、密碼、key material）進 repo 或輸出
- [ ] 牽涉 crypto / DB schema / 匯入匯出：更新 `docs/architecture.md` / `docs/guardrails.md`（至少一處）
- [ ] 牽涉操作流程：更新 `skills/`（或 `docs/workflows.md`）
- [ ] `frontend`: `npm run lint` 通過
- [ ] `frontend`: `npm run build` 通過（允許 CSS @import warning，但不可新增 error）
- [ ] `python`: `python3 -m pytest -q` 通過

## Release Smoke Test（人工）

- [ ] `/login`、`/signup` 可正常使用
- [ ] `/app` 可正常進入桌面並完成寫入/搜尋/刪除
- [ ] re-key 後：舊資料仍可讀、登出再登入可用新密碼
