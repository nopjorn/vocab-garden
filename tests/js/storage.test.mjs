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

test("settings default to 10 new words a day starting from level 1 with the system theme", () => {
  assert.deepEqual(createStorage(fakeStore()).loadSettings(), DEFAULT_SETTINGS);
  assert.deepEqual(DEFAULT_SETTINGS, {
    newPerDay: 10,
    startLevel: 1,
    autoSpeak: false,
    speechRate: 0.9,
    theme: "auto",
    textSize: "normal",
    sound: false,
    dailyGoal: 10,
    reviewCap: 100,
    quizMode: "flip",
    quizTyping: true,
  });
});

test("startLevel is saved and read back", () => {
  const storage = createStorage(fakeStore());
  storage.saveSettings({ ...DEFAULT_SETTINGS, newPerDay: 5, startLevel: 2 });
  assert.deepEqual(storage.loadSettings(), { ...DEFAULT_SETTINGS, newPerDay: 5, startLevel: 2 });
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
  assert.deepEqual(storage.loadSettings(), { ...DEFAULT_SETTINGS, newPerDay: 20 });
});

test("addReview counts reviews per day and survives a reload", () => {
  const store = fakeStore();
  const storage = createStorage(store);
  storage.addReview(100);
  storage.addReview(100);
  storage.addReview(101);
  assert.deepEqual(createStorage(store).loadHistory(), { 100: 2, 101: 1 });
});

test("addReview drops history older than about a year", () => {
  const storage = createStorage(fakeStore());
  storage.saveHistory({ 1: 5, 599: 2, 600: 3 });
  storage.addReview(1000);
  assert.deepEqual(storage.loadHistory(), { 600: 3, 1000: 1 });
});

test("a corrupt history falls back to empty", () => {
  for (const days of [[1, 2], { 5: -1 }, { 5: 1.5 }, { x: 1 }]) {
    const store = fakeStore({ "vg:history": JSON.stringify({ schema: 1, days }) });
    assert.deepEqual(createStorage(store).loadHistory(), {}, JSON.stringify(days));
  }
});

test("history is exported, imported, and kept when an old backup has none", () => {
  const source = createStorage(fakeStore());
  source.addReview(50);
  const backup = JSON.parse(JSON.stringify(source.exportData("0.6.0")));
  assert.deepEqual(backup.history, { 50: 1 });

  const target = createStorage(fakeStore());
  target.importData(backup);
  assert.deepEqual(target.loadHistory(), { 50: 1 });

  target.importData({ app: "vocab-garden", schema: 1, cards: {} });
  assert.deepEqual(target.loadHistory(), { 50: 1 });
});

test("reset clears the history too", () => {
  const storage = createStorage(fakeStore());
  storage.addReview(7);
  storage.reset();
  assert.deepEqual(storage.loadHistory(), {});
});

test("sound and appearance settings are saved and read back", () => {
  const storage = createStorage(fakeStore());
  const custom = { ...DEFAULT_SETTINGS, autoSpeak: true, speechRate: 0.7, theme: "dark", textSize: "large", sound: true, dailyGoal: 30, reviewCap: 0, quizMode: "mixed", quizTyping: false };
  storage.saveSettings(custom);
  assert.deepEqual(storage.loadSettings(), custom);
});

test("invalid sound and appearance values fall back to the defaults", () => {
  const saved = { autoSpeak: "yes", speechRate: 5, theme: "purple", textSize: "huge", sound: "on", dailyGoal: 15, reviewCap: "many", quizMode: "hard", quizTyping: "no" };
  const storage = createStorage(fakeStore({ "vg:settings": JSON.stringify(saved) }));
  assert.deepEqual(storage.loadSettings(), DEFAULT_SETTINGS);
});

test("rest days are validated, exported and imported, and a backup without them clears the old ones", () => {
  const source = createStorage(fakeStore());
  source.addReview(50);
  source.saveRest({ bank: 1, run: 3, upTo: 50, frozen: [48] });
  const backup = JSON.parse(JSON.stringify(source.exportData("0.11.0")));
  assert.deepEqual(backup.rest, { bank: 1, run: 3, upTo: 50, frozen: [48] });

  const target = createStorage(fakeStore());
  target.importData(backup);
  assert.deepEqual(target.loadRest(), backup.rest);

  const { rest, ...withoutRest } = backup;
  target.importData(withoutRest);
  assert.equal(target.loadRest(), null);

  for (const bad of [{ bank: -1, run: 0, upTo: 1, frozen: [] }, { bank: 0, run: 0, upTo: 1, frozen: ["x"] }, [1], "no"]) {
    assert.equal(createStorage(fakeStore({ "vg:rest": JSON.stringify(bad) })).loadRest(), null);
  }
});

test("the daily record keeps the new-word count and the goal flag together and resets each day", () => {
  const storage = createStorage(fakeStore());
  assert.deepEqual(storage.loadDaily(10), { newCount: 0, goalDone: false });
  storage.saveNewCount(10, 4);
  storage.saveGoalDone(10);
  storage.saveNewCount(10, 5);
  assert.deepEqual(storage.loadDaily(10), { newCount: 5, goalDone: true });
  assert.equal(storage.newCountToday(10), 5);
  assert.deepEqual(storage.loadDaily(11), { newCount: 0, goalDone: false });
});

test("addReview returns the count for that day", () => {
  const storage = createStorage(fakeStore());
  assert.equal(storage.addReview(5), 1);
  assert.equal(storage.addReview(5), 2);
});

test("reset clears the rest days", () => {
  const storage = createStorage(fakeStore());
  storage.saveRest({ bank: 1, run: 1, upTo: 5, frozen: [] });
  storage.reset();
  assert.equal(storage.loadRest(), null);
});
