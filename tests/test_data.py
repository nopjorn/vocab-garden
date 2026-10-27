import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import build_skeleton  # noqa: E402
import ngsl_data  # noqa: E402
import validate_data  # noqa: E402

UNTRANSLATED = ["67", "work", "works, worked, working, workings", "", "", "", "", ""]
TRANSLATED = [
    "67", "work", "works, worked, working, workings",
    "v: ทำงาน, ใช้การได้ | n: งาน, ผลงาน",
    "I work at a small hotel.",
    "ฉันทำงานที่โรงแรมเล็ก ๆ แห่งหนึ่ง",
    "",
    "",
]


def with_fields(**changes):
    row = list(TRANSLATED)
    for name, value in changes.items():
        row[ngsl_data.COLUMNS.index(name)] = value
    return row


class BaseRowsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = ngsl_data.load_base_rows(ROOT)

    def test_has_all_words(self):
        self.assertEqual(len(self.rows), 2861)
        self.assertEqual(len({row.headword for row in self.rows}), 2861)

    def test_level_sizes(self):
        sizes = {name: sum(row.level == name for row in self.rows) for name in ngsl_data.level_names()}
        self.assertEqual(sizes["01"], 100)
        self.assertEqual(sizes["27"], 100)
        self.assertEqual(sizes["28"], 109)
        self.assertEqual(sizes["sup"], 52)

    def test_uses_headword_from_stats_file(self):
        row = next(row for row in self.rows if row.headword.lower() == "i")
        self.assertEqual((row.rank, row.headword, row.forms), ("20", "I", "me, my, mine"))

    def test_supplementary_words(self):
        first = next(row for row in self.rows if row.level == "sup")
        self.assertEqual((first.rank, first.headword, first.forms), ("S1", "Monday", "Mondays"))


class BuildSkeletonTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        shutil.copytree(ROOT / "ngsl-source", self.root / "ngsl-source")

    def test_keeps_existing_translations(self):
        build_skeleton.build(self.root)
        path = ngsl_data.level_path(self.root, "01")
        text = path.read_text(encoding="utf-8")
        path.write_text(text.replace("\t".join(UNTRANSLATED), "\t".join(TRANSLATED)), encoding="utf-8")

        build_skeleton.build(self.root)
        _, rows = ngsl_data.read_level(path)
        self.assertIn(TRANSLATED, rows)

    def test_matches_repository_dataset(self):
        build_skeleton.build(self.root)
        for name in ngsl_data.level_names():
            _, built = ngsl_data.read_level(ngsl_data.level_path(self.root, name))
            _, repo = ngsl_data.read_level(ngsl_data.level_path(ROOT, name))
            self.assertEqual([row[:3] for row in built], [row[:3] for row in repo], name)


