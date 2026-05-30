from __future__ import annotations


class VellichorError(Exception):
    pass


class InvalidMasterPassword(VellichorError):
    pass


class EntryNotFound(VellichorError):
    def __init__(self, entry_id: str) -> None:
        super().__init__(entry_id)
        self.entry_id = entry_id

