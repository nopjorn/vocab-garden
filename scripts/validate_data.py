#!/usr/bin/env python3
"""ตรวจรูปแบบคอลัมน์ภาษาไทยในชุดข้อมูล app/data/levels/ (กติกาใน docs/translation-guide.md)

คำที่ยังไม่แปลต้องเว้นคอลัมน์ภาษาไทยว่างทั้งหมด คำที่เริ่มแปลแล้วต้องมี meanings,
example_en และ example_th ครบ ส่วน note ใส่หรือไม่ก็ได้

    python3 scripts/validate_data.py
"""

from __future__ import annotations

import json
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
EMOJI_MAX_LENGTH = 8  # จำนวน code point (อีโมจิครอบครัวหรือสีผิวยาวหลาย code point)
EMOJI_RE = re.compile(r"[^\x00-\u2000฀-๿]+")  # ไม่มีตัวอักษรละติน เลข ช่องว่าง หรือไทย


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
    emoji = fields["emoji"]
    if emoji and (len(emoji) > EMOJI_MAX_LENGTH or not EMOJI_RE.fullmatch(emoji)):
        problems.append("emoji ต้องเป็นอีโมจิล้วน ๆ ไม่เกิน 8 ตัว (ไม่มีตัวอักษร ตัวเลข หรือช่องว่าง)")
    words = [fields["headword"]] + [form for form in fields["forms"].split(ngsl_data.FORMS_SEPARATOR) if form]
    if not uses_word(fields["example_en"], words):
        problems.append("example_en ต้องมีคำหลักหรือรูปคำของคำนี้อยู่ในประโยค")
    if not THAI_RE.search(fields["example_th"]):
        problems.append("example_th ต้องเป็นภาษาไทย")
    return problems


CONFUSABLES_PATH = "app/data/confusables.json"
CONFUSABLE_BLANK = "___"


def check_confusables(root: Path, base_rows=None) -> list[str]:
    """ตรวจ app/data/confusables.json: ทุกคำต้องอยู่ใน NGSL, ประโยคมีช่องว่างเดียว, ตัวเลือกเป็นคำหรือรูปคำของคู่นั้น"""
    path = root / CONFUSABLES_PATH
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except ValueError as error:
        return [f"{CONFUSABLES_PATH} อ่านเป็น JSON ไม่ได้ ({error})"]
    rows = base_rows if base_rows is not None else ngsl_data.load_base_rows(root)
    forms_of = {row.headword.lower(): {form.lower() for form in row.forms.split(ngsl_data.FORMS_SEPARATOR) if form} for row in rows}
    errors = []
    seen_ids = set()
    for pair in data.get("pairs", []):
        label = f"{CONFUSABLES_PATH} ({pair.get('id', '?')})"
        if not re.fullmatch(r"[a-z]+(-[a-z]+)+", str(pair.get("id", ""))):
            errors.append(f"{label}: id ต้องเป็นคำภาษาอังกฤษพิมพ์เล็กคั่นด้วย - เช่น borrow-lend")
        if pair.get("id") in seen_ids:
            errors.append(f"{label}: id ซ้ำ")
        seen_ids.add(pair.get("id"))
        words = pair.get("words", [])
        if not 2 <= len(words) <= 3:
            errors.append(f"{label}: ต้องมี 2–3 คำ")
        allowed = set()
        for word in words:
            if word.lower() not in forms_of:
                errors.append(f"{label}: {word} ไม่ใช่คำหลักของ NGSL 1.2")
            allowed |= {word.lower()} | forms_of.get(word.lower(), set())
        if not THAI_RE.search(pair.get("note", "")):
            errors.append(f"{label}: note ต้องเป็นภาษาไทย")
        items = pair.get("items", [])
        if len(items) < 3:
            errors.append(f"{label}: ต้องมีข้อฝึกอย่างน้อย 3 ข้อ")
        for number, item in enumerate(items, start=1):
            where = f"{label} ข้อ {number}"
            if item.get("en", "").count(CONFUSABLE_BLANK) != 1:
                errors.append(f"{where}: en ต้องมีช่องว่าง {CONFUSABLE_BLANK} หนึ่งช่อง")
            options = item.get("options", [])
            if not 2 <= len(options) <= 3 or len({option.lower() for option in options}) != len(options):
                errors.append(f"{where}: options ต้องมี 2–3 ตัวและไม่ซ้ำกัน")
            if item.get("answer") not in options:
                errors.append(f"{where}: answer ต้องอยู่ใน options")
            for option in options:
                if option.lower() not in allowed:
                    errors.append(f"{where}: ตัวเลือก {option} ไม่ใช่คำหรือรูปคำของ {', '.join(words)}")
            for name in ("th", "why"):
                if not THAI_RE.search(item.get(name, "")):
                    errors.append(f"{where}: {name} ต้องเป็นภาษาไทย")
    return errors


