# 密碼學與加密機制 (Cryptography & Key Management)

本篇詳細解說 Vellichor 的密碼學原語選擇、威脅模型、金鑰衍生（KDF）、資料對稱加密、零知識密碼驗證以及主金鑰輪替（Re-key）機制。

相關核心實作位於 [vellichor/crypto.py](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/crypto.py) 與 [vellichor/core.py](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/core.py)。

---

## 1. 威脅模型 (Threat Model)

### 我們防禦的威脅
1. **靜態資料被竊 (Database at rest theft)**：攻擊者獲取實體硬碟、SQLite `.db` 備份檔或雲端備份時，在沒有使用者主密碼的情況下，無法解密讀取任何日記內文。
2. **密文竄改 (Ciphertext tampering)**：任何針對資料庫內文二進位資料的微幅變更，均能在解密階段透過認證標籤（Auth Tag）立即被偵測並拒絕，防止惡意注入或位元翻轉攻擊。
3. **彩虹表與預計算 (Precomputation / Rainbow Table Attacks)**：每個使用者具備獨立 16 位元組隨機 Salt，防止橫跨使用者的彩虹表比對。

### 信任邊界與非防禦範圍
- **執行時記憶體被 Dump**：目前伺服器進程在 Session 存活期間將衍生金鑰置於記憶體中；若本機已被取得 root/kernel 層級特權，記憶體內金鑰可能面臨洩漏風險（未來可透過進程隔離或硬體 Enclave 強化）。
- **惡意瀏覽器擴充功能**：前端頁面在渲染明文後，受限於瀏覽器 DOM 信任環境。

---

## 2. 金鑰衍生函式 (KDF: PBKDF2-HMAC-SHA256)

使用者輸入的主密碼（Password）不能直接作為 AES 對稱金鑰使用，必須經過強阻抗的金鑰衍生計算。

```
使用者輸入的主密碼 (UTF-8 Bytes)
              │
              ▼
   ┌─────────────────────────────────────┐
   │ PBKDF2-HMAC-SHA256                  │
   │ ─ Salt: 16 bytes (CSPRN random)     │
   │ ─ Iterations: 390,000               │
   │ ─ Output length: 32 bytes (256-bit) │
   └─────────────────────────────────────┘
              │
              ▼
    Derived Key (用於 AES-256)
```

### 為什麼選擇 PBKDF2 而非 bcrypt 或 Argon2？

| 演算法 | 特性 | 為什麼在 Vellichor 選 / 不選 |
|--------|------|---------------------------|
| **PBKDF2-HMAC-SHA256（採用）** | 1. 符合 NIST SP 800-132 與 OWASP 2023 推薦標準（390k 迭代）。<br>2. **Python `cryptography` 原生支援**，不需額外編譯 C 擴充套件，跨平台安裝最穩定。<br>3. 能夠**產出指定長度的二進位對稱金鑰（32 bytes）**。 | **最合適**：一石二鳥，既能做密碼驗證，又能產出高品質 AES-256 加密金鑰。 |
| **bcrypt** | 僅能產出 184-bit 的雜湊值字串，主要用於「驗證是否相符」，不適合直接衍生高品質的 256-bit 對稱金鑰。 | **不適用**：無法自然衍生加密金鑰。 |
| **Argon2id** | 具備防 ASIC/GPU 記憶體硬度（Memory-hard），理論強度最高。 | **列入未來規劃**：目前需額外相依 `argon2-cffi`，在部分嵌入式/純標準庫環境會增加建置負擔；未來可作為可選升級。 |

---

## 3. 對稱加密：AES-256-GCM

所有日記條目內文（Content）均使用 **AES-256-GCM**（Galois/Counter Mode）進行對稱加密。

```
Plaintext Content (UTF-8 Bytes)
              │
              ▼
   ┌──────────────────────────────────────────────┐
   │ AES-256-GCM Encryption                      │
   │ ─ Key: 32 bytes (Derived Key)                │
   │ ─ Nonce: 12 bytes (secrets.token_bytes(12))  │
   └──────────────────────────────────────────────┘
              │
              ▼
   Ciphertext (含 16 bytes Authentication Tag)
```

### 關鍵設計考量

