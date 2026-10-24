#!/usr/bin/env python3
"""ตรวจเงื่อนไขของ NGSL (CLAUDE.md ข้อ 1)

1. ไฟล์ต้นฉบับใน ngsl-source/ ต้องไม่ถูกแก้ (SHA-256 ตรงกับ SOURCE.md)
2. ข้อความเครดิตทางการ ลิงก์ license และลิงก์เว็บทางการ ต้องอยู่ครบทุกไฟล์ที่กำหนด
3. ห้ามมีลิงก์ไปโดเมน .org ของ NGSL ซึ่งไม่ใช่เว็บทางการแล้ว
4. คอลัมน์ของ NGSL (rank, headword, forms) ในชุดข้อมูลทุกด่านต้องตรงกับไฟล์ต้นฉบับ ครบทุกคำ ไม่ขาด ไม่เกิน

    python3 scripts/check_ngsl.py
"""

from __future__ import annotations

import hashlib
import os
import re
import subprocess
import sys
from pathlib import Path

import ngsl_data

ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = "ngsl-source"
SOURCE_NOTE = "SOURCE.md"

OFFICIAL_ATTRIBUTION = (
    "New General Service List by Browne, C., Culligan, B., and Phillips, J. "
    "is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License."
)
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"
OFFICIAL_SITE = "https://www.newgeneralservicelist.com"
# เขียนแยกเป็น 2 ส่วน เพื่อไม่ให้สคริปต์นี้ถูกตรวจเจอเอง
UNOFFICIAL_DOMAIN = "newgeneralservicelist" + ".org"

# ไฟล์ที่ต้องมีเครดิต NGSL ครบ (SOURCE.md ของทุกเวอร์ชันถูกรวมให้อัตโนมัติ)
ATTRIBUTION_FILES = ["README.md", "app/data/LICENSE", "app/index.html"]

CHECKSUM_LINE_RE = re.compile(r"^([0-9a-f]{64})  (\S+)$", re.MULTILINE)


def source_dirs(root: Path) -> list[Path]:
    base = root / SOURCE_ROOT
    if not base.is_dir():
        return []
    return sorted(path for path in base.iterdir() if path.is_dir())


def check_sources(root: Path) -> list[str]:
    folders = source_dirs(root)
    if not folders:
        return [f"ไม่พบไฟล์ต้นฉบับ NGSL ใน {SOURCE_ROOT}/"]
    errors = []
    for folder in folders:
        rel = folder.relative_to(root).as_posix()
        note = folder / SOURCE_NOTE
        if not note.is_file():
            errors.append(f"{rel}/ ต้องมี {SOURCE_NOTE} ที่บันทึกที่มาและ SHA-256")
            continue
        listed = {name: digest for digest, name in CHECKSUM_LINE_RE.findall(note.read_text(encoding="utf-8"))}
        if not listed:
            errors.append(f"{rel}/{SOURCE_NOTE} ไม่มีรายการ SHA-256")
        for name, digest in sorted(listed.items()):
            path = folder / name
            if not path.is_file():
                errors.append(f"ไม่พบไฟล์ต้นฉบับ {rel}/{name}")
            elif hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                errors.append(f"{rel}/{name} ถูกแก้ไข (SHA-256 ไม่ตรงกับ {SOURCE_NOTE}) ห้ามแก้ไฟล์ต้นฉบับของ NGSL")
        for path in sorted(folder.iterdir()):
            if path.name != SOURCE_NOTE and path.name not in listed:
                errors.append(f"{rel}/{path.name} ไม่ได้บันทึก SHA-256 ไว้ใน {SOURCE_NOTE}")
    return errors


def check_attribution(root: Path) -> list[str]:
    notes = [folder / SOURCE_NOTE for folder in source_dirs(root)]
    files = ATTRIBUTION_FILES + [note.relative_to(root).as_posix() for note in notes if note.is_file()]
    errors = []
    for rel in files:
        path = root / rel
        if not path.is_file():
            errors.append(f"ไม่พบ {rel} ซึ่งต้องมีเครดิต NGSL")
            continue
        # รวมช่องว่างและการขึ้นบรรทัดใหม่ เผื่อข้อความเครดิตถูกตัดบรรทัด
        text = " ".join(path.read_text(encoding="utf-8").split())
        if OFFICIAL_ATTRIBUTION not in text:
            errors.append(f"{rel} ไม่มีข้อความเครดิตทางการของ NGSL")
        if LICENSE_URL not in text:
            errors.append(f"{rel} ไม่มีลิงก์ license {LICENSE_URL}")
        if OFFICIAL_SITE not in text:
            errors.append(f"{rel} ไม่มีลิงก์เว็บทางการ {OFFICIAL_SITE}")
    return errors


