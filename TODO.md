# Vellichor UI 待辦（首頁表單）

目標：讓首頁的 Title / Date / Content 在同一張「手帳紙」上的視覺一致（字體、顏色、游標、對齊、間距）。

## Must Fix

- [x] Title：移除 underline（移除 `.diary-toprow .field-input` 的 `border-bottom`）
- [x] Title：游標（caret）顏色再深一點（加深 `--caret`）
- [x] Date：前綴改成 `Date:`（更新 `.diary-date-prefix` 內容）
- [x] Date：calendar icon 與日期間距縮小（調整 `::-webkit-calendar-picker-indicator`）
- [x] Date：`Date:` 與日期文字要同一條 baseline（`.diary-date-row` 改為 baseline）
- [x] Content：游標（caret）顏色更深（加深 `--caret`）
- [x] Content：文字顏色要深咖啡色（使用 `--ink-strong`）

## 後續微調（新）

- [x] Title 字體再放大（`.diary-toprow .field-input` 調整為 `1.5rem`）
- [x] Date 區塊再往上（`.diary-date` 的 `margin-top` 再上移）
- [x] Content 在深色模式下不要被覆寫成灰白（移除 dark media 內 `.diary-input-section .diary-textarea` 的淺色覆寫）

## 檔案與位置

- CSS：`vellichor/static/app.css`
  - Title / Date：`.diary-toprow`, `.diary-date-row`, `.diary-date-prefix`, `.diary-toprow .field-input`, `.diary-date .field-input`
  - Content：`.diary-textarea`
- Template：`vellichor/templates/index.html`
  - Date 前綴文字：`<span class="diary-date-prefix">Date:</span>`
