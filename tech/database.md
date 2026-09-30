# 資料庫架構與選型 (Database Architecture)

本篇深入探討 Vellichor 的資料持久化層設計、SQLite 選型考量、完整 Schema 定義、欄位加密取捨與未來遷移規劃。

---

## 1. 為什麼選擇 SQLite？

在專案早期評估中，我們比對了多種資料儲存方案，最終選定 **SQLite** 作為單一真相來源（SSOT，Single Source of Truth）。

### 方案對比矩陣

| 方案 | 優點 | 缺點 / 不符原因 | 結論 |
|------|------|----------------|------|
| **SQLite（採用）** | 1. 零配置、零維運：單一 `.db` 檔案即全站資料庫。<br>2. 跨平台嵌入式：macOS / Linux / Windows / Docker 皆原生支援。<br>3. 支援 ACID 交易與結構化 SQL 查詢（WHERE, ORDER BY, INDEX）。<br>4. 完美契合 Offline-First 與本機隱私保護理念。 | 單檔寫入鎖（Single-writer），不適合數萬同時寫入的高併發分散式叢集。 | **最佳契合**：私密日記本以個人或小型協同為核心，讀多寫少，極度重視備份與隱私。 |
| **PostgreSQL / MySQL** | 1. 強大的高併發與分散式支援。<br>2. 豐富的外掛與進階資料型別。 | 1. 違反「單一執行檔 / 最小相依性」部署原則，使用者必須安裝並管理獨立資料庫服務。<br>2. 備份與遷移困難（需 dump/restore）。 | **過度設計**：增加日常維運負擔，失去個人私密工具的輕巧性。 |
| **Flat JSON / Markdown 檔案** | 1. 人類可讀性高。<br>2. 易於透過 Git 進行版本追蹤。 | 1. 缺乏 ACID 交易保證，當伺服器異常中斷時易發生資料損毀。<br>2. 當日記篇數達到數千篇時，全量讀寫效能低落。<br>3. 難以建立多維度索引（如依使用者、日期、建立時間排序）。 | **不符需求**：資料一致性脆弱，檢索效能不足。 |
| **DuckDB / RocksDB** | 1. 針對分析（OLAP）或 Key-Value 極度最佳化。 | 1. 對於行式交易（OLTP）與簡單 CRUD 並無明顯優勢。<br>2. Python 標準庫未內建（RocksDB 還需額外 C 依賴編譯）。 | **不符需求**：增加不必要的相依性。 |

---

## 2. SQLite 引擎配置與並行機制

SQLite 在預設模式下採用 Rollback Journal，讀寫會互相鎖定。為了在 FastAPI 非同步並行環境中發揮最大效能，我們在連線初始化時啟用了以下 PRAGMA 配置（詳見 [conn.py](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/infra/sqlite/conn.py)）：

```python
conn.execute("PRAGMA journal_mode=WAL;")
conn.execute("PRAGMA foreign_keys=ON;")
conn.row_factory = sqlite3.Row
```

### 2.1 WAL 模式（Write-Ahead Logging）
- **讀寫並行不阻塞**：讀取作業（Readers）不會阻塞寫入作業（Writer），寫入作業也不會阻塞讀取作業。
- **快取一致性**：寫入先落盤到 `.db-wal` 記錄檔，定期透過 checkpoint 機制同步回 `.db` 主檔案。
- **IO 效能提升**：多數交易只需連續寫入 WAL 檔，大幅減少隨機磁碟磁頭尋道（Seek）。

### 2.2 Foreign Key 開啟
- SQLite 歷史預設不開啟外鍵約束。透過顯式執行 `PRAGMA foreign_keys=ON`，確保資料關聯性完整。

### 2.3 連線生命週期
- 目前採用 **Per-request connection**（由 FastAPI Dependency 提供獨立 connection），並在請求結束後確保 `close()` 或透過交易 Commit / Rollback，避免連線外洩或 Transaction 懸掛。

---

## 3. Schema 設計詳解

目前 Vellichor 核心包含三張資料表：`meta`、`users` 與 `entries`。

