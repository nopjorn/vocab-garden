import { test } from "node:test";
import assert from "node:assert/strict";

import { KEEP_BEFORE, KEEP_DAILY, backupDue, backupText, daysSinceBackup, formatSnapshotTime, markSince, planPrune } from "../../app/js/backup.js";

const meta = (over = {}) => ({ last: null, since: null, asked: null, ...over });

test("the reminder starts counting once there is enough progress", () => {
  assert.deepEqual(markSince(meta(), 9, 100), meta());
  assert.deepEqual(markSince(meta(), 10, 100), meta({ since: 100 }));
  assert.deepEqual(markSince(meta({ since: 90 }), 50, 100), meta({ since: 90 }));
  assert.deepEqual(markSince(meta({ last: 95 }), 50, 100), meta({ last: 95 }));
});

test("backupDue waits 7 days from the last backup, or from the start when never backed up", () => {
  assert.equal(backupDue(meta(), 50, 100), false); // ยังไม่เริ่มนับ
  assert.equal(backupDue(meta({ since: 94 }), 50, 100), false); // 6 วัน
  assert.equal(backupDue(meta({ since: 93 }), 50, 100), true); // 7 วัน
  assert.equal(backupDue(meta({ last: 99, since: 50 }), 50, 100), false); // สำรองเมื่อวาน
  assert.equal(backupDue(meta({ last: 93, since: 50 }), 50, 100), true);
  assert.equal(backupDue(meta({ last: 93 }), 9, 100), false); // ความคืบหน้าน้อยเกินไป
});

test("snoozing silences the reminder for 3 days", () => {
  const due = meta({ last: 80, asked: 98 });
  assert.equal(backupDue(due, 50, 100), false);
  assert.equal(backupDue(due, 50, 101), true);
  assert.equal(backupDue(meta({ last: 80, asked: 97 }), 50, 100), true);
});

test("backupText describes the last backup", () => {
  assert.equal(daysSinceBackup(meta(), 100), null);
  assert.equal(backupText(meta(), 100), "ยังไม่เคยสำรอง");
  assert.equal(backupText(meta({ since: 95 }), 100), "ยังไม่เคยสำรองไฟล์ (ใช้มา 5 วัน)");
  assert.equal(backupText(meta({ last: 100 }), 100), "สำรองล่าสุด: วันนี้");
  assert.equal(backupText(meta({ last: 97 }), 100), "สำรองล่าสุด: 3 วันที่แล้ว");
});

test("planPrune keeps the newest daily and before snapshots separately", () => {
  const entries = [];
  for (let day = 1; day <= 10; day += 1) {
    entries.push({ id: `daily-${day}`, kind: "daily", at: `2026-01-${String(day).padStart(2, "0")}T00:00:00Z` });
  }
  for (let n = 1; n <= 5; n += 1) {
    entries.push({ id: `before-${n}`, kind: "before", at: `2026-02-0${n}T00:00:00Z` });
  }
  const drop = planPrune(entries);
  assert.equal(drop.length, 10 - KEEP_DAILY + 5 - KEEP_BEFORE);
  assert.deepEqual(drop.filter((id) => id.startsWith("daily")).sort(), ["daily-1", "daily-2", "daily-3"]);
  assert.deepEqual(drop.filter((id) => id.startsWith("before")).sort(), ["before-1", "before-2"]);
  assert.deepEqual(planPrune(entries.slice(7, 10)), []);
});

test("formatSnapshotTime shows the local date and time", () => {
  assert.equal(formatSnapshotTime(new Date(2026, 9, 26, 7, 5).toISOString()), "26 ต.ค. 07:05 น.");
  assert.equal(formatSnapshotTime(new Date(2026, 0, 3, 23, 59).toISOString()), "3 ม.ค. 23:59 น.");
});
