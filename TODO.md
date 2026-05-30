# Vellichor UI 待辦（首頁表單）

目標：讓首頁的 Title / Date / Content 在同一張「手帳紙」上的視覺一致（字體、顏色、游標、對齊、間距）。

## Must Fix

- [ ] Title：移除 underline（目前是 `.diary-toprow .field-input` 的 `border-bottom`）
- [ ] Title：游標（caret）顏色再深一點（目前走 `--caret`）
- [ ] Date：前綴改成 `Date:`（目前是 `.diary-date-prefix` 顯示 `Date`）
- [ ] Date：calendar icon 與日期間距縮小（調整 `::-webkit-calendar-picker-indicator` 或 input padding）
- [ ] Date：`Date:` 與日期文字要同一條 baseline（調整 `.diary-date-row` / `.diary-date-prefix` 的 `align-items`、`padding-bottom` 或 `line-height`）
- [ ] Content：游標（caret）顏色更深（textarea 已吃 `--caret`，需要加深 token 或針對 `.diary-textarea` 覆寫）
- [ ] Content：文字顏色要深咖啡色（調整 `.diary-textarea` 的 `color`，建議用新 token 如 `--ink-strong`）

## 檔案與位置

- CSS：`vellichor/static/app.css`
  - Title / Date：`.diary-toprow`, `.diary-date-row`, `.diary-date-prefix`, `.diary-toprow .field-input`, `.diary-date .field-input`
  - Content：`.diary-textarea`
- Template：`vellichor/templates/index.html`
  - Date 前綴文字：`<span class="diary-date-prefix">Date</span>`

