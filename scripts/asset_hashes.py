#!/usr/bin/env python3
"""สร้างรายการ hash ของไฟล์ใน app/ ให้ service worker โหลดเฉพาะไฟล์ที่เปลี่ยนตอนอัปเดตเวอร์ชัน

    python3 scripts/asset_hashes.py          # เขียน app/asset-hashes.js ใหม่ (รันทุกครั้งที่แก้ไฟล์ใน app/)
    python3 scripts/asset_hashes.py --check  # ตรวจว่าไฟล์ที่ commit ไว้ตรงกับไฟล์จริง (tests/test_pwa.py เรียกใช้)

ไม่นับ sw.js, version.js (เปลี่ยนทุกเวอร์ชันและเล็กมาก โหลดใหม่ทุกครั้ง) และตัว asset-hashes.js เอง
ไฟล์ที่ได้ไม่ใช่ build step: แอปยังเปิดได้ตรง ๆ จาก app/ ถ้าไฟล์นี้ไม่ตรง แค่โหลดไฟล์ใหม่มากกว่าที่จำเป็น
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
OUTPUT = APP / "asset-hashes.js"
SKIP = {"sw.js", "version.js", "asset-hashes.js"}


def asset_hashes() -> dict[str, str]:
    hashes = {}
    for path in sorted(APP.rglob("*")):
        name = path.relative_to(APP).as_posix()
        if path.is_file() and name not in SKIP:
            hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    return hashes


def render(hashes: dict[str, str]) -> str:
    body = json.dumps(hashes, indent=2, ensure_ascii=False)
    return (
        "// สร้างโดย scripts/asset_hashes.py ห้ามแก้เอง: รัน python3 scripts/asset_hashes.py ทุกครั้งที่แก้ไฟล์ใน app/\n"
        "// service worker ใช้เทียบกับเวอร์ชันก่อน ไฟล์ที่ hash ไม่เปลี่ยนคัดลอกจาก cache เดิม ไม่ต้องโหลดใหม่\n"
        f"self.VG_ASSETS = {body};\n"
    )


def main(argv: list[str]) -> int:
    expected = render(asset_hashes())
    if "--check" in argv:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        if current != expected:
            print("❌ app/asset-hashes.js ไม่ตรงกับไฟล์ใน app/ รัน: python3 scripts/asset_hashes.py", file=sys.stderr)
            return 1
        print("✅ app/asset-hashes.js ตรงกับไฟล์ใน app/")
        return 0
    OUTPUT.write_text(expected, encoding="utf-8")
    print(f"เขียน {OUTPUT.relative_to(ROOT)} แล้ว ({len(expected.splitlines()) - 4} ไฟล์)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
