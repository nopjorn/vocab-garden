import hashlib
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_ngsl  # noqa: E402

CREDIT = f"> {check_ngsl.OFFICIAL_ATTRIBUTION}\n\n- {check_ngsl.LICENSE_URL}\n- {check_ngsl.OFFICIAL_SITE}\n"


class CheckNgslTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.write("ngsl-source/1.2/words.csv", "the,1\r\nbe,2\r\n")
        self.write_source_note()
        self.write("README.md", "# test\n\n" + CREDIT)

    def write(self, rel, text):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text.encode("utf-8"))

    def write_source_note(self):
        digest = hashlib.sha256((self.root / "ngsl-source/1.2/words.csv").read_bytes()).hexdigest()
        self.write("ngsl-source/1.2/SOURCE.md", f"{CREDIT}\n```\n{digest}  words.csv\n```\n")

    def assertErrorMentions(self, text):
        errors = check_ngsl.run_checks(self.root)
        self.assertTrue(any(text in error for error in errors), errors)

    def test_valid_repo_passes(self):
        self.assertEqual(check_ngsl.run_checks(self.root), [])

    def test_detects_modified_source_file(self):
        self.write("ngsl-source/1.2/words.csv", "the,1\r\nbe,3\r\n")
        self.assertErrorMentions("words.csv ถูกแก้ไข")

    def test_detects_line_ending_change_in_source_file(self):
        self.write("ngsl-source/1.2/words.csv", "the,1\nbe,2\n")
        self.assertErrorMentions("words.csv ถูกแก้ไข")

    def test_detects_unlisted_source_file(self):
        self.write("ngsl-source/1.2/extra.csv", "x")
        self.assertErrorMentions("extra.csv ไม่ได้บันทึก SHA-256")

    def test_detects_missing_source_file(self):
        (self.root / "ngsl-source/1.2/words.csv").unlink()
        self.assertErrorMentions("ไม่พบไฟล์ต้นฉบับ ngsl-source/1.2/words.csv")

    def test_detects_missing_source_folder(self):
        shutil.rmtree(self.root / "ngsl-source")
        self.assertErrorMentions("ไม่พบไฟล์ต้นฉบับ NGSL")

    def test_detects_missing_attribution(self):
        self.write("README.md", f"# test\n\n{check_ngsl.LICENSE_URL}\n{check_ngsl.OFFICIAL_SITE}\n")
        self.assertErrorMentions("README.md ไม่มีข้อความเครดิตทางการ")

    def test_detects_missing_license_link(self):
        self.write("README.md", f"> {check_ngsl.OFFICIAL_ATTRIBUTION}\n\n{check_ngsl.OFFICIAL_SITE}\n")
        self.assertErrorMentions("README.md ไม่มีลิงก์ license")

    def test_detects_missing_official_site(self):
        self.write("README.md", f"> {check_ngsl.OFFICIAL_ATTRIBUTION}\n\n{check_ngsl.LICENSE_URL}\n")
        self.assertErrorMentions("README.md ไม่มีลิงก์เว็บทางการ")

    def test_attribution_may_wrap_lines(self):
        wrapped = check_ngsl.OFFICIAL_ATTRIBUTION.replace(" is licensed", "\nis licensed")
        self.write("README.md", f"{wrapped}\n\n{check_ngsl.LICENSE_URL}\n{check_ngsl.OFFICIAL_SITE}\n")
        self.assertEqual(check_ngsl.run_checks(self.root), [])

    def test_detects_unofficial_domain(self):
        self.write("docs/links.md", f"https://www.{check_ngsl.UNOFFICIAL_DOMAIN}/\n")
        self.assertErrorMentions("docs/links.md มีลิงก์ไปโดเมน .org")

    def test_unofficial_domain_check_ignores_case(self):
        self.write("docs/links.md", check_ngsl.UNOFFICIAL_DOMAIN.upper())
        self.assertErrorMentions("docs/links.md มีลิงก์ไปโดเมน .org")

    def test_source_files_are_not_scanned_for_domains(self):
        self.write("ngsl-source/1.2/words.csv", f"{check_ngsl.UNOFFICIAL_DOMAIN}\r\n")
        self.write_source_note()
        self.assertEqual(check_ngsl.run_checks(self.root), [])


class RepositoryTest(unittest.TestCase):
    def test_repository_passes(self):
        self.assertEqual(check_ngsl.run_checks(ROOT), [])


if __name__ == "__main__":
    unittest.main()