class CheckRowTest(unittest.TestCase):
    def test_untranslated_row_passes(self):
        self.assertEqual(validate_data.check_row(UNTRANSLATED), [])

    def test_translated_row_passes(self):
        self.assertEqual(validate_data.check_row(TRANSLATED), [])

    def test_example_may_use_any_form(self):
        self.assertEqual(validate_data.check_row(with_fields(example_en="She worked late.")), [])

    def test_rejects_wrong_column_count(self):
        self.assertTrue(validate_data.check_row(TRANSLATED[:-1]))

    def test_rejects_partial_translation(self):
        problems = validate_data.check_row(with_fields(example_th=""))
        self.assertTrue(any("example_th" in problem for problem in problems), problems)

    def test_rejects_note_without_translation(self):
        self.assertTrue(validate_data.check_row(UNTRANSLATED[:-1] + ["หมายเหตุ"]))

    def test_rejects_bad_meanings(self):
        for meanings in ["ทำงาน", "verb: ทำงาน", "v: work", "v:ทำงาน", "v: ทำงาน|n: งาน"]:
            with self.subTest(meanings=meanings):
                self.assertTrue(validate_data.check_row(with_fields(meanings=meanings)))

    def test_rejects_example_without_word(self):
        problems = validate_data.check_row(with_fields(example_en="I play at a small hotel."))
        self.assertTrue(any("example_en" in problem for problem in problems), problems)

    def test_word_must_be_whole_word(self):
        problems = validate_data.check_row(with_fields(example_en="This is homework."))
        self.assertTrue(any("example_en" in problem for problem in problems), problems)

    def test_rejects_non_thai_translation(self):
        self.assertTrue(validate_data.check_row(with_fields(example_th="I work at a hotel.")))

    def test_accepts_emoji_only(self):
        for emoji in ["💼", "👨‍👩‍👧", "🏃", "❤️", "👍🏽"]:
            with self.subTest(emoji=emoji):
                self.assertEqual(validate_data.check_row(with_fields(emoji=emoji)), [])
        for emoji in ["work", "งาน", "💼 ", "💼💼💼💼💼💼💼💼💼", "1", "a💼"]:
            with self.subTest(emoji=emoji):
                self.assertTrue(validate_data.check_row(with_fields(emoji=emoji)))

    def test_emoji_alone_does_not_make_a_word_translated(self):
        problems = validate_data.check_row([*UNTRANSLATED[:7], "💼"])
        self.assertTrue(any("ขาด" in problem for problem in problems), problems)

    def test_rejects_surrounding_spaces(self):
        self.assertTrue(validate_data.check_row(with_fields(meanings="v: ทำงาน ")))


class RepositoryDataTest(unittest.TestCase):
    def test_repository_data_is_valid(self):
        errors, _, total = validate_data.validate(ROOT)
        self.assertEqual(errors, [])
        self.assertEqual(total, 2861)


if __name__ == "__main__":
    unittest.main()


class ConfusablesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = ngsl_data.load_base_rows(ROOT)

    def check(self, data):
        root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, root)
        (root / "app/data").mkdir(parents=True)
        import json

        (root / validate_data.CONFUSABLES_PATH).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        return validate_data.check_confusables(root, self.rows)

    def pair(self, **changes):
        item = {"en": "Can I ___ your pen?", "options": ["borrow", "lend"], "answer": "borrow", "th": "ขอยืมปากกาได้ไหม", "why": "ขอยืมมาใช้ ใช้ borrow"}
        pair = {"id": "borrow-lend", "words": ["borrow", "lend"], "note": "borrow คือยืมมา", "items": [item, item, item]}
        pair.update(changes)
        return {"pairs": [pair]}

    def test_the_committed_file_is_valid(self):
        self.assertEqual(validate_data.check_confusables(ROOT, self.rows), [])

    def test_a_valid_pair_passes(self):
        self.assertEqual(self.check(self.pair()), [])

    def test_words_must_be_ngsl_headwords(self):
        self.assertTrue(any("ไม่ใช่คำหลักของ NGSL" in e for e in self.check(self.pair(words=["borrow", "zzzz"]))))

    def test_blank_answer_and_options_are_checked(self):
        bad = {"en": "No blank here.", "options": ["borrow", "borrow"], "answer": "lend", "th": "x", "why": "y"}
        errors = self.check(self.pair(items=[bad, bad, bad]))
        joined = "\n".join(errors)
        self.assertIn("ช่องว่าง", joined)
        self.assertIn("ไม่ซ้ำกัน", joined)
        self.assertIn("answer ต้องอยู่ใน options", joined)
        self.assertIn("th ต้องเป็นภาษาไทย", joined)

    def test_options_must_belong_to_the_pair(self):
        item = {"en": "Can I ___ your pen?", "options": ["borrow", "bring"], "answer": "borrow", "th": "ไทย", "why": "ไทย"}
        self.assertTrue(any("ไม่ใช่คำหรือรูปคำ" in e for e in self.check(self.pair(items=[item, item, item]))))

    def test_inflected_options_are_allowed(self):
        item = {"en": "She ___ me a bike.", "options": ["lent", "borrowed"], "answer": "lent", "th": "ไทย", "why": "ไทย"}
        self.assertEqual(self.check(self.pair(items=[item, item, item])), [])
