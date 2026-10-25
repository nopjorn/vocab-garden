import { test } from "node:test";
import assert from "node:assert/strict";

import { buildIcs, escapeText, firstOccurrence, foldLine, parseTime } from "../../app/js/reminder.js";

test("only valid HH:MM times are accepted", () => {
  assert.deepEqual(parseTime("19:00"), { hour: 19, minute: 0 });
  assert.deepEqual(parseTime("07:05"), { hour: 7, minute: 5 });
  assert.deepEqual(parseTime("23:59"), { hour: 23, minute: 59 });
  for (const bad of ["", "24:00", "7:00", "19:60", "abc", null, undefined]) assert.equal(parseTime(bad), null, String(bad));
});

test("the first reminder is today if the time is still ahead, otherwise tomorrow", () => {
  const now = new Date(2026, 9, 25, 18, 30, 0);
  const today = firstOccurrence(now, { hour: 19, minute: 0 });
  assert.equal(today.getDate(), 25);
  assert.equal(today.getHours(), 19);
  const tomorrow = firstOccurrence(now, { hour: 8, minute: 0 });
  assert.equal(tomorrow.getDate(), 26);
  const exactly = firstOccurrence(now, { hour: 18, minute: 30 });
  assert.equal(exactly.getDate(), 26);
  const monthEnd = firstOccurrence(new Date(2026, 9, 31, 20, 0, 0), { hour: 19, minute: 0 });
  assert.equal(monthEnd.getMonth(), 10);
  assert.equal(monthEnd.getDate(), 1);
});

test("text is escaped for the calendar format", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\;c\\\\d\\ne");
});

test("long lines are folded at 75 bytes without splitting a Thai character", () => {
  const long = `SUMMARY:${"ท่องศัพท์".repeat(12)}`;
  const folded = foldLine(long);
  const lines = folded.split("\r\n");
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.equal(folded.replace(/\r\n /g, ""), long); // ต่อกลับได้เท่าเดิม
});

test("the calendar file has a daily repeating event with an alarm and CRLF line endings", () => {
  const now = new Date(2026, 9, 25, 18, 30, 0);
  const ics = buildIcs({ hour: 19, minute: 0 }, now, "https://nopjorn.github.io/vocab-garden/");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /\r\nDTSTART:20261025T190000\r\n/);
  assert.match(ics, /\r\nRRULE:FREQ=DAILY\r\n/);
  assert.match(ics, /\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0S\r\n/);
  assert.match(ics, /\r\nUID:vocab-garden-daily-1900@vocab-garden\r\n/);
  assert.match(ics, /\r\nDTSTAMP:\d{8}T\d{6}Z\r\n/);
  assert.match(ics, /\r\nURL:https:\/\/nopjorn\.github\.io\/vocab-garden\/\r\n/);
  assert.ok(!/[^\r]\n/.test(ics.replace(/\r\n/g, "")), "no bare newlines");
});

test("the url is optional", () => {
  const ics = buildIcs({ hour: 7, minute: 5 }, new Date(2026, 0, 1, 12, 0, 0));
  assert.ok(!ics.includes("\r\nURL:"));
  assert.match(ics, /DTSTART:20260102T070500/);
});
