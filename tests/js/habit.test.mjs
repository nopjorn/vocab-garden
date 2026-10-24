import { test } from "node:test";
import assert from "node:assert/strict";

import { REST_EVERY, REST_MAX, daysAway, emptyRest, goalProgress, settleRest } from "../../app/js/habit.js";
import { streakOf } from "../../app/js/stats.js";

const TODAY = 20000;
// ท่องติดกัน n วันจบที่วัน last
const run = (last, n) => Object.fromEntries(Array.from({ length: n }, (_, index) => [last - index, 2]));

test("a first-time user starts with an empty bank and nothing to settle", () => {
  const { rest, usedNow, earned } = settleRest({}, null, TODAY);
  assert.deepEqual([rest.bank, rest.upTo, usedNow, earned], [0, TODAY - 1, [], 0]);
});

test("studying 7 days in a row earns one rest day, capped at 2", () => {
  assert.equal(settleRest(run(TODAY, REST_EVERY), null, TODAY).rest.bank, 1);
  assert.equal(settleRest(run(TODAY, REST_EVERY * 2), null, TODAY).rest.bank, 2);
  assert.equal(settleRest(run(TODAY, REST_EVERY * 3), null, TODAY).rest.bank, REST_MAX);
});

test("one missed day is covered by a rest day and the streak survives", () => {
  const days = { ...run(TODAY - 2, 7) }; // ท่อง 7 วันจบเมื่อสามวันก่อน... แล้วพลาดเมื่อวาน
  const { rest, usedNow } = settleRest(days, null, TODAY);
  assert.deepEqual(usedNow, [TODAY - 1]);
  assert.equal(rest.bank, 0);
  assert.deepEqual(rest.frozen, [TODAY - 1]);
  assert.deepEqual(streakOf({ ...days, [TODAY]: 1 }, TODAY, rest.frozen), { current: 8, best: 8 });
  assert.deepEqual(streakOf(days, TODAY, rest.frozen), { current: 7, best: 7 });
});

test("without a rest day a missed day breaks the streak", () => {
  const days = run(TODAY - 2, 3);
  const { rest, usedNow } = settleRest(days, null, TODAY);
  assert.deepEqual(usedNow, []);
  assert.equal(rest.run, 0);
  assert.deepEqual(streakOf(days, TODAY, rest.frozen), { current: 0, best: 3 });
});

test("a long absence uses at most the banked rest days and then lets the streak go", () => {
  const days = run(TODAY - 10, REST_EVERY * 2); // ได้วันพัก 2 วัน แล้วหายไป 10 วัน
  const { rest, usedNow } = settleRest(days, null, TODAY);
  assert.equal(usedNow.length, 2);
  assert.equal(rest.bank, 0);
  assert.deepEqual(streakOf(days, TODAY, rest.frozen).current, 0);
});

test("settling again changes nothing and carries on from the saved state", () => {
  const days = run(TODAY - 2, 7);
  const first = settleRest(days, null, TODAY);
  const again = settleRest(days, first.rest, TODAY);
  assert.deepEqual(again.rest, first.rest);
  assert.deepEqual([again.usedNow, again.earned], [[], 0]);

  const tomorrow = settleRest({ ...days, [TODAY]: 3 }, first.rest, TODAY + 1);
  assert.equal(tomorrow.rest.run, 8);
});

test("today counts toward earning a rest day as soon as it is studied", () => {
  const { rest, earned } = settleRest(run(TODAY, 7), null, TODAY);
  assert.deepEqual([rest.bank, earned, rest.upTo], [1, 1, TODAY]);
});

test("old rest days are dropped after the history window", () => {
  const saved = { ...emptyRest(), upTo: TODAY - 1, frozen: [TODAY - 500, TODAY - 3] };
  assert.deepEqual(settleRest({ [TODAY]: 1 }, saved, TODAY).rest.frozen, [TODAY - 3]);
});

test("daysAway counts days since the last study and is null when not applicable", () => {
  assert.equal(daysAway({ [TODAY - 5]: 2, [TODAY - 9]: 1 }, TODAY), 5);
  assert.equal(daysAway({ [TODAY]: 1, [TODAY - 5]: 2 }, TODAY), null);
  assert.equal(daysAway({}, TODAY), null);
});

test("goalProgress reports percent and when the goal is reached", () => {
  assert.deepEqual(goalProgress({ [TODAY]: 4 }, TODAY, 10), { done: 4, goal: 10, percent: 40, reached: false });
  assert.deepEqual(goalProgress({ [TODAY]: 12 }, TODAY, 10), { done: 12, goal: 10, percent: 100, reached: true });
  assert.equal(goalProgress({}, TODAY, 10).done, 0);
});
