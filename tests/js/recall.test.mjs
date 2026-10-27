import { test } from "node:test";
import assert from "node:assert/strict";

import { ANSWER_KEEP, mergeAnswers, recallBetween, recallStats, stageIdOf } from "../../app/js/recall.js";
import { createStorage } from "../../app/js/storage.js";

const fakeStore = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
};

test("stages follow the same thresholds as the garden", () => {
  assert.equal(stageIdOf(1), "sprout");
  assert.equal(stageIdOf(6), "sprout");
  assert.equal(stageIdOf(7), "growing");
  assert.equal(stageIdOf(20), "growing");
  assert.equal(stageIdOf(21), "tree");
});

test("recall rate ignores new words and counts hard and good as remembered", () => {
  const entries = [
    [100, "a", 3, 0], // คำใหม่ ไม่นับ
    [100, "b", 3, 2],
    [100, "c", 2, 10],
    [101, "d", 1, 25],
    [101, "e", 1, 3],
  ];
  const stats = recallBetween(entries, 100, 101);
  assert.equal(stats.total, 4);
  assert.equal(stats.remembered, 2);
  assert.equal(stats.rate, 50);
  assert.deepEqual([stats.good, stats.hard, stats.again], [1, 1, 2]);
  assert.equal(stats.byStage.sprout.rate, 50);
  assert.equal(stats.byStage.growing.rate, 100);
  assert.equal(stats.byStage.tree.rate, 0);
});

test("no data gives a null rate instead of 0%", () => {
  const stats = recallBetween([[100, "a", 3, 0]], 100, 100);
  assert.equal(stats.rate, null);
  assert.equal(stats.byStage.tree.rate, null);
});

test("recallStats looks back a window of days ending today", () => {
  const entries = [[70, "old", 1, 5], [71, "in", 3, 5], [100, "today", 3, 5]];
  assert.equal(recallStats(entries, 100, 30).total, 2);
  assert.equal(recallStats(entries, 100, 31).total, 3);
});

test("merging answers drops duplicates and keeps the newest", () => {
  const a = [[1, "x", 3, 2], [2, "y", 1, 5]];
  const b = [[2, "y", 1, 5], [3, "z", 2, 9]];
  assert.deepEqual(mergeAnswers(a, b), [[1, "x", 3, 2], [2, "y", 1, 5], [3, "z", 2, 9]]);
  const many = Array.from({ length: ANSWER_KEEP + 5 }, (_, i) => [i, "w", 3, 1]);
  assert.equal(mergeAnswers(many, []).length, ANSWER_KEEP);
  assert.equal(mergeAnswers(many, [])[0][0], 5);
});

test("storage keeps answers, caps them, and round-trips them through backup", () => {
  const storage = createStorage(fakeStore());
  assert.deepEqual(storage.loadAnswers(), []);
  storage.addAnswer(10, "house", 3, 4);
  storage.addAnswer(10, "child", 1, 0);
  assert.deepEqual(storage.loadAnswers(), [[10, "house", 3, 4], [10, "child", 1, 0]]);
  const backup = storage.exportData("0.45.0");
  assert.equal(backup.answers.length, 2);

  const other = createStorage(fakeStore());
  other.importData(backup);
  assert.deepEqual(other.loadAnswers(), backup.answers);
  // นำเข้าแบบรวมไม่ซ้ำ
  other.importData(backup, { merge: true });
  assert.equal(other.loadAnswers().length, 2);
  // ไฟล์สำรองเก่าไม่มีผลการตอบ ต้องไม่ลบของเดิม
  const { answers, ...old } = backup;
  other.importData(old);
  assert.equal(other.loadAnswers().length, 2);
  other.reset();
  assert.deepEqual(other.loadAnswers(), []);
});

test("malformed answers are dropped when loading", () => {
  const store = fakeStore();
  store.setItem("vg:answers", JSON.stringify([[1, "ok", 3, 2], [1, "bad", 9, 2], "junk", [1, "", 3, 2], [1.5, "x", 3, 2]]));
  assert.deepEqual(createStorage(store).loadAnswers(), [[1, "ok", 3, 2]]);
});
