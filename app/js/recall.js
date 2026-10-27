// อัตราจำได้จากผลการตอบที่เก็บไว้แบบย่อ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ผลการตอบหนึ่งครั้ง = [เลขวัน, คำหลัก, คะแนน 1–3 (ดู srs.js), ระยะทวนก่อนตอบเป็นวัน]
// "อัตราจำได้" นับเฉพาะคำที่เคยเรียนแล้ว (ระยะทวนก่อนตอบ > 0) ไม่นับคำใหม่ เพราะคำใหม่ยังไม่มีอะไรให้จำ
// จำได้ = ตอบ "พอจำได้" หรือ "จำได้แม่น" (ไม่ใช่ "ยังจำไม่ได้")

export const ANSWER_KEEP = 3000; // เก็บผลการตอบล่าสุดไม่เกินกี่ครั้ง (ตัวเก่าสุดถูกตัดทิ้งก่อน)
export const RECALL_DAYS = 30; // หน้าสวนดูย้อนหลังกี่วัน

const AGAIN = 1;

// กลุ่มตามระยะของต้นไม้ก่อนตอบ ตรงกับ stageOf ใน srs.js (< 7 วัน ต้นอ่อน, < 21 วัน กำลังโต, นอกนั้นต้นไม้ใหญ่)
export function stageIdOf(ivl) {
  return ivl < 7 ? "sprout" : ivl < 21 ? "growing" : "tree";
}

const emptyBucket = () => ({ total: 0, remembered: 0, rate: null });

function finish(bucket) {
  bucket.rate = bucket.total > 0 ? Math.round((bucket.remembered / bucket.total) * 100) : null;
  return bucket;
}

// สรุปของวัน from ถึง to (รวมทั้งสองวัน) { total, remembered, rate, good, hard, again, byStage }
// rate = null เมื่อยังไม่มีคำที่เคยเรียนแล้วให้นับ
export function recallBetween(entries, from, to) {
  const result = { ...emptyBucket(), good: 0, hard: 0, again: 0, byStage: { sprout: emptyBucket(), growing: emptyBucket(), tree: emptyBucket() } };
  for (const [day, , rating, ivl] of entries) {
    if (day < from || day > to || ivl <= 0) continue;
    const ok = rating !== AGAIN;
    const bucket = result.byStage[stageIdOf(ivl)];
    for (const target of [result, bucket]) {
      target.total += 1;
      if (ok) target.remembered += 1;
    }
    if (rating === AGAIN) result.again += 1;
    else if (rating === 2) result.hard += 1;
    else result.good += 1;
  }
  finish(result);
  Object.values(result.byStage).forEach(finish);
  return result;
}

// ย้อนหลัง days วันนับถึงวันนี้
export const recallStats = (entries, today, days = RECALL_DAYS) => recallBetween(entries, today - days + 1, today);

// รวมผลการตอบจากสองฝั่ง (ตอนนำเข้าแบบรวม) ตัดซ้ำ เรียงตามวัน และเก็บเฉพาะล่าสุด ANSWER_KEEP ครั้ง
export function mergeAnswers(local, incoming) {
  const seen = new Set();
  const merged = [];
  for (const entry of [...local, ...incoming]) {
    const key = entry.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  merged.sort((a, b) => a[0] - b[0]);
  return merged.slice(-ANSWER_KEEP);
}
