import { test } from "node:test";
import assert from "node:assert/strict";

import { PLOT_FILTERS, dueLabel, matchesQuery, plantInfo, plantMatchesFilter, plotFilterCounts, plotSummary } from "../../app/js/garden.js";

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

import { LEECH_LAPSES, leechWords } from "../../app/js/garden.js";

test("leech words are the ones forgotten at least 3 times, most forgotten first", () => {
  const words = ["a", "b", "c", "d", "e"].map((headword, order) => ({ headword, order }));
  const lapsed = (lapses) => ({ due: 0, ivl: 1, ease: 2, reps: 1, lapses });
  const cards = { a: lapsed(3), b: lapsed(5), c: lapsed(2), d: lapsed(3) };
  assert.equal(LEECH_LAPSES, 3);
  assert.deepEqual(leechWords(words, cards).map((word) => word.headword), ["b", "a", "d"]);
  assert.deepEqual(leechWords(words, cards, 2).map((word) => word.headword), ["b", "a"]);
  assert.deepEqual(leechWords(words, {}), []);
});

import { PRACTICE_LIMIT, plantedInLevel, reviewedToday } from "../../app/js/garden.js";

test("reviewedToday picks cards last answered today (due - ivl) and ignores the rest", () => {
  const words = ["a", "b", "c", "d"].map((headword) => ({ headword, level: "01" }));
  const cards = {
    a: { due: 103, ivl: 3, reps: 1, lapses: 0 }, // ตอบวันที่ 100
    b: { due: 105, ivl: 5, reps: 2, lapses: 0 }, // ตอบวันที่ 100
    c: { due: 100, ivl: 0, reps: 0, lapses: 1 }, // ไม่เคยตอบผ่าน
    d: { due: 99, ivl: 2, reps: 2, lapses: 0 }, // ตอบวันที่ 97
  };
  assert.deepEqual(reviewedToday(words, cards, 100).map((word) => word.headword), ["a", "b"]);
  assert.deepEqual(reviewedToday(words, cards, 101), []);
});

test("plantedInLevel only returns planted words of that level, capped at the limit", () => {
  const words = Array.from({ length: 40 }, (_, index) => ({ headword: `w${index}`, level: index < 35 ? "01" : "02" }));
  const cards = Object.fromEntries(words.map((word) => [word.headword, { due: 10, ivl: 1, reps: 1, lapses: 0 }]));
  delete cards.w0;
  const picked = plantedInLevel(words, cards, "01");
  assert.equal(picked.length, PRACTICE_LIMIT);
  assert.ok(picked.every((word) => word.level === "01" && word.headword !== "w0"));
  assert.equal(new Set(picked.map((word) => word.headword)).size, picked.length);
  assert.equal(plantedInLevel(words, cards, "02").length, 5);
  assert.deepEqual(plantedInLevel(words, {}, "01"), []);
});

test("plot filters match all, wilted, or one growth stage", () => {
  const cards = {
    a: card(2, TODAY + 1), // ต้นอ่อน ยังไม่ถึงเวลา
    b: card(10, TODAY - 1), // กำลังโต ถึงเวลารดน้ำ
    c: card(30, TODAY + 9), // ต้นไม้ใหญ่
  };
  const words = ["a", "b", "c", "d"].map((headword) => ({ headword })); // d ยังเป็นเมล็ด
  assert.equal(plantMatchesFilter(cards.a, TODAY, "all"), true);
  assert.equal(plantMatchesFilter(cards.b, TODAY, "wilted"), true);
  assert.equal(plantMatchesFilter(cards.a, TODAY, "wilted"), false);
  assert.equal(plantMatchesFilter(undefined, TODAY, "wilted"), false);
  assert.equal(plantMatchesFilter(undefined, TODAY, "seed"), true);
  assert.equal(plantMatchesFilter(cards.c, TODAY, "tree"), true);
  assert.deepEqual(plotFilterCounts(words, cards, TODAY), { all: 4, wilted: 1, seed: 1, sprout: 1, growing: 1, tree: 1 });
  assert.deepEqual(PLOT_FILTERS.map((filter) => filter.id), ["all", "wilted", "seed", "sprout", "growing", "tree"]);
});
