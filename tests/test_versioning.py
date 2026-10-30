import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import versioning  # noqa: E402
from versioning import CheckError  # noqa: E402

CHANGELOG = """# บันทึกการเปลี่ยนแปลง

## [0.1.0] - 2026-11-02

### เพิ่ม
- ด่าน 2

## [0.0.1] - 2026-10-25

### เพิ่ม
- เริ่มโปรเจค
"""


class SemverTest(unittest.TestCase):
    def test_accepts_x_y_z(self):
        self.assertEqual(versioning.parse_semver("10.2.30"), (10, 2, 30))

    def test_rejects_other_formats(self):
        for text in ["1.0", "01.0.0", "v1.0.0", "1.0.0-beta", ""]:
            with self.subTest(text=text), self.assertRaises(CheckError):
                versioning.parse_semver(text)


class BumpTest(unittest.TestCase):
    def test_allows_one_step(self):
        cases = [("0.0.0", "0.0.1"), ("0.0.1", "0.0.2"), ("0.0.1", "0.1.0"), ("0.0.1", "1.0.0"), ("0.9.3", "0.10.0")]
        for base, head in cases:
            with self.subTest(base=base, head=head):
                versioning.check_bump(base, head)

    def test_rejects_same_lower_or_skipped(self):
        cases = [("0.0.1", "0.0.1"), ("0.0.2", "0.0.1"), ("0.0.1", "0.0.3"), ("0.0.1", "0.1.1"), ("0.1.5", "0.2.1"), ("0.1.0", "2.0.0")]
        for base, head in cases:
            with self.subTest(base=base, head=head), self.assertRaises(CheckError):
                versioning.check_bump(base, head)


class ReadVersionTest(unittest.TestCase):
    def test_reads_version(self):
        self.assertEqual(versioning.read_version('self.VG_VERSION = "1.2.3";'), "1.2.3")

    def test_rejects_missing_or_invalid(self):
        for source in ["", 'self.VG_VERSION = "1.2";']:
            with self.subTest(source=source), self.assertRaises(CheckError):
                versioning.read_version(source)


class ChangelogTest(unittest.TestCase):
    def test_accepts_new_version_on_top(self):
        versioning.check_changelog(CHANGELOG, "0.1.0")

    def test_rejects_version_not_on_top(self):
        with self.assertRaises(CheckError):
            versioning.check_changelog(CHANGELOG, "0.0.1")

    def test_rejects_missing_version(self):
        with self.assertRaises(CheckError):
            versioning.check_changelog(CHANGELOG, "0.1.1")

    def test_rejects_bad_heading_or_date(self):
        for heading in ["## 0.1.0", "## [0.1.0]", "## [0.1.0] - 2026-13-01", "## [0.1.0] - 2026-1-5", "## Unreleased"]:
            text = CHANGELOG.replace("## [0.1.0] - 2026-11-02", heading)
            with self.subTest(heading=heading), self.assertRaises(CheckError):
                versioning.check_changelog(text, "0.1.0")

    def test_rejects_entry_without_items(self):
        text = CHANGELOG.replace("### เพิ่ม\n- ด่าน 2\n", "")
        with self.assertRaises(CheckError):
            versioning.check_changelog(text, "0.1.0")

    def test_rejects_wrong_order(self):
        text = CHANGELOG.replace("[0.0.1]", "[0.2.0]")
        with self.assertRaises(CheckError):
            versioning.check_changelog(text, "0.1.0")

    def test_notes_returns_entry_body(self):
        self.assertEqual(versioning.find_notes(CHANGELOG, "0.0.1"), "### เพิ่ม\n- เริ่มโปรเจค")


class GitCheckTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.git("init", "-q", "-b", "main")

    def git(self, *args):
        subprocess.run(
            ["git", "-C", str(self.root), "-c", "user.name=test", "-c", "user.email=test@example.com",
             "-c", "commit.gpgsign=false", *args],
            check=True,
            capture_output=True,
        )

    def write(self, version, changelog):
        (self.root / "app").mkdir(exist_ok=True)
        (self.root / "app/version.js").write_text(f'self.VG_VERSION = "{version}";\n', encoding="utf-8")
        (self.root / "CHANGELOG.md").write_text(changelog, encoding="utf-8")

    def commit(self):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "commit")

    def test_first_version_starts_from_zero(self):
        (self.root / "README.md").write_text("test\n", encoding="utf-8")
        self.commit()
        self.write("0.0.1", "## [0.0.1] - 2026-10-25\n\n- เริ่ม\n")
        versioning.run_check(self.root, "main")

    def test_accepts_bump_with_changelog(self):
        self.write("0.0.1", "## [0.0.1] - 2026-10-25\n\n- เริ่ม\n")
        self.commit()
        self.write("0.0.2", "## [0.0.2] - 2026-10-26\n\n- แก้\n\n## [0.0.1] - 2026-10-25\n\n- เริ่ม\n")
        versioning.run_check(self.root, "main")

    def test_rejects_unchanged_version(self):
        self.write("0.0.1", "## [0.0.1] - 2026-10-25\n\n- เริ่ม\n")
        self.commit()
        with self.assertRaises(CheckError):
            versioning.run_check(self.root, "main")

    def test_rejects_bump_without_changelog(self):
        self.write("0.0.1", "## [0.0.1] - 2026-10-25\n\n- เริ่ม\n")
        self.commit()
        self.write("0.0.2", "## [0.0.1] - 2026-10-25\n\n- เริ่ม\n")
        with self.assertRaises(CheckError):
            versioning.run_check(self.root, "main")

    def test_rejects_unknown_ref(self):
        self.write("0.0.1", "## [0.0.1] - 2026-10-25\n\n- เริ่ม\n")
        self.commit()
        with self.assertRaises(CheckError):
            versioning.run_check(self.root, "origin/does-not-exist")


class RepositoryTest(unittest.TestCase):
    def test_changelog_matches_current_version(self):
        version = versioning.current_version(ROOT)
        versioning.check_changelog((ROOT / "CHANGELOG.md").read_text(encoding="utf-8"), version)

    def test_every_version_follows_the_previous_one_and_categories_are_not_repeated(self):
        # กันหัวข้อเวอร์ชันถูกเขียนทับ (เคยเกิดกับ 0.47.1) ซึ่งทำให้เวอร์ชันข้ามขั้นหรือหมวดซ้ำในเวอร์ชันเดียว
        entries = versioning.parse_changelog((ROOT / "CHANGELOG.md").read_text(encoding="utf-8"))
        for newer, older in zip(entries, entries[1:]):
            self.assertIn(newer.version, versioning.next_versions(older.version), f"{older.version} → {newer.version}")
        for entry in entries:
            headings = [line for line in entry.body.splitlines() if line.startswith("### ")]
            self.assertEqual(len(headings), len(set(headings)), f"เวอร์ชัน {entry.version} มีหมวดซ้ำ")


if __name__ == "__main__":
    unittest.main()
