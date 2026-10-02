# API 規格與端點參考 (API Reference)

本篇列出 Vellichor 後端提供的所有 HTTP 路由、伺服端渲染頁面（SSR）、靜態資源掛載與 RESTful API 端點規範。

所有 API 實作位於 [vellichor/web.py](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/web.py)。

---

## 1. 頁面與靜態資源路由

| 方法 | 路徑 | 認證 | 格式 | 說明 |
|------|------|------|------|------|
| `GET` | `/` | 否 | Redirect | 依據是否有登入 Session，轉址至 `/app` 或 `/login` |
| `GET` | `/login` | 否 | HTML | 伺服端渲染之登入頁面（Jinja2） |
| `POST` | `/login` | 否 | Form | 接收 `username` 與 `password` 表單，建立 Session |
| `GET` | `/signup` | 否 | HTML | 伺服端渲染之註冊帳號頁面（Jinja2） |
| `POST` | `/signup` | 否 | Form | 接收 `username`, `pen_name`, `password` 建立使用者 |
| `GET` | `/logout` | Cookie | Redirect | 清除 Session 狀態並轉址至 `/login` |
| `GET` | `/app` | 否 | HTML/SPA | 載入前端 SPA 單頁應用程式 |
| `GET` | `/app/{path:path}` | 否 | Static / Fallback | 載入 SPA 靜態資產；非靜態檔案則回傳 `index.html` 達成客戶端路由 |

---

## 2. 前端 SPA 專用身分驗證 API (`/api/auth/*`)

提供 SPA 內嵌擬物解鎖彈窗使用，無須跳出至外部 SSR 頁面：

| 方法 | 路徑 | 認證 | 格式 | 說明 |
|------|------|------|------|------|
| `GET` | `/api/auth/suggested-user` | 否 | JSON | 獲取本機最新活躍帳號（用於快速預填帳號） |
| `POST` | `/api/auth/login` | 否 | JSON | 接收 `username`, `password`，驗證並寫入 30 天持久化 `sid` Cookie |
| `POST` | `/api/auth/signup` | 否 | JSON | 接收 `username`, `password`, `pen_name` 建立新使用者並自動登入；若帳號已存在則回傳 `409 Conflict` 以保護原帳號日記資料 |
| `POST` | `/api/auth/logout` | Cookie | JSON | 清除 Session 狀態與 Cookie |

---

## 3. 帳號與個人資料 API (`/api/me`)

### 2.1 取得當前使用者資訊
- **Method**: `GET`
- **Path**: `/api/me`
- **Auth**: 需要 Session Cookie (`sid`)
- **Response** (`200 OK`):
```json
{
  "id": "e9b20b22-86ee-4b77-a7eb-6d0c9f13e711",
  "username": "ludwigchao",
  "pen_name": "Ludwig"
}
```

### 2.2 更新筆名
- **Method**: `PATCH`
- **Path**: `/api/me`
- **Auth**: 需要 Session Cookie (`sid`)
- **Request Body**:
```json
{
  "pen_name": "New Ludwig"
}
```
- **Response** (`200 OK`):
```json
{
  "id": "e9b20b22-86ee-4b77-a7eb-6d0c9f13e711",
  "username": "ludwigchao",
  "pen_name": "New Ludwig"
}
```

---

## 3. 日記條目 API (`/api/entries`)

### 3.1 取得日記列表（Summary Only）
- **Method**: `GET`
- **Path**: `/api/entries`
- **Auth**: 需要 Session Cookie (`sid`)
- **說明**：僅回傳明文中繼資料與標題，不進行耗資源的內文解密，用於快速目錄展示與總覽。
- **Response** (`200 OK`):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "初春的夜雨",
    "entry_date": "2026-03-15",
    "created_at": "2026-03-15T22:30:00Z",
    "updated_at": "2026-03-15T22:30:00Z",
    "is_encrypted": true,
    "signed_by_pen_name": "Ludwig",
    "signed_at": "2026-03-15T22:30:00Z"
  }
]
```

### 3.2 取得全量日記列表（含解密內文）
- **Method**: `GET`
- **Path**: `/api/entries/full`
- **Auth**: 需要 Session Cookie (`sid`)
- **說明**：後端利用 Session 內的金鑰全量解密該使用者之日記內文，提供 SPA Ledger 翻閱與內文即時檢索。
- **Response** (`200 OK`):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "初春的夜雨",
    "content": "窗外的雨滴敲打著窗櫺，墨水在紙上緩緩渲染開來...",
    "entry_date": "2026-03-15",
    "created_at": "2026-03-15T22:30:00Z",
    "updated_at": "2026-03-15T22:30:00Z",
    "is_encrypted": true,
    "signed_by_pen_name": "Ludwig",
    "signed_at": "2026-03-15T22:30:00Z"
  }
]
```
> ⚠️ **安全性提醒**：目前此端點需修正避免將原始 `ciphertext` / `nonce` 同時回傳前端（見 [TODO.md](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/TODO.md) P0）。

