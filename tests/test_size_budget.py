import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "app" / "js"

# เพดานขนาดไฟล์ (ไบต์) ตั้งไว้เหนือขนาดปัจจุบันเล็กน้อย
# ถ้าเกิน ให้ลดขนาดก่อน หรือย้ายโค้ดไปไว้ใน js/screens/ ให้โหลดเมื่อเปิดใช้
# ถ้าจำเป็นต้องเพิ่มเพดานจริง ๆ ให้บอกเหตุผลใน PR
BUDGET_STARTUP_JS = 285_000  # JS ที่หน้าแรกต้องโหลด (main.js + ที่ import แบบ static)
BUDGET_TOTAL_JS = 370_000  # JS ทั้งหมดรวมหน้าที่โหลดเมื่อเปิดใช้
BUDGET_CSS = 80_000


def static_imports(path):
    """ไฟล์ที่ path import แบบ static (import ... from "...") ไม่นับ import() แบบ dynamic"""
    source = path.read_text(encoding="utf-8")
    return {(path.parent / name).resolve() for name in re.findall(r'^import [^;]*?from "(\.[^"]+)";', source, re.M | re.S)}


def startup_files():
    seen = set()
    todo = [(JS / "main.js").resolve()]
    while todo:
        current = todo.pop()
        if current in seen:
            continue
        seen.add(current)
        todo.extend(static_imports(current))
    return seen


def size(paths):
    return sum(path.stat().st_size for path in paths)


class SizeBudgetTest(unittest.TestCase):
    def test_startup_js_within_budget(self):
        total = size(startup_files())
        self.assertLessEqual(total, BUDGET_STARTUP_JS, f"JS ที่หน้าแรกโหลดคือ {total:,} ไบต์ เกินเพดาน {BUDGET_STARTUP_JS:,}")

    def test_total_js_within_budget(self):
        total = size(JS.rglob("*.js"))
        self.assertLessEqual(total, BUDGET_TOTAL_JS, f"JS ทั้งหมดคือ {total:,} ไบต์ เกินเพดาน {BUDGET_TOTAL_JS:,}")

    def test_css_within_budget(self):
        total = size((ROOT / "app" / "css").glob("*.css"))
        self.assertLessEqual(total, BUDGET_CSS, f"CSS ทั้งหมดคือ {total:,} ไบต์ เกินเพดาน {BUDGET_CSS:,}")

    def test_screens_load_only_on_demand(self):
        # หน้าใน js/screens/ ต้องไม่ถูก import แบบ static ไม่งั้นการแยกไฟล์ไม่มีผล
        screens = {path.resolve() for path in (JS / "screens").glob("*.js")}
        self.assertTrue(screens)
        self.assertEqual(startup_files() & screens, set())


if __name__ == "__main__":
    unittest.main()
