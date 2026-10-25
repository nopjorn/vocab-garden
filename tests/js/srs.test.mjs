import { test } from "node:test";
import assert from "node:assert/strict";

import { AGAIN, HARD, GOOD, buildQueue, dayNumber, grade, knownCard, stageOf } from "../../app/js/srs.js";

const TODAY = 20000;

test("new card: good waits 3 days, hard 1 day, again stays today", () => {
  assert.equal(grade(undefined, GOOD, TODAY).due, TODAY + 3);
  assert.equal(grade(undefined, HARD, TODAY).due, TODAY + 1);
  const again = grade(undefined, AGAIN, TODAY);
  assert.deepEqual([again.due, again.ivl, again.reps], [TODAY, 0, 0]);
});

test("new card answered again then good waits 3 days", () => {
  const relearned = grade(grade(undefined, AGAIN, TODAY), GOOD, TODAY);
  assert.equal(relearned.ivl, 3);
});

test("review good multiplies interval by ease", () => {
  const card = { due: TODAY, ivl: 10, ease: 2.5, reps: 3, lapses: 0 };
  assert.equal(grade(card, GOOD, TODAY).ivl, 25);
});

test("review hard grows slowly and lowers ease", () => {
  const card = { due: TODAY, ivl: 10, ease: 2.5, reps: 3, lapses: 0 };
  const next = grade(card, HARD, TODAY);
  assert.equal(next.ivl, 12);
  assert.equal(next.ease, 2.35);
});

test("forgetting a review card counts a lapse and relearns in 1 day", () => {
  const card = { due: TODAY, ivl: 30, ease: 2.5, reps: 5, lapses: 0 };
  const forgot = grade(card, AGAIN, TODAY);
  assert.deepEqual([forgot.ivl, forgot.due, forgot.lapses, forgot.ease], [0, TODAY, 1, 2.3]);
  assert.equal(grade(forgot, GOOD, TODAY).ivl, 1);
});

test("ease never drops below 1.3", () => {
  let card = { due: TODAY, ivl: 5, ease: 1.35, reps: 3, lapses: 0 };
  card = grade(card, HARD, TODAY);
  assert.equal(card.ease, 1.3);
});

test("grade does not change the original state", () => {
  const card = { due: TODAY, ivl: 10, ease: 2.5, reps: 3, lapses: 0 };
  grade(card, GOOD, TODAY);
  assert.equal(card.ivl, 10);
});

test("stages follow the interval", () => {
  assert.equal(stageOf(undefined).id, "seed");
  assert.equal(stageOf({ ivl: 0 }).id, "sprout");
  assert.equal(stageOf({ ivl: 6 }).id, "sprout");
  assert.equal(stageOf({ ivl: 7 }).id, "growing");
  assert.equal(stageOf({ ivl: 21 }).id, "tree");
});

test("day starts at 4 AM local time", () => {
  const before = dayNumber(new Date(2026, 9, 25, 3, 59));
  const after = dayNumber(new Date(2026, 9, 25, 4, 0));
  assert.equal(after - before, 1);
  assert.equal(dayNumber(new Date(2026, 9, 25, 23, 0)), after);
});

test("queue puts overdue cards first, then new cards in NGSL order up to the limit", () => {
  const words = ["a", "b", "c", "d", "e"].map((headword, order) => ({ headword, order }));
  const cards = {
    a: { due: TODAY + 2, ivl: 3 },
    b: { due: TODAY, ivl: 3 },
    c: { due: TODAY - 1, ivl: 3 },
  };
  assert.deepEqual(buildQueue(words, cards, TODAY, 1).map((word) => word.headword), ["c", "b", "d"]);
  assert.deepEqual(buildQueue(words, cards, TODAY, 0).map((word) => word.headword), ["c", "b"]);
});

test("knownCard sends a new word straight to a big tree", () => {
  const card = knownCard(undefined, TODAY);
  assert.deepEqual([card.ivl, card.due, card.reps, card.lapses], [30, TODAY + 30, 1, 0]);
  assert.equal(stageOf(card).id, "tree");
});

