#!/usr/bin/env python3
"""ตรวจรูปแบบคอลัมน์ภาษาไทยในชุดข้อมูล app/data/levels/ (กติกาใน docs/translation-guide.md)

คำที่ยังไม่แปลต้องเว้นคอลัมน์ภาษาไทยว่างทั้งหมด คำที่เริ่มแปลแล้วต้องมี meanings,
example_en และ example_th ครบ ส่วน note ใส่หรือไม่ก็ได้

    python3 scripts/validate_data.py
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import ngsl_data

ROOT = Path(__file__).resolve().parent.parent

PARTS_OF_SPEECH = {"n", "v", "adj", "adv", "pron", "prep", "conj", "det", "num", "int", "aux", "modal"}
SENSE_SEPARATOR = " | "
SENSE_RE = re.compile(r"([a-z]+): ([^|\s][^|]*)")
THAI_RE = re.compile(r"[฀-๿]")
REQUIRED = ["meanings", "example_en", "example_th"]


def check_meanings(meanings: str) -> list[str]:
    problems = []
    for sense in meanings.split(SENSE_SEPARATOR):
        match = SENSE_RE.fullmatch(sense)
        if not match:
            problems.append(f'ความหมาย "{sense}" ต้องเป็นรูปแบบ "ชนิดคำ: คำแปล"')
        elif match.group(1) not in PARTS_OF_SPEECH:
            problems.append(f'ชนิดคำ "{match.group(1)}" ไม่อยู่ในรายการ ({", ".join(sorted(PARTS_OF_SPEECH))})')
        elif not THAI_RE.search(match.group(2)):
            problems.append(f'ความหมาย "{sense}" ต้องมีคำแปลภาษาไทย')
    return problems


def uses_word(sentence: str, words: list[str]) -> bool:
    return any(re.search(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", sentence, re.IGNORECASE) for word in words)


def check_row(row: list[str]) -> list[str]:
    if len(row) != len(ngsl_data.COLUMNS):
        return [f"ต้องมี {len(ngsl_data.COLUMNS)} คอลัมน์ (ตอนนี้มี {len(row)})"]
    fields = dict(zip(ngsl_data.COLUMNS, row))
    problems = [f"{name} มีช่องว่างหัวหรือท้าย" for name, value in fields.items() if value != value.strip()]

    if not any(fields[name] for name in ngsl_data.THAI_COLUMNS):
        return problems  # ยังไม่แปล
    missing = [name for name in REQUIRED if not fields[name]]
    if missing:
        return problems + [f"เริ่มแปลแล้วแต่ยังขาด {', '.join(missing)}"]

    problems += check_meanings(fields["meanings"])
    words = [fields["headword"]] + [form for form in fields["forms"].split(ngsl_data.FORMS_SEPARATOR) if form]
    if not uses_word(fields["example_en"], words):
        problems.append("example_en ต้องมีคำหลักหรือรูปคำของคำนี้อยู่ในประโยค")
    if not THAI_RE.search(fields["example_th"]):
        problems.append("example_th ต้องเป็นภาษาไทย")
    return problems


def validate(root: Path) -> tuple[list[str], int, int]:
    """คืนรายการปัญหา จำนวนคำที่แปลแล้ว และจำนวนคำทั้งหมด"""
    errors = []
    translated = total = 0
    for name in ngsl_data.level_names():
        path = ngsl_data.level_path(root, name)
        if not path.is_file():
            continue  # check_ngsl.py รายงานไฟล์ที่หายไปแล้ว
        rel = path.relative_to(root).as_posix()
        raw = path.read_bytes()
        if b"\r" in raw:
            errors.append(f"{rel} ต้องใช้ line ending แบบ LF")
        _, rows = ngsl_data.read_level(path)
        for line, row in enumerate(rows, start=2):
            total += 1
            translated += bool(len(row) == len(ngsl_data.COLUMNS) and row[3])
            for problem in check_row(row):
                errors.append(f"{rel} บรรทัด {line} ({row[1] if len(row) > 1 else '?'}): {problem}")
    return errors, translated, total


def report_error(message: str) -> None:
    if os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::error::{message}")
    else:
        print(f"❌ {message}", file=sys.stderr)


def main() -> int:
    errors, translated, total = validate(ROOT)
    for error in errors:
        report_error(error)
    if errors:
        print(f"พบปัญหา {len(errors)} ข้อ ดู docs/translation-guide.md", file=sys.stderr)
        return 1
    print(f"✅ รูปแบบชุดข้อมูลถูกต้อง (แปลแล้ว {translated}/{total} คำ)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
