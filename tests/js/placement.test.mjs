import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseLevel } from "../../app/js/data.js";
import { FAKE_COUNT, FAKE_WORDS, PER_LEVEL, buildPlacement, estimateKnown, knownWords, recommendLevel, scorePlacement } from "../../app/js/placement.js";

function seeded(seed = 1) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const allWords = ["01", "02", "03", "04", "sup"].flatMap((level) =>
  parseLevel(readFileSync(new URL(`../../app/data/levels/${level}.tsv`, import.meta.url), "utf8"), level),
);
const translated = allWords.filter((entry) => entry.senses.length > 0);

test("a placement test mixes real words of every translated level (not the special level) with fake words", () => {
  const items = buildPlacement(translated, seeded());
  const real = items.filter((item) => item.kind === "word");
  const fake = items.filter((item) => item.kind === "fake");
  assert.equal(real.length, PER_LEVEL * 4);
  assert.equal(fake.length, FAKE_COUNT);
  for (const level of ["01", "02", "03", "04"]) assert.equal(real.filter((item) => item.level === level).length, PER_LEVEL);
  assert.equal(new Set(real.map((item) => item.word.headword)).size, real.length);
  assert.equal(new Set(fake.map((item) => item.text)).size, fake.length);
});

test("fake words are never real NGSL headwords or word forms", () => {
  const known = new Set(allWords.flatMap((entry) => [entry.headword.toLowerCase(), ...entry.forms.map((form) => form.toLowerCase())]));
  for (const fake of FAKE_WORDS) assert.equal(known.has(fake), false, fake);
});

test("answering yes to everything real and no to fakes means a perfect level score", () => {
  const items = buildPlacement(translated, seeded());
  const answers = items.map((item) => item.kind === "word");
  const result = scorePlacement(items, answers);
  assert.equal(result.falseRate, 0);
  assert.equal(result.reliable, true);
  assert.ok(result.levels.every((entry) => entry.known === 1));
  assert.equal(recommendLevel(result), 4); // รู้หมดทุกแปลง = แนะนำแปลงสุดท้าย
  assert.equal(estimateKnown(result, { "01": 100, "02": 100, "03": 100, "04": 100 }), 400);
});

test("saying no to everything recommends the first level", () => {
  const items = buildPlacement(translated, seeded());
  const result = scorePlacement(items, items.map(() => false));
  assert.ok(result.levels.every((entry) => entry.known === 0));
  assert.equal(recommendLevel(result), 1);
  assert.deepEqual(knownWords(items, items.map(() => false)), []);
});

test("recommends the first level the user does not know well enough", () => {
  const items = buildPlacement(translated, seeded(3));
  // รู้แปลง 1-2 หมด ไม่รู้แปลง 3-4
  const answers = items.map((item) => item.kind === "word" && (item.level === "01" || item.level === "02"));
  const result = scorePlacement(items, answers);
  assert.equal(recommendLevel(result), 3);
  assert.equal(estimateKnown(result, { "01": 100, "02": 100, "03": 100, "04": 100 }), 200);
});

test("claiming to know fake words discounts the score and can make the result unreliable", () => {
  const items = buildPlacement(translated, seeded(5));
  const fakeIndexes = items.map((item, index) => (item.kind === "fake" ? index : -1)).filter((index) => index >= 0);
  // ตอบว่ารู้จักทุกอย่าง รวมคำปลอมทั้งหมด
  const all = scorePlacement(items, items.map(() => true));
  assert.equal(all.falseRate, 1);
  assert.equal(all.reliable, false);
  assert.ok(all.levels.every((entry) => entry.known === 0));
  assert.equal(recommendLevel(all), 1);
  assert.deepEqual(knownWords(items, items.map(() => true), all.reliable), []);
  // รู้จักคำปลอมหนึ่งในแปดข้อ: ยังน่าเชื่อถือ แต่คะแนนถูกหักลง
  const answers = items.map((item, index) => item.kind === "word" || index === fakeIndexes[0]);
  const some = scorePlacement(items, answers);
  assert.equal(some.falseRate, 1 / FAKE_COUNT);
  assert.equal(some.reliable, true);
  assert.ok(some.levels.every((entry) => entry.known === 1));
});
