from __future__ import annotations

import unittest

try:
    from vellichor import crypto
except ModuleNotFoundError:
    crypto = None  # type: ignore[assignment]


@unittest.skipIf(crypto is None, "cryptography dependency not installed")
def test_encrypt_decrypt_roundtrip() -> None:
    assert crypto is not None
    key = b"x" * 32
    plaintext = "hello"
    blob = crypto.encrypt(plaintext, key=key)
    assert crypto.decrypt(blob, key=key) == plaintext


@unittest.skipIf(crypto is None, "cryptography dependency not installed")
def test_derive_key_deterministic() -> None:
    assert crypto is not None
    salt = crypto.new_salt()
    k1 = crypto.derive_key("pw", salt=salt)
    k2 = crypto.derive_key("pw", salt=salt)
    assert k1 == k2
