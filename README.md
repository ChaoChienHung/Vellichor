# Vellichor

Offline-first 日記（本機 SQLite + 內容 AES-256 加密）。

## 先跑起來

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 本機 Web

```bash
python -m vellichor web --db vellichor.db --port 8000
```

然後開 `http://127.0.0.1:8000/`。

### CLI

```bash
python -m vellichor cli init --db vellichor.db
python -m vellichor cli new --title "2026-05-30" --db vellichor.db <<'EOF'
今天開始寫日記。
EOF
python -m vellichor cli list --db vellichor.db
python -m vellichor cli search 日記 --db vellichor.db
```

## 測試帳號（本機）

- username: ludwigchao
- 筆名: Ludwig
- Password: 請放在 `secret.txt`（已被 `.gitignore` 忽略，避免被 commit）

```bash
export VELLICHOR_PASSWORD="$(cat secret.txt)"
python -m vellichor cli init --db vellichor.db --username ludwigchao --pen-name Ludwig
```

## 資料與安全

- 內容只存密文：DB 裡的 `content_ciphertext/content_nonce` 是 AES-GCM 產物
- 金鑰由主密碼 + DB 內 salt 衍生（PBKDF2-HMAC-SHA256）
- 這是 MVP：目前搜尋會用「解密後的預覽」做本機過濾，之後可升級成 FTS/索引

## 修改 Master Password

會把現有 entries 全部用舊密碼解密後，再用新密碼重加密並更新 DB 的 KDF salt。

```bash
python -m vellichor cli change-password --db vellichor.db
```
