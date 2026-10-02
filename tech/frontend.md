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
│   ├── api.ts                  # Fetch API 封裝（處理 Cookie、錯誤彈窗等）
│   ├── entryParser.ts          # 隨筆心情札記與正文分解打包工具
│   └── imageCompressor.ts      # 客戶端圖片等比規格化壓縮（保障 AES 加密容量與畫質）
└── components/
    ├── SkeuomorphicDesk.tsx     # 書桌主場景（書桌材質、頂部 Navbar、文具擺設）
    ├── VellichorBook.tsx        # 日記本主體（封面閉合 / 內頁展開狀態機）
    ├── DiaryWriter.tsx          # 執筆介面：Markdown 工具列、寫作/預覽分頁、拖曳與剪貼簿貼圖
    ├── DiarySearch.tsx          # 歷史 Ledger：左頁目錄索引 + 右頁詳情閱覽
    ├── MarkdownRenderer.tsx     # 古典手帳風 Markdown 解析與拍立得相框（支援燈箱放大）
    ├── DeskUnlockModal.tsx      # 擬物火漆印章解鎖/註冊彈窗（含帳號重疊保護引導）
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

在 Vellichor 的擬物書桌介面中，3D 動畫與物理反饋是打造沉浸式儀式感的靈魂。以下記錄在開發與除錯過程中所歸納的核心工程架構與避坑守則：

### 5.1 空間舞台穩定性與消滅 230px 橫移閃跳 (Constant Stage Width & Non-FLIP Architecture)

- **痛點（Anti-Pattern）**：
  在早期實作中，桌面列與物件包裹層使用了 Framer Motion 的 `layout="position"`，且書本外容器依狀態切換寬度：
  ```tsx
  // 錯誤示範：FLIP 矩陣衝突與寬度動態切換
  <motion.div layout="position" className="flex items-center justify-center">
    <motion.div layout="position"><PenTray3D /></motion.div>
    <motion.div layout="position" className={isClosed ? "max-w-[580px]" : "max-w-[1040px]"}>
      <VellichorBook />
    </motion.div>
    <motion.div layout="position"><InkwellAndSeal /></motion.div>
  </motion.div>
  ```
  這會帶來兩大致命視覺破綻：
  1. **3D Perspective 扁平化崩潰**：Framer Motion 在進行 FLIP 補間時，每一幀會在外層節點注入 2D `matrix(...)` 或 `translate3d(...)`，導致 Chromium 與 WebKit 引擎將子層的 3D 透視上下文（`perspective: 2400` + `preserve-3d`）直接拍平成 2D 平面，造成 3D 幀率瞬斷白閃（「打開時會閃掉然後動畫不見」）。
  2. **幾何中心瞬移 230px**：外層從 580px 驟增為 1040px 時，Grid 單元中心座標在第 0 毫秒從 290px 瞬移到 520px，導致封面還沒開始翻轉就先向右跳躍 230px；闔書時外層瞬間被壓回 580px，導致 1040px 內頁瞬間被排版截斷（「闔起來則基本沒動畫」）。
  3. **桌中文具滑動**：兩側的鋼筆架與墨水瓶會隨書本開合在桌面上產生 230px 的非自然左右橫移滑動。

- **解決方案（桌面實體錨定 + 恆定舞台寬度）**：
  ```tsx
  // 正確架構：靜態桌面座標 + 恆定舞台容器
  <div className="relative w-full flex items-center justify-center gap-8 my-2">
    {/* 鋼筆托盤：穩定錨定於左側 */}
    <div className="shrink-0 pointer-events-auto">
      <PenTray3D onDraftClick={handlePenClick} />
    </div>

    {/* 書本舞台：恆定 max-w-[1060px]，開書與闔書幾何中心 100% 重合 */}
    <div className="relative flex-1 flex justify-center items-center w-full max-w-[1060px] min-h-[640px]">
      <VellichorBook ... />
    </div>

    {/* 墨水瓶與封泥：穩定錨定於右側 */}
    <div className="shrink-0 pointer-events-auto">
      <WaxSealAndAudit3D ... />
      <CrystalInkwell3D ... />
    </div>
  </div>
  ```
  - **移除 FLIP 干擾**：全面移除外層容器的 `layout="position"`，保護 3D 硬體加速管線。
  - **恆定舞台（Constant Stage）**：書本舞台始終維持 `max-w-[1060px]`，520px 闔書與 1040px 開書在同一個 `grid-cols-1 grid-rows-1 place-items-center` 中完全同心，消滅位移跳躍與邊界溢位。

---

### 5.2 序列化物理階段動態（Sequenced Stage Transition: 消滅雙頁提前穿幫）

