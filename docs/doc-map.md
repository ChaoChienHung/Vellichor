# docs / Doc Map

本資料夾用來放「可支撐協作」的專案文件：架構、守則、驗收清單、與關鍵決策。操作手冊請看 `skills/`。

## 先讀哪一份？

- 新加入或要理解規格：`tech/`（見 `tech/README.md`）→ `architecture.md` → `guardrails.md`
- 要改功能前確認不會退化：`guardrails.md` → `checklist.md`
- 要跑起來 / build / release：`workflows.md`（或 `skills/`）
- 要查技術細節（DB / 加密 / API / 框架選型）：`tech/` 各專題文檔（如 `database.md`, `cryptography.md`）

## 文件清單

- `architecture.md`：系統架構與資料流（SPA / Web / DB / Crypto）
- `guardrails.md`：不可退化守則（安全、資料、產物、相容性）
- `checklist.md`：交付驗收清單（PR/Release）
- `workflows.md`：常用工作流（本機跑站、前端 build、re-key、測試）

## 專案根目錄文件

- `tech/`：獨立技術專題文件庫（架構、資料庫選型、加密方案、前後端設計、API 規格、開發測試）
- `TODO.md`：待辦事項（P0–P3）
- `AGENTS.md`：硬契約（不可退化約束）
