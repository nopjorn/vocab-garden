import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SETTINGS, createStorage } from "../../app/js/storage.js";

function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test("settings default to 10 new words a day starting from level 1", () => {
  assert.deepEqual(createStorage(fakeStore()).loadSettings(), DEFAULT_SETTINGS);
  assert.deepEqual(DEFAULT_SETTINGS, { newPerDay: 10, startLevel: 1 });
});

test("startLevel is saved and read back", () => {
  const storage = createStorage(fakeStore());
  storage.saveSettings({ newPerDay: 5, startLevel: 2 });
  assert.deepEqual(storage.loadSettings(), { newPerDay: 5, startLevel: 2 });
});

test("an invalid startLevel falls back to level 1", () => {
  for (const startLevel of [0, 29, 1.5, "2", null]) {
    const storage = createStorage(fakeStore({ "vg:settings": JSON.stringify({ newPerDay: 10, startLevel }) }));
    assert.equal(storage.loadSettings().startLevel, 1, String(startLevel));
  }
});

test("a backup from an older version without startLevel still imports", () => {
  const storage = createStorage(fakeStore());
  const count = storage.importData({ app: "vocab-garden", schema: 1, cards: {}, settings: { newPerDay: 20 } });
  assert.equal(count, 0);
  assert.deepEqual(storage.loadSettings(), { newPerDay: 20, startLevel: 1 });
});
