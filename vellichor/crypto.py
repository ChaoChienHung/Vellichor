from __future__ import annotations

import os
from dataclasses import dataclass

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


PBKDF2_ITERATIONS = 390_000
SALT_LEN = 16
NONCE_LEN = 12
KEY_LEN = 32


def new_salt() -> bytes:
    return os.urandom(SALT_LEN)


def derive_key(password: str, *, salt: bytes, iterations: int = PBKDF2_ITERATIONS) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_LEN,
        salt=salt,
        iterations=iterations,
    )
    return kdf.derive(password.encode("utf-8"))


@dataclass(frozen=True)
class EncryptedBlob:
    nonce: bytes
    ciphertext: bytes


def encrypt(plaintext: str, *, key: bytes) -> EncryptedBlob:
    aesgcm = AESGCM(key)
    nonce = os.urandom(NONCE_LEN)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return EncryptedBlob(nonce=nonce, ciphertext=ciphertext)


def decrypt(blob: EncryptedBlob, *, key: bytes) -> str:
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(blob.nonce, blob.ciphertext, None)
    return plaintext.decode("utf-8")
