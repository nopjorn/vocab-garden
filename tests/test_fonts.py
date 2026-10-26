import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
FONT = "fonts/anuphan-thai-latin.woff2"


class BundledFontTest(unittest.TestCase):
    """ฟอนต์ที่มากับแอปต้องใช้ offline ได้ มีไฟล์ license และให้เครดิตในหน้าเกี่ยวกับ"""

    def test_font_file_is_a_small_woff2(self):
        data = (APP / FONT).read_bytes()
        self.assertEqual(data[:4], b"wOF2")
        self.assertLess(len(data), 100 * 1024, "ฟอนต์ใหญ่เกินไป ตัดตัวอักษรที่ไม่ใช้ออกก่อน")

    def test_license_and_notes_ship_with_the_font(self):
        ofl = (APP / "fonts/OFL.txt").read_text(encoding="utf-8")
        self.assertIn("SIL OPEN FONT LICENSE Version 1.1", ofl)
        self.assertIn("Anuphan Project Authors", ofl)
        notes = (APP / "fonts/README.md").read_text(encoding="utf-8")
        self.assertIn("สิ่งที่เราเปลี่ยน", notes)

    def test_css_loads_the_font_from_the_app_itself(self):
        css = (APP / "css/style.css").read_text(encoding="utf-8")
        face = re.search(r"@font-face\s*\{(.*?)\}", css, re.S).group(1)
        self.assertIn('font-family: "Anuphan"', face)
        self.assertIn("font-display: swap", face)
        url = re.search(r'url\("\.\./([^"]+)"\)', face).group(1)
        self.assertEqual(url, FONT)
        self.assertNotRegex(css, r"fonts\.(googleapis|gstatic)\.com", "ห้ามโหลดฟอนต์จากเว็บภายนอก")
        self.assertRegex(css, r"font-family: \"Anuphan\", -apple-system")

    def test_about_page_credits_the_font(self):
        html = (APP / "index.html").read_text(encoding="utf-8")
        self.assertIn(f'href="{FONT}"', html)  # preload
        self.assertIn("Anuphan", html)
        self.assertIn("SIL Open Font License", html)


if __name__ == "__main__":
    unittest.main()
