// สรุปประจำสัปดาห์: ทวนกี่ครั้ง ท่องกี่วัน ปลูกใหม่กี่คำ ต้นไม้ใหญ่ใหม่กี่ต้น และตอบจำได้กี่เปอร์เซ็นต์ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// สัปดาห์นับจากวันอาทิตย์ถึงวันเสาร์ (เหมือนปฏิทินสวน) เลขวันนับจาก 1970-01-01 วันที่ 0 เป็นวันพฤหัสบดี

import { weekdayOf } from "./calendar.js";

export const weekStartOf = (day) => day - weekdayOf(day);

// ข้อมูลของสัปดาห์ที่เริ่มวัน start (7 วัน) days = ประวัติการทวนรวมวันเล่นเกม log = สถิติรายวันแบบละเอียด
// hasLog = มีสถิติละเอียดของสัปดาห์นั้นหรือไม่ (สัปดาห์ก่อนเวอร์ชันที่เริ่มเก็บสถิติ จะไม่มีตัวเลขคำใหม่กับต้นไม้ใหญ่)
export function summarizeWeek(days, log, start) {
  let reviews = 0;
  let activeDays = 0;
  let planted = 0;
  let trees = 0;
  let again = 0;
  let hasLog = false;
  for (let day = start; day < start + 7; day += 1) {
    const count = days[day] || 0;
    reviews += count;
    if (count > 0) activeDays += 1;
    const entry = log[day];
    if (entry) {
      hasLog = true;
      planted += entry.n;
      trees += entry.t;
      again += entry.a;
    }
  }
  const rate = reviews > 0 && hasLog ? Math.max(0, Math.round(((reviews - again) / reviews) * 100)) : null;
  return { start, reviews, activeDays, planted, trees, again, rate, hasLog };
}

// สรุปที่จะโชว์ตอนนี้: สัปดาห์ที่แล้ว (เทียบกับสัปดาห์ก่อนหน้านั้น) ถ้ายังไม่เคยโชว์ และมีกิจกรรมในสัปดาห์นั้น ไม่งั้น null
export function weeklyReport(days, log, today, seenStart) {
  const thisStart = weekStartOf(today);
  const start = thisStart - 7;
  if (seenStart !== null && seenStart >= start) return null;
  const week = summarizeWeek(days, log, start);
  if (week.reviews === 0) return null;
  return { week, previous: summarizeWeek(days, log, start - 7), markSeen: start };
}

// ข้อความเทียบกับสัปดาห์ก่อน (ไม่มีข้อมูลให้เทียบ = ว่าง)
export function compareText(current, previous) {
  if (previous === 0) return "";
  const diff = current - previous;
  if (diff === 0) return "เท่ากับสัปดาห์ก่อน";
  return `${diff > 0 ? "มากกว่า" : "น้อยกว่า"}สัปดาห์ก่อน ${Math.abs(diff)} ครั้ง`;
}
