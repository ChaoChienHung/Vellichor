# 前端架構與擬物化設計 (Frontend Architecture & Skeuomorphism)

本篇說明 Vellichor 前端的技術選型、擬物化（Skeuomorphic）視覺哲學、Motion 動效狀態機、元件樹階層與建置整合流程。

相關原始碼位於 [frontend/src/](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/frontend/src/)，建置產物輸出至 [vellichor/static/app/](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/static/app/)。

---

## 1. 前端技術棧選型

| 函式庫 / 工具 | 版本 | 核心用途 | 選型理由 |
|--------------|------|---------|---------|
| **React** | 19.0.1 | UI 視圖渲染 | 現代組件化開發標準，具備優異的生態系與 TypeScript 適配性。 |
| **TypeScript** | ~5.8 | 靜態型別系統 | 定義清晰的領域資料型別（如 `DiaryEntry`、`BookViewMode`），杜絕執行期屬性拼寫錯誤。 |
| **Vite** | 6.2.3 | 建置工具與本機伺服器 | 現代前端極速標準；基於原生 ESM 的熱模組替換（HMR），毫秒級反饋。 |
| **Tailwind CSS** | 4.1.14 | 樣式引擎 | 採用最新的 v4 架構，透過 `@tailwindcss/vite` 原生編譯，不再需要額外配置 `postcss.config.js`，建置速度倍增。 |
| **Motion** (`framer-motion`) | 12.23.24 | 物理與動效引擎 | 實現書本開闔、書籤抽屜滑動、頁面翻轉、擬物化陰影微動畫的核心骨幹。 |
| **Lucide React** | 0.546.0 | 圖標系統 | 向量圖標設計純粹、支援 Tree-shaking，風格與古典/現代融合介面高度協調。 |

---

## 2. 擬物化（Skeuomorphic）視覺與互動哲學

與多數採用扁平化（Flat Design）的現代筆記軟體不同，Vellichor 追求的是「**在數位世界重現深夜書桌前，手握鋼筆、翻開皮質日記本的儀式感**」：

1. **材質與觸感**：
   - 羊皮紙質感（Aged Parchment）的頁面底色與纖維紋理。
   - 深棕色與墨水黑（Deep Walnut & Calligraphy Ink）的文字色階，拒絕冷硬的純黑 `#000000`。
   - 裁紙刀（Paper Knife）、胡桃木筆架（Pen Tray）、墨水瓶（Ink Bottle）與火漆印章（Wax Seal）等周邊道具。
2. **物理反饋**：
   - 點擊「書本」時產生立體厚度的旋轉與展開效果。
   - 點擊「執筆完成」時觸發筆尖手寫簽署動畫（`PenScribbleAnimation`）。
   - 抽屜與書籤具有符合重力與阻尼（Spring Physics）的滑動反饋。

---

## 3. 元件階層與架構

```
frontend/src/
├── main.tsx                    # ReactDOM 掛載點
├── App.tsx                     # 根元件（狀態初始化、載入 SkeuomorphicDesk）
├── index.css                   # 全域樣式（字體引入、Tailwind、CSS 變數）
├── types.ts                    # 核心介面定義 (DiaryEntry, UserProfile, BookViewMode)
├── utils/
│   └── api.ts                  # Fetch API 封裝（處理 Cookie、錯誤彈窗等）
└── components/
    ├── SkeuomorphicDesk.tsx     # 書桌主場景（書桌材質、頂部 Navbar、文具擺設）
    ├── VellichorBook.tsx        # 日記本主體（封面閉合 / 內頁展開狀態機）
    ├── DiaryWriter.tsx          # 執筆介面：左頁元資料（日期/心緒）+ 右頁正文草稿
    ├── DiarySearch.tsx          # 歷史 Ledger：左頁目錄索引 + 右頁詳情閱覽
    ├── UserAccountModal.tsx     # 執筆人帳號設定、主密碼輪替（Re-key）、安全證章
    └── PenScribbleAnimation.tsx # 落款簽名時的手寫動效回饋
```

### 書本視圖模式 (BookViewMode)

在 [types.ts](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/frontend/src/types.ts) 中，核心狀態機透過 `BookViewMode` 控制書本展開形式：

```typescript
export type BookViewMode = 
  | 'closed'  // 書本闔上，展示皮革封面與燙金書名
  | 'write'   // 開啟至空白草稿頁，進入即時執筆模式
  | 'ledger'; // 開啟至編年史目錄，進入搜尋與翻閱模式
```

---

## 4. 建置管線與後端整合 (Build Pipeline)

前端專案經過建置後，直接成為 Python FastAPI 伺服器靜態目錄的一部分，實現自給自足的發布流程：

### 關鍵建置配置 (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/app/',                      // 靜態資源 URL 前綴對齊 FastAPI 路由
  build: {
    outDir: '../vellichor/static/app', // 直接產出至 Python 後端靜態目錄
    emptyOutDir: true,                 // 每次 build 自動清除舊產物
  }
})
```

### 後端靜態資源託管與 SPA Fallback

在 [vellichor/web.py](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/web.py) 中，FastAPI 配置了對應的靜態檔案服務：
- 當使用者訪問 `/app` 或 `/app/{path:path}` 時，若檔案存在則返回靜態檔案；若為路由路徑，則回傳 `index.html`（HTML5 Client-side Routing Fallback）。

---

## 5. 前端重構與優化藍圖 (Refactoring Roadmap)

1. **拆分 `SkeuomorphicDesk.tsx`（595 行）**：
   - 當前元件負擔過重，混合了文具配置、燈光濾鏡、快捷鍵監聽與視窗縮放邏輯。
   - 預計拆出 `<DeskStationeryTray />`、`<DeskLampControl />` 與 `<DeskTopBar />`。
2. **SVG 全域 ID 衝突消除**：
   - 桌面與書本使用之 SVG 漸層（Gradient）與濾鏡（Filter）目前有全域重複的 `id="wood-grain"` 等，易造成不同元件渲染互相覆蓋，需改為隨機 prefix 或模組化定義。
3. **頁面翻轉手勢與箭頭動畫**：
   - 書本展開後，左右頁需補齊翻頁微動畫與左右翻頁箭頭引導（見 TODO P0）。
