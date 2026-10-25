import { test } from "node:test";
import assert from "node:assert/strict";

import { COMEBACK_DAYS, EMPTY_CONTEXT, MEDALS, isEarlyBird, isPerfectRound, newMedals } from "../../app/js/achievements.js";
import { createStorage } from "../../app/js/storage.js";

const ids = (context, unlocked = {}) => newMedals(context, unlocked).map((medal) => medal.id);

test("medal ids are unique, safe for storage, and each has a title and description", () => {
  assert.equal(new Set(MEDALS.map((medal) => medal.id)).size, MEDALS.length);
  for (const medal of MEDALS) {
    assert.match(medal.id, /^[a-z0-9-]{1,30}$/);
    assert.ok(medal.emoji && medal.title && medal.desc);
  }
});

test("a fresh context earns nothing", () => {
  assert.deepEqual(ids({}), []);
  assert.deepEqual(ids(EMPTY_CONTEXT), []);
});

test("planting and tree medals unlock at their thresholds", () => {
  assert.deepEqual(ids({ planted: 1 }), ["plant-1"]);
  assert.deepEqual(ids({ planted: 100, trees: 1 }), ["plant-1", "plant-50", "plant-100", "tree-1"]);
  assert.ok(ids({ planted: 200, trees: 50 }).includes("plant-200"));
  assert.ok(ids({ planted: 200, trees: 50 }).includes("tree-50"));
});

test("streak medals use the best streak", () => {
  assert.deepEqual(ids({ bestStreak: 2 }), []);
  assert.deepEqual(ids({ bestStreak: 7 }), ["streak-3", "streak-7"]);
  assert.ok(ids({ bestStreak: 30 }).includes("streak-30"));
});

test("round events and game records unlock their medals", () => {
  assert.deepEqual(ids({ perfectRound: true, earlyBird: true, comeback: true }), ["perfect-round", "early-bird", "comeback"]);
  assert.deepEqual(ids({ notes: 1, gamePlays: 1, wordleWins: 1 }), ["first-note", "first-game", "wordle-win"]);
  assert.deepEqual(ids({ matchBest: 20000 }), ["match-fast"]);
  assert.deepEqual(ids({ matchBest: 20001 }), []);
  assert.deepEqual(ids({ scrambleBest: 10 }), ["scramble-perfect"]);
  assert.deepEqual(ids({ scrambleBest: 9 }), []);
});

test("medals already unlocked are not awarded twice", () => {
  assert.deepEqual(ids({ planted: 60 }, { "plant-1": 5 }), ["plant-50"]);
  assert.deepEqual(ids({ planted: 60 }, { "plant-1": 5, "plant-50": 6 }), []);
});

test("early bird, perfect round and comeback rules", () => {
  assert.deepEqual([3, 4, 7, 8, 12].map(isEarlyBird), [false, true, true, false, false]);
  assert.ok(isPerfectRound(10, false));
  assert.ok(!isPerfectRound(9, false));
  assert.ok(!isPerfectRound(20, true));
  assert.equal(COMEBACK_DAYS, 7);
});

test("medals are saved once, validated, exported, merged on import and reset", () => {
  const data = new Map();
  const fake = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  const storage = createStorage(fake);
  assert.deepEqual(storage.loadMedals(), {});
  storage.addMedals(["plant-1"], 10);
  assert.deepEqual(storage.addMedals(["plant-1", "tree-1"], 12), { "plant-1": 10, "tree-1": 12 });
  const backup = JSON.parse(JSON.stringify(storage.exportData("0.19.0")));
  assert.deepEqual(backup.medals, { "plant-1": 10, "tree-1": 12 });

  const other = createStorage({ getItem: (k) => (k === "vg:medals" ? JSON.stringify({ "streak-3": 4 }) : null), setItem(k, v) { data.set(`other:${k}`, v); }, removeItem() {} });
  other.importData(backup);
  assert.deepEqual(JSON.parse(data.get("other:vg:medals")), { "streak-3": 4, "plant-1": 10, "tree-1": 12 }); // รวมกัน ไม่หาย

  storage.reset();
  assert.deepEqual(storage.loadMedals(), {});
  const junk = createStorage({ getItem: () => JSON.stringify({ "BAD ID": 1, ok: 5, text: "x", "plant-1": 2.5 }), setItem() {}, removeItem() {} });
  assert.deepEqual(junk.loadMedals(), { ok: 5 });
});

test("exam medals follow the tier of the exam just finished", () => {
  assert.deepEqual(ids({}), []);
  assert.deepEqual(ids({ examTier: "bronze" }), ["exam-first"]);
  assert.deepEqual(ids({ examTier: "silver" }), ["exam-first"]);
  assert.deepEqual(ids({ examTier: "gold" }), ["exam-first", "exam-gold"]);
});