```sql
-- 1. 系統 Metadata（Key-Value Store）
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value BLOB NOT NULL
);

-- 2. 使用者帳號表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                -- UUID (v4)
    username TEXT NOT NULL UNIQUE,       -- 登入帳號（唯一）
    pen_name TEXT NOT NULL,             -- 執筆人顯示名稱（如 "Ludwig"）
    kdf_salt BLOB NOT NULL,            -- 專屬 PBKDF2 鹽值（16 bytes）
    pw_check_nonce BLOB NOT NULL,      -- 密碼驗證 AES-GCM Nonce（12 bytes）
    pw_check_ciphertext BLOB NOT NULL, -- 密碼驗證用密文 Blob
    created_at TEXT NOT NULL,           -- ISO 8601 UTC 字串
    updated_at TEXT NOT NULL            -- ISO 8601 UTC 字串
);

-- 3. 日記條目表（內容強制加密）
CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,                -- UUID (v4)
    created_at TEXT NOT NULL,           -- 建立時間戳記 (ISO 8601 UTC)
    updated_at TEXT NOT NULL,           -- 更新時間戳記 (ISO 8601 UTC)
    entry_date TEXT,                    -- 使用者指定的日記日期 (YYYY-MM-DD)
    title TEXT NOT NULL,                -- 日記標題（明文儲存，用於目錄索引）
    content_nonce BLOB NOT NULL,        -- AES-256-GCM Nonce（12 bytes）
    content_ciphertext BLOB NOT NULL,   -- AES-256-GCM 密文 + Tag（二進位）
    is_encrypted INTEGER NOT NULL,      -- 是否加密旗標（固定為 1）
    user_id TEXT,                       -- 所屬使用者 UUID
    signed_by_pen_name TEXT,           -- 落款執筆人姓名
    signed_at TEXT                      -- 落款時間戳記 (ISO 8601 UTC)
);
```

### 3.1 索引配置 (Indexes)

為了支援 SPA 與 CLI 高頻的目錄查詢、分頁與排序，建立了以下索引：

```sql
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
CREATE INDEX IF NOT EXISTS idx_entries_entry_date ON entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_entries_user_id_created_at ON entries(user_id, created_at);
```

- `idx_entries_user_id_created_at`：複合索引，讓特定使用者的日記列表依照時間降序查詢能走高效 Index Scan，避免全表掃描。
- `idx_entries_entry_date`：支援依使用者指定日期（而非建立系統時間）進行 Ledger 索引過濾。

---

## 4. 欄位明文 vs 密文的設計抉擇 (Trade-offs)

Vellichor 在設計資料表時，明確劃分了**敏感資料**與**檢索中繼資料（Metadata）**：

| 欄位 | 儲存型態 | 理由與安全性權衡 |
|------|---------|-----------------|
| `content_ciphertext` | 密文（AES-256-GCM） | **最核心機密**。日記內文承載最私密的思想與文字，必須 encrypt-before-write，沒有金鑰即使拿到 DB 也絕對無法還原。 |
| `title` | 明文 (TEXT) | **效能與體驗權衡**。讓書本打開目錄、Ledger 搜尋清單能即時以 SQL 快速分頁載入，不需將數百篇日記全部解密至記憶體才能排版。未來若需更高安全性，可評估提供「全表加密模式」。 |
| `entry_date` | 明文 (TEXT) | **索引與排序支援**。讓使用者能依據歷史年份、月份進行快速分頁過濾與跳頁。 |
| `signed_by_pen_name` | 明文 (TEXT) | **擬物化介面展示**。在翻閱封底或目錄時顯示落款筆名。 |

---

## 5. 資料庫遷移策略 (Migration Strategy)

### 當前現狀
目前採用輕量級的啟動期 Schema 檢查（見 [conn.py](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/infra/sqlite/conn.py)）：
1. 透過 `PRAGMA table_info(entries)` 檢查各欄位是否存在。
2. 若缺少 `user_id`、`signed_by_pen_name`、`signed_at` 等後續新增欄位，透過動態 `ALTER TABLE entries ADD COLUMN ...` 進行就地補齊。

### 待改進方向（見 TODO P3）
- 引入版本化 Migration 腳本（例如 Alembic 或輕量 SQL Migration Runner），維護 `schema_version` 表。
- 補齊 `entries.user_id` 指向 `users.id` 的正規 `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` 約束。
