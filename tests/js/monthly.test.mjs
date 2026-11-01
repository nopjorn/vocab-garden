import { test } from "node:test";
import assert from "node:assert/strict";

import { CHALLENGES, challengeOf, completedMonths, monthOf, monthlyProgress } from "../../app/js/monthly.js";

const dayOf = (year, month, date) => Date.UTC(year, month, date) / 86400000;

test("monthOf finds the first and last day and a medal id for the month", () => {
  const month = monthOf(dayOf(2026, 10, 15));
  assert.equal(month.first, dayOf(2026, 10, 1));
  assert.equal(month.last, dayOf(2026, 10, 30));
  assert.equal(month.id, "month-2026-11");
  assert.equal(month.name, "พฤศจิกายน");
  assert.equal(monthOf(dayOf(2028, 1, 10)).last, dayOf(2028, 1, 29)); // ปีอธิกสุรทิน
});

test("the challenge changes every month and cycles through all kinds", () => {
  const ids = Array.from({ length: CHALLENGES.length }, (_, index) => challengeOf(monthOf(dayOf(2026, index, 5))).id);
  assert.equal(new Set(ids).size, CHALLENGES.length);
});

// หาเดือนที่ได้ชาเลนจ์ชนิดที่ต้องการ
function monthWith(id) {
  for (let index = 0; index < 12; index += 1) {
    const day = dayOf(2026, index, 1);
    if (challengeOf(monthOf(day)).id === id) return day;
  }
  throw new Error(id);
}

test("monthlyProgress counts only days inside the month", () => {
  const first = monthWith("plant");
  const log = { [first - 1]: { n: 50, t: 0, a: 0 }, [first]: { n: 40, t: 1, a: 0 }, [first + 3]: { n: 30, t: 0, a: 0 } };
  const progress = monthlyProgress(first + 3, { history: {}, log, games: {} });
  assert.equal(progress.value, 70);
  assert.equal(progress.done, false);
  assert.equal(progress.percent, 70);
  assert.equal(progress.daysLeft, monthOf(first).last - (first + 3));
});

test("days challenge counts days with reviews or games, and caps at the target", () => {
  const first = monthWith("days");
  const history = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [first + index, 3]));
  const games = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [first + 10 + index, 1]));
  const progress = monthlyProgress(first + 25, { history, log: {}, games });
  assert.equal(progress.value, 20);
  assert.equal(progress.done, true);
});

test("completedMonths reads month ids among other medals", () => {
  assert.deepEqual(completedMonths({ "plant-1": 3, "month-2026-12": 9, "month-2026-11": 5, "gift-duck": 4 }), ["month-2026-11", "month-2026-12"]);
});