def repo_files(root: Path) -> list[Path]:
    """ไฟล์ทั้งหมดใน repo ยกเว้นที่ .gitignore ไว้ ถ้าไม่ใช่ git repo ให้ไล่ทั้งโฟลเดอร์"""
    listed = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        capture_output=True,
    )
    if listed.returncode == 0:
        return [root / name for name in listed.stdout.decode("utf-8").split("\0") if name]
    return [path for path in root.rglob("*") if ".git" not in path.relative_to(root).parts]


def check_unofficial_links(root: Path) -> list[str]:
    needle = UNOFFICIAL_DOMAIN.encode("ascii")
    errors = []
    for path in repo_files(root):
        rel = path.relative_to(root).as_posix()
        # ไฟล์ต้นฉบับเป็นข้อความของทีม NGSL ซึ่งห้ามแก้ และตรวจด้วย SHA-256 แยกอยู่แล้ว
        if rel.startswith(SOURCE_ROOT + "/") or not path.is_file():
            continue
        if needle in path.read_bytes().lower():
            errors.append(f"{rel} มีลิงก์ไปโดเมน .org ของ NGSL ซึ่งไม่ใช่เว็บทางการ ให้ใช้ {OFFICIAL_SITE} แทน")
    return errors


def check_dataset(root: Path) -> list[str]:
    try:
        expected = ngsl_data.load_base_rows(root)
    except (OSError, KeyError, ValueError, IndexError) as error:
        return [f"อ่านไฟล์ต้นฉบับ NGSL เพื่อตรวจชุดข้อมูลไม่ได้ ({error!r})"]

    names = ngsl_data.level_names()
    errors = []
    present = {path.stem for path in (root / ngsl_data.LEVELS_DIR).glob("*.tsv")}
    for name in sorted(present - set(names)):
        errors.append(f"{ngsl_data.LEVELS_DIR}/{name}.tsv ไม่ใช่ไฟล์ด่านที่กำหนดไว้")

    for name in names:
        rel = f"{ngsl_data.LEVELS_DIR}/{name}.tsv"
        path = ngsl_data.level_path(root, name)
        if not path.is_file():
            errors.append(f"ไม่พบไฟล์ด่าน {rel} (รัน scripts/build_skeleton.py)")
            continue
        header, rows = ngsl_data.read_level(path)
        if header != ngsl_data.COLUMNS:
            errors.append(f"{rel} หัวตารางต้องเป็น {', '.join(ngsl_data.COLUMNS)}")
        want = [(row.rank, row.headword, row.forms) for row in expected if row.level == name]
        got = [tuple(row[:len(ngsl_data.NGSL_COLUMNS)]) for row in rows]
        if len(got) != len(want):
            errors.append(f"{rel} ต้องมี {len(want)} คำตาม NGSL (ตอนนี้มี {len(got)})")
        mismatches = [(line, row, base) for line, (row, base) in enumerate(zip(got, want), start=2) if row != base]
        for line, row, base in mismatches[:5]:
            errors.append(
                f"{rel} บรรทัด {line}: คอลัมน์ของ NGSL ต้องเป็น {' / '.join(base)} (ตอนนี้เป็น {' / '.join(row)}) ห้ามแก้ข้อมูลของ NGSL"
            )
        if len(mismatches) > 5:
            errors.append(f"{rel} มีบรรทัดที่ไม่ตรงกับ NGSL อีก {len(mismatches) - 5} บรรทัด")
    return errors


def run_checks(root: Path) -> list[str]:
    return check_sources(root) + check_attribution(root) + check_unofficial_links(root) + check_dataset(root)


def report_error(message: str) -> None:
    if os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::error::{message}")
    else:
        print(f"❌ {message}", file=sys.stderr)


def main() -> int:
    errors = run_checks(ROOT)
    for error in errors:
        report_error(error)
    if errors:
        print(f"พบปัญหา {len(errors)} ข้อ ดูกฎข้อ 1 ใน CLAUDE.md", file=sys.stderr)
        return 1
    print("✅ ผ่านการตรวจเงื่อนไข NGSL")
    return 0


if __name__ == "__main__":
    sys.exit(main())