EXTRA_DIR = "app/data/extra"
EXTRA_COLUMNS = ["headword", "example2_en", "example2_th", "collocations"]
EXTRA_MAX_WORDS = 12
COLLOCATION_MAX = 4


def check_extra_row(row: list[str], base: dict[str, list[str]]) -> list[str]:
    """ตรวจหนึ่งแถวของไฟล์ extra: ประโยคตัวอย่างที่ 2 และคำที่มักใช้คู่กัน (กติกาใน docs/translation-guide.md)"""
    if len(row) != len(EXTRA_COLUMNS):
        return [f"ต้องมี {len(EXTRA_COLUMNS)} คอลัมน์ (ตอนนี้มี {len(row)})"]
    fields = dict(zip(EXTRA_COLUMNS, row))
    problems = [f"{name} มีช่องว่างหัวหรือท้าย" for name, value in fields.items() if value != value.strip()]
    head = fields["headword"]
    if head not in base:
        return problems + [f"{head} ไม่ใช่คำในด่านนี้"]
    level_row = dict(zip(ngsl_data.COLUMNS, base[head]))
    words = [head] + [form for form in level_row["forms"].split(ngsl_data.FORMS_SEPARATOR) if form]
    if not level_row["meanings"]:
        problems.append("ใส่ข้อมูลเพิ่มได้เฉพาะคำที่แปลแล้ว")
    for name in ("example2_en", "example2_th"):
        if not fields[name]:
            problems.append(f"{name} ว่างอยู่ (ถ้าไม่มีข้อมูลเพิ่ม ไม่ต้องใส่คำนั้นในไฟล์)")
    if fields["example2_en"]:
        if not uses_word(fields["example2_en"], words):
            problems.append("example2_en ต้องมีคำหลักหรือรูปคำของคำนี้อยู่ในประโยค")
        if len(fields["example2_en"].split()) > EXTRA_MAX_WORDS:
            problems.append(f"example2_en ยาวเกิน {EXTRA_MAX_WORDS} คำ")
        if fields["example2_en"] == level_row["example_en"]:
            problems.append("example2_en ต้องไม่ซ้ำกับประโยคตัวอย่างเดิม")
    if fields["example2_th"] and not THAI_RE.search(fields["example2_th"]):
        problems.append("example2_th ต้องเป็นภาษาไทย")
    if fields["collocations"]:
        items = fields["collocations"].split("; ")
        if len(items) > COLLOCATION_MAX:
            problems.append(f"collocations ใส่ได้ไม่เกิน {COLLOCATION_MAX} วลี")
        for item in items:
            phrase, _, meaning = item.partition("=")
            if not phrase or not meaning:
                problems.append(f'วลี "{item}" ต้องเป็นรูปแบบ "วลีอังกฤษ=ความหมายไทย" คั่นแต่ละวลีด้วย "; "')
            elif not uses_word(phrase, words):
                problems.append(f'วลี "{phrase}" ต้องมีคำหลักหรือรูปคำของคำนี้')
            elif not THAI_RE.search(meaning):
                problems.append(f'วลี "{phrase}" ต้องมีความหมายภาษาไทย')
    return problems


def check_extra(root: Path) -> list[str]:
    """ตรวจ app/data/extra/NN.tsv ทุกไฟล์เทียบกับด่านที่ตรงกัน"""
    folder = root / EXTRA_DIR
    if not folder.is_dir():
        return []
    errors = []
    for path in sorted(folder.glob("*.tsv")):
        rel = path.relative_to(root).as_posix()
        level_file = ngsl_data.level_path(root, path.stem)
        if path.stem not in ngsl_data.level_names() or not level_file.is_file():
            errors.append(f"{rel} ไม่ตรงกับไฟล์ด่านใด ๆ")
            continue
        if b"\r" in path.read_bytes():
            errors.append(f"{rel} ต้องใช้ line ending แบบ LF")
        lines = path.read_text(encoding="utf-8").split("\n")
        if lines[0].split("\t") != EXTRA_COLUMNS:
            errors.append(f"{rel} หัวตารางต้องเป็น {', '.join(EXTRA_COLUMNS)}")
            continue
        _, rows = ngsl_data.read_level(level_file)
        base = {row[1]: row for row in rows if len(row) == len(ngsl_data.COLUMNS)}
        seen = set()
        for number, line in enumerate(lines[1:], start=2):
            if not line:
                continue
            row = line.split("\t")
            if row[0] in seen:
                errors.append(f"{rel} บรรทัด {number} ({row[0]}): คำซ้ำ")
            seen.add(row[0])
            errors += [f"{rel} บรรทัด {number} ({row[0]}): {problem}" for problem in check_extra_row(row, base)]
    return errors


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
    errors += check_confusables(root)
    errors += check_extra(root)
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
