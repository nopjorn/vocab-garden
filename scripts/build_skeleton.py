#!/usr/bin/env python3
"""สร้างไฟล์ชุดข้อมูลทุกด่านใน app/data/levels/ จากไฟล์ต้นฉบับ NGSL

คอลัมน์ของ NGSL (rank, headword, forms) ถูกเขียนใหม่จากต้นฉบับทุกครั้ง
ส่วนคอลัมน์ภาษาไทยที่มีอยู่แล้วจะถูกเก็บไว้ตามคำหลัก รันซ้ำได้โดยไม่ทับคำแปล

    python3 scripts/build_skeleton.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import ngsl_data

ROOT = Path(__file__).resolve().parent.parent


def existing_translations(root: Path) -> dict[str, list[str]]:
    translations = {}
    for path in sorted((root / ngsl_data.LEVELS_DIR).glob("*.tsv")):
        _, rows = ngsl_data.read_level(path)
        for row in rows:
            row = row + [""] * (len(ngsl_data.COLUMNS) - len(row))
            translations[row[1]] = row[len(ngsl_data.NGSL_COLUMNS):len(ngsl_data.COLUMNS)]
    return translations


def build(root: Path) -> dict[str, int]:
    translations = existing_translations(root)
    empty = [""] * len(ngsl_data.THAI_COLUMNS)
    levels: dict[str, list[list[str]]] = {name: [] for name in ngsl_data.level_names()}
    for base in ngsl_data.load_base_rows(root):
        levels[base.level].append([base.rank, base.headword, base.forms] + translations.get(base.headword, empty))
    for name, rows in levels.items():
        ngsl_data.write_level(ngsl_data.level_path(root, name), rows)
    return {name: len(rows) for name, rows in levels.items()}


def main() -> int:
    counts = build(ROOT)
    print(f"✅ สร้าง {len(counts)} ไฟล์ รวม {sum(counts.values())} คำ")
    return 0


if __name__ == "__main__":
    sys.exit(main())
