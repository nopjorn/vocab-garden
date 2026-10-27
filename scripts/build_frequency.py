#!/usr/bin/env python3
"""สร้าง app/data/frequency.tsv จากไฟล์ stats ของ NGSL (ใช้ดูอันดับความถี่ ตรงกับวัตถุประสงค์ของไฟล์ stats)

ไฟล์ผลลัพธ์มี 2 คอลัมน์ rank กับ per_million (Adjusted Frequency per Million) ของคำที่มีอันดับ 2,809 คำ
แอปใช้ประมาณว่าคำที่ปลูกแล้วครอบคลุมข้อความได้ราวกี่เปอร์เซ็นต์ CI ตรวจว่าไฟล์นี้ตรงกับไฟล์ต้นฉบับ

    python3 scripts/build_frequency.py          # เขียนไฟล์
    python3 scripts/build_frequency.py --check  # แค่ตรวจว่าตรงกับไฟล์ต้นฉบับ
"""

from __future__ import annotations

import sys
from pathlib import Path

import ngsl_data

ROOT = Path(__file__).resolve().parent.parent
FREQUENCY_PATH = "app/data/frequency.tsv"
HEADER = "rank\tper_million"


def build(root: Path = ROOT) -> str:
    stats = ngsl_data.read_csv_rows(root / ngsl_data.SOURCE_DIR / ngsl_data.STATS_FILE)[1:]  # ข้ามหัวตาราง
    rows = sorted(((int(row[1]), row[3]) for row in stats), key=lambda pair: pair[0])
    return "\n".join([HEADER] + [f"{rank}\t{value}" for rank, value in rows]) + "\n"


def check(root: Path = ROOT) -> list[str]:
    path = root / FREQUENCY_PATH
    if not path.is_file():
        return [f"ไม่พบ {FREQUENCY_PATH} (รัน scripts/build_frequency.py)"]
    if path.read_bytes().decode("utf-8") != build(root):
        return [f"{FREQUENCY_PATH} ไม่ตรงกับไฟล์ stats ของ NGSL (รัน scripts/build_frequency.py) ห้ามแก้ข้อมูลของ NGSL"]
    return []


def main(argv: list[str]) -> int:
    if "--check" in argv:
        errors = check()
        for error in errors:
            print(f"❌ {error}")
        return 1 if errors else 0
    (ROOT / FREQUENCY_PATH).write_bytes(build().encode("utf-8"))
    print(f"✅ เขียน {FREQUENCY_PATH} แล้ว")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
