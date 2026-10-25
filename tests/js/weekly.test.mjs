import { test } from "node:test";
import assert from "node:assert/strict";

import { compareText, summarizeWeek, weekStartOf, weeklyReport } from "../../app/js/weekly.js";
import { createStorage } from "../../app/js/storage.js";

// 20751 = 2026-10-25 วันอาทิตย์
const SUNDAY = 20751;

test("weeks start on Sunday", () => {
  assert.equal(weekStartOf(SUNDAY), SUNDAY);
  assert.equal(weekStartOf(SUNDAY + 6), SUNDAY);
  assert.equal(weekStartOf(SUNDAY + 7), SUNDAY + 7);
  assert.equal(weekStartOf(SUNDAY - 1), SUNDAY - 7);
});

test("a week adds up reviews, active days and the detailed log", () => {
  const days = { [SUNDAY]: 10, [SUNDAY + 2]: 20, [SUNDAY + 7]: 99 };
  const log = { [SUNDAY]: { n: 5, t: 0, a: 2 }, [SUNDAY + 2]: { n: 3, t: 1, a: 4 } };
  const week = summarizeWeek(days, log, SUNDAY);
  assert.deepEqual({ ...week }, { start: SUNDAY, reviews: 30, activeDays: 2, planted: 8, trees: 1, again: 6, rate: 80, hasLog: true });
});

test("a week before the detailed log existed has no new-word or rate numbers", () => {
  const week = summarizeWeek({ [SUNDAY]: 10 }, {}, SUNDAY);
  assert.equal(week.hasLog, false);
  assert.equal(week.rate, null);
  assert.equal(week.reviews, 10);
});

test("the report shows last week once, and not when it was quiet or already seen", () => {
  const today = SUNDAY + 7 + 2; // วันอังคารของสัปดาห์ถัดไป
  const days = { [SUNDAY + 1]: 12 };
  const first = weeklyReport(days, {}, today, null);
  assert.equal(first.week.reviews, 12);
  assert.equal(first.markSeen, SUNDAY);
  assert.equal(weeklyReport(days, {}, today, SUNDAY), null); // เคยดูแล้ว
  assert.equal(weeklyReport({}, {}, today, null), null); // สัปดาห์ที่แล้วไม่ได้ท่อง
  assert.equal(weeklyReport(days, {}, SUNDAY + 3, null), null); // ยังอยู่ในสัปดาห์เดียวกับที่ท่อง (สรุปสัปดาห์ก่อนหน้านั้นไม่มีกิจกรรม)
});

test("the report compares with the week before it", () => {
  const today = SUNDAY + 7;
  const days = { [SUNDAY - 7 + 1]: 20, [SUNDAY + 1]: 30 };
  const report = weeklyReport(days, {}, today, null);
  assert.equal(report.week.reviews, 30);
  assert.equal(report.previous.reviews, 20);
  assert.equal(compareText(30, 20), "มากกว่าสัปดาห์ก่อน 10 ครั้ง");
  assert.equal(compareText(15, 20), "น้อยกว่าสัปดาห์ก่อน 5 ครั้ง");
  assert.equal(compareText(20, 20), "เท่ากับสัปดาห์ก่อน");
  assert.equal(compareText(20, 0), "");
});

function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key) => (data.has(key) ? data.get(key) : null), setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key), data };
}

test("the daily log accumulates, is trimmed, validated, exported and merged on import", () => {
  const store = fakeStore();
  const storage = createStorage(store);
  storage.addLog(500, { n: 2, a: 1 });
  storage.addLog(500, { t: 1 });
  assert.deepEqual(storage.loadLog(), { 500: { n: 2, t: 1, a: 1 } });
  storage.addLog(1000, { n: 1 }); // วัน 500 เก่าเกิน 400 วัน
  assert.deepEqual(storage.loadLog(), { 1000: { n: 1, t: 0, a: 0 } });

  const backup = storage.exportData("0.26.0");
  assert.deepEqual(backup.log, { 1000: { n: 1, t: 0, a: 0 } });

  const other = createStorage(fakeStore({ "vg:log": JSON.stringify({ 1000: { n: 5, t: 0, a: 0 }, 999: { n: 1, t: 1, a: 1 } }) }));
  other.importData({ ...backup, log: { 1000: { n: 1, t: 2, a: 0 }, bad: 3, 1001: "x", 1002: { n: -4, t: "z", a: 2.5 } } });
  assert.deepEqual(other.loadLog(), { 999: { n: 1, t: 1, a: 1 }, 1000: { n: 5, t: 2, a: 0 }, 1002: { n: 0, t: 0, a: 0 } });
});

test("the seen week marker is validated and cleared by reset", () => {
  const store = fakeStore({ "vg:week-seen": '"x"' });
  const storage = createStorage(store);
  assert.equal(storage.loadWeekSeen(), null);
  storage.saveWeekSeen(20751);
  assert.equal(storage.loadWeekSeen(), 20751);
  storage.reset();
  assert.equal(storage.loadWeekSeen(), null);
  assert.deepEqual(storage.loadLog(), {});
});
