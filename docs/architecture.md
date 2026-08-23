# Architecture

Vellichor 是 offline-first 的加密日記本：SQLite 是唯一真相來源（SSOT），所有 entry 內容在落盤前以 AES‑GCM 加密。

## Components

- **Frontend（SPA / `/app`）**
  - Source：`frontend/`
  - Build output：`vellichor/static/app/`
  - 職責：呈現、互動動畫、呼叫後端 API；不負責資料持久化與安全存放

- **Backend（FastAPI）**
  - 入口：`vellichor/web.py`
  - 職責：session、API、模板頁（`/desk`）、提供 `/app` 靜態檔與 fallback routing

- **Domain（核心邏輯）**
  - `vellichor/crypto.py`：KDF + AES‑GCM encrypt/decrypt
  - `vellichor/core.py`：entry 讀寫、re-key（主密碼輪替）、與跨層協調邏輯

- **Infra（SQLite repos）**
  - `vellichor/infra/sqlite/`：表存取與 repo

## Data Flow（寫入一篇 Diary）

1. SPA 呼叫後端 API（攜帶 session cookie）
2. Backend 在 handler 內取得 user 與 session key
3. Domain 將 plaintext 以 AES‑GCM 加密後寫入 SQLite
4. SQLite 只保存 nonce + ciphertext；明文只存在於記憶體

## Key Rotation（主密碼輪替 / Re-key）

1. 使用者提供 old_password + new_password
2. 後端以 old_password 派生 old_key，驗證 pw_check
3. 產生新 salt，派生 new_key，更新 pw_check
4. 逐筆解密舊 entries → 用 new_key 重加密 → 交易提交
5. 更新 session 內使用的 key（避免 re-login 才生效）

## Build / Release Contract

- `frontend` build 後產物必須能在後端直接服務（不依賴前端 dev server）
- `vellichor/static/app/` 是可再生生成物，但允許入版控以支援簡化部署
