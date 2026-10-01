from __future__ import annotations

import base64
import io
import json
import os
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Union

from . import crypto

SCHEMA_VERSION = "1.0"
SCHEMA_URI = "https://vellichor.local/schemas/diary-backup-v1.json"
ENCRYPTED_FORMAT_TAG = "vellichor-encrypted-entry-v1"
ENCRYPTED_BACKUP_TAG = "vellichor-encrypted-backup-v1"


def _sanitize_filename(name: str) -> str:
    """Sanitize title for safe cross-platform file naming."""
    s = re.sub(r'[\\/*?:"<>|]', "_", name).strip()
    return s[:60] if s else "untitled"


def entry_to_frontmatter_markdown(entry: dict[str, Any]) -> str:
    """Convert an entry dict to Markdown with YAML frontmatter."""
    title = str(entry.get("title") or "Untitled").replace('"', '\\"')
    date = str(entry.get("date") or "")
    mood = str(entry.get("mood") or "reflective")
    tags = entry.get("tags") or []
    signature = str(entry.get("signature") or "")
    created_at = str(entry.get("createdAt") or "")
    updated_at = str(entry.get("updatedAt") or "")
    entry_id = str(entry.get("id") or "")
    content = str(entry.get("content") or "")

    lines = [
        "---",
        f'title: "{title}"',
        f'date: "{date}"',
        f'mood: "{mood}"',
    ]
    if signature:
        lines.append(f'signature: "{signature}"')
    if created_at:
        lines.append(f'createdAt: "{created_at}"')
    if updated_at:
        lines.append(f'updatedAt: "{updated_at}"')
    if entry_id:
        lines.append(f'id: "{entry_id}"')

    if tags:
        lines.append("tags:")
        for t in tags:
            clean_tag = str(t).replace('"', '\\"')
            lines.append(f'  - "{clean_tag}"')
    else:
        lines.append("tags: []")

    lines.append("---")
    lines.append("")
    lines.append(content)
    lines.append("")
    return "\n".join(lines)


# ==============================================================================
# Encrypted Entry Primitives (AES-GCM-256)
# ==============================================================================

def encrypt_entry_data(entry: dict[str, Any], password_or_key: Union[str, bytes]) -> dict[str, Any]:
    """Encrypt an entry into a portable encrypted envelope."""
    clean_entry = {
        "id": entry.get("id", ""),
        "title": entry.get("title", ""),
        "date": entry.get("date", ""),
        "mood": entry.get("mood", "reflective"),
        "tags": entry.get("tags", []),
        "content": entry.get("content", ""),
        "signature": entry.get("signature", ""),
        "createdAt": entry.get("createdAt", ""),
        "updatedAt": entry.get("updatedAt", ""),
    }
    plaintext = json.dumps(clean_entry, ensure_ascii=False)
    salt = crypto.new_salt()

    if isinstance(password_or_key, str):
        key = crypto.derive_key(password_or_key, salt=salt)
    else:
        # If raw 32-byte key is given, derive a unique key with salt to prevent nonce/key reuse
        kdf_salt = salt
        key = crypto.derive_key(password_or_key.hex(), salt=kdf_salt)

    blob = crypto.encrypt(plaintext, key=key)
    return {
        "format": ENCRYPTED_FORMAT_TAG,
        "version": SCHEMA_VERSION,
        "id": clean_entry["id"],
        "date": clean_entry["date"],
        "salt": base64.b64encode(salt).decode("ascii"),
        "nonce": base64.b64encode(blob.nonce).decode("ascii"),
        "ciphertext": base64.b64encode(blob.ciphertext).decode("ascii"),
    }


