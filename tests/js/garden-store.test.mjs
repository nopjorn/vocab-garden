import { test } from "node:test";
import assert from "node:assert/strict";

import { createStorage, mergeGarden } from "../../app/js/storage.js";

const bugsOf = ({ bugs, caught }) => ({ bugs, caught });

function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test("the garden store starts empty and drops bad values", () => {
  assert.deepEqual(createStorage(fakeStore()).loadGarden(), { bugs: {}, caught: 0, visits: [], souvenirs: {}, pressed: {}, spotted: {}, spottedOn: {} });
  const messy = fakeStore({ "vg:garden": JSON.stringify({ bugs: { house: 3, bad: -1, odd: 1.5, ["x".repeat(65)]: 2 }, caught: "lots" }) });
  assert.deepEqual(bugsOf(createStorage(messy).loadGarden()), { bugs: { house: 3 }, caught: 0 });
  assert.deepEqual(bugsOf(createStorage(fakeStore({ "vg:garden": "[1,2]" })).loadGarden()), { bugs: {}, caught: 0 });
});

test("catching a bug remembers the lapses and counts it", () => {
  const storage = createStorage(fakeStore());
  storage.catchBug("house", 3);
  const garden = storage.catchBug("house", 4);
  assert.deepEqual(bugsOf(garden), { bugs: { house: 4 }, caught: 2 });
  assert.deepEqual(storage.loadGarden(), garden);
});

test("the garden goes into backups and merges by taking the larger value", () => {
  const source = createStorage(fakeStore());
  source.catchBug("house", 3);
  const backup = JSON.parse(JSON.stringify(source.exportData("0.58.0")));
  assert.deepEqual(bugsOf(backup.garden), { bugs: { house: 3 }, caught: 1 });

  const target = createStorage(fakeStore());
  target.catchBug("go", 5);
  target.importData(backup, { merge: true });
  assert.deepEqual(bugsOf(target.loadGarden()), { bugs: { go: 5, house: 3 }, caught: 1 });
  target.importData(backup);
  assert.deepEqual(bugsOf(target.loadGarden()), { bugs: { house: 3 }, caught: 1 });

  const old = createStorage(fakeStore());
  old.catchBug("go", 5);
  old.importData({ app: "vocab-garden", schema: 1, cards: {} });
  assert.deepEqual(old.loadGarden().bugs, { go: 5 }, "an old backup without garden keeps what is there");
  const empty = { visits: [], souvenirs: {}, pressed: {} };
  assert.deepEqual(bugsOf(mergeGarden({ ...empty, bugs: { a: 1 }, caught: 4 }, { ...empty, bugs: { a: 3, b: 1 }, caught: 2 })), { bugs: { a: 3, b: 1 }, caught: 4 });
});

test("visits are recorded once per slot and souvenirs pile up", () => {
  const storage = createStorage(fakeStore());
  assert.equal(storage.recordVisit(100, 0, "acorn"), true);
  assert.equal(storage.recordVisit(100, 0, "acorn"), false, "the same slot cannot be answered twice");
  assert.equal(storage.recordVisit(100, 1, null), true);
  storage.recordVisit(101, 0, "acorn");
  assert.deepEqual(storage.loadGarden().visits, ["100-0", "100-1", "101-0"]);
  assert.deepEqual(storage.loadGarden().souvenirs, { acorn: 2 });
});

test("visits are cleaned, capped and merged", () => {
  const many = Array.from({ length: 80 }, (_, i) => `${i}-0`);
  const store = fakeStore({ "vg:garden": JSON.stringify({ visits: ["x", "5-2", 3, "9-1", "9-1", ...many], souvenirs: { acorn: 2, bad: "x" } }) });
  const garden = createStorage(store).loadGarden();
  assert.equal(garden.visits.length, 60);
  assert.equal(garden.visits.at(-1), "79-0");
  assert.deepEqual(garden.souvenirs, { acorn: 2 });
  const merged = mergeGarden({ bugs: {}, caught: 0, visits: ["1-0", "3-1"], souvenirs: { acorn: 1 }, pressed: {} }, { bugs: {}, caught: 0, visits: ["2-0", "1-0"], souvenirs: { acorn: 3, shell: 1 }, pressed: {} });
  assert.deepEqual(merged.visits, ["1-0", "2-0", "3-1"]);
  assert.deepEqual(merged.souvenirs, { acorn: 3, shell: 1 });
});

test("spotting a word in real life counts once a day and merges by the larger count", () => {
  const storage = createStorage(fakeStore());
  assert.equal(storage.spotWord("house", 10), 1);
  assert.equal(storage.spotWord("house", 10), 0, "only once a day");
  assert.equal(storage.spotWord("house", 11), 2);
  assert.equal(storage.spotWord("go", 11), 1);
  const garden = storage.loadGarden();
  assert.deepEqual(garden.spotted, { house: 2, go: 1 });
  assert.deepEqual(garden.spottedOn, { house: 11, go: 11 });
  const merged = mergeGarden(garden, { ...garden, spotted: { house: 1, eat: 4 }, spottedOn: { house: 9, eat: 12 } });
  assert.deepEqual(merged.spotted, { house: 2, go: 1, eat: 4 });
  assert.deepEqual(merged.spottedOn, { house: 11, go: 11, eat: 12 });
});

test("ten real-life spots earn the spotter medal", async () => {
  const { newMedals } = await import("../../app/js/achievements.js");
  assert.equal(newMedals({ spotted: 9 }, {}).some((medal) => medal.id === "spotter"), false);
  assert.equal(newMedals({ spotted: 10 }, {}).some((medal) => medal.id === "spotter"), true);
});
