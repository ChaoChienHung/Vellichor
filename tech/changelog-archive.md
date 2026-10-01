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

### 隨筆匯出與匯入系統（Export / Import Engine）
- **明文 / 加密雙模式 (Dual-Mode)**：
  - 預設 Encrypted（AES-256-GCM 獨立加密檔案 `.vellichor`，具獨立 salt / nonce）。
  - 支援 Plaintext（Markdown 附 YAML Frontmatter 或 JSON）。
- **每篇日記獨立檔案**：
  - ZIP 壓縮封裝包內部結構包含 `entries/YYYY-MM-DD-標題.{vellichor,md}` 獨立檔案，附帶 `manifest.json` 與 `README.md`。
  - CLI 支援 `--dir <path>` 輸出/匯入個別獨立檔案目錄。
- **範圍自選**：
  - 支援匯出單篇日記或全帳號隨筆。
- **CLI 工具**：
  - `vellichor export` 與 `vellichor import` 支援 `--mode {encrypted,plaintext}`、`--dir`、`--input`、`--password`、`--file-password`。

### 3D 擬物書桌與典雅書皮視覺
- **3D 擬物文具**：
  - 胡桃木筆架配金屬自來水鋼筆（Draft • 執筆）。
  - 勃艮第火漆封蠟與立體黃銅印章（Audit • 審計）。
  - 切面水晶墨水瓶與深藍墨水液面（Ink • 墨水）。
  - 具備 3D 傾斜、物理浮起、動態擴散陰影與復古黃銅標牌。
- **書皮字體與質地升級**：
  - 燙金浮雕 Vellichor 標題放大至 `text-5xl md:text-6xl`。
  - 執筆墨客筆名字級放大，搭配古典紋理裝飾線。
  - 加入鞍部手工車線邊框與 3D 書脊立體肋紋。
