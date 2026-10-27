import { test } from "node:test";
import assert from "node:assert/strict";

import { MEDALS } from "../../app/js/achievements.js";
import { DECORATIONS, FLOWERS, LOY_KRATHONG_DATES, bloomedLevels, flowerId, flowerOf, ownedDecorations, seasonOf } from "../../app/js/decor.js";

const LEVELS = [...Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(2, "0")), "sup"];

test("there is a distinct flower for every level and ids fit the medal storage format", () => {
  assert.equal(FLOWERS.length, LEVELS.length);
  assert.equal(new Set(FLOWERS.map((flower) => flower.emoji)).size, FLOWERS.length);
  for (const level of LEVELS) assert.match(flowerId(level), /^[a-z0-9-]{1,30}$/);
  assert.equal(flowerOf("01", LEVELS).emoji, "🌸");
  assert.equal(flowerOf("sup", LEVELS), FLOWERS[28]);
  assert.equal(flowerOf("99", LEVELS), null);
});

const word = (headword, level, translated = true) => ({ headword, level, translated });
const grown = { due: 9, ivl: 7, ease: 2.5, reps: 3, lapses: 0 };
const sprout = { ...grown, ivl: 3 };

test("a level blooms only when every word is translated and at least growing", () => {
  const words = [word("a", "01"), word("b", "01"), word("c", "02"), word("d", "02", false)];
  assert.deepEqual(bloomedLevels(words, { a: grown, b: { ...grown, ivl: 30 } }, ["01", "02"]), ["01"]);
  assert.deepEqual(bloomedLevels(words, { a: grown, b: sprout }, ["01", "02"]), []);
  assert.deepEqual(bloomedLevels(words, { a: grown }, ["01"]), []); // b ยังไม่ได้ปลูก
  assert.deepEqual(bloomedLevels(words, { c: grown, d: grown }, ["02"]), []); // d ยังไม่ได้แปล
  assert.deepEqual(bloomedLevels([], {}, ["01"]), []);
});

test("every decoration is unlocked by a real medal and unique", () => {
  const medalIds = new Set(MEDALS.map((medal) => medal.id));
  assert.equal(new Set(DECORATIONS.map((decoration) => decoration.id)).size, DECORATIONS.length);
  assert.equal(new Set(DECORATIONS.map((decoration) => decoration.emoji)).size, DECORATIONS.length);
  for (const decoration of DECORATIONS) assert.ok(medalIds.has(decoration.medal), decoration.id);
});

test("decorations follow the medals owned (flowers in the same map are ignored)", () => {
  assert.deepEqual(ownedDecorations({}), []);
  const owned = ownedDecorations({ "plant-1": 5, "flower-01": 6, "tree-1": 7 }).map((decoration) => decoration.id);
  assert.deepEqual(owned, ["mushroom", "ladybug"]);
});

test("seasons follow fixed dates of the year", () => {
  assert.equal(seasonOf(new Date(2026, 3, 13)).id, "songkran");
  assert.equal(seasonOf(new Date(2026, 3, 15)).id, "songkran");
  assert.equal(seasonOf(new Date(2026, 3, 16)), null);
  assert.equal(seasonOf(new Date(2026, 11, 31)).id, "newyear");
  assert.equal(seasonOf(new Date(2027, 0, 2)).id, "newyear");
  assert.equal(seasonOf(new Date(2026, 5, 1)), null);
});

test("Loy Krathong shows from two days before to one day after the listed dates only", () => {
  assert.equal(seasonOf(new Date(2026, 10, 21)), null);
  assert.equal(seasonOf(new Date(2026, 10, 22)).id, "loykrathong");
  assert.equal(seasonOf(new Date(2026, 10, 24)).id, "loykrathong");
  assert.equal(seasonOf(new Date(2026, 10, 25)).id, "loykrathong");
  assert.equal(seasonOf(new Date(2026, 10, 26)), null);
  // ข้ามเดือนได้: งาน 2 พ.ย. 2028 ขึ้นธีมตั้งแต่ 31 ต.ค.
  assert.equal(seasonOf(new Date(2028, 9, 31)).id, "loykrathong");
  // ปีที่ไม่อยู่ในตารางไม่ขึ้นธีม
  assert.equal(seasonOf(new Date(2029, 10, 15)), null);
});

test("fixed festivals still win and the Loy Krathong table is in date order", () => {
  assert.equal(seasonOf(new Date(2026, 3, 14)).id, "songkran");
  const stamps = LOY_KRATHONG_DATES.map(([y, m, d]) => Date.UTC(y, m, d));
  assert.deepEqual(stamps, [...stamps].sort((a, b) => a - b));
  for (const [, month] of LOY_KRATHONG_DATES) assert.ok(month === 9 || month === 10, "Loy Krathong falls in late Oct or Nov");
});
