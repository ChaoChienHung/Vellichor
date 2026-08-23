# AGENTS（Vellichor 協作契約）

本文件是 Vellichor 的「硬契約」（non‑negotiables）。任何功能新增、重構、UI/UX 調整，都必須以「不讓這些約束退化」為第一優先。

本文件只放「必須永遠成立」的規則；具體操作教學與日常工作流請看 `skills/`；更完整的專案說明請看 `docs/`。

## Key Paths

- `vellichor/`: Python backend（FastAPI + SQLite + AES‑GCM）
- `frontend/`: Vite + React frontend source
- `vellichor/static/app/`: Build 後 SPA 靜態產物（服務在 `/app`）
- `skills/`: 可操作工作流（run-local / frontend-build / rekey）
- `docs/`: 專案文件（架構/守則/清單）

## Roles & Ownership

Vellichor 預設是小團隊/個人也能維運的結構，但仍需要清楚的「誰負責什麼」來避免規格漂移：

- **Core Contract Owner**：維護本文件（AGENTS）與 `docs/guardrails.md`，對不可退化約束負責。
- **Backend Owner**：負責 DB schema、加密/解密契約、登入/session、key rotation、import/export、CLI 相容性。
- **Frontend Owner**：負責 `/app` 體驗、交互動畫、可用性與跑版修正；不得引入與安全契約衝突的本地儲存策略。
- **Release/Build Owner**：負責 frontend build → `vellichor/static/app/` 的產物一致性，避免「本機可跑、部署不可跑」。
- **Security Reviewer（可兼任）**：新增任何與密碼、金鑰、匯出/匯入、檔案 IO 相關能力時，做一次「最小安全審視」。

## Module Boundaries（模組邊界）

- **Domain（核心規格）**
  - `vellichor/crypto.py`：加密原語（derive/encrypt/decrypt）是所有資料安全的底座。
  - `vellichor/core.py`：業務層（entries、re-key、讀寫策略）應在此收斂，而非散在 web handler。
- **Infra（落地實作）**
  - `vellichor/infra/sqlite/`：SQLite 連線、repo、資料存取細節。
- **Interface（入口）**
  - `vellichor/web.py`：HTTP/Session/SPA routing；不在此放業務核心邏輯。
  - `vellichor/cli.py`：CLI 入口；作為本機自動化/批次操作第一公民（匯出/匯入也應納入）。
- **Frontend（呈現層）**
  - `frontend/src/`：UI、動畫與 API client；不得把資料安全責任搬到瀏覽器儲存（例如 localStorage 存密文/金鑰）。
- **Build Artifacts（生成物）**
  - 只允許在 `vellichor/static/app/`（SPA build）出現可再生的前端產物。
  - 其他核心目錄不應混入生成物、下載檔、或手動導出的資料。

## Non‑Negotiables（不可退化）

- **SQLite 是唯一真相來源（SSOT）**：所有 entries 與帳號資訊以 SQLite 為準。
- **At‑rest 必須加密**：entries 永遠 encrypt‑before‑save（AES‑GCM）後才落盤。
- **Key Rotation 必須全量重加密**：換主密碼必須重加密該 user 的所有 entries，且重啟/重新登入後仍可讀。
- **Web session 不洩漏密鑰**：任何 logs/exception/response 不得輸出密碼、衍生 key、nonce、ciphertext。
- **`/app` 必須獨立可服務**：SPA build 產物放在 `vellichor/static/app/`，後端可直接服務，不依賴額外前端 server。

## Collaboration（協同機制）

- **小步提交**：每次改動能被 lint/build/test 驗證，並保持回滾容易。
- **規格不漂移**：若改動會影響不可退化約束或日常工作流，必須同步更新：
  - `AGENTS.md`
  - `docs/`（至少 architecture/guardrails/checklist 中相對應的一份）
  - `skills/`（若牽涉操作步驟）
- **TODO 的噪音控制**：討論確認的新任務記到 `TODO.md`，採用 P0/P1/P2/P3；完成後直接移除，不保留已完成勾勾清單。

## Doc Map（文件更新流程）

本模塊的目標是降低協作成本：在完成 feature/refactor/任何 repo 變更之後，不必每次把所有文檔全量重讀，而是以 `docs/doc-map.md` 作為索引，僅更新「受影響」的文檔並保持一致性。

### 觸發時機

- 當完成任何 repo 變更（feature/refactor/bugfix/文檔調整）後，需主動評估是否要同步更新文檔
- 當使用者提出「請協助更新項目的相關文檔」類需求時，需按下列流程處理

### 流程

- 變更盤點：先看此次變更影響到哪些面向（CLI/訓練輸出/評估輸出/dataset pipeline/benchmark recipe/目錄結構/檔名）
- 以 `docs/doc-map.md` 作為入口：根據 doc-map 的職責邊界，定位需要更新的最小文件集合
- 分段交付：允許分多輪完成，不要求一次性調整完所有文檔
- 索引同步：每次有文檔新增/遷移/更名/職責變更，必須同步更新 `docs/doc-map.md` 與本文件的 `Doc Map` 模塊

## Security（安全基線）

- 不在 repo 提交任何 token、API key、憑證、或包含敏感參數的連結
- 不在 logs / console / response 中輸出密碼、衍生 key、nonce、ciphertext（除非明確 debug 且不會進版本控制）
- 新增匯出/匯入時，必須明確區分「明文」與「加密」兩種格式，並預設選擇更安全的路徑（例如加密導出）
