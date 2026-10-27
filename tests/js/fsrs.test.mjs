import { test } from "node:test";
import assert from "node:assert/strict";

import { DESIRED_RETENTION, fsrsGrade, initialDifficulty, initialStability, intervalFor, memoryFromCard, retrievability } from "../../app/js/fsrs.js";
import { AGAIN, GOOD, HARD, grade } from "../../app/js/srs.js";
import { createStorage } from "../../app/js/storage.js";

const fakeStore = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
};

test("recall probability is 90% when the elapsed days equal the stability", () => {
  assert.ok(Math.abs(retrievability(10, 10) - DESIRED_RETENTION) < 1e-9);
  assert.equal(retrievability(0, 5), 1);
  assert.ok(retrievability(30, 5) < retrievability(5, 5));
});

test("the interval for 90% retention equals the stability, never below 1 day", () => {
  assert.equal(intervalFor(10), 10);
  assert.equal(intervalFor(0.4), 1);
  assert.ok(intervalFor(10, 0.8) > intervalFor(10, 0.9));
});

test("the first answer on a new word sets the starting memory and interval", () => {
  const good = fsrsGrade(null, null, GOOD, 100);
  assert.equal(good.card.ivl, 3); // เท่ากับแบบเดิม: คำใหม่ที่จำได้แม่นนัดอีก 3 วัน
  assert.equal(good.card.due, 103);
  assert.equal(good.card.reps, 1);
  assert.deepEqual(good.mem[0], Number(initialStability(GOOD).toFixed(3)));
  const hard = fsrsGrade(null, null, HARD, 100);
  assert.equal(hard.card.ivl, 1);
  const again = fsrsGrade(null, null, AGAIN, 100);
  assert.equal(again.card.ivl, 0);
  assert.equal(again.card.lapses, 0);
  assert.ok(initialDifficulty(AGAIN) > initialDifficulty(GOOD));
});

test("answering later and better grows stability, forgetting shrinks it", () => {
  let result = fsrsGrade(null, null, GOOD, 100);
  let day = 100;
  let previous = result.mem[0];
  for (let i = 0; i < 4; i += 1) {
    day += result.card.ivl;
    result = fsrsGrade(result.card, result.mem, GOOD, day);
    assert.ok(result.mem[0] > previous, `stability should grow on review ${i + 1}`);
    assert.equal(result.card.ivl, Math.round(result.mem[0]));
    previous = result.mem[0];
  }
  day += result.card.ivl;
  const lapse = fsrsGrade(result.card, result.mem, AGAIN, day);
  assert.ok(lapse.mem[0] < previous);
  assert.equal(lapse.card.ivl, 0);
  assert.equal(lapse.card.lapses, 1);
  assert.equal(lapse.card.due, day);
  // ตอบถูกในรอบเดียวกันหลังลืม ได้ระยะใหม่อย่างน้อย 1 วัน
  const again = fsrsGrade(lapse.card, lapse.mem, GOOD, day);
  assert.ok(again.card.ivl >= 1);
  assert.equal(again.card.lapses, 1);
});

test("hard gives a shorter interval than good and difficulty stays within 1 to 10", () => {
  const start = fsrsGrade(null, null, GOOD, 100);
  const hard = fsrsGrade(start.card, start.mem, HARD, 103);
  const good = fsrsGrade(start.card, start.mem, GOOD, 103);
  assert.ok(hard.card.ivl < good.card.ivl);
  let result = start;
  let day = 100;
  for (let i = 0; i < 40; i += 1) {
    day += Math.max(1, result.card.ivl);
    result = fsrsGrade(result.card, result.mem, i % 2 ? GOOD : AGAIN, day);
    assert.ok(result.mem[1] >= 1 && result.mem[1] <= 10);
    assert.ok(result.mem[0] >= 0.1 && result.mem[0] <= 36500);
  }
});

test("a word learned with the old scheduler is seeded from its card", () => {
  const old = grade(grade(null, GOOD, 100), GOOD, 103); // ivl ≈ 8
  assert.deepEqual(memoryFromCard({ ...old, ease: 2.5 }), [old.ivl, 5]);
  const [, hardDifficulty] = memoryFromCard({ ivl: 5, ease: 1.3 });
  assert.equal(hardDifficulty, 9);
  const next = fsrsGrade(old, null, GOOD, old.due);
  assert.ok(next.card.ivl > old.ivl);
});

test("fuzz keeps the interval close to the plan and never below 1", () => {
  const start = fsrsGrade(null, null, GOOD, 100);
  const a = fsrsGrade(start.card, start.mem, GOOD, 103, () => 0);
  const b = fsrsGrade(start.card, start.mem, GOOD, 103, () => 0.999);
  assert.ok(b.card.ivl >= a.card.ivl && a.card.ivl >= 1);
});

test("FSRS memory is stored apart from the cards and follows the chosen card when merging", () => {
  const source = createStorage(fakeStore());
  source.saveFsrs({ house: [5.2, 4.1], child: [3, 6] });
  const backup = JSON.parse(JSON.stringify(source.exportData("0.45.0")));
  assert.deepEqual(backup.fsrs, { house: [5.2, 4.1], child: [3, 6] });

  const target = createStorage(fakeStore());
  target.saveCards({ house: { due: 10, ivl: 5, ease: 2.5, reps: 3, lapses: 0 } });
  target.saveFsrs({ house: [9, 3] });
  const incoming = { ...backup, cards: { house: { due: 5, ivl: 2, ease: 2.5, reps: 1, lapses: 0 }, child: { due: 9, ivl: 3, ease: 2.5, reps: 1, lapses: 0 } } };
  target.importData(incoming, { merge: true });
  // house: การ์ดในเครื่องตอบล่าสุดกว่า จึงคงค่า FSRS ของเครื่อง · child: ไม่มีในเครื่อง รับจากไฟล์
  assert.deepEqual(target.loadFsrs(), { house: [9, 3], child: [3, 6] });
  // กู้คืนจากไฟล์เก่าที่ไม่มี fsrs: ล้างค่าเดิมเพื่อไม่ให้ไม่ตรงกับการ์ด
  const { fsrs, ...old } = incoming;
  target.importData(old);
  assert.deepEqual(target.loadFsrs(), {});
});

test("malformed FSRS memory is dropped", () => {
  const store = fakeStore();
  store.setItem("vg:fsrs", JSON.stringify({ ok: [3, 5], low: [0, 5], hard: [3, 11], text: ["a", 5], short: [3] }));
  assert.deepEqual(createStorage(store).loadFsrs(), { ok: [3, 5] });
});