### 3.3 新增日記條目
- **Method**: `POST`
- **Path**: `/api/entries`
- **Auth**: 需要 Session Cookie (`sid`)
- **Request Body**:
```json
{
  "title": "深夜手記",
  "content": "今夜讀完了《時間的皺摺》，心有所感...",
  "entry_date": "2026-03-16"
}
```
- **Response** (`200 OK`):
```json
{
  "id": "c1f72782-b7e6-4fa2-938d-8a58572bcf81",
  "title": "深夜手記",
  "entry_date": "2026-03-16",
  "created_at": "2026-03-16T01:15:00Z",
  "updated_at": "2026-03-16T01:15:00Z",
  "is_encrypted": true,
  "signed_by_pen_name": "Ludwig",
  "signed_at": "2026-03-16T01:15:00Z"
}
```

### 3.4 刪除日記條目
- **Method**: `DELETE`
- **Path**: `/api/entries/{entry_id}`
- **Auth**: 需要 Session Cookie (`sid`)
- **Response** (`200 OK`):
```json
{
  "ok": true
}
```

---

## 4. 主密碼輪替 API (`/api/rekey`)

### 4.1 執行主金鑰輪替 (Key Rotation)
- **Method**: `POST`
- **Path**: `/api/rekey`
- **Auth**: 需要 Session Cookie (`sid`)
- **Request Body**:
```json
{
  "old_password": "current_secret_password",
  "new_password": "super_secure_new_password"
}
```
- **Response** (`200 OK`):
```json
{
  "ok": true,
  "rekeyed_count": 42
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"detail": "invalid old password"}`
  - `401 Unauthorized`: 未登入

---

## 5. 匯出與匯入 API (`/api/entries/export`, `/api/entries/import`)

### 5.1 匯出隨筆 (Export)
- **Method**: `GET`
- **Path**: `/api/entries/export`
- **Auth**: 需要 Session Cookie (`sid`)
- **Query Parameters**:
  - `mode`: `encrypted` (預設，高安全 AES-GCM 獨立加密檔案) | `plaintext` (明文輸出)
  - `format`: `zip` (預設，ZIP 封裝包) | `json` | `markdown`
  - `entry_id`: (可選) 匯出單篇日記 ID；未提供時預設匯出該使用者之全部日記
  - `password`: (可選) 加密模式之專用保護密碼；若未指定則自動採用使用者派生金鑰
- **Response**:
  - `format=zip`: `application/zip` 二進位下載串流（若為 `encrypted` 模式，內含 `entries/*.vellichor` 獨立加密檔；若為 `plaintext` 模式，內含 `entries/*.md` 獨立檔案）
  - `format=json`: `application/json` 結構化資料或單篇 `.vellichor` 封包
  - `format=markdown`: `text/markdown; charset=utf-8` 檔案

### 5.2 匯入隨筆 (Import)
- **Method**: `POST`
- **Path**: `/api/entries/import`
- **Auth**: 需要 Session Cookie (`sid`)
- **Request**:
  - 支援 Multipart 檔案上傳 (`file`: `.zip`, `.vellichor`, `.json`, 或 `.md`)
  - 可附帶 `password` 表單欄位用於解密 `.vellichor` 或加密 ZIP 包
  - 或傳送 JSON 結構酬載 (`{"entries": [...]}`)
- **Response** (`200 OK`):
```json
{
  "imported": 5,
  "errors": []
}
```
所有匯入之隨筆在落盤 SQLite 前均自動由後端以當前使用者主金鑰完成 AES-GCM-256 加密。

