import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"


def precache_list():
    """จำลองรายการ PRECACHE ใน sw.js (รวมไฟล์ด่านที่สร้างจาก LEVELS)"""
    source = (APP / "sw.js").read_text(encoding="utf-8")
    block = re.search(r"const PRECACHE = \[(.*?)\];", source, re.S).group(1)
    files = set(re.findall(r'"([^"]+)"', block))
    if "LEVELS.map" in block:
        files |= {f"data/levels/{path.stem}.tsv" for path in (APP / "data/levels").glob("*.tsv")}
    if "EXTRA_LEVELS.map" in block:
        files |= {f"data/extra/{level}.tsv" for level in extra_levels(source)}
    return files


def extra_levels(source):
    """ค่า EXTRA_LEVELS ในไฟล์ JS (sw.js หรือ data.js)"""
    return re.findall(r'"(\d\d)"', re.search(r"const EXTRA_LEVELS = \[(.*?)\];", source, re.S).group(1))


class ServiceWorkerTest(unittest.TestCase):
    def test_precache_covers_every_app_file(self):
        app_files = {path.relative_to(APP).as_posix() for path in APP.rglob("*") if path.is_file()}
        missing = app_files - precache_list() - {"sw.js"}
        self.assertEqual(missing, set(), "เพิ่มไฟล์เหล่านี้ใน PRECACHE ของ app/sw.js")

    def test_precache_files_exist(self):
        missing = {name for name in precache_list() - {"./"} if not (APP / name).is_file()}
        self.assertEqual(missing, set())

    def test_extra_levels_match_between_sw_data_and_files(self):
        sw = extra_levels((APP / "sw.js").read_text(encoding="utf-8"))
        data = extra_levels((APP / "js/data.js").read_text(encoding="utf-8").replace("export const", "const"))
        on_disk = sorted(path.stem for path in (APP / "data/extra").glob("*.tsv"))
        self.assertEqual(sw, data)
        self.assertEqual(sorted(sw), on_disk)

    def test_levels_in_sw_match_dataset(self):
        source = (APP / "sw.js").read_text(encoding="utf-8")
        self.assertIn("Array.from({ length: 28 }", source)
        self.assertEqual(len(list((APP / "data/levels").glob("*.tsv"))), 29)

    def test_sw_version_matches_app_version(self):
        # Safari ติดตั้ง service worker ใหม่ก็ต่อเมื่อไฟล์ sw.js เปลี่ยน
        sw_version = re.search(r"^// sw-version: (\S+)$", (APP / "sw.js").read_text(encoding="utf-8"), re.M)
        app_version = re.search(r'VG_VERSION = "([^"]+)"', (APP / "version.js").read_text(encoding="utf-8"))
        self.assertIsNotNone(sw_version, "ใส่บรรทัด // sw-version: x.y.z ใน app/sw.js")
        self.assertEqual(sw_version.group(1), app_version.group(1), "แก้ // sw-version ใน app/sw.js ให้ตรงกับ app/version.js")


class ManifestTest(unittest.TestCase):
    def test_manifest_icons_exist(self):
        manifest = json.loads((APP / "manifest.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual(manifest["display"], "standalone")
        for icon in manifest["icons"]:
            self.assertTrue((APP / icon["src"]).is_file(), icon["src"])
        self.assertTrue(any(icon.get("purpose") == "maskable" for icon in manifest["icons"]))


if __name__ == "__main__":
    unittest.main()
