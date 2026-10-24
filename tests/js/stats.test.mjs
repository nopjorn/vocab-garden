import { test } from "node:test";
import assert from "node:assert/strict";

import { recentDays, stageCounts, streakOf, totalReviews } from "../../app/js/stats.js";

const TODAY = 20000; // 2024-10-04 (วันศุกร์) ตามเลขวันของ dayNumber

test("streak counts consecutive days up to today", () => {
  const days = { [TODAY]: 3, [TODAY - 1]: 5, [TODAY - 2]: 1 };
  assert.deepEqual(streakOf(days, TODAY), { current: 3, best: 3 });
});

test("streak is kept until the end of today when today has no reviews yet", () => {
  const days = { [TODAY - 1]: 4, [TODAY - 2]: 2 };
  assert.deepEqual(streakOf(days, TODAY), { current: 2, best: 2 });
});

test("streak resets after a missed day but best remembers the longest run", () => {
  const days = { [TODAY]: 1, [TODAY - 2]: 1, [TODAY - 3]: 1, [TODAY - 4]: 1, [TODAY - 5]: 1 };
  assert.deepEqual(streakOf(days, TODAY), { current: 1, best: 4 });
  assert.deepEqual(streakOf({ [TODAY - 3]: 2 }, TODAY), { current: 0, best: 1 });
  assert.deepEqual(streakOf({}, TODAY), { current: 0, best: 0 });
});

test("days with a zero count do not extend a streak", () => {
  assert.deepEqual(streakOf({ [TODAY]: 1, [TODAY - 1]: 0, [TODAY - 2]: 5 }, TODAY), { current: 1, best: 1 });
});

test("totalReviews sums every day", () => {
  assert.equal(totalReviews({ 1: 3, 2: 4 }), 7);
  assert.equal(totalReviews({}), 0);
});

test("recentDays returns the last n days oldest first with Thai weekday labels", () => {
  const week = recentDays({ [TODAY]: 9, [TODAY - 6]: 2 }, TODAY, 7);
  assert.equal(week.length, 7);
  assert.deepEqual([week[0].count, week[6].count, week[3].count], [2, 9, 0]);
  assert.equal(week[6].day, TODAY);
  assert.equal(week[6].label, "ศ");
  assert.equal(week[0].label, "ส");
});

test("stageCounts groups cards into the four stages", () => {
  const words = ["a", "b", "c", "d"].map((headword) => ({ headword }));
  const cards = {
    b: { due: 0, ivl: 3, ease: 2.5, reps: 1, lapses: 0 },
    c: { due: 0, ivl: 10, ease: 2.5, reps: 2, lapses: 0 },
    d: { due: 0, ivl: 30, ease: 2.5, reps: 3, lapses: 0 },
  };
  assert.deepEqual(
    stageCounts(words, cards).map((stage) => [stage.id, stage.count]),
    [["seed", 1], ["sprout", 1], ["growing", 1], ["tree", 1]],
  );
});
