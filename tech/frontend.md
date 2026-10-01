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

---

## 5. 3D 空間動效與物理微互動工程 (3D Motion & Physics Engineering)

在 Vellichor 的擬物書桌介面中，3D 動畫與物理反饋是打造沉浸式儀式感的靈魂。以下記錄在開發過程中所歸納的核心工程模式與避坑守則：

### 5.1 書本開闔的同軸空間堆疊（CSS Grid Stack Architecture）

- **痛點（Anti-Pattern）**：
  若在書本開闔使用常見的 `<AnimatePresence mode="wait">`，會導致嚴重的視覺瑕疵：
  1. **空白幀閃爍**：闔書封面退出完成後，展開頁面才開始掛載，中間產生 200~400ms 的空白瞬斷。
  2. **主線程卡頓跳幀**：掛載 `DiarySearch`/`DiaryWriter` 等大型組件時，瀏覽器同步進行 DOM 重排（Reflow）與字型渲染，導致剛進場的動畫直接跳幀（「看到時就已經打開了」）。
  3. **闔書無動效**：關閉時只有展開頁淡出，封面突兀閃現，失去闔書觸感。
- **解決方案（CSS Grid Stack 同槽疊加）**：
  ```tsx
  <div 
    className="relative w-full max-w-6xl mx-auto grid grid-cols-1 grid-rows-1 place-items-center min-h-[640px]"
    style={{ perspective: 2400 }}
  >
    <AnimatePresence initial={false}>
      {isClosed ? (
        <motion.div
          key="closed-book"
          initial={{ rotateY: -115, x: -30, opacity: 0 }}
          animate={{ rotateY: 0, x: 0, opacity: 1 }}
          exit={{ rotateY: -115, x: -30, opacity: 0 }}
          style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
          className="col-start-1 row-start-1 select-none z-20"
        />
      ) : (
        <motion.div
          key="opened-book"
          initial={{ scale: 0.96, rotateY: 12, opacity: 0 }}
          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
          exit={{ scale: 0.96, rotateY: 12, opacity: 0 }}
          style={{ transformOrigin: 'center center', transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
          className="col-start-1 row-start-1 z-10"
        />
      )}
    </AnimatePresence>
  </div>
  ```
  1. **零高度位移**：透過 `grid-cols-1 grid-rows-1` 搭配 `col-start-1 row-start-1`，讓封面與內頁共享完全相同的物理空間中心點，開闔過程中舞台高度完全穩定。
  2. **真實書脊鉸鏈（Hinged Spine）**：封面設為 `transformOrigin: 'left center'`，以左側皮革書脊為軸心旋轉（`0deg ↔ -115deg`）。
  3. **雙向協同動畫（Simultaneous Transition）**：移除 `mode="wait"`，開書時封面掀開的同時內頁向外展開；闔書時內頁向內收合的同時封面自左側翻回蓋下，並帶有真實皮革彈簧回彈（`stiffness: 110, damping: 16`），達成 60fps 流暢翻書。

### 5.2 靜態錨定 Hitbox 防護（消滅 Hover 震盪死循環 Flicker Loop）

- **痛點（Anti-Pattern）**：
  在擬物化桌面文具（例如胡桃木筆架上的自來水鋼筆 `PenTray3D`、切面水晶墨水瓶 `CrystalInkwell3D`）中，Hover 互動通常伴隨「物體自桌面懸浮升起（Lift）」的動態物理效果：
  ```tsx
  // 錯誤寫法：事件綁在位移本體上
  <motion.button
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    animate={isHovered ? { y: -18 } : { y: 0 }}
  />
  ```
  當游標靜止在鋼筆上時，鋼筆觸發 `y: -18px` 上移，其邊界立刻脫離滑鼠游標下方，觸發 `onMouseLeave` 導致鋼筆落下；落下後鋼筆再度接觸游標，又觸發 `onMouseEnter` 上移。如此一來便引發 **60 FPS 無限高頻震盪抖動（Flicker Loop）**，造成「鋼筆完全壞掉／破圖」的假象。
- **解決方案（Stationary Outer Hitbox）**：
  ```tsx
  // 正確寫法：事件綁在靜止的 Hitbox 容器，內層本體做視覺位移
  <div
    onClick={onDraftClick}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    className="group relative cursor-pointer flex flex-col items-center p-2"
  >
    {/* 隱形延伸判定邊界，保證位移後游標仍在範圍內 */}
    <div className="absolute -inset-4 z-20 pointer-events-auto" />

    {/* 動態桌面倒影與陰影 */}
    <motion.div animate={isHovered ? { opacity: 0.35, y: 16 } : { opacity: 0.7, y: 2 }} />

    {/* 純視覺懸浮本體（關閉指針事件防干擾） */}
    <motion.div
      className="pointer-events-none"
      animate={isHovered ? { y: -10, scale: 1.04, rotateX: -8 } : { y: 0, scale: 1, rotateX: 0 }}
    >
      <PenMesh />
    </motion.div>
  </div>
  ```
  透過將互動事件錨定於靜止的外層容器，並賦予 `-inset-4` 擴充緩衝判定帶，即便內層鋼筆物理浮起 `10px`，滑鼠依舊穩固落在判定區內，徹底杜絕死循環震盪。

### 5.3 GPU 硬體加速與 3D 渲染優化守則

1. **GPU 圖層提升**：在參與 3D 旋轉變形的父層全面加入 `will-change: transform, opacity` 與 `transformStyle: 'preserve-3d'`。
2. **消滅 3D 穿模閃爍（Z-Fighting）**：
   - 避免在同一個平面（Z = 0）重疊多個帶有模糊陰影（`drop-shadow`）的複雜 SVG。
   - 明確賦予各層次立體景深（如 `transform: translateZ(4px)`、印章冠頂 `translateZ(2px)`）。
3. **自然物理曲線**：書本翻動使用 `cubic-bezier(0.22, 1, 0.36, 1)`（特徵為初速度高、末端溫和減速靠攏），擬物文具使用 React Motion 彈簧物理（`stiffness: 260~280, damping: 20~22`），避免機械式的線性運動。

---

## 6. 前端重構與優化藍圖 (Refactoring Roadmap)

1. **拆分 `SkeuomorphicDesk.tsx`**：
   - 當前元件負擔較重，可進一步拆出獨立之文具裝飾與燈光控制子元件。
2. **SVG 全域 ID 衝突消除**：
   - 桌面與書本使用之 SVG 漸層（Gradient）與濾鏡（Filter）目前有全域重複的 `id="wood-grain"` 等，易造成不同元件渲染互相覆蓋，需改為隨機 prefix 或模組化定義。
3. **頁面翻轉手勢與箭頭動畫**：
   - 書本展開後，左右頁需補齊翻頁微動畫與左右翻頁箭頭引導（見 TODO P0）。