1. **認證加密 (Authenticated Encryption with Associated Data, AEAD)**：
   - 傳統 CBC 模式需要額外計算 HMAC-SHA256（Encrypt-then-MAC）才能防止填充提示攻擊（Padding Oracle Attack）。
   - GCM 模式原生整合了 128-bit 驗證標籤（Auth Tag），解密時若密文有任何位元被竄改，會直接丟出 `cryptography.exceptions.InvalidTag`，確保機密性與完整性一併達成。
2. **Nonce 唯一性保證**：
   - GCM 模式最嚴重的致命傷為「相同金鑰下重複使用 Nonce」，會導致驗證金鑰洩漏並失去安全性。
   - Vellichor 每次執行 `encrypt()` 均使用標準密碼學安全隨機來源 `secrets.token_bytes(12)` 動態產生獨立 Nonce，並與密文一併以 `EncryptedBlob` 資料結構持久化。

---

## 4. 零知識密碼驗證 (Password Check Blob)

傳統 Web 應用程式通常將密碼以雜湊（Hash）存入資料庫；但在加密資料庫架構中，如果只存 Hash，資料庫外洩時攻擊者可以直接使用 Hash 離線爆破密碼，且無法證明當前金鑰能否解開 entries。

Vellichor 採取了一種**基於解密結果的零知識驗證機制**：

```python
PW_CHECK_PLAINTEXT = "vellichor_pw_check_v1"

# 1. 註冊 / 初始化帳號：
derived_key = derive_key(password, salt=user.kdf_salt)
pw_check_blob = encrypt(PW_CHECK_PLAINTEXT.encode("utf-8"), key=derived_key)
# 將 pw_check_blob.nonce 與 pw_check_blob.ciphertext 存入 users 表

# 2. 登入時驗證：
candidate_key = derive_key(input_password, salt=user.kdf_salt)
try:
    decrypted = decrypt(user.pw_check_blob, key=candidate_key)
    if decrypted.decode("utf-8") == PW_CHECK_PLAINTEXT:
        # 密碼完全正確，且 candidate_key 具備解密 entries 的有效性！
        login_success(candidate_key)
except InvalidTag:
    # 密碼錯誤，解密驗證標籤失敗
    login_failed()
```

### 優勢
- 資料庫內完全沒有密碼 hash；只有一份用 Derived Key 加密的固定文字密文。
- 驗證成功時，系統直接獲得解密 entries 所需的 `derived_key`，無需二次輸入金鑰。

---

## 5. 主密碼輪替機制 (Key Rotation / Re-key)

當使用者希望修改登入密碼時，必須將原本由「舊金鑰」加密的所有 entries，全量轉換為由「新金鑰」加密。

### 交易原子性保證流程

整個輪替過程由 [core.py:rekey_user_entries](file:///Users/ludwigchao/Desktop/Ludwig/Projects/Vellichor/vellichor/core.py) 在單一 SQLite 交易內完成：

```
[使用者請求換密碼]
  │ (提供 old_password, new_password)
  ▼
[1. 驗證舊密碼]
  ├─ 派生 old_key
  └─ 嘗試解密 pw_check_blob（失敗立即中斷）
  ▼
[2. 準備新金鑰]
  ├─ 產生全新 16-byte random salt
  ├─ 派生 new_key
  └─ 加密 PW_CHECK_PLAINTEXT 產生新 pw_check_blob
  ▼
[3. 開啟 SQLite 原子交易 (BEGIN IMMEDIATE)]
  ├─ 寫入 users 表：更新 kdf_salt 與 pw_check_blob
  ├─ 撈出該 user 所有 entries (id, nonce, ciphertext)
  ├─ 迴圈逐筆處理：
  │    ├─ old_key 解密 content
  │    ├─ new_key 重新加密 content (產生新 nonce)
  │    └─ UPDATE entries SET content_nonce=?, content_ciphertext=?
  └─ COMMIT（任一步驟異常則 ROLLBACK，維持舊狀態）
  ▼
[4. 更新即時狀態]
  └─ 更新伺服器當前 Session 內的 derived_key 為 new_key（無須強制登出重登）
```

**安全性保證**：
- 如果在重加密到第 50 篇時發生斷電或程式異常，SQLite 交易自動 Rollback，資料庫保持全量為舊密碼加密狀態，絕不出現「一半新密碼、一半舊密碼」的不可逆死鎖損毀。