- **痛點（Concurrent Mode Leakage）**：
  若使用 Framer Motion 預設的並行 `<AnimatePresence initial={false}>`：
  當使用者點擊開書時，退場中的「闔書封面（520px）」與進場中的「展開雙頁（1040px）」會在第 0 毫秒同時渲染。
  因為展開雙頁寬度（1040px）遠大於封面（520px），在封面剛開始旋轉的前 100~200ms，展開頁的左右兩翼就已經從封面後方穿幫露出，導致「開書動畫還沒加載完畢就已經有開啟的狀態」。

- **解決方案（`mode="wait"` 序列化時間軸）**：
  ```tsx
  <AnimatePresence mode="wait" initial={false}>
    {isClosed ? (
      <motion.div
        key="closed-book"
        initial={{ rotateY: -100, x: -30, opacity: 0, scale: 0.98 }}
        animate={{ rotateY: 0, x: 0, opacity: 1, scale: 1 }}
        exit={{ 
          rotateY: -100, 
          x: -30, 
          opacity: 0, 
          scale: 0.98,
          transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } 
        }}
        transition={{ type: 'spring', stiffness: 160, damping: 20, mass: 1 }}
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
        className="col-start-1 row-start-1 relative select-none z-20"
      >
        <ClosedBookCover />
      </motion.div>
    ) : (
      <motion.div
        key="opened-book"
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ 
          scale: 0.97, 
          y: 8, 
          opacity: 0,
          transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] } 
        }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'center center', width: "min(1040px, 96vw)", transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
        className="col-start-1 row-start-1 relative z-10"
      >
        <OpenedLedgerSpread />
      </motion.div>
    )}
  </AnimatePresence>
  ```
  - **開書物理時間軸**：
    - `0ms ~ 320ms`：封面單獨以左書脊為軸（`transformOrigin: 'left center'`）翻開（`0 -> -100deg`），展開雙頁完全不進 DOM，零穿幫、零偷跑。
    - `320ms ~ 640ms`：封面退場完成後，雙頁 Ledger 掛載並以 `scale: 0.96 -> 1` 平滑微升展開就位。
  - **闔書物理時間軸**：
    - `0ms ~ 220ms`：展開雙頁快速收縮退場。
    - `220ms ~ 540ms`：封面從左側覆蓋甩回（`rotateY: -100deg -> 0`），透過調校阻尼彈簧（`stiffness: 160, damping: 20`）沉穩闔上，模擬真實皮革封皮的入位重量感。

---

### 5.3 擬物文具 3D 向量對齊與純淨 Z 軸抬升 (Vector Alignment & Pure Z-Axis Lift)

- **痛點（Anti-Pattern）**：
  擬物自來水鋼筆若存在座標軸顛倒、複合 CSS 轉場與 3D 傾角穿透，會產生破圖：
  1. **筆尖向量倒掛**：若 SVG 筆尖點座標尖端在上方 `(10, 0)`，裝配在筆桿下端會變成尖端朝筆身倒插。
  2. **CSS 與 Motion 變換矩陣競爭**：在 Motion 元件上同時使用 Tailwind `group-hover:scale-105 transition-transform`，會導致 CSS 轉場覆蓋 Motion 的 Spring 矩陣，造成筆尖在 Hover 時脫節拉扯。
  3. **傾角穿透底板**：在已經具有 `rotateX(14deg)` 的胡桃木筆架中，若 Hover 額外疊加 `rotateX: -8, rotateZ: -2`，筆尖或筆尾會切入木槽底板造成破面。

- **解決方案（結構化裝配 + 純淨 Z 軸浮升）**：
  1. **幾何裝配與筆尖路徑對齊**：
     筆身結構由上至下嚴格對齊：頂冠（Finial）→ 筆蓋（Cap + Clip）→ 筆身（Barrel）→ 握位（Section）→ 筆圈（Collar）→ 14k 金筆尖（Nib）。
     筆尖 SVG 座標規範：基底 `y = 0` 與握位金屬圈縫合，兩側展肩於 `y = 9`，向下收攏於尖端 `(10, 27)`，中縫直線與氣孔垂直向下貫通。
  2. **純淨 Z 軸抬升物理**：
     移除旋轉傾角，Hover 時僅進行平行垂直抬升：
     ```tsx
     <motion.div
       animate={isHovered ? { y: -8, scale: 1.03 } : { y: 0, scale: 1 }}
       transition={{ type: 'spring', stiffness: 280, damping: 22 }}
       style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
     >
       <FountainPenAssembly />
     </motion.div>
     ```
  3. **動態接觸柔陰影**：底層投影在 Hover 時擴散淡化（`scale: 1.15, opacity: 0.35, blur: 7px`），靜止時聚攏銳化（`scale: 1, opacity: 0.75, blur: 2.5px`），呈現真實桌面光學倒影。

---

### 5.4 靜態錨定 Hitbox 防護（消滅 Hover 震盪死循環 Flicker Loop）

