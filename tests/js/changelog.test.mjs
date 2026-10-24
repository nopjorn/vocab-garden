import { test } from "node:test";
import assert from "node:assert/strict";

import { entriesSince, inlineParts, parseChangelog } from "../../app/js/changelog.js";
import { issueUrl, REPO_URL } from "../../app/js/report.js";

const SAMPLE = `# บันทึกการเปลี่ยนแปลง

คำอธิบายด้านบน

## [0.2.0] - 2026-10-25

### เพิ่ม
- ปัดการ์ดได้ ใช้ \`←\` \`→\` บนคอม
- แถบความคืบหน้า
  ต่อบรรทัดที่สอง

### ข้อมูลคำศัพท์
- แปลด่าน 2

## [0.1.0] - 2026-10-24

เวอร์ชันแรก 🎉

### เพิ่ม
- ติดตั้งเป็นแอปได้
`;

test("parseChangelog reads versions, dates, sections and items", () => {
  const entries = parseChangelog(SAMPLE);
  assert.deepEqual(entries.map((entry) => [entry.version, entry.date]), [["0.2.0", "2026-10-25"], ["0.1.0", "2026-10-24"]]);
  assert.deepEqual(entries[0].sections.map((section) => section.title), ["เพิ่ม", "ข้อมูลคำศัพท์"]);
  assert.deepEqual(entries[0].sections[0].items, ["ปัดการ์ดได้ ใช้ `←` `→` บนคอม", "แถบความคืบหน้า ต่อบรรทัดที่สอง"]);
  assert.equal(entries[1].intro, "เวอร์ชันแรก 🎉");
  assert.equal(entries[0].intro, "");
});

test("parseChangelog tolerates CRLF and empty input", () => {
  assert.equal(parseChangelog(SAMPLE.replace(/\n/g, "\r\n")).length, 2);
  assert.deepEqual(parseChangelog(""), []);
  assert.deepEqual(parseChangelog("<html>404</html>"), []);
});

test("parseChangelog reads the real CHANGELOG.md of this repo", async () => {
  const { readFile } = await import("node:fs/promises");
  const entries = await readFile(new URL("../../CHANGELOG.md", import.meta.url), "utf8").then(parseChangelog);
  assert.ok(entries.length >= 8);
  assert.ok(entries.every((entry) => entry.sections.length > 0));
  assert.ok(entries.every((entry) => entry.sections.every((section) => section.items.length > 0)));
});

test("entriesSince returns versions after seen up to current", () => {
  const entries = parseChangelog(SAMPLE);
  assert.deepEqual(entriesSince(entries, "0.1.0", "0.2.0").map((entry) => entry.version), ["0.2.0"]);
  assert.deepEqual(entriesSince(entries, "0.2.0", "0.2.0"), []);
  assert.deepEqual(entriesSince(entries, "0.0.1", "0.1.0").map((entry) => entry.version), ["0.1.0"]);
});

test("inlineParts splits backtick code from plain text", () => {
  assert.deepEqual(inlineParts("ใช้ `K` ได้"), [
    { text: "ใช้ ", code: false },
    { text: "K", code: true },
    { text: " ได้", code: false },
  ]);
  assert.deepEqual(inlineParts("ไม่มีโค้ด"), [{ text: "ไม่มีโค้ด", code: false }]);
});

test("issueUrl prefills a GitHub issue with the word and app version", () => {
  const word = {
    headword: "work",
    rank: "67",
    level: "01",
    senses: [{ pos: "v", text: "ทำงาน, ใช้การได้" }, { pos: "n", text: "งาน" }],
    exampleEn: "I work at a small hotel.",
    exampleTh: "ฉันทำงานที่โรงแรมเล็ก ๆ",
  };
  const url = new URL(issueUrl(word, "0.7.0"));
  assert.equal(`${url.origin}${url.pathname}`, `${REPO_URL}/issues/new`);
  assert.equal(url.searchParams.get("title"), "แจ้งคำแปลผิด: work");
  const body = url.searchParams.get("body");
  assert.match(body, /work \(อันดับ 67, ด่าน 01\)/);
  assert.match(body, /v: ทำงาน, ใช้การได้ \| n: งาน/);
  assert.match(body, /v0\.7\.0 · NGSL 1\.2/);
});
