"""ตรวจคอนทราสต์สีตามเกณฑ์ WCAG 2.1 AA จาก design tokens ใน app/css/style.css ทั้งโหมดสว่างและมืด"""

import re
import unittest
from pathlib import Path

CSS = (Path(__file__).resolve().parent.parent / "app/css/style.css").read_text(encoding="utf-8")


def tokens(selector):
    block = re.search(re.escape(selector) + r" \{(.*?)\n\}", CSS, re.S).group(1)
    return dict(re.findall(r"(--[\w-]+):\s*([^;]+);", block))


LIGHT = tokens(":root")
DARK = {**LIGHT, **tokens(':root[data-theme="dark"]')}


def rgb(value):
    value = value.strip()
    if value == "white":
        return (255, 255, 255)
    match = re.fullmatch(r"#([0-9a-f]{6})", value)
    assert match, f"ใช้ค่าสีแบบ #rrggbb เท่านั้น: {value}"
    return tuple(int(match.group(1)[i : i + 2], 16) for i in (0, 2, 4))


def luminance(color):
    def channel(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in color)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg, bg):
    a, b = sorted((luminance(rgb(fg)), luminance(rgb(bg))), reverse=True)
    return (a + 0.05) / (b + 0.05)


def resolve(theme, name):
    return theme[name] if name.startswith("--") else name


# (ตัวอักษร, พื้นหลัง, ขั้นต่ำ) ตัวอักษรปกติ 4.5 ตัวใหญ่หนา 3
PAIRS = [
    ("--text", "--bg", 4.5),
    ("--text", "--surface", 4.5),
    ("--text", "--surface-2", 4.5),
    ("--muted", "--bg", 4.5),
    ("--muted", "--surface", 4.5),
    ("--muted", "--surface-2", 4.5),
    ("--link", "--bg", 4.5),
    ("--link", "--surface", 4.5),
    ("--link", "--brand-soft", 4.5),
    ("--on-brand", "--btn-bg", 4.5),
    ("--on-brand", "--hero-1", 4.5),
    ("--on-brand", "--hero-2", 4.5),
    ("--on-brand", "--hero-3", 4.5),
    ("--on-brand", "--again-bg", 4.5),
    ("--on-brand", "--hard-bg", 4.5),
    ("--on-brand", "--good-bg", 4.5),
    ("--text", "--warning-bg", 4.5),
]


class ContrastTest(unittest.TestCase):
    def check(self, theme_name, theme):
        failures = []
        for fg, bg, minimum in PAIRS:
            ratio = contrast(resolve(theme, fg), resolve(theme, bg))
            if ratio < minimum:
                failures.append(f"{fg} บน {bg} = {ratio:.2f} (ต้อง ≥ {minimum})")
        self.assertEqual(failures, [], f"โหมด{theme_name}")

    def test_light_theme(self):
        self.check("สว่าง", LIGHT)

    def test_dark_theme(self):
        self.check("มืด", DARK)

    def test_every_dark_token_is_also_forced_by_data_theme(self):
        # โหมดมืดอัตโนมัติ (ตามเครื่อง) กับโหมดมืดที่เลือกเอง ต้องมีค่าชุดเดียวกัน
        auto = tokens(':root:not([data-theme="light"])')
        self.assertEqual(auto, tokens(':root[data-theme="dark"]'))


if __name__ == "__main__":
    unittest.main()
