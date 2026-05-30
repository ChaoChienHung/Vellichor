from __future__ import annotations

from dataclasses import dataclass

from ... import crypto
from ...domain.errors import InvalidMasterPassword
from ..ports import MetaRepo

META_SALT_KEY = "kdf_salt"
META_PW_CHECK_NONCE_KEY = "pw_check_nonce"
META_PW_CHECK_CIPHERTEXT_KEY = "pw_check_ciphertext"
PW_CHECK_PLAINTEXT = "vellichor_pw_check_v1"


@dataclass(frozen=True)
class AuthService:
    meta: MetaRepo

    def derive_or_init_key(self, *, password: str) -> bytes:
        salt = self.meta.get(META_SALT_KEY)
        if salt is None:
            salt = crypto.new_salt()
            self.meta.set(META_SALT_KEY, salt)

        key = crypto.derive_key(password, salt=salt)

        check_nonce = self.meta.get(META_PW_CHECK_NONCE_KEY)
        check_ciphertext = self.meta.get(META_PW_CHECK_CIPHERTEXT_KEY)
        if check_nonce is None or check_ciphertext is None:
            blob = crypto.encrypt(PW_CHECK_PLAINTEXT, key=key)
            self.meta.set(META_PW_CHECK_NONCE_KEY, blob.nonce)
            self.meta.set(META_PW_CHECK_CIPHERTEXT_KEY, blob.ciphertext)
        else:
            blob = crypto.EncryptedBlob(nonce=check_nonce, ciphertext=check_ciphertext)
            try:
                check = crypto.decrypt(blob, key=key)
            except Exception as e:
                raise InvalidMasterPassword() from e
            if check != PW_CHECK_PLAINTEXT:
                raise InvalidMasterPassword()

        return key

