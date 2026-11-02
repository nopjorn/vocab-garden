import { test } from "node:test";
import assert from "node:assert/strict";

import { createStorage, mergeGarden } from "../../app/js/storage.js";

function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test("the garden store starts empty and drops bad values", () => {
  assert.deepEqual(createStorage(fakeStore()).loadGarden(), { bugs: {}, caught: 0 });
  const messy = fakeStore({ "vg:garden": JSON.stringify({ bugs: { house: 3, bad: -1, odd: 1.5, ["x".repeat(65)]: 2 }, caught: "lots" }) });
  assert.deepEqual(createStorage(messy).loadGarden(), { bugs: { house: 3 }, caught: 0 });
  assert.deepEqual(createStorage(fakeStore({ "vg:garden": "[1,2]" })).loadGarden(), { bugs: {}, caught: 0 });
});

test("catching a bug remembers the lapses and counts it", () => {
  const storage = createStorage(fakeStore());
  storage.catchBug("house", 3);
  const garden = storage.catchBug("house", 4);
  assert.deepEqual(garden, { bugs: { house: 4 }, caught: 2 });
  assert.deepEqual(storage.loadGarden(), garden);
});

test("the garden goes into backups and merges by taking the larger value", () => {
  const source = createStorage(fakeStore());
  source.catchBug("house", 3);
  const backup = JSON.parse(JSON.stringify(source.exportData("0.58.0")));
  assert.deepEqual(backup.garden, { bugs: { house: 3 }, caught: 1 });

  const target = createStorage(fakeStore());
  target.catchBug("go", 5);
  target.importData(backup, { merge: true });
  assert.deepEqual(target.loadGarden(), { bugs: { go: 5, house: 3 }, caught: 1 });
  target.importData(backup);
  assert.deepEqual(target.loadGarden(), { bugs: { house: 3 }, caught: 1 });

  const old = createStorage(fakeStore());
  old.catchBug("go", 5);
  old.importData({ app: "vocab-garden", schema: 1, cards: {} });
  assert.deepEqual(old.loadGarden().bugs, { go: 5 }, "an old backup without garden keeps what is there");
  assert.deepEqual(mergeGarden({ bugs: { a: 1 }, caught: 4 }, { bugs: { a: 3, b: 1 }, caught: 2 }), { bugs: { a: 3, b: 1 }, caught: 4 });
});
