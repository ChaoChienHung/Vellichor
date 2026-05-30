# Vellichor TODO（產品 / UI / 系統）

這份清單分成兩部分：
- A. 目前已完成的首頁表單 UI 優化（留作紀錄）
- B. 下一階段產品化：書桌首頁 / 書本交互 / 搜索與寫作流程 / 帳號與筆名

## A. 已完成：首頁表單 UI

### A1. Must Fix（Done）

- [x] Title：移除 underline（移除 `.diary-toprow .field-input` 的 `border-bottom`）
- [x] Title：游標（caret）顏色再深一點（加深 `--caret`）
- [x] Date：前綴改成 `Date:`（更新 `.diary-date-prefix` 內容）
- [x] Date：calendar icon 與日期間距縮小（調整 `::-webkit-calendar-picker-indicator`）
- [x] Date：`Date:` 與日期文字要同一條 baseline（`.diary-date-row` 改為 baseline）
- [x] Content：游標（caret）顏色更深（加深 `--caret`）
- [x] Content：文字顏色要深咖啡色（使用 `--ink-strong`）

### A2. 後續微調（Done）

- [x] Title 字體再放大（`.diary-toprow .field-input` 調整為 `1.5rem`）
- [x] Date 區塊再往上（`.diary-date` 的 `margin-top` 再上移）
- [x] Content 在深色模式下不要被覆寫成灰白（移除 dark media 內 `.diary-input-section .diary-textarea` 的淺色覆寫）

### A3. 檔案與位置（參考）

- CSS：`vellichor/static/app.css`
  - Title / Date：`.diary-toprow`, `.diary-date-row`, `.diary-date-prefix`, `.diary-toprow .field-input`, `.diary-date .field-input`
  - Content：`.diary-textarea`
- Template：`vellichor/templates/index.html`
  - Date 前綴文字：`<span class="diary-date-prefix">Date:</span>`

---

## B. 下一階段：書桌 / 書本交互（TODO）

### B1. Landing：書桌首頁（初始畫面）

- [ ] 初始頁面：書桌場景（桌上一本闔起來的深棕色書封）+ 書籤 + 鉛筆/鋼筆

### B2. 互動：點擊入口（書籤 / 鋼筆 / 書本）

- [ ] 點擊書籤：開啟書本 → 進入「搜索」頁
- [ ] 點擊鋼筆：開啟書本 → 進入「寫新日記」模式頁
- [ ] 點擊書本：開啟成左右兩頁（雙頁書）
  - [ ] 左右兩頁都要能呈現已寫過的日記（含翻頁/分頁策略）

### B3. 寫作：新增日記與完成簽名

- [ ] 新增日記頁：將 `Write to Diary` 按鈕文字改成 `Sign`
- [ ] 點擊 `Sign` 後：右下角出現筆名簽名，代表日記完成寫入
- [ ] 寫日記頁底部：敞開書動畫 + 中間筆在動寫字動畫
- [ ] 寫入完成動畫：此頁內容收進書裡 → 書合起來 → 回到初始頁面

### B4. 系統：用戶帳號與筆名（Pen Name）

- [ ] 增加用戶個人帳號系統（登入 / 登出）
- [ ] 使用者可設定筆名（Pen Name）
- [ ] `Sign` 相關功能需綁定筆名

### B5. 搜索：關鍵字 + 日期篩選 + 命中片段

- [ ] 搜索頁：關鍵字搜索 + 日期 filtering
- [ ] 搜索結果呈現：
  - [ ] 先顯示 Title + 日期
  - [ ] 下方再顯示命中的 sentences（片段）
