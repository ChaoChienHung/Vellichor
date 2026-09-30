# 後端架構與分層設計 (Backend Architecture)

本篇說明 Vellichor 後端的技術棧選型、依賴反轉（Inversion of Control）架構分層、模組職責邊界與現存待重構技術債。

---

## 1. 執行環境與核心依賴套件

### 語言與版本規範
- **Python 3.12+**：全面啟用 `from __future__ import annotations`，支援現代型別提示（Type Hinting）與更快的直譯器效能。

### 套件選型與依據

| 套件名稱 | 版本 | 核心用途 | 選型理由 |
|---------|------|---------|---------|
| **FastAPI** | 0.115.0 | Web 框架與 API Routing | 具備原生 ASGI 非同步支援、Pydantic 自動資料驗證、OpenAPI (Swagger) 規範自動生成。相較 Flask 更具現代型別安全，相較 Django 更輕量無贅。 |
| **Uvicorn** | 0.30.6 | ASGI HTTP 伺服器 | 輕量高吞吐量，支援本機 `--reload` 自動重載，與 FastAPI 深度最佳化適配。 |
| **cryptography** | 43.0.1 | 密碼學基礎原語 | Python 官方與社群公認最成熟的安全密碼學函式庫，提供 PBKDF2 與 AES-GCM 的硬體加速與嚴謹安全邊界。 |
| **Jinja2** | 3.1.4 | 伺服端模板引擎 | 專門負責伺服端渲染（SSR）之 `/login`、`/signup` 與基礎錯誤頁面，降低前端 SPA 載入前的首屏進入門檻。 |
| **python-multipart** | 0.0.9 | Form Data 串流解析 | FastAPI 處理標準 HTML 表單 POST（如登入註冊表單）之必須依賴。 |
| **pytest** | 8.4.1 | 單元與整合測試 | 易於編寫 fixture、支援參數化測試與即時例外回溯。 |

---

## 2. 分層架構與依賴反轉 (Clean Architecture / Hexagonal)

Vellichor 後端遵循依賴反轉原則（Ports and Adapters），將業務核心、領域模型與外部基礎設施完全解耦：

```
                      [Web (web.py) / CLI (cli.py)]  <-- 介面入口層 (Interfaces)
                                    │
                                    ▼
                          [Core Facade (core.py)]     <-- 業務組裝層 (Assembly)
                                    │
                                    ▼
                      [App Services (app/services/)]  <-- 應用服務層 (Application)
                        │                       │
                        │                       ▼
                        │             [App Ports (app/ports.py)]  <-- 介面抽象 (Protocols)
                        ▼                               ▲
             [Domain (domain/models.py)]                │ (implements)
                        ▲                               │
                        │                 [Infra SQLite (infra/sqlite/)] <-- 基礎設施層 (Infra)
                        │
             [Crypto Primitives (crypto.py)]          <-- 密碼學底座 (Zero-dependency)
```

### 各目錄與模組職責詳解

#### 1. `crypto.py`（密碼學底座）
- 位於最底層，**零業務相依**。
- 專職提供 `derive_key()`、`encrypt()`、`decrypt()` 等純粹的密碼學輸入輸出。

#### 2. `domain/`（領域層）
- `domain/models.py`：純 Python dataclass，定義 `EntrySummary`、`EntryDetail`、`EncryptedBlob`。
- `domain/errors.py`：純領域例外，例如 `EntryNotFound`、`UserNotFound`。
- **規則**：絕對不引用任何 SQLite、HTTP 或框架相關邏輯。

#### 3. `app/`（應用層）
- `app/ports.py`：透過 `typing.Protocol` 定義 Repository 介面契約（如 `EntryRepoProtocol`、`MetaRepoProtocol`）。
- `app/services/entries.py`：`EntriesService` 實作業務核心流程——在存入 repo 前使用 key 加密，自 repo 取出後解密。

#### 4. `infra/sqlite/`（基礎設施層）
- `infra/sqlite/conn.py`：負責資料庫連線開啟、PRAGMA 配置（WAL, FK）與資料表建立。
- `infra/sqlite/repos.py`：具體實作 `app/ports.py` 的協議（`SqliteEntryRepo`、`SqliteMetaRepo`），將 SQL 操作完全隔離於此。

#### 5. `core.py`（業務門面 Facade）
- 提供高階聚合 API：`create_user()`、`authenticate_user()`、`rekey_user_entries()`、`add_entry()`。
- 為 CLI 與 Web 共同依賴的統一業務入口，避免重複撰寫事務邏輯。

#### 6. `web.py` 與 `cli.py`（介面入口層）
- `web.py`：FastAPI 實例、依賴注入（`Depends(get_db)`）、Session Cookie 讀取、路由派送。
- `cli.py`：命令列介面，以本機第一公民身分提供 `init`、`entry add`、`entry list`、`rekey` 等批次與離線操作。

---

## 3. 現存技術債與待重構清單 (Technical Debt)

在近期的架構審視中，標註了以下歷史包袱，後續將陸續清理以符合標準分層：

1. **死碼目錄**：
   - `vellichor/webapp/` 與 `vellichor/cliapp/`：早期原型殘留程式碼，已被根層級的 `web.py` 與 `cli.py` 取代，應予刪除（見 TODO P2）。
2. **`vellichor/storage.py`**：
   - 包含舊版直接執行的 SQL CRUD 函式，多數已被 `infra/sqlite/repos.py` 取代，但部分 CLI 指令仍有引用，需完成遷移後下線。
3. **業務邏輯散落於 Handler**：
   - `web.py` 中的表單 POST handler（如 `/entries` 表單提交）存在部分未完全透過 `EntriesService` 包裝的直接操作，需統一口徑。