- **痛點（Anti-Pattern）**：
  若將 Hover 事件直接綁定在位移本體（如升起的鋼筆）：
  滑鼠碰觸鋼筆 → 鋼筆觸發 `y: -8px` 上移 → 邊界脫離滑鼠 → 觸發 `onMouseLeave` 落下 → 鋼筆再次碰觸滑鼠 → 觸發 `onMouseEnter` 上移。
  如此產生 **60 FPS 高頻閃爍死循環（Flicker Loop）**。

- **解決方案（Stationary Hitbox Pattern）**：
  ```tsx
  <div
    onClick={onDraftClick}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    className="relative cursor-pointer flex flex-col items-center justify-center w-full h-full"
  >
    {/* 靜態不可見判定層：擴展邊界，本體位移時此層不動 */}
    <div className="absolute -inset-4 z-30 pointer-events-auto" />

    {/* 動態光學陰影 */}
    <motion.div animate={isHovered ? { opacity: 0.35, y: 12, filter: 'blur(7px)' } : { opacity: 0.75, y: 2 }} />

    {/* 純視覺懸浮本體（關閉事件判定） */}
    <motion.div
      className="pointer-events-none"
      animate={isHovered ? { y: -8, scale: 1.03 } : { y: 0, scale: 1 }}
    >
      <FountainPenMesh />
    </motion.div>
  </div>
  ```
  透過靜態判定層與視覺位移層解耦，無論鋼筆如何懸浮位移，事件判定始終恆定平穩。

---

### 5.5 GPU 硬體加速與 3D 渲染優化守則

1. **GPU 圖層提升**：在參與 3D 旋轉變形的父層全面加入 `will-change: transform, opacity` 與 `transformStyle: 'preserve-3d'`。
2. **消滅 3D 穿模閃爍（Z-Fighting）**：
   - 避免在同一個平面（Z = 0）重疊多個帶有模糊陰影（`drop-shadow`）的複雜 SVG。
   - 明確賦予各層次立體景深（如 `transform: translateZ(4px)`、印章冠頂 `translateZ(2px)`）。
3. **自然物理曲線**：書本翻動使用 `cubic-bezier(0.16, 1, 0.3, 1)`（初速度高、末端溫和靠攏），擬物文具使用 React Motion 彈簧物理（`stiffness: 160~280, damping: 20~22`），避免機械式的線性運動。

---

### 5.6 書桌與書籍文具自適應佈局與相對大小契約 (Responsive Desk & Relative Sizing)

為保證書本翻開（Double-page Spread）時，左右側擬物文具（左側胡桃木筆架 `PenTray3D`、右側火漆印章 `WaxSealAndAudit3D` 與水晶墨水瓶 `CrystalInkwell3D`）不會因不同螢幕解析度或視窗縮放而與書頁產生穿模、遮擋或擠壓，遵循以下相對大小契約：

1. **空間邊界與寬度解耦（Flexbox Isolation）**：
   - 移除書本運動外框上強制的 `96vw` 視窗絕對寬度，改用 `w-full max-w-[880px] 2xl:max-w-[960px]` 配合父層 `flex-1 min-w-0`。
   - 書桌主容器上限提升至 `max-w-[1560px]`，在 1280px ~ 1600px+ 螢幕上提供充裕兩側呼吸邊界（至少 140px~300px 以上安全淨空）。
2. **文具相對大小（Relative Responsive Scale）**：
   - 左右文具採用漸進縮放階梯：`scale-80 sm:scale-85 md:scale-90 xl:scale-95 2xl:scale-100 origin-center`，在高解析度呈現莊嚴大氣、在標準筆電呈現精緻緊緻。
   - 右側印章與墨水瓶垂直間隙由原本的 `gap-10 lg:gap-12` 收斂為 `gap-2.5 sm:gap-3.5 xl:gap-5`，適應高度較低（如 768px/771px）之螢幕環境，避免垂直爆版擠壓。
3. **行動/小平板垂直收納（Stacking Fallback）**：
   - 在窄螢幕寬度下自動切換為 `flex-col`，文具水平橫向排列於上下外側，永不覆蓋書面閱讀與書寫工作區。

---

## 6. 前端重構與優化藍圖 (Refactoring Roadmap)

1. **拆分 `SkeuomorphicDesk.tsx`**：
   - 當前元件負擔較重，可進一步拆出獨立之文具裝飾與燈光控制子元件。
2. **SVG 全域 ID 衝突消除**：
   - 桌面與書本使用之 SVG 漸層（Gradient）與濾鏡（Filter）目前有全域重複的 `id="wood-grain"` 等，易造成不同元件渲染互相覆蓋，需改為隨機 prefix 或模組化定義。
3. **頁面翻轉手勢與箭頭動畫**：
   - 書本展開後，左右頁需補齊翻頁微動畫與左右翻頁箭頭引導（見 TODO P0）。