def decrypt_entry_data(payload: dict[str, Any], password_or_key: Union[str, bytes]) -> dict[str, Any]:
    """Decrypt a portable encrypted envelope back to entry dictionary."""
    if payload.get("format") != ENCRYPTED_FORMAT_TAG:
        raise ValueError("Invalid encrypted entry format")

    salt = base64.b64decode(payload["salt"])
    nonce = base64.b64decode(payload["nonce"])
    ciphertext = base64.b64decode(payload["ciphertext"])

    if isinstance(password_or_key, str):
        key = crypto.derive_key(password_or_key, salt=salt)
    else:
        key = crypto.derive_key(password_or_key.hex(), salt=salt)

    blob = crypto.EncryptedBlob(nonce=nonce, ciphertext=ciphertext)
    try:
        plaintext = crypto.decrypt(blob, key=key)
        return json.loads(plaintext)
    except Exception as err:
        raise ValueError("Invalid decryption password or corrupted entry payload") from err


# ==============================================================================
# Plaintext Exporters
# ==============================================================================

def export_to_json(entries: list[dict[str, Any]], user_info: Optional[dict[str, Any]] = None) -> str:
    """Export entries to standard Vellichor JSON format."""
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_entries = []
    for e in entries:
        clean_entries.append({
            "id": e.get("id", ""),
            "title": e.get("title", ""),
            "date": e.get("date", ""),
            "mood": e.get("mood", "reflective"),
            "tags": e.get("tags", []),
            "content": e.get("content", ""),
            "signature": e.get("signature", ""),
            "createdAt": e.get("createdAt", ""),
            "updatedAt": e.get("updatedAt", ""),
        })

    data = {
        "$schema": SCHEMA_URI,
        "version": SCHEMA_VERSION,
        "generator": "Vellichor Diary System",
        "exportedAt": now_iso,
        "user": user_info or {},
        "count": len(clean_entries),
        "entries": clean_entries,
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def export_to_markdown(entries: list[dict[str, Any]]) -> str:
    """Export one or multiple entries as Markdown."""
    if len(entries) == 1:
        return entry_to_frontmatter_markdown(entries[0])

    blocks = []
    for idx, e in enumerate(entries, 1):
        md = entry_to_frontmatter_markdown(e)
        blocks.append(md.strip())

    return "\n\n<!-- vellichor:entry:boundary -->\n\n".join(blocks) + "\n"


def export_to_zip(
    entries: list[dict[str, Any]],
    user_info: Optional[dict[str, Any]] = None,
    mode: str = "plaintext",
    password: Optional[Union[str, bytes]] = None,
) -> bytes:
    """
    Package entries as a compressed ZIP backup archive.
    - If mode == "encrypted": Each file in entries/ is an individual .vellichor encrypted file.
    - If mode == "plaintext": Each file in entries/ is an individual .md file.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        now_iso = datetime.now(timezone.utc).isoformat()
        is_encrypted = (mode == "encrypted")

        # 1. Manifest
        manifest_data = {
            "format": ENCRYPTED_BACKUP_TAG if is_encrypted else "vellichor-plaintext-backup-v1",
            "version": SCHEMA_VERSION,
            "generator": "Vellichor Diary System",
            "exportedAt": now_iso,
            "isEncrypted": is_encrypted,
            "user": user_info or {},
            "count": len(entries),
        }
        zf.writestr("manifest.json", json.dumps(manifest_data, ensure_ascii=False, indent=2).encode("utf-8"))

        if not is_encrypted:
            json_content = export_to_json(entries, user_info=user_info)
            zf.writestr("vellichor-backup.json", json_content.encode("utf-8"))

        # 2. README guide
        readme_lines = [
            "# Vellichor Diary Backup Archive",
            "",
            f"Exported At: {now_iso}",
            f"Total Entries: {len(entries)}",
            f"Security Mode: {'Encrypted (AES-GCM-256)' if is_encrypted else 'Plaintext'}",
            f"User: {(user_info or {}).get('penName', 'Anonymous')} ({(user_info or {}).get('username', '')})",
            "",
            "## Contents",
        ]
        if is_encrypted:
            readme_lines.extend([
                "- `manifest.json`: Backup metadata.",
                "- `entries/*.vellichor`: Individual encrypted entries (AES-256-GCM).",
                "",
                "## How to Restore",
                "Use Vellichor Web '隨筆匯入' or CLI `python -m vellichor cli import --input <archive.zip>`",
                "Enter your decryption password to import into your encrypted journal.",
            ])
        else:
            readme_lines.extend([
                "- `vellichor-backup.json`: Structured backup manifest.",
                "- `entries/*.md`: Individual Markdown entries with YAML frontmatter.",
                "",
                "## How to Restore",
                "In Vellichor, select '隨筆匯入' and upload this archive or any individual .md file.",
            ])
        zf.writestr("README.md", "\n".join(readme_lines).encode("utf-8"))

        # 3. Individual files in entries/ folder
        used_names: set[str] = set()
        for idx, e in enumerate(entries, 1):
            date_str = str(e.get("date") or e.get("createdAt") or "undated")[:10]
            title_slug = _sanitize_filename(e.get("title") or "entry")
            ext = ".vellichor" if is_encrypted else ".md"
            base_filename = f"entries/{date_str}-{title_slug}"
            filename = f"{base_filename}{ext}"
            counter = 1
            while filename in used_names:
                filename = f"{base_filename}-{counter}{ext}"
                counter += 1
            used_names.add(filename)

            if is_encrypted:
                if not password:
                    raise ValueError("Password is required for encrypted export")
                enc_data = encrypt_entry_data(e, password)
                zf.writestr(filename, json.dumps(enc_data, ensure_ascii=False, indent=2).encode("utf-8"))
            else:
                md_content = entry_to_frontmatter_markdown(e)
                zf.writestr(filename, md_content.encode("utf-8"))

    buf.seek(0)
    return buf.getvalue()


# ==============================================================================
# Directory-Based Export / Import (One File Per Diary)
# ==============================================================================

def export_to_directory(
    entries: list[dict[str, Any]],
    target_dir: Union[str, Path],
    mode: str = "encrypted",
    password: Optional[Union[str, bytes]] = None,
    format: str = "markdown",
) -> int:
    """Export each entry as an individual file into target_dir."""
    p = Path(target_dir)
    p.mkdir(parents=True, exist_ok=True)
    is_encrypted = (mode == "encrypted")

    count = 0
    for e in entries:
        date_str = str(e.get("date") or e.get("createdAt") or "undated")[:10]
        title_slug = _sanitize_filename(e.get("title") or "entry")
        
        if is_encrypted:
            if not password:
                raise ValueError("Password is required for encrypted export")
            enc_data = encrypt_entry_data(e, password)
            filename = p / f"{date_str}-{title_slug}.vellichor"
            filename.write_text(json.dumps(enc_data, ensure_ascii=False, indent=2), encoding="utf-8")
        else:
            if format == "json":
                filename = p / f"{date_str}-{title_slug}.json"
                filename.write_text(json.dumps(e, ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                filename = p / f"{date_str}-{title_slug}.md"
                filename.write_text(entry_to_frontmatter_markdown(e), encoding="utf-8")
        count += 1
    return count


def import_from_directory(
    source_dir: Union[str, Path],
    password: Optional[Union[str, bytes]] = None,
) -> list[dict[str, Any]]:
    """Scan and import all individual diary files from a directory."""
    p = Path(source_dir)
    if not p.is_dir():
        raise ValueError(f"Not a directory: {source_dir}")

    results: list[dict[str, Any]] = []
    # Collect all candidate files
    files = sorted([f for f in p.glob("*") if f.is_file()])
    for f in files:
        if f.name.startswith("."):
            continue
        lower_name = f.name.lower()
        if lower_name.endswith((".md", ".markdown", ".txt", ".json", ".vellichor")):
            try:
                raw_bytes = f.read_bytes()
                parsed = parse_import_payload(f.name, raw_bytes, password=password)
                results.extend(parsed)
            except Exception:
                continue
    return results


# ==============================================================================
# Parsers & Deserializers
# ==============================================================================

def parse_frontmatter_markdown(text: str) -> dict[str, Any]:
    """Parse a single Markdown string containing YAML frontmatter."""
    text = text.replace("\r\n", "\n")
    if not text.startswith("---"):
        lines = text.strip().split("\n")
        title = lines[0].strip("# \t") if lines else "Untitled"
        content = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""
        return {"title": title, "content": content, "tags": [], "mood": "reflective"}

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {"title": "Untitled", "content": text.strip(), "tags": [], "mood": "reflective"}

    fm_raw = parts[1]
    content = parts[2].strip()

    meta: dict[str, Any] = {}
    tags: list[str] = []
    in_tags = False

    for raw_line in fm_raw.split("\n"):
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("tags:"):
            in_tags = True
            tag_val = line[len("tags:"):].strip()
            if tag_val.startswith("[") and tag_val.endswith("]"):
                clean = tag_val[1:-1].strip()
                if clean:
                    tags = [t.strip().strip("'\"") for t in clean.split(",") if t.strip()]
                in_tags = False
            continue

        if in_tags:
            if line.startswith("- "):
                tag_item = line[2:].strip().strip("'\"")
                if tag_item:
                    tags.append(tag_item)
                continue
            else:
                in_tags = False

        if ":" in line:
            k, v = line.split(":", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            meta[k] = v

    meta["tags"] = tags
    meta["content"] = content
    if not meta.get("title"):
        meta["title"] = "Untitled"
    return meta


def parse_markdown_entries(text: str) -> list[dict[str, Any]]:
    """Parse a Markdown document that may contain one or multiple entries."""
    if "<!-- vellichor:entry:boundary -->" in text:
        chunks = text.split("<!-- vellichor:entry:boundary -->")
    else:
        chunks = [text]

    results: list[dict[str, Any]] = []
    for chunk in chunks:
        c = chunk.strip()
        if not c:
            continue
        entry = parse_frontmatter_markdown(c)
        if entry.get("title") or entry.get("content"):
            results.append(entry)
    if not results:
        raise ValueError("Markdown 隨筆格式無效：未包含任何有效標題或內容")
    return results


def parse_json_entries(text: str) -> list[dict[str, Any]]:
    """Parse entries from JSON string with strict schema checks."""
    try:
        data = json.loads(text)
    except Exception as e:
        raise ValueError("JSON 格式損毀或語法無效，無法解析") from e

    entries: list[Any] = []
    if isinstance(data, list):
        entries = data
    elif isinstance(data, dict):
        if "entries" in data and isinstance(data["entries"], list):
            entries = data["entries"]
        elif "title" in data or "content" in data:
            entries = [data]
        else:
            raise ValueError("JSON 檔案不符合 Vellichor 隨筆規格（缺少 entries 列表或 title/content 欄位）")
    else:
        raise ValueError("JSON 結構無效（需為隨筆陣列或物件）")

    valid_entries: list[dict[str, Any]] = []
    for item in entries:
        if isinstance(item, dict):
            title = str(item.get("title") or "").strip()
            content = str(item.get("content") or "").strip()
            if title or content:
                valid_entries.append(item)

    if not valid_entries:
        raise ValueError("檔案中未找到任何符合格式的有效隨筆（標題與內容皆為空）")
    return valid_entries


def parse_zip_entries(zip_bytes: bytes, password: Optional[Union[str, bytes]] = None) -> list[dict[str, Any]]:
    """Extract and parse entries from a ZIP backup archive (supports both plaintext and encrypted)."""
    try:
        buf = io.BytesIO(zip_bytes)
        zf = zipfile.ZipFile(buf, "r")
    except Exception as e:
        raise ValueError("ZIP 壓縮檔案已損毀或無法開啟") from e

    with zf:
        names = zf.namelist()

        # 1. Parse any .vellichor encrypted entry files
        encrypted_files = [n for n in names if n.lower().endswith(".vellichor")]
        if encrypted_files:
            if not password:
                raise ValueError("此備份壓縮包為加密格式，請輸入解密密碼以還原隨筆")
            results: list[dict[str, Any]] = []
            for n in encrypted_files:
                try:
                    raw_json = json.loads(zf.read(n).decode("utf-8", errors="replace"))
                    decrypted = decrypt_entry_data(raw_json, password)
                    results.append(decrypted)
                except Exception as e:
                    raise ValueError(f"隨筆條目解密失敗（{n}）：密碼錯誤或密文損毀") from e
            if results:
                return results
            raise ValueError("加密壓縮包中未包含任何可還原之隨筆")

        # 2. Check for manifest / backup JSON
        manifest_name = next((n for n in names if n.endswith("vellichor-backup.json")), None)
        if manifest_name:
            try:
                manifest_text = zf.read(manifest_name).decode("utf-8", errors="replace")
                entries = parse_json_entries(manifest_text)
                if entries:
                    return entries
            except Exception as e:
                raise ValueError(f"壓縮包內的備份 JSON 不符合規格：{e}") from e

        # 3. Parse all .md files in the archive
        results = []
        for n in names:
            if n.lower().endswith(".md") and not n.lower().endswith("readme.md") and not n.startswith("__MACOSX"):
                try:
                    content_str = zf.read(n).decode("utf-8", errors="replace")
                    parsed = parse_frontmatter_markdown(content_str)
                    if parsed.get("title") or parsed.get("content"):
                        results.append(parsed)
                except Exception:
                    continue

        if results:
            return results

        # 4. Fallback check any .json files
        for n in names:
            if n.lower().endswith(".json") and not n.startswith("__MACOSX"):
                try:
                    json_str = zf.read(n).decode("utf-8", errors="replace")
                    parsed_json = parse_json_entries(json_str)
                    if parsed_json:
                        return parsed_json
                except Exception:
                    continue

    raise ValueError("ZIP 壓縮檔案中未包含任何符合 Vellichor 規格的隨筆檔案（需含 .vellichor、.md 或 vellichor-backup.json）")


def parse_import_payload(
    filename: str,
    raw_bytes: bytes,
    password: Optional[Union[str, bytes]] = None,
) -> list[dict[str, Any]]:
    """Automatically detect format by filename and content and return parsed entry dictionaries."""
    if not raw_bytes or len(raw_bytes.strip()) == 0:
        raise ValueError("上傳的檔案為空檔案，無法處理")

    lower_name = filename.lower()
    if lower_name.endswith(".zip"):
        return parse_zip_entries(raw_bytes, password=password)

    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("檔案格式無效：僅支援 UTF-8 編碼之文字檔（.md, .json, .vellichor）或 ZIP 壓縮包")

    # If it is a .vellichor file or contains encrypted JSON format tag
    if lower_name.endswith(".vellichor") or '"format": "vellichor-encrypted-entry-v1"' in text:
        if not password:
            raise ValueError("此檔案為 Vellichor 獨立加密隨筆，需要輸入解密密碼")
        try:
            payload = json.loads(text)
        except Exception:
            raise ValueError("加密檔案內容損毀，無法解析 JSON 結構")
        decrypted = decrypt_entry_data(payload, password)
        if not isinstance(decrypted, dict) or (not decrypted.get("title") and not decrypted.get("content")):
            raise ValueError("解密後的隨筆內容不符合格式規格")
        return [decrypted]

    if lower_name.endswith(".json"):
        return parse_json_entries(text)

    if lower_name.endswith((".md", ".markdown", ".txt")):
        return parse_markdown_entries(text)

    # Unknown extension: try encrypted JSON first, then JSON, then Markdown
    try:
        data = json.loads(text)
        if isinstance(data, dict) and data.get("format") == ENCRYPTED_FORMAT_TAG:
            if not password:
                raise ValueError("此檔案為加密隨筆，需要解密密碼")
            return [decrypt_entry_data(data, password)]
        return parse_json_entries(text)
    except Exception:
        return parse_markdown_entries(text)
