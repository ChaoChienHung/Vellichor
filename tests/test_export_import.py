from __future__ import annotations

import json
import unittest
from vellichor import export_import


class TestExportImport(unittest.TestCase):
    def test_markdown_export_and_parse(self):
        entries = [
            {
                "id": "entry-1",
                "title": "測試標題",
                "date": "2026-10-01",
                "mood": "peaceful",
                "tags": ["日常", "感悟"],
                "signature": "Ludwig",
                "content": "今天天氣很好。\n寫下一段思緒。",
            }
        ]
        md = export_import.export_to_markdown(entries)
        self.assertIn('title: "測試標題"', md)
        self.assertIn('date: "2026-10-01"', md)
        self.assertIn('signature: "Ludwig"', md)
        self.assertIn("今天天氣很好。", md)

        parsed = export_import.parse_markdown_entries(md)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["title"], "測試標題")
        self.assertEqual(parsed[0]["date"], "2026-10-01")
        self.assertEqual(parsed[0]["mood"], "peaceful")
        self.assertIn("日常", parsed[0]["tags"])
        self.assertIn("今天天氣很好。", parsed[0]["content"])

    def test_json_export_and_parse(self):
        entries = [
            {
                "id": "e1",
                "title": "JSON 測試",
                "date": "2026-10-02",
                "mood": "reflective",
                "tags": ["test"],
                "content": "JSON 內文",
                "signature": "Ludwig",
            }
        ]
        json_str = export_import.export_to_json(entries, user_info={"username": "user1", "penName": "Ludwig"})
        data = json.loads(json_str)
        self.assertEqual(data["version"], "1.0")
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["entries"][0]["title"], "JSON 測試")

        parsed = export_import.parse_json_entries(json_str)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["title"], "JSON 測試")
        self.assertEqual(parsed[0]["content"], "JSON 內文")

    def test_zip_export_and_parse(self):
        entries = [
            {
                "id": "e1",
                "title": "第一篇",
                "date": "2026-10-01",
                "mood": "joyful",
                "tags": ["A"],
                "content": "第一篇內容",
                "signature": "Ludwig",
            },
            {
                "id": "e2",
                "title": "第二篇",
                "date": "2026-10-02",
                "mood": "melancholy",
                "tags": ["B"],
                "content": "第二篇內容",
                "signature": "Ludwig",
            },
        ]
        zip_bytes = export_import.export_to_zip(entries, user_info={"username": "user1", "penName": "Ludwig"})
        self.assertGreater(len(zip_bytes), 0)

        parsed = export_import.parse_zip_entries(zip_bytes)
        self.assertEqual(len(parsed), 2)
        titles = {p["title"] for p in parsed}
        self.assertIn("第一篇", titles)
        self.assertIn("第二篇", titles)

    def test_encrypted_entry_and_zip(self):
        entry = {
            "id": "sec-1",
            "title": "絕密手稿",
            "date": "2026-10-03",
            "mood": "mysterious",
            "tags": ["祕密"],
            "content": "夜深人靜，書閣沉思。",
            "signature": "Ludwig",
        }
        password = "strong-secret-password-123"
        enc_payload = export_import.encrypt_entry_data(entry, password)
        self.assertEqual(enc_payload["format"], export_import.ENCRYPTED_FORMAT_TAG)
        self.assertIn("ciphertext", enc_payload)
        self.assertIn("nonce", enc_payload)
        self.assertIn("salt", enc_payload)

        # Decrypt with correct password
        decrypted = export_import.decrypt_entry_data(enc_payload, password)
        self.assertEqual(decrypted["title"], "絕密手稿")
        self.assertEqual(decrypted["content"], "夜深人靜，書閣沉思。")

        # Decrypt with wrong password fails
        with self.assertRaises(ValueError):
            export_import.decrypt_entry_data(enc_payload, "wrong-password")

        # Test encrypted zip
        zip_enc_bytes = export_import.export_to_zip(
            [entry],
            user_info={"username": "ludwig"},
            mode="encrypted",
            password=password,
        )
        parsed_enc = export_import.parse_zip_entries(zip_enc_bytes, password=password)
        self.assertEqual(len(parsed_enc), 1)
        self.assertEqual(parsed_enc[0]["title"], "絕密手稿")

    def test_directory_export_and_import(self):
        import tempfile
        import shutil

        temp_dir = tempfile.mkdtemp()
        try:
            entries = [
                {
                    "id": "dir-1",
                    "title": "日記一",
                    "date": "2026-10-01",
                    "mood": "calm",
                    "tags": ["筆記"],
                    "content": "第一頁。",
                },
                {
                    "id": "dir-2",
                    "title": "日記二",
                    "date": "2026-10-02",
                    "mood": "joyful",
                    "tags": ["工作"],
                    "content": "第二頁。",
                },
            ]
            # 1. Plaintext markdown export
            count = export_import.export_to_directory(entries, temp_dir, mode="plaintext", format="markdown")
            self.assertEqual(count, 2)

            imported = export_import.import_from_directory(temp_dir)
            self.assertEqual(len(imported), 2)
            titles = {i["title"] for i in imported}
            self.assertIn("日記一", titles)
            self.assertIn("日記二", titles)

            # 2. Encrypted export to another dir
            enc_dir = tempfile.mkdtemp()
            try:
                pass_key = "dir-password-key"
                count_enc = export_import.export_to_directory(entries, enc_dir, mode="encrypted", password=pass_key)
                self.assertEqual(count_enc, 2)

                imported_enc = export_import.import_from_directory(enc_dir, password=pass_key)
                self.assertEqual(len(imported_enc), 2)
                titles_enc = {i["title"] for i in imported_enc}
                self.assertIn("日記一", titles_enc)
                self.assertIn("日記二", titles_enc)
            finally:
                shutil.rmtree(enc_dir, ignore_errors=True)

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_invalid_schema_fallbacks(self):
        # 1. Invalid JSON structure (random keys, no entries or title/content)
        with self.assertRaises(ValueError):
            export_import.parse_json_entries(json.dumps({"some_key": "some_value", "number": 123}))

        # 2. JSON with empty entries list
        with self.assertRaises(ValueError):
            export_import.parse_json_entries(json.dumps({"entries": []}))

        # 3. Invalid Markdown with no content or title
        with self.assertRaises(ValueError):
            export_import.parse_markdown_entries("")

        # 4. Unknown payload format or corrupted payload
        with self.assertRaises(ValueError):
            export_import.parse_import_payload("corrupted.bin", b"\x00\x01\x02\x03\xff\xfe")

        # 5. Empty zip archive
        import io
        import zipfile
        empty_buf = io.BytesIO()
        with zipfile.ZipFile(empty_buf, "w") as zf:
            zf.writestr("random.txt", "not a diary")
        with self.assertRaises(ValueError):
            export_import.parse_zip_entries(empty_buf.getvalue())


if __name__ == "__main__":
    unittest.main()

