import { test } from "node:test";
import assert from "node:assert/strict";

import { dueLabel, matchesQuery, plantInfo, plotSummary } from "../../app/js/garden.js";

const TODAY = 20000;
const card = (ivl, due) => ({ due, ivl, ease: 2.5, reps: 4, lapses: 1 });

test("a plant wilts only when it is planted and due", () => {
  assert.deepEqual(plantInfo(undefined, TODAY), { stage: { id: "seed", emoji: "🌰", label: "เมล็ด" }, planted: false, wilted: false, overdue: 0 });
  assert.deepEqual(
    [plantInfo(card(10, TODAY + 3), TODAY).wilted, plantInfo(card(10, TODAY), TODAY).wilted, plantInfo(card(10, TODAY - 2), TODAY).overdue],
    [false, true, 2],
  );
  assert.equal(plantInfo(card(30, TODAY - 1), TODAY).stage.id, "tree");
});

test("dueLabel says when to water next", () => {
  assert.match(dueLabel(undefined, TODAY), /ยังไม่ได้ปลูก/);
  assert.match(dueLabel(card(3, TODAY), TODAY), /วันนี้/);
  assert.match(dueLabel(card(3, TODAY - 4), TODAY), /ค้าง 4 วัน/);
  assert.equal(dueLabel(card(3, TODAY + 1), TODAY), "รดน้ำครั้งถัดไป: พรุ่งนี้");
  assert.equal(dueLabel(card(3, TODAY + 12), TODAY), "รดน้ำครั้งถัดไป: อีก 12 วัน");
});

test("search matches headword, other forms and Thai meanings, ignoring case", () => {
  const word = { headword: "house", forms: ["houses"], senses: [{ text: "บ้าน, ที่อยู่อาศัย" }] };
  assert.ok(matchesQuery(word, ""));
  assert.ok(matchesQuery(word, "  "));
  assert.ok(matchesQuery(word, "HOU"));
  assert.ok(matchesQuery(word, "houses"));
  assert.ok(matchesQuery(word, "บ้าน"));
  assert.ok(!matchesQuery(word, "car"));
});

test("plotSummary counts planted and wilted plants", () => {
  const words = ["a", "b", "c", "d"].map((headword) => ({ headword }));
  const cards = { a: card(2, TODAY - 1), b: card(9, TODAY + 5), c: card(1, TODAY) };
  assert.deepEqual(plotSummary(words, cards, TODAY), { planted: 3, wilted: 2, total: 4 });
});
