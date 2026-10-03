# Vellichor TODO（P0 / P1 / P2 / P3）

本清單只放「尚未完成」事項；完成後直接移除，避免 backlog 漂移。已完成紀錄請放在 `tech/changelog-archive.md`。

- P0：會影響使用 / 明顯跑版 / 資料正確性 / 安全問題
- P1：核心體驗（書本 / 寫作 / 搜索 / 帳號）
- P2：視覺精緻化、可選配偏好、次要體驗
- P3：研究與探索

---

## P0. 安全與資料正確性

- [ ] `/api/entries/full` 回傳 ciphertext + nonce 到前端：前端密文展示功能應改為只回傳一段不可逆的摘要（如 `AES-GCM::SHA256(ciphertext)[:16]`），而非將真實 ciphertext 與 nonce base64 明文傳回瀏覽器。這違反 AGENTS.md 的「Web session 不洩漏密鑰」精神，雖然沒有 key 無法解密，但不應將密文原文暴露於 HTTP response
- [ ] Session 儲存在 `app.state.sessions` 記憶體 dict：server 重啟即失效（可接受），但沒有 session 過期機制。長時間不操作的 session 應加上 TTL（建議 24h）自動清除，避免 key 長期留存記憶體
- [ ] `web.py` signup handler 用裸 `except Exception` 攔截所有錯誤一律顯示 "Username already exists"：應至少區分 `IntegrityError`（username 重複）與其他意外錯誤，否則 DB 問題或 schema 不一致會被靜默吞掉
- [ ] `delete_entry` repo 層沒有驗證 `user_id`：`SqliteEntryRepo.delete()` 只用 `entry_id` 作 WHERE 條件，理論上可以刪除其他使用者的 entry（若 entry_id 已知）。應加上 `WHERE id = ? AND user_id = ?`
- [ ] CLI `cmd_change_password` 直接 `raise SystemExit("not supported")`：應實作完成或至少移除此子指令避免使用者困惑。rekey 邏輯在 `core.py` 已完整實作，CLI 只需接上
- [ ] **Cookie 缺少 `secure` flag**：`set_cookie("sid", sid, httponly=True, samesite="lax")` 沒有設 `secure=True`。在任何非 localhost 的 HTTP 連線下，session cookie 會以明文傳輸，可被中間人竊取。部署時應加 `secure=True`（或偵測環境自動開啟）
- [ ] **無 CSRF 防護**：所有 POST 表單（`/login`、`/signup`、`/entry/new`、`/entry/{id}/edit`、`/entry/{id}/delete`、`/settings`）沒有 CSRF token。雖然 `samesite=lax` 可阻擋跨站 POST，但 `lax` 不防 top-level navigation POST（如 `<form>` 表單自動提交），應加上 CSRF token 或改用 `samesite=strict`
- [ ] **Login / Signup 無 rate-limiting**：`authenticate_user` 使用 PBKDF2 390k 迭代，本身有一定計算成本，但沒有任何 IP / 帳號層級的暴力破解防護。惡意攻擊者可持續猜測密碼。應在 `/login`、`/signup`、`/api/rekey` 加上速率限制（如 `slowapi` 或自行實作 token bucket）
- [ ] **Timing oracle：帳號存在性洩漏**：`authenticate_user` 在 `username` 不存在時立即回傳 `ValueError`，不走 PBKDF2；但 username 存在時會跑一次 390k 迭代的 KDF。攻擊者可透過回應時間差異判斷帳號是否存在。應在 username 不存在時也執行一次等長的 dummy KDF
- [ ] **無安全回應標頭**：所有 HTTP response 缺少 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy`、`Content-Security-Policy` 等基本安全標頭。應加 FastAPI middleware 統一注入
- [ ] **SPA path traversal 防護不完整**：`/app/{path:path}` 用 `spa_dir in p.parents` 檢查，但 `p` 可能 resolve 到 symlink 外的位置，且條件邏輯在 `p == spa_dir` 時（即 `spa_dir` 本身不在自己的 parents 裡）會 fall through。應改用 `p.is_relative_to(spa_dir)`（Python 3.9+）
- [ ] **Signup / Rekey 不檢查密碼強度**：允許空字串或單字元密碼。`create_user` 與 `rekey_user` 都不驗證 `len(password)`。應至少要求最低長度（如 8 字元），防止使用者設定極弱密碼

### 品質與跑版修正（原 P0 保留）

- [ ] 上方 navbar 視覺加大：logo / 字級 / 高度 / 間距與「執筆人證」按鈕尺寸（不同寬度下仍易讀、易點）

---

## P1. 核心體驗

### 書本與翻頁

- [ ] 書本點開時：左右兩頁都顯示頁碼 + 左右頁清單（依 recency 排序）
- [ ] 書本開啟後：左右頁顯示翻頁箭頭（左翻 / 右翻）並對應翻頁動畫
- [ ] Ledger（索引）整體再放大一些，提升可讀性
- [ ] 點擊書籤後：左頁上方出現 filtering top bar（小型半透明 navbar，含 date + 關鍵字輸入）；未點書籤時不顯示
- [ ] 執筆（Draft）時：書籤放左側；點開後提供 sidebar 顯示 metadata（日期、心緒、標籤、札記等）
- [ ] 寫入完成動畫：此頁簽署完成 → 翻回目錄（Ledger）展開檢視最新隨筆頁面
- [ ] 更新「執筆」進場 / 闔書動畫（更流暢、更像真實翻頁 / 落筆）

### 搜尋、檢索與篩選

- [ ] **心情標籤篩選（Mood Filter）**：在隨筆檢索/閱讀頁（`DiarySearch`）支援選定心情進行篩選。點選隨筆的心情徽章或從篩選器選取心緒，能精準過濾特定心情（如：寧靜、沉思、喜悅等）之隨筆，與日期、關鍵字及標籤協同運作

### 帳號與登入

### 後端架構改進

- [ ] `storage.py` 與 `infra/sqlite/repos.py` 功能高度重疊：`storage.py` 的 `create_entry`、`update_entry`、`delete_entry`、`list_entry_rows`、`get_entry_row` 等函式與 `SqliteEntryRepo` 做同樣的事但缺少 `user_id` 過濾。應移除 `storage.py` 中已被 repo 取代的重複函式，僅保留 `connect`、`init_db`、`utc_now_iso` 等基礎工具
- [ ] `utc_now_iso()` 重複定義在 `storage.py` 與 `repos.py`：統一放 `storage.py` 或獨立 `vellichor/utils.py`，repos 引用之
- [ ] `core.py` 中的 `LatestEntry` dataclass 與 `domain/models.py` 的 `EntryMetaRow` 幾乎相同：應統一領域模型，減少重複映射
- [ ] `web.py` 的 `/api/entries/full` handler 直接呼叫 `SqliteEntryRepo` 與 `crypto.decrypt`，繞過了 `EntriesService`：違反模組邊界契約（AGENTS.md 要求業務邏輯收斂在 core/service 層）。應在 service 層提供 full-detail list 方法
- [ ] `entries/full` API 的 `mood` 和 `tags` 是寫死的 hardcoded 值（`"reflective"`、`[]`）：前端寫入時把 mood/tags 合併進 content 字串，但讀取時無法還原。應在 DB schema 加上 mood/tags metadata 欄位（明文即可，非敏感資料），或將 content 改為 JSON envelope `{mood, tags, body}`
- [ ] SPA 的 fallback routing：`/app/{path:path}` 中 `spa_dir in p.parents` 的路徑遍歷防護應改用 `p.resolve().is_relative_to(spa_dir)` 以更明確地防止 path traversal

---

## P1. 前端品質與健壯性

- [ ] `package.json` 的 `name` 仍為 `"react-example"`：應改為 `"vellichor-frontend"` 或 `"vellichor"`
- [ ] `package.json` 包含不需要的 dependencies：`@google/genai`、`express`、`dotenv` 似乎是專案 scaffold 殘留，未被使用，應移除以減小 bundle
- [ ] 前端 `DiarySearch` 的搜尋是純前端 filter（在已載入的全量 entries 上做 `.includes`）：當 entry 數量增加後效能會成問題。短期可接受，中期應支援後端分頁 + 搜尋 API
- [ ] `DiaryWriter` 中 `highlightText` 使用 `new RegExp(highlight, 'gi')` 但未 escape 特殊字元：若搜尋詞含正則特殊字元（如 `(`, `[`, `*`）會拋錯。應加 `escapeRegex` 處理
- [ ] 前端 API error handling 只用 `catch(() => toast(...))`：401 返回後應自動導向 `/login`（目前只在初始載入時處理，操作中的 401 不會跳轉）
- [ ] `UserAccountModal` 的安全審計日誌池永遠為空（`securityLogs` 從未被寫入任何資料）：應移除此區塊或串接真實的審計事件（如 login、rekey、delete 紀錄）

---

## P2. 偏好設定與介面適配

- [ ] 左右撇子偏好：home 的鋼筆 / 墨水 / 印章區塊可切換置左 / 置右（並影響書本展開位移方向）
- [ ] **行動裝置（Mobile / 手機）專屬排版與字體規格訂定**：目前桌面版各螢幕尺寸之字級（書封、隨筆正文、歷史編目、工具標籤）與相對比例已固定且舒適；未來規劃支援手機端時，需針對小螢幕直式直覺特別定義字體大小（Title/Body/Labels）、書本單頁滑動/分頁模式，以及行動版工具列配置

## P2. 統計分析與數據可視化

- [ ] **心情與主題標籤時序統計（Mood & Tag Analytics）**：支援以週、月、年份為維度，統計心情與標籤的出現頻率與次數。包含各心緒比重、時間推移下的心境變化曲線，以及最常紀錄的熱門標籤分佈排行，以典雅的視覺化方式呈現執筆者心境軌跡

## P2. 測試覆蓋與開發體驗

- [ ] 補充 `rekey_user` 的整合測試：確認 re-key 後舊 key 無法解密、新 key 可以解密所有 entries
- [ ] 補充 `web.py` API handler 的基本測試（至少覆蓋 auth、CRUD、rekey 路徑），可用 FastAPI TestClient
- [ ] 補充 `search_entries` 的測試（尤其全量解密 + filter 的正確性）
- [ ] `frontend/` 沒有任何測試：至少為核心 API 呼叫層（`utils/api.ts`）加 mock test

## P2. 程式碼衛生

- [ ] 清理疑似死碼目錄：`vellichor/webapp/` 和 `vellichor/cliapp/` 只是 re-export，如果沒有外部使用者，應整合進主入口或移除
- [ ] 清理 `vellichor/templates/` 中的舊版 Jinja2 模板（`index.html`、`book.html`、`desk.html` 等）：SPA 已成為主要 `/app` 入口，SSR 模板若已不再使用應標記 deprecated 或移除以減少維護負擔
- [ ] `frontend/src/index.css` 極為精簡（僅 body 設定）：多數樣式都 inline 在 TSX 裡用 Tailwind。若有全域 design token（字體、色票）應收進 CSS 變數，避免散落在各 component
- [ ] `SkeuomorphicDesk.tsx`（595 行）太大：應抽出 `DeskHeader`、`PenTray`、`InkBottleAndSeal`、`ToastOverlay` 等子元件，提升可讀性與可測試性
- [ ] SVG `<defs>` 中的 `id`（如 `goldGrad`、`woodGrad`）是全域的：如果未來同頁面出現多個同元件實例會衝突。應改用 `useId()` 或加 prefix

---

## P3. Research

- [ ] 研究 vector database：用於語意搜尋 / 相似日記（本機可行性、加密 / 脫敏、索引更新策略）
- [ ] 研究 DB migration 機制：目前 schema 升級用 `init_db` 裡的 `PRAGMA table_info` + 手動 ALTER TABLE，隨欄位增加會越來越脆弱。評估引入輕量 migration tool（如 `alembic` 或自寫版本號機制）
- [ ] 研究 session 持久化方案：目前 in-memory dict 在多 worker / 重啟時丟失。考慮 signed cookie（JWT）或 Redis-backed session（但需平衡安全性——key 不能進 JWT payload）
