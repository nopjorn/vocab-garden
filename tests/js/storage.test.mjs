import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SETTINGS, NOTE_MAX, createStorage } from "../../app/js/storage.js";

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
    menuPosition: "bottom",
    sound: false,
    appBadge: false,
    dailyGoal: 10,
    reviewCap: 100,
    roundSize: 10,
    playLevels: null,
    playStatuses: ["new", "learning", "done"],
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
  const custom = { ...DEFAULT_SETTINGS, autoSpeak: true, speechRate: 0.7, theme: "dark", textSize: "large", sound: true, dailyGoal: 30, reviewCap: 0, roundSize: 20, playLevels: ["01", "sup"], playStatuses: ["done"], quizMode: "mixed", quizTyping: false };
  storage.saveSettings(custom);
  assert.deepEqual(storage.loadSettings(), custom);
});

test("invalid sound and appearance values fall back to the defaults", () => {
  const saved = { autoSpeak: "yes", speechRate: 5, theme: "purple", textSize: "huge", sound: "on", dailyGoal: 15, reviewCap: "many", roundSize: 7, playLevels: "all", playStatuses: "none", quizMode: "hard", quizTyping: "no" };
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

test("notes are saved per word, trimmed, capped, and deleted when empty", () => {
  const storage = createStorage(fakeStore());
  assert.deepEqual(storage.loadNotes(), {});
  assert.deepEqual(storage.saveNote("house", "  บ้าน = เฮ้าส์  "), { house: "บ้าน = เฮ้าส์" });
  storage.saveNote("work", "x".repeat(NOTE_MAX + 50));
  assert.equal(storage.loadNotes().work.length, NOTE_MAX);
  assert.deepEqual(storage.saveNote("house", "   "), { work: "x".repeat(NOTE_MAX) });
});

test("corrupt notes are cleaned up", () => {
  const raw = JSON.stringify({ ok: "good", empty: "  ", num: 5, ["__proto__"]: "x", long: "y".repeat(500) });
  const notes = createStorage(fakeStore({ "vg:notes": raw })).loadNotes();
  assert.deepEqual(Object.keys(notes).sort(), ["long", "ok"]);
  assert.equal(notes.long.length, NOTE_MAX);
  for (const bad of ["[1]", '"text"', "7"]) {
    assert.deepEqual(createStorage(fakeStore({ "vg:notes": bad })).loadNotes(), {});
  }
});

test("notes travel in the backup, old backups keep the current notes, and reset clears them", () => {
  const source = createStorage(fakeStore());
  source.saveNote("house", "บ้าน");
  const backup = JSON.parse(JSON.stringify(source.exportData("0.15.0")));
  assert.deepEqual(backup.notes, { house: "บ้าน" });

  const target = createStorage(fakeStore());
  target.saveNote("old", "เดิม");
  target.importData({ app: "vocab-garden", schema: 1, cards: {} });
  assert.deepEqual(target.loadNotes(), { old: "เดิม" });
  target.importData(backup);
  assert.deepEqual(target.loadNotes(), { house: "บ้าน" });
  target.reset();
  assert.deepEqual(target.loadNotes(), {});
});

test("play word filters keep only known levels and statuses", () => {
  const read = (saved) => createStorage(fakeStore({ "vg:settings": JSON.stringify(saved) })).loadSettings();
  assert.deepEqual(read({ playLevels: ["01", "01", "99", "sup", 5, "x1"], playStatuses: ["done", "bogus", "new"] }).playLevels, ["01", "sup"]);
  assert.deepEqual(read({ playStatuses: ["done", "bogus", "new"] }).playStatuses, ["new", "done"]);
  assert.deepEqual(read({ playLevels: [], playStatuses: [] }).playLevels, []);
  assert.deepEqual(read({ playLevels: [], playStatuses: [] }).playStatuses, []);
  assert.equal(read({}).playLevels, null);
});

test("the app badge setting defaults to off and only accepts true", () => {
  const read = (saved) => createStorage(fakeStore({ "vg:settings": JSON.stringify(saved) })).loadSettings();
  assert.equal(read({}).appBadge, false);
  assert.equal(read({ appBadge: true }).appBadge, true);
  assert.equal(read({ appBadge: "yes" }).appBadge, false);
  assert.equal(read({ appBadge: 1 }).appBadge, false);
});

// ---------- นำเข้าแบบรวม ----------

const card = (due, ivl, reps = 1) => ({ due, ivl, ease: 2.5, reps, lapses: 0 });
const backupOf = (overrides) => ({ app: "vocab-garden", schema: 1, cards: {}, ...overrides });

test("merge import keeps the card that was answered most recently", () => {
  const target = createStorage(fakeStore());
  target.saveCards({ a: card(110, 10), b: card(120, 10), c: card(130, 10, 2), only: card(105, 5) });
  const count = target.importData(
    backupOf({ cards: { a: card(115, 10), b: card(100, 10), c: card(130, 10, 5), extra: card(140, 7) } }),
    { merge: true },
  );
  const cards = target.loadCards();
  assert.equal(count, 5);
  assert.deepEqual(cards.a, card(115, 10)); // ตอบล่าสุดคือไฟล์ (105 > 100)
  assert.deepEqual(cards.b, card(120, 10)); // ตอบล่าสุดคือในเครื่อง
  assert.deepEqual(cards.c, card(130, 10, 5)); // วันเดียวกัน เอาฝั่งที่ reps มากกว่า
  assert.deepEqual(cards.only, card(105, 5));
  assert.deepEqual(cards.extra, card(140, 7));
});

test("default import still replaces the progress", () => {
  const target = createStorage(fakeStore());
  target.saveCards({ a: card(110, 10), only: card(105, 5) });
  target.importData(backupOf({ cards: { a: card(50, 10) } }));
  assert.deepEqual(Object.keys(target.loadCards()), ["a"]);
  assert.deepEqual(target.loadCards().a, card(50, 10));
});

test("merge import keeps local settings once the device has progress, but a fresh device takes the file's", () => {
  const used = createStorage(fakeStore());
  used.saveCards({ a: card(110, 10) });
  used.saveSettings({ ...used.loadSettings(), newPerDay: 5 });
  used.importData(backupOf({ cards: { b: card(120, 10) }, settings: { newPerDay: 20 } }), { merge: true });
  assert.equal(used.loadSettings().newPerDay, 5);

  const fresh = createStorage(fakeStore());
  fresh.importData(backupOf({ cards: { b: card(120, 10) }, settings: { newPerDay: 20 } }), { merge: true });
  assert.equal(fresh.loadSettings().newPerDay, 20);
});

test("merge import takes the larger daily counts and recomputes the rest days", () => {
  const target = createStorage(fakeStore());
  target.saveHistory({ 100: 5, 101: 8 });
  target.saveRest({ bank: 1, run: 3, upTo: 101, frozen: [] });
  target.importData(backupOf({ history: { 101: 3, 102: 4 }, rest: { bank: 2, run: 7, upTo: 102, frozen: [] } }), { merge: true });
  assert.deepEqual(target.loadHistory(), { 100: 5, 101: 8, 102: 4 });
  assert.equal(target.loadRest(), null);
});

test("merge import unions notes (local wins on conflict) and merges game records", () => {
  const target = createStorage(fakeStore());
  target.saveNote("house", "ของฉัน");
  target.addGamePlay(100);
  target.saveBest("match", 30000);
  target.saveBest("listen", 5);
  target.importData(
    backupOf({
      notes: { house: "จากไฟล์", water: "น้ำ" },
      games: { days: { 100: 3, 101: 1 }, best: { match: 25000, listen: 4, scramble: 9 } },
    }),
    { merge: true },
  );
  assert.deepEqual(target.loadNotes(), { house: "ของฉัน", water: "น้ำ" });
  const games = target.loadGames();
  assert.deepEqual(games.days, { 100: 3, 101: 1 });
  assert.equal(games.best.match, 25000); // เวลาน้อยกว่าดีกว่า
  assert.equal(games.best.listen, 5); // คะแนนมากกว่าดีกว่า
  assert.equal(games.best.scramble, 9);
});

test("backup meta defaults to nothing and survives a round trip", () => {
  const target = createStorage(fakeStore());
  assert.deepEqual(target.loadBackupMeta(), { last: null, since: null, asked: null });
  target.saveBackupMeta({ last: 100, since: 90, asked: 99 });
  assert.deepEqual(target.loadBackupMeta(), { last: 100, since: 90, asked: 99 });
  target.reset();
  assert.deepEqual(target.loadBackupMeta(), { last: null, since: null, asked: null });
});

test("the menu position defaults to the floating bottom bar and only accepts bottom, dock or top", () => {
  const target = createStorage(fakeStore());
  assert.equal(target.loadSettings().menuPosition, "bottom");
  target.saveSettings({ ...target.loadSettings(), menuPosition: "top" });
  assert.equal(target.loadSettings().menuPosition, "top");
  target.saveSettings({ ...target.loadSettings(), menuPosition: "dock" });
  assert.equal(target.loadSettings().menuPosition, "dock");
  target.saveSettings({ ...target.loadSettings(), menuPosition: "left" });
  assert.equal(target.loadSettings().menuPosition, "bottom");
});
