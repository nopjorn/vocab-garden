import { test } from "node:test";
import assert from "node:assert/strict";

import { allDone, longestRun, missionProgress, missionsFor, withDone } from "../../app/js/missions.js";
import { createStorage } from "../../app/js/storage.js";

const fakeStore = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
};

test("every day has three missions: review the daily goal, play a game, and one that alternates", () => {
  const even = missionsFor(100, 20);
  const odd = missionsFor(101, 20);
  assert.deepEqual(even.map((m) => m.id), ["review", "game", "streak"]);
  assert.deepEqual(odd.map((m) => m.id), ["review", "game", "plant"]);
  assert.equal(even[0].target, 20);
  assert.equal(even[0].title, "ทวน 20 ใบ");
});

test("the longest run counts only today's answers and resets on a miss", () => {
  const answers = [
    [99, "x", 3, 5],
    [100, "a", 3, 5],
    [100, "b", 2, 5],
    [100, "c", 1, 5],
    [100, "d", 3, 5],
    [100, "e", 3, 5],
    [100, "f", 3, 5],
    [101, "g", 3, 5],
  ];
  assert.equal(longestRun(answers, 100), 3);
  assert.equal(longestRun(answers, 102), 0);
});

test("progress is capped at the target and done flags follow", () => {
  const progress = missionProgress(100, 10, { reviews: 25, games: 0, planted: 0, answers: [] });
  assert.deepEqual(progress.map((m) => [m.id, m.value, m.done]), [["review", 10, true], ["game", 0, false], ["streak", 0, false]]);
  assert.equal(allDone(progress), false);
  const full = missionProgress(100, 10, { reviews: 10, games: 2, planted: 0, answers: [[100, "a", 3, 1], [100, "b", 3, 1], [100, "c", 3, 1], [100, "d", 3, 1], [100, "e", 3, 1]] });
  assert.equal(allDone(full), true);
});

test("completed days are kept sorted, without duplicates, for the last 90 days", () => {
  assert.deepEqual(withDone([5, 3], 4), [3, 4, 5]);
  assert.deepEqual(withDone([5], 5), [5]);
  assert.deepEqual(withDone([1, 50], 100), [50, 100]);
});

test("storage records completed days, round-trips them through backup and rejects junk", () => {
  const storage = createStorage(fakeStore());
  assert.deepEqual(storage.loadMissions(), []);
  assert.equal(storage.markMissionsDone(100), true);
  assert.equal(storage.markMissionsDone(100), false);
  storage.markMissionsDone(101);
  const backup = JSON.parse(JSON.stringify(storage.exportData("0.46.0")));
  assert.deepEqual(backup.missions, [100, 101]);
  const other = createStorage(fakeStore());
  other.markMissionsDone(99);
  other.importData(backup, { merge: true });
  assert.deepEqual(other.loadMissions(), [99, 100, 101]);
  other.importData(backup);
  assert.deepEqual(other.loadMissions(), [100, 101]);
  const store = fakeStore();
  store.setItem("vg:missions", JSON.stringify([1, "x", 2.5, 3, null]));
  assert.deepEqual(createStorage(store).loadMissions(), [1, 3]);
});
