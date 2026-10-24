"""ตรวจเทมเพลต Issue และเอกสารชุมชนให้ตรงกับโค้ดที่อ้างถึง"""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / ".github/ISSUE_TEMPLATE"


def field_ids(path):
    return set(re.findall(r"^\s+id:\s*(\w+)\s*$", path.read_text(encoding="utf-8"), re.M))


class IssueTemplatesTest(unittest.TestCase):
    def test_every_template_has_the_required_keys(self):
        for name in ["wrong-translation.yml", "bug.yml", "feature.yml"]:
            text = (TEMPLATES / name).read_text(encoding="utf-8")
            for key in ["name:", "description:", "body:"]:
                self.assertIn(key, text, f"{name} ขาด {key}")
            self.assertNotIn("\t", text, f"{name} ห้ามใช้ tab ใน YAML")

    def test_translation_form_has_every_field_the_app_prefills(self):
        # app/js/report.js ส่งค่ามาตามชื่อพารามิเตอร์ ซึ่งต้องเป็น id ของช่องในฟอร์ม
        report = (ROOT / "app/js/report.js").read_text(encoding="utf-8")
        query = re.search(r"new URLSearchParams\(\{(.*?)\}\)", report, re.S).group(1)
        params = set(re.findall(r"^\s+(\w+):", query, re.M)) - {"template", "title"}
        self.assertTrue(params)
        self.assertLessEqual(params, field_ids(TEMPLATES / "wrong-translation.yml"))
        self.assertIn('template: "wrong-translation.yml"', report)

    def test_translation_form_asks_for_the_data_license(self):
        text = (TEMPLATES / "wrong-translation.yml").read_text(encoding="utf-8")
        self.assertIn("CC BY-SA 4.0", text)

    def test_config_only_points_to_the_official_ngsl_site(self):
        text = (TEMPLATES / "config.yml").read_text(encoding="utf-8")
        urls = re.findall(r"https?://\S+", text)
        self.assertEqual(urls, ["https://www.newgeneralservicelist.com"])


class CommunityFilesTest(unittest.TestCase):
    def test_contributing_states_both_licenses_and_the_official_credit(self):
        text = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
        self.assertIn("CC BY-SA 4.0", text)
        self.assertIn("MIT", text)
        self.assertIn("New General Service List by Browne, C., Culligan, B., and Phillips, J. is licensed under", text)
        self.assertIn("ห้ามแก้ `rank`, `headword`, `forms`", text)

    def test_funding_file_has_no_active_entries_until_the_owner_signs_up(self):
        lines = (ROOT / ".github/FUNDING.yml").read_text(encoding="utf-8").splitlines()
        self.assertEqual([line for line in lines if line.strip() and not line.lstrip().startswith("#")], [])


if __name__ == "__main__":
    unittest.main()
