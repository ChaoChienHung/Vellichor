# 開發環境與測試指南 (Development & Testing)

本篇提供 Vellichor 本機開發環境搭建、CLI 初始化帳號、前端 Build 整合與 pytest 測試執行指南。

---

## 1. 系統環境需求

- **Python**：3.12 或更高版本
- **Node.js**：20.x 或 22.x LTS
- **npm**：10.x 或更高版本
- **OS**：macOS, Linux, 或 WSL2 on Windows

---

## 2. 快速啟動指南

### 2.1 後端環境建置

```bash
# 1. 建立並啟用 Python 虛擬環境
python3 -m venv .venv
source .venv/bin/activate

# 2. 安裝後端相依套件
pip install -r requirements.txt

# 3. 啟動 FastAPI 服務（預設監聽 127.0.0.1:8000）
python -m vellichor web --db vellichor.db --port 8000
```

### 2.2 前端開發與建置

```bash
cd frontend

# 1. 安裝相依套件
npm install

# 2. 開發模式（啟動 Vite HMR 開發伺服器，通常於 localhost:5173）
npm run dev

# 3. 生產打包（自動將產物寫入 ../vellichor/static/app/）
npm run build
```

> 💡 **提醒**：在生產環境或驗收模式下，直接運行 `npm run build` 後啟動後端，瀏覽器即可直接訪問 `http://127.0.0.1:8000/app`，不需要常駐前端 Vite dev server。

---

## 3. 本機測試帳號與 CLI 操作

本機開發或初次部署時，可透過 CLI 指令快速建立初始管理員/執筆人帳號：

```bash
# 預先設定環境變數密碼（或由終端機互動輸入）
export VELLICHOR_PASSWORD="YourSecurePasswordHere"

# 初始化資料庫與使用者
python -m vellichor cli init \
  --db vellichor.db \
  --username ludwigchao \
  --pen-name Ludwig
```

### 常用 CLI 子指令

```bash
# 列出指定使用者的所有日記標題與 ID
python -m vellichor cli entry list --db vellichor.db --username ludwigchao

# 新增一篇日記
python -m vellichor cli entry add \
  --db vellichor.db \
  --username ludwigchao \
  --title "本機測試篇章" \
  --content "這是一篇透過命令列寫入的加密日記。"

# 查看特定日記內文（即時解密）
python -m vellichor cli entry view \
  --db vellichor.db \
  --username ludwigchao \
  --id <ENTRY_UUID>
```

---

## 4. 自動化測試體系 (Testing)

所有自動化測試置於 `tests/` 目錄，採用 `pytest` 驅動：

```bash
pytest tests/ -v
```

### 目前測試套件覆蓋範疇

| 測試檔案 | 測試目標 | 驗證重點 |
|---------|---------|---------|
| `test_crypto.py` | 密碼學核心原語 | 1. `derive_key` 確定性（相同密碼+salt產出相同金鑰）與隨機性。<br>2. AES-256-GCM 加密與解密往返正確性。<br>3. 密文或驗證 Tag 被竄改時必定拋出 `InvalidTag`。 |
| `test_entries_service.py` | 應用服務層業務流程 | 1. 透過 `EntriesService` 寫入日記條目（含 `entry_date`）的加密完整性。<br>2. 取得單篇日記與日記清單時的解密正確性。 |
| `test_sqlite_repo.py` | SQLite 資料庫 Repository | 1. 驗證 `SqliteEntryRepo` 的 CRUD 運作。<br>2. 驗證資料表自動建表與刪除行為。 |

### 待補齊之測試規劃（見 TODO P2）
- `test_web_api.py`：測試 FastAPI 各路由（`/api/me`, `/api/entries`, `/api/rekey`）的狀態碼、Session Cookie 驗證與未登入拒絕。
- `test_rekey_integration.py`：端對端驗證 Key Rotation 交易成功後，舊密碼失效且新密碼可成功解密既有 entries。
