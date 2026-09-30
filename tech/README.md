# Vellichor — 技術文件庫 (Tech Docs)

本目錄是 Vellichor 的技術全景參考，將系統架構、底層原理、框架套件與選型決策拆解為各獨立專題，讓協作者能快速深入特定技術領域。

> 📖 **相關契約與守則**：
> - 核心契約與不可退化約束：請見 [AGENTS.md](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/AGENTS.md)
> - 守則與邊界防護：請見 [docs/guardrails.md](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/docs/guardrails.md)
> - 日常操作步驟：請見 `skills/` 與 [docs/workflows.md](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/docs/workflows.md)

---

## 📚 技術專題索引

| 專題文檔 | 內容重點 | 關鍵技術 |
|---------|---------|---------|
| [1. 資料庫 (database.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/database.md) | SQLite 選型理由、Schema 設計、WAL 模式、索引策略與遷移考量 | SQLite, WAL, PRAGMA, SQL Schema |
| [2. 加密機制 (cryptography.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/cryptography.md) | 威脅模型、PBKDF2-HMAC-SHA256、AES-256-GCM、密碼驗證 Blob、主密碼輪替（Re-key） | AES-GCM, PBKDF2, KDF, Key Rotation |
| [3. 後端架構 (backend.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/backend.md) | FastAPI 整合、依賴反轉/分層架構（Domain/App/Infra/Web/CLI）、套件選型理由 | FastAPI, Uvicorn, Python 3.12, Ports & Adapters |
| [4. 前端架構 (frontend.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/frontend.md) | React 19、擬物化（Skeuomorphism）設計、Motion 動畫狀態機、Tailwind v4、Build 管線 | React 19, Vite, Tailwind CSS v4, Motion, Lucide |
| [5. 認證與 Session (auth-session.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/auth-session.md) | In-Memory Session 機制、金鑰記憶體持有生命週期、安全邊界與防禦規劃 | Session Auth, Cookie, Security Boundaries |
| [6. API 規格 (api.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/api.md) | 完整 HTTP/REST API 端點規格、Request/Response 格式、認證要求 | REST API, OpenAPI, SSR Endpoints |
| [7. 開發與測試 (development.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/development.md) | 本機開發環境設定、CLI 操作、pytest 測試策略與覆蓋範圍 | DX, pytest, CLI, Local Dev |
| [8. 變更紀錄封存 (changelog-archive.md)](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/tech/changelog-archive.md) | 歷史已完成之 UI/UX 與表單微調細節歸檔 | Changelog Archive |

---

## 🏛️ 系統架構簡覽

```
┌────────────────────────────────────────────────────────┐
│  Browser Client（SPA @ /app）                           │
│  Vite + React 19 + TypeScript + Tailwind CSS 4 + Motion│
│  ↕ JSON API (Same-origin Cookie with Session ID)       │
├────────────────────────────────────────────────────────┤
│  FastAPI Application Server                            │
│  ├── In-Memory Sessions (持有 Derived Key)             │
│  ├── Routing: /api/* (JSON), /app (SPA), /login (SSR)  │
│  └── Architecture: Interface → App Service → Infra     │
│  ↕ sqlite3 (Python standard library)                   │
├────────────────────────────────────────────────────────┤
│  SQLite Database (WAL Mode)                            │
│  ├── users: kdf_salt, pw_check blob                    │
│  └── entries: content_nonce, content_ciphertext        │
└────────────────────────────────────────────────────────┘
```

### 設計核心原則

1. **Offline-First / Zero-Cloud-Dependency**：單一 SQLite 資料庫為唯一真相來源（SSOT），不需要安裝外部資料庫伺服器或依賴雲端帳號。
2. **Encrypt-at-Rest**：所有日記內文落盤時必定經過 AES-256-GCM 加密，資料庫檔案外洩時無法還原真實內容。
3. **Single-Binary Deployable（自給自足服務）**：前端 SPA 建構產物直接輸出至後端 static 目錄，由 FastAPI 統一部署託管。
