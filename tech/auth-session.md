# 認證與 Session 機制 (Authentication & Session Architecture)

本篇解說 Vellichor 的使用者認證架構、Cookie Session 生命週期、記憶體金鑰持有機制以及當前的安全限制與強化藍圖。

相關實作位於 [vellichor/web.py](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/web.py)。

---

## 1. 認證流程與 Session 生命週期

```
1. 使用者輸入 (username, password)
              │
              ▼
   [POST /login 路由]
              │
              ▼
2. 驗證密碼與衍生金鑰 (core.authenticate_user)
   ├─ 查出 user.kdf_salt 與 user.pw_check_blob
   ├─ PBKDF2 派生 candidate_key
   └─ 成功解密驗證明文 → 取得有效 derived_key
              │
              ▼
3. 建立 Session 物件
   ├─ session_id = secrets.token_urlsafe(32)
   ├─ app.state.sessions[session_id] = AuthenticatedUser(
   │     id=user.id,
   │     username=user.username,
   │     pen_name=user.pen_name,
   │     key=derived_key  <-- 32 bytes 二進位對稱金鑰
   │  )
   └─ Set-Cookie: sid=<session_id>; HttpOnly; SameSite=Lax
              │
              ▼
4. 後續 API 請求
   ├─ 瀏覽器自動攜帶 Cookie: sid=<session_id>
   └─ get_current_user 依賴注入取得 AuthenticatedUser
```

---

## 2. 為什麼將金鑰常駐於記憶體？

在傳統 Web 應用中，Session 通常只保存 `user_id`；但 Vellichor 具備 **Encrypt-at-Rest** 的不可退化硬契約：
- 當使用者在書桌前寫日記（`POST /api/entries`）或翻閱內文（`GET /api/entries/full`）時，後端必須能即時執行 AES-GCM 加密或解密。
- 如果 Session 不保存 `derived_key`，使用者在每一次儲存或查看日記時，就必須重新輸入一次主密碼。
- **設計決策**：在使用者登入至登出的生命週期內，將 32-byte 的 `derived_key` 保存在後端記憶體字典 `app.state.sessions` 中。

---

## 3. 安全邊界與現存限制分析

在最近的深度安全審計中，識別出以下待強化項目（已登載於 [TODO.md](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/TODO.md)）：

### 3.1 Cookie 安全性
- **現狀**：`response.set_cookie("sid", session_id, httponly=True, samesite="lax")`
- **問題**：缺少 `secure=True` 屬性。在 HTTPS 部署環境下，如果沒有 `secure` flag，Cookie 可能在明文 HTTP 降級連線中洩漏。
- **改善**：偵測環境變數或在生產環境強制啟用 `secure=True`。

### 3.2 Session TTL 與清理機制
- **現狀**：Session 字典只要伺服器不重啟就不會過期。
- **風險**：長時間未操作的 Session 依然有效，記憶體金鑰無上限滯留。
- **改善**：增加 `created_at` / `last_active_at`，設定例如 7 天絕對過期或 2 小時滑動過期，並具備背景清理協程。

### 3.3 CSRF 防護
- **現狀**：雖然設定了 `SameSite=Lax`，但對於部分頂層導航（Top-level GET navigation）或舊型瀏覽器相容情境仍有防護盲區。
- **改善**：針對狀態變更（POST / DELETE / PATCH）全面實施 CSRF Double Submit Cookie 或 Token 檢核。

### 3.4 登入暴力破解（Rate Limiting）
- **現狀**：`/login` 與 `/signup` 端點未設置頻率限制。
- **風險**：攻擊者可發起大量字典檔暴力猜測攻擊，雖然 PBKDF2 390k 迭代能消耗 CPU，但多並行會導致伺服器 DoS。
- **改善**：引入以 IP / 使用者名稱為單位的限流中介層（Rate-Limiting Middleware）。

### 3.5 多程序 / 叢集架構限制
- **現狀**：`app.state.sessions` 是進程內（In-Process）字典。
- **影響**：若使用多個 Uvicorn Worker（`--workers 4`）或負載平衡器（Load Balancer），不同 Worker 間 Session 無法共享。
- **未來考量**：若擴展至多程序，需評估 Redis 快取，但**金鑰存入外部 Redis 必須具備二級加密機制**，不能明文落盤至 Redis。
