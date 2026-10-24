#!/usr/bin/env python3
"""เลข version และ CHANGELOG ของ Vocab Garden (กติกาใน CLAUDE.md ข้อ 2)

    python3 scripts/versioning.py check --base-ref origin/main
        ตรวจว่า version ขยับจาก base ทีละขั้น และ CHANGELOG มีหัวข้อของเวอร์ชันนี้อยู่บนสุด
    python3 scripts/versioning.py current
        พิมพ์เลข version ปัจจุบัน
    python3 scripts/versioning.py notes [VERSION]
        พิมพ์เนื้อหา CHANGELOG ของเวอร์ชันนั้น ใช้เป็น release notes
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple, Optional

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = "app/version.js"
CHANGELOG_FILE = "CHANGELOG.md"

VERSION_RE = re.compile(r'VG_VERSION\s*=\s*"([^"]*)"')
SEMVER_RE = re.compile(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)")
HEADING_RE = re.compile(r"^## (.*)$", re.MULTILINE)
VERSION_HEADING_RE = re.compile(r"\[([^\]]+)\] - (\d{4}-\d{2}-\d{2})")
LIST_ITEM_RE = re.compile(r"^\s*[-*] \S", re.MULTILINE)


class CheckError(Exception):
    """ปัญหาที่ต้องแจ้งผู้ใช้ (ข้อความภาษาไทย)"""


class Entry(NamedTuple):
    version: str
    date: str
    body: str


def parse_semver(text: str) -> tuple[int, int, int]:
    match = SEMVER_RE.fullmatch(text)
    if not match:
        raise CheckError(f'"{text}" ไม่ใช่เลข version แบบ x.y.z')
    major, minor, patch = (int(part) for part in match.groups())
    return major, minor, patch


def read_version(js_source: str) -> str:
    match = VERSION_RE.search(js_source)
    if not match:
        raise CheckError(f"ไม่พบ VG_VERSION ใน {VERSION_FILE}")
    parse_semver(match.group(1))
    return match.group(1)


def next_versions(base: str) -> list[str]:
    major, minor, patch = parse_semver(base)
    return [f"{major}.{minor}.{patch + 1}", f"{major}.{minor + 1}.0", f"{major + 1}.0.0"]


def check_bump(base: str, head: str) -> None:
    parse_semver(head)
    allowed = next_versions(base)
    if head not in allowed:
        raise CheckError(
            f"version ต้องขยับจาก {base} ทีละขั้น เป็น {' / '.join(allowed)} อย่างใดอย่างหนึ่ง (ตอนนี้เป็น {head})"
        )


def parse_changelog(text: str) -> list[Entry]:
    """แยก CHANGELOG เป็นรายเวอร์ชันตามลำดับในไฟล์ ทุกหัวข้อ ## ต้องเป็นหัวข้อเวอร์ชัน"""
    headings = list(HEADING_RE.finditer(text))
    entries = []
    for index, heading in enumerate(headings):
        title = heading.group(1).strip()
        match = VERSION_HEADING_RE.fullmatch(title)
        if not match:
            raise CheckError(f'หัวข้อ "## {title}" ใน CHANGELOG ต้องเป็นรูปแบบ "## [x.y.z] - YYYY-MM-DD"')
        version, date = match.groups()
        parse_semver(version)
        try:
            dt.datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise CheckError(f"วันที่ของเวอร์ชัน {version} ใน CHANGELOG ไม่ถูกต้อง ({date})") from None
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        entries.append(Entry(version, date, text[heading.end():end].strip()))
    return entries


def check_changelog(text: str, version: str) -> None:
    entries = parse_changelog(text)
    if not entries:
        raise CheckError("CHANGELOG ยังไม่มีหัวข้อเวอร์ชันเลย")
    if entries[0].version != version:
        raise CheckError(f"หัวข้อบนสุดของ CHANGELOG ต้องเป็นเวอร์ชัน {version} (ตอนนี้เป็น {entries[0].version})")
    if not LIST_ITEM_RE.search(entries[0].body):
        raise CheckError(f"เวอร์ชัน {version} ใน CHANGELOG ต้องมีรายการการเปลี่ยนแปลงอย่างน้อย 1 ข้อ")
    versions = [parse_semver(entry.version) for entry in entries]
    if any(newer <= older for newer, older in zip(versions, versions[1:])):
        raise CheckError("CHANGELOG ต้องเรียงจากเวอร์ชันใหม่ไปเก่า และห้ามมีเวอร์ชันซ้ำ")


def find_notes(text: str, version: str) -> str:
    for entry in parse_changelog(text):
        if entry.version == version:
            return entry.body
    raise CheckError(f"ไม่พบเวอร์ชัน {version} ใน CHANGELOG")


def read_text(root: Path, rel: str) -> str:
    path = root / rel
    if not path.is_file():
        raise CheckError(f"ไม่พบไฟล์ {rel}")
    return path.read_text(encoding="utf-8")


def current_version(root: Path) -> str:
    return read_version(read_text(root, VERSION_FILE))


def git_show(root: Path, ref: str, rel: str) -> Optional[str]:
    """อ่านไฟล์จาก git ref คืน None ถ้า ref นั้นยังไม่มีไฟล์นี้"""
    verify = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"],
        capture_output=True,
    )
    if verify.returncode != 0:
        raise CheckError(f"ไม่พบ git ref {ref} (ลอง git fetch origin main ก่อน)")
    shown = subprocess.run(
        ["git", "-C", str(root), "show", f"{ref}:{rel}"],
        capture_output=True,
        encoding="utf-8",
    )
    return shown.stdout if shown.returncode == 0 else None


def run_check(root: Path, base_ref: str) -> str:
    head = current_version(root)
    base_source = git_show(root, base_ref, VERSION_FILE)
    base = read_version(base_source) if base_source is not None else "0.0.0"
    check_bump(base, head)
    check_changelog(read_text(root, CHANGELOG_FILE), head)
    return f"✅ version {base} → {head} และ CHANGELOG ถูกต้อง"


def report_error(message: str) -> None:
    if os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::error::{message}")
    else:
        print(f"❌ {message}", file=sys.stderr)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="เลข version และ CHANGELOG ของ Vocab Garden")
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("check", help="ตรวจการขยับ version และ CHANGELOG เทียบกับ base")
    check.add_argument("--base-ref", default="origin/main")
    commands.add_parser("current", help="พิมพ์เลข version ปัจจุบัน")
    notes = commands.add_parser("notes", help="พิมพ์เนื้อหา CHANGELOG ของเวอร์ชันนั้น")
    notes.add_argument("version", nargs="?")
    args = parser.parse_args(argv)

    try:
        if args.command == "check":
            print(run_check(ROOT, args.base_ref))
        elif args.command == "current":
            print(current_version(ROOT))
        else:
            version = args.version or current_version(ROOT)
            print(find_notes(read_text(ROOT, CHANGELOG_FILE), version))
    except CheckError as error:
        report_error(str(error))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
