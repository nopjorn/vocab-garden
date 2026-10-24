// สถิติของหน้า "สวนของฉัน" คำนวณจากประวัติการทวนรายวัน { [เลขวัน]: จำนวนครั้ง } และความคืบหน้าของการ์ด

import { STAGES, stageOf } from "./srs.js";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// streak ปัจจุบันนับถึงวันนี้ ถ้าวันนี้ยังไม่ได้ท่อง ให้นับถึงเมื่อวาน (ยังไม่ถือว่าขาด)
// best คือช่วงที่ท่องติดต่อกันนานที่สุดเท่าที่มีประวัติ
export function streakOf(days, today) {
  const studied = (day) => (days[day] || 0) > 0;
  let current = 0;
  for (let cursor = studied(today) ? today : today - 1; studied(cursor); cursor -= 1) current += 1;

  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of Object.keys(days).map(Number).sort((a, b) => a - b)) {
    if (!studied(day)) continue;
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return { current, best };
}

export function totalReviews(days) {
  return Object.values(days).reduce((sum, count) => sum + count, 0);
}

// n วันล่าสุดเรียงจากเก่าไปใหม่ (วันสุดท้ายคือวันนี้)
export function recentDays(days, today, n = 7) {
  return Array.from({ length: n }, (_, index) => {
    const day = today - (n - 1 - index);
    return { day, count: days[day] || 0, label: WEEKDAYS[new Date(day * 86400000).getUTCDay()] };
  });
}

// จำนวนคำในแต่ละระยะของต้นไม้ (เรียงตาม STAGES)
export function stageCounts(words, cards) {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage.id, 0]));
  words.forEach((word) => {
    counts[stageOf(cards[word.headword]).id] += 1;
  });
  return STAGES.map((stage) => ({ ...stage, count: counts[stage.id] }));
}
