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
        self.write("app/data/LICENSE", CREDIT)

    def write(self, rel, text):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text.encode("utf-8"))

    def write_source_note(self):
        digest = hashlib.sha256((self.root / "ngsl-source/1.2/words.csv").read_bytes()).hexdigest()
        self.write("ngsl-source/1.2/SOURCE.md", f"{CREDIT}\n```\n{digest}  words.csv\n```\n")

    def errors(self):
        # ชุดข้อมูลตรวจแยกใน DatasetTest เพราะต้องใช้ไฟล์ต้นฉบับ NGSL จริง
        return check_ngsl.check_sources(self.root) + check_ngsl.check_attribution(self.root) + \
            check_ngsl.check_unofficial_links(self.root)

    def assertErrorMentions(self, text):
        errors = self.errors()
        self.assertTrue(any(text in error for error in errors), errors)

    def test_valid_repo_passes(self):
        self.assertEqual(self.errors(), [])

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

    def test_detects_missing_data_license(self):
        (self.root / "app/data/LICENSE").unlink()
        self.assertErrorMentions("ไม่พบ app/data/LICENSE")

    def test_detects_missing_official_site(self):
        self.write("README.md", f"> {check_ngsl.OFFICIAL_ATTRIBUTION}\n\n{check_ngsl.LICENSE_URL}\n")
        self.assertErrorMentions("README.md ไม่มีลิงก์เว็บทางการ")

    def test_attribution_may_wrap_lines(self):
        wrapped = check_ngsl.OFFICIAL_ATTRIBUTION.replace(" is licensed", "\nis licensed")
        self.write("README.md", f"{wrapped}\n\n{check_ngsl.LICENSE_URL}\n{check_ngsl.OFFICIAL_SITE}\n")
        self.assertEqual(self.errors(), [])

    def test_detects_unofficial_domain(self):
        self.write("docs/links.md", f"https://www.{check_ngsl.UNOFFICIAL_DOMAIN}/\n")
        self.assertErrorMentions("docs/links.md มีลิงก์ไปโดเมน .org")

    def test_unofficial_domain_check_ignores_case(self):
        self.write("docs/links.md", check_ngsl.UNOFFICIAL_DOMAIN.upper())
        self.assertErrorMentions("docs/links.md มีลิงก์ไปโดเมน .org")

    def test_source_files_are_not_scanned_for_domains(self):
        self.write("ngsl-source/1.2/words.csv", f"{check_ngsl.UNOFFICIAL_DOMAIN}\r\n")
        self.write_source_note()
        self.assertEqual(self.errors(), [])


class DatasetTest(unittest.TestCase):
    """ใช้ไฟล์ต้นฉบับ NGSL และชุดข้อมูลจริงของ repo ในโฟลเดอร์ชั่วคราว"""

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        shutil.copytree(ROOT / "ngsl-source", self.root / "ngsl-source")
        shutil.copytree(ROOT / "app/data/levels", self.root / "app/data/levels")
        self.level = self.root / "app/data/levels/01.tsv"

    def assertErrorMentions(self, text):
        errors = check_ngsl.check_dataset(self.root)
        self.assertTrue(any(text in error for error in errors), errors)

    def replace_in_level(self, old, new):
        self.level.write_text(self.level.read_text(encoding="utf-8").replace(old, new, 1), encoding="utf-8")

    def test_real_dataset_passes(self):
        self.assertEqual(check_ngsl.check_dataset(self.root), [])

    def test_detects_changed_headword(self):
        self.replace_in_level("\tthe\t", "\tThe\t")
        self.assertErrorMentions("บรรทัด 2: คอลัมน์ของ NGSL ต้องเป็น 1 / the")

    def test_detects_changed_forms(self):
        self.replace_in_level("works, worked, working, workings", "works, worked, working")
        self.assertErrorMentions("ห้ามแก้ข้อมูลของ NGSL")

    def test_detects_removed_word(self):
        lines = self.level.read_text(encoding="utf-8").splitlines(keepends=True)
        self.level.write_text("".join(lines[:-1]), encoding="utf-8")
        self.assertErrorMentions("ต้องมี 100 คำตาม NGSL (ตอนนี้มี 99)")

    def test_detects_missing_level(self):
        (self.root / "app/data/levels/sup.tsv").unlink()
        self.assertErrorMentions("ไม่พบไฟล์ด่าน app/data/levels/sup.tsv")

    def test_detects_unknown_level(self):
        shutil.copy(self.level, self.root / "app/data/levels/99.tsv")
        self.assertErrorMentions("99.tsv ไม่ใช่ไฟล์ด่านที่กำหนดไว้")

    def test_detects_wrong_header(self):
        self.replace_in_level("example_th", "example_thai")
        self.assertErrorMentions("หัวตารางต้องเป็น")


class RepositoryTest(unittest.TestCase):
    def test_repository_passes(self):
        self.assertEqual(check_ngsl.run_checks(ROOT), [])


if __name__ == "__main__":
    unittest.main()
