# Guardrails（不可退化守則）

本文件把 `AGENTS.md` 的硬契約落成更可操作的「守門規則」。任何功能新增、重構或 UI 調整，都必須滿足以下條件。

## Data & Crypto

- SQLite 是 SSOT：不得引入第二份資料真相（例如 localStorage 作為持久資料庫）。
- Entry 落盤前必須加密：DB 內不得出現 plaintext entry content。
- 任何 key/nonce/ciphertext 不得出現在 logs、trace、analytics、或任何會進版本控制的輸出。

## Auth & Session

- session cookie 只用於識別與授權，不在 cookie/前端落地存放金鑰材料。
- re-key 成功後必須更新 session key，且舊 entries 仍可讀。

## Import / Export

- 必須明確區分「明文」與「加密」兩種格式，且 UI/CLI 要避免誤操作（例如明文導出需二次確認）。
- 預設應偏向更安全路徑（例如加密導出），並清楚提示風險。
- 批次匯入/匯出要具備可恢復性：單檔失敗不應讓整批不可預期地半成功。

## Frontend / Build Artifacts

- 只允許 `vellichor/static/app/` 放可再生前端產物；其餘目錄不放 build output、匯出檔、下載檔。
- SPA 必須可由後端直接服務（`/app`），並在 refresh / deep link 時可正常回到 SPA router。

## Documentation Consistency

以下任一項變更，都必須同步更新對應文件，避免規格漂移：

- 加密/解密流程、KDF 參數、資料格式：`docs/architecture.md` + `AGENTS.md`
- 工作流（run/build/rekey/匯入匯出）：`docs/workflows.md` + `skills/`
- 不可退化約束新增/調整：`AGENTS.md` + `docs/guardrails.md` + `docs/checklist.md`
