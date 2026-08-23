# Re-key Master Password

Rotate the user master password and re-encrypt all diary entries.

## UI Flow

- Open `/app`
- Click `執筆人證`
- Fill `舊主密碼` + `新主密碼`
- Submit `執行重加密與金鑰重構`

## API Flow

`POST /api/rekey`

```json
{
  "old_password": "old",
  "new_password": "new"
}
```

On success:

- updates user `kdf_salt` and password check ciphertext
- re-encrypts all entries for that user
- refreshes the session key

