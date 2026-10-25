"""อ่านไฟล์ต้นฉบับ NGSL และไฟล์ชุดข้อมูล TSV ของแอป (ใช้ร่วมกันหลายสคริปต์)

ชุดข้อมูลอยู่ที่ app/data/levels/ ด่านละไฟล์ คอลัมน์ rank, headword, forms มาจาก NGSL
ห้ามแก้ ส่วนคอลัมน์ภาษาไทยเขียนเพิ่มตาม docs/translation-guide.md
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import NamedTuple

SOURCE_DIR = "ngsl-source/1.2"
STATS_FILE = "NGSL_12_stats.csv"
TEACHING_FILE = "NGSL_12_lemmatized_for_teaching.csv"
SUPPLEMENT_FILE = "SUP_lemmatized.csv"

LEVELS_DIR = "app/data/levels"
LEVEL_SIZE = 100
LAST_LEVEL = 28  # ด่าน 28 รวมอันดับ 2,701–2,809 (109 คำ)
SUPPLEMENT_LEVEL = "sup"

COLUMNS = ["rank", "headword", "forms", "meanings", "example_en", "example_th", "note", "emoji"]
NGSL_COLUMNS = COLUMNS[:3]
THAI_COLUMNS = COLUMNS[3:]
FORMS_SEPARATOR = ", "


class BaseRow(NamedTuple):
    """คอลัมน์ที่มาจาก NGSL ของคำหนึ่งคำ"""

    level: str
    rank: str
    headword: str
    forms: str


def level_name(level: int) -> str:
    return f"{level:02d}"


def level_names() -> list[str]:
    return [level_name(level) for level in range(1, LAST_LEVEL + 1)] + [SUPPLEMENT_LEVEL]


def level_of_rank(rank: int) -> str:
    return level_name(min((rank - 1) // LEVEL_SIZE + 1, LAST_LEVEL))


def read_csv_rows(path: Path) -> list[list[str]]:
    """อ่าน CSV ของ NGSL ข้ามบรรทัดหมายเหตุ (##) และบรรทัดว่าง"""
    with path.open(encoding="utf-8-sig", newline="") as handle:
        lines = [line for line in handle if not line.startswith("##")]
    rows = []
    for row in csv.reader(lines):
        cells = [cell.strip() for cell in row]
        if any(cells):
            rows.append([cell for cell in cells if cell])
    return rows


def load_base_rows(root: Path) -> list[BaseRow]:
    """คำทั้งหมดของ NGSL 1.2 เรียงตามด่านและอันดับ: คำหลักและอันดับจากไฟล์ stats,
    รูปคำจากไฟล์ teaching (จับคู่แบบไม่สนตัวพิมพ์เล็กใหญ่ เพราะไฟล์ stats สะกด I แต่ teaching สะกด i)
    และคำเสริม 52 คำต่อท้าย"""
    source = root / SOURCE_DIR
    forms_by_word = {row[0].lower(): row[1:] for row in read_csv_rows(source / TEACHING_FILE)}

    rows = []
    stats = read_csv_rows(source / STATS_FILE)[1:]  # ข้ามหัวตาราง
    for headword, rank, *_ in sorted(stats, key=lambda row: int(row[1])):
        forms = forms_by_word[headword.lower()]
        rows.append(BaseRow(level_of_rank(int(rank)), rank, headword, FORMS_SEPARATOR.join(forms)))

    for index, (headword, *forms) in enumerate(read_csv_rows(source / SUPPLEMENT_FILE), start=1):
        rows.append(BaseRow(SUPPLEMENT_LEVEL, f"S{index}", headword, FORMS_SEPARATOR.join(forms)))
    return rows


def level_path(root: Path, level: str) -> Path:
    return root / LEVELS_DIR / f"{level}.tsv"


def read_level(path: Path) -> tuple[list[str], list[list[str]]]:
    """คืนหัวตารางและแถวของไฟล์ TSV (ไม่ตัดช่องว่าง เพื่อให้ตัวตรวจเห็นข้อมูลจริง)"""
    lines = path.read_text(encoding="utf-8").split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    table = [line.split("\t") for line in lines]
    return (table[0] if table else []), table[1:]


def write_level(path: Path, rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["\t".join(row) for row in [COLUMNS] + rows]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
