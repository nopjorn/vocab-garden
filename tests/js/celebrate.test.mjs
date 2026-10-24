import { test } from "node:test";
import assert from "node:assert/strict";

import { comboMessage, growthSummary, nextCombo, recordGrowth, stageIndex, stageMove, wordList } from "../../app/js/celebrate.js";
import { AGAIN, GOOD, HARD } from "../../app/js/srs.js";
import { TONES, VIBRATION, playSfx } from "../../app/js/sfx.js";

const card = (ivl) => ({ due: 0, ivl, ease: 2.5, reps: 1, lapses: 0 });

test("combo grows on HARD and GOOD and restarts on AGAIN", () => {
  assert.equal(nextCombo(0, GOOD), 1);
  assert.equal(nextCombo(4, HARD), 5);
  assert.equal(nextCombo(7, AGAIN), 0);
});

test("combo messages appear only at the milestones", () => {
  assert.ok(comboMessage(3));
  assert.ok(comboMessage(5));
  assert.ok(comboMessage(10));
  assert.ok(comboMessage(20));
  [0, 1, 2, 4, 6, 11].forEach((combo) => assert.equal(comboMessage(combo), null));
});

test("stageIndex follows seed, sprout, growing and tree", () => {
  assert.deepEqual([undefined, card(1), card(7), card(21)].map(stageIndex), [0, 1, 2, 3]);
});

test("stageMove reports only upward moves", () => {
  assert.deepEqual(stageMove(undefined, card(1)), { fromIndex: 0, toIndex: 1, stage: { id: "sprout", emoji: "🌱", label: "ต้นอ่อน" } });
  assert.equal(stageMove(card(6), card(7)).stage.id, "growing");
  assert.equal(stageMove(card(20), card(21)).stage.id, "tree");
  assert.equal(stageMove(card(7), card(8)), null);
  assert.equal(stageMove(card(30), card(0)), null);
});

test("growth summary counts new plants and lists words that grew or became trees", () => {
  const grown = new Map();
  recordGrowth(grown, "house", stageMove(undefined, card(1)));
  recordGrowth(grown, "house", stageMove(card(6), card(7)));
  recordGrowth(grown, "work", stageMove(card(10), card(25)));
  recordGrowth(grown, "tea", stageMove(undefined, card(1)));
  assert.deepEqual(growthSummary(grown), { planted: 2, growing: ["house"], trees: ["work"] });
  assert.deepEqual(growthSummary(new Map()), { planted: 0, growing: [], trees: [] });
});

test("wordList shortens long lists", () => {
  assert.equal(wordList(["a", "b"]), "a, b");
  assert.equal(wordList(["a", "b", "c", "d"], 2), "a, b และอีก 2 คำ");
});

test("sound effects stay silent unless enabled and never throw without Web Audio", () => {
  assert.equal(playSfx("correct", false), false);
  assert.equal(playSfx("unknown", true), false);
  assert.equal(playSfx("correct", true), false); // Node ไม่มี AudioContext
  Object.values(TONES).forEach((notes) => notes.forEach(([frequency, offset, length]) => assert.ok(frequency > 0 && offset >= 0 && length > 0)));
  Object.keys(VIBRATION).forEach((name) => assert.ok(TONES[name]));
});
