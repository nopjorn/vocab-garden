import { test } from "node:test";
import assert from "node:assert/strict";

import { AGAIN, HARD, GOOD, buildQueue, dayNumber, grade, stageOf } from "../../app/js/srs.js";

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
