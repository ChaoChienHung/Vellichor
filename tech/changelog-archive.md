# UI 變更紀錄封存 (UI Changelog Archive)

本文件封存歷史上已完成之首頁表單與介面視覺微調紀錄（自 `TODO.md` 移出，避免 TODO 清單膨脹）。

---

## 歷史已完成項目

### 首頁表單與排版微調
- **Title 標題欄**：
  - 移除 underline（移除 `.diary-toprow .field-input` 的 `border-bottom`）。
  - 游標（caret）顏色加深（加深 `--caret` 變數）。
  - 字體放大（`.diary-toprow .field-input` 調整為 `1.5rem`）。
- **Date 日期欄**：
  - 前綴改為 `Date:`（更新 `.diary-date-prefix` 內容）。
  - Calendar Icon 與日期間距微調縮小（調整 `::-webkit-calendar-picker-indicator` 樣式）。
  - `Date:` 標籤與日期文字對齊 baseline（`.diary-date-row` 樣式改為 baseline）。
  - 日期區塊上移（調整 `.diary-date` 的 `margin-top` 向上微縮）。
- **Content 內文區**：
  - 游標（caret）顏色加深（加深 `--caret` 變數）。
  - 文字顏色改為深咖啡色（使用 `--ink-strong` 擬物墨水色階）。
  - 深色模式修正：深色模式下不再強制覆寫為灰白色（移除 dark media 內 `.diary-input-section .diary-textarea` 的淺色覆寫，保留擬物羊皮紙墨水感）。
