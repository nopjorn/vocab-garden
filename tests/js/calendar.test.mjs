import { test } from "node:test";
import assert from "node:assert/strict";

import { CALENDAR_WEEKS, buildCalendar, cellLabel, levelOf, weekdayOf } from "../../app/js/calendar.js";

// 20751 = 2026-10-25 วันอาทิตย์
const SUNDAY = 20751;

test("weekday follows the real calendar (day 0 is a Thursday)", () => {
  assert.equal(weekdayOf(0), 4);
  assert.equal(weekdayOf(SUNDAY), 0);
  assert.equal(weekdayOf(SUNDAY + 6), 6);
  assert.equal(weekdayOf(-1), 3);
});

test("levels get darker with more reviews", () => {
  assert.deepEqual([0, undefined, 1, 4, 5, 9, 10, 19, 20, 99].map(levelOf), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test("the calendar has whole weeks ending with the week of today", () => {
  const calendar = buildCalendar({}, SUNDAY + 2);
  assert.equal(calendar.cells.length, CALENDAR_WEEKS * 7);
  assert.equal(weekdayOf(calendar.cells[0].day), 0);
  assert.equal(calendar.cells.find((cell) => cell.day === SUNDAY + 2).future, false);
  assert.equal(calendar.cells.find((cell) => cell.day === SUNDAY + 3).future, true);
  assert.equal(calendar.cells.at(-1).day, SUNDAY + 6);
  assert.equal(calendar.months.length, CALENDAR_WEEKS);
});

test("activity, totals, rest days and future days are counted correctly", () => {
  const counts = { [SUNDAY]: 12, [SUNDAY - 1]: 3, [SUNDAY + 1]: 50 }; // วันพรุ่งนี้ไม่นับ
  const calendar = buildCalendar(counts, SUNDAY, [SUNDAY - 2]);
  const at = (day) => calendar.cells.find((cell) => cell.day === day);
  assert.equal(at(SUNDAY).level, 3);
  assert.equal(at(SUNDAY - 1).level, 1);
  assert.equal(at(SUNDAY + 1).count, 0);
  assert.equal(at(SUNDAY - 2).rest, true);
  assert.equal(at(SUNDAY - 3).rest, false);
  assert.equal(calendar.activeDays, 2);
  assert.equal(calendar.total, 15);
});

test("month names appear once where the month changes", () => {
  const calendar = buildCalendar({}, SUNDAY);
  const labels = calendar.months.filter(Boolean);
  assert.ok(labels.length >= 5 && labels.length <= 7);
  assert.equal(labels.at(-1), "ต.ค.");
  assert.equal(new Set(labels).size, labels.length);
});

test("cell labels read well in Thai", () => {
  const calendar = buildCalendar({ [SUNDAY]: 12 }, SUNDAY, [SUNDAY - 1]);
  const at = (day) => calendar.cells.find((cell) => cell.day === day);
  assert.equal(cellLabel(at(SUNDAY)), "25 ต.ค.: ทวน 12 ครั้ง");
  assert.equal(cellLabel(at(SUNDAY - 1)), "24 ต.ค.: วันพัก 🧊");
  assert.equal(cellLabel(at(SUNDAY - 2)), "23 ต.ค.: ไม่ได้ท่อง");
  assert.equal(cellLabel(at(SUNDAY + 1)), "26 ต.ค.");
});