test("knownCard never shortens a longer interval and keeps the lapse history", () => {
  const card = knownCard({ due: TODAY, ivl: 50, ease: 2.1, reps: 6, lapses: 2 }, TODAY);
  assert.deepEqual([card.ivl, card.due, card.ease, card.reps, card.lapses], [50, TODAY + 50, 2.1, 7, 2]);
});

test("buildQueue takes new words only from freshWords but still reviews every due word", () => {
  const words = ["a", "b", "c", "d"].map((headword, order) => ({ headword, order }));
  const cards = { a: { due: TODAY - 1, ivl: 1, ease: 2.5, reps: 1, lapses: 0 } };
  const queue = buildQueue(words, cards, TODAY, 5, words.slice(2));
  assert.deepEqual(queue.map((word) => word.headword), ["a", "c", "d"]);
});

test("a due limit keeps the longest-overdue cards and pauses new words while there is a backlog", () => {
  const words = ["a", "b", "c", "d", "e"].map((headword, order) => ({ headword, order }));
  const card = (due) => ({ due, ivl: 3, ease: 2.5, reps: 2, lapses: 0 });
  const cards = { a: card(TODAY - 1), b: card(TODAY - 5), c: card(TODAY) };
  const names = (queue) => queue.map((word) => word.headword);
  assert.deepEqual(names(buildQueue(words, cards, TODAY, 5, words, 2)), ["b", "a"]);
  assert.deepEqual(names(buildQueue(words, cards, TODAY, 5, words, 3)), ["b", "a", "c", "d", "e"]);
  assert.deepEqual(names(buildQueue(words, cards, TODAY, 1, words, 0)), []);
  assert.deepEqual(names(buildQueue(words, {}, TODAY, 2, words, 0)), ["a", "b"]); // ไม่มีคำค้าง เพดานหมดแล้วก็ยังเรียนคำใหม่ได้
});

import { fuzzRange } from "../../app/js/srs.js";

test("fuzzRange is zero for very short intervals and grows with the interval", () => {
  assert.deepEqual([0, 1, 2].map(fuzzRange), [0, 0, 0]);
  assert.deepEqual([3, 6].map(fuzzRange), [1, 1]);
  assert.equal(fuzzRange(10), 1);
  assert.equal(fuzzRange(20), 2);
  assert.equal(fuzzRange(30), 2);
  assert.equal(fuzzRange(100), 5);
});

test("grading without an rng never fuzzes, with an rng it stays inside the range", () => {
  assert.equal(grade(undefined, GOOD, TODAY).due, TODAY + 3);
  const low = grade(undefined, GOOD, TODAY, () => 0);
  const high = grade(undefined, GOOD, TODAY, () => 0.999999);
  assert.equal(low.ivl, 2);
  assert.equal(high.ivl, 4);
  assert.equal(low.due, TODAY + 2);
  const seen = new Set();
  let seed = 7;
  for (let i = 0; i < 200; i += 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const card = grade({ due: TODAY, ivl: 20, ease: 2.5, reps: 3, lapses: 0 }, GOOD, TODAY, () => seed / 4294967296);
    assert.equal(card.due, TODAY + card.ivl); // due - ivl ยังเป็นวันที่ตอบ
    assert.ok(card.ivl >= 47 && card.ivl <= 53, String(card.ivl)); // 20×2.5=50 ± 3
    seen.add(card.ivl);
  }
  assert.ok(seen.size > 1);
});

test("again and short intervals are never fuzzed", () => {
  for (const rng of [() => 0, () => 0.999999]) {
    assert.equal(grade({ due: TODAY, ivl: 10, ease: 2.5, reps: 2, lapses: 0 }, AGAIN, TODAY, rng).ivl, 0);
    assert.equal(grade(undefined, HARD, TODAY, rng).ivl, 1);
  }
});
