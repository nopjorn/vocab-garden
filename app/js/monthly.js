// ชาเลนจ์ประจำเดือน: เป้าระยะกลางระหว่างภารกิจรายวันกับเหรียญ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ความคืบหน้าคำนวณจากข้อมูลรายวันที่แอปเก็บอยู่แล้ว (vg:history vg:log vg:games) ทำสำเร็จแล้วเก็บใน vg:medals
// ด้วยรหัส "month-YYYY-MM" จึงไม่มีคีย์ใหม่ · เป็นของสนุก ๆ เท่านั้น ไม่ได้ล็อกคำศัพท์หรือฟีเจอร์ไว้

export const MONTH_NAMES = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

// สลับชนิดชาเลนจ์ทุกเดือน (เป้าตั้งให้ทำได้สบาย ๆ ถ้าเปิดแอปเกือบทุกวันด้วยค่าเริ่มต้น)
export const CHALLENGES = [
  { id: "plant", emoji: "🌱", title: (target) => `ปลูกคำใหม่ ${target} ต้น`, target: 100, unit: "ต้น" },
  { id: "days", emoji: "📅", title: (target) => `ท่องหรือเล่นเกมให้ได้ ${target} วัน`, target: 20, unit: "วัน" },
  { id: "reviews", emoji: "🔁", title: (target) => `ทวนรวม ${target} ครั้ง`, target: 400, unit: "ครั้ง" },
  { id: "trees", emoji: "🌳", title: (target) => `ปลูกให้โตเป็นต้นไม้ใหญ่ ${target} ต้น`, target: 30, unit: "ต้น" },
];

// เดือนของเลขวัน (เลขวันคือวันที่ตามปฏิทินของเครื่องนับเป็นวันจาก 1970-01-01 ดู dayNumber ใน srs.js)
export function monthOf(day) {
  const date = new Date(day * 86400000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = Date.UTC(year, month, 1) / 86400000;
  const last = Date.UTC(year, month + 1, 0) / 86400000;
  return { year, month, first, last, id: `month-${year}-${String(month + 1).padStart(2, "0")}`, name: MONTH_NAMES[month] };
}

export const challengeOf = (month) => CHALLENGES[(month.year * 12 + month.month) % CHALLENGES.length];

// ความคืบหน้าของเดือนที่มีวัน day · data = { history, log, games } (games = จำนวนรอบเกมรายวัน)
export function monthlyProgress(day, data) {
  const month = monthOf(day);
  const challenge = challengeOf(month);
  let value = 0;
  for (let current = month.first; current <= Math.min(day, month.last); current += 1) {
    const reviews = data.history[current] || 0;
    const entry = data.log[current];
    if (challenge.id === "plant") value += entry?.n || 0;
    else if (challenge.id === "trees") value += entry?.t || 0;
    else if (challenge.id === "reviews") value += reviews;
    else if (reviews > 0 || (data.games[current] || 0) > 0) value += 1;
  }
  const { target } = challenge;
  return {
    month,
    challenge,
    title: challenge.title(target),
    value: Math.min(value, target),
    target,
    done: value >= target,
    percent: Math.min(100, Math.round((value / target) * 100)),
    daysLeft: month.last - day,
  };
}

// เดือนที่ทำชาเลนจ์สำเร็จแล้ว (จากรหัสใน vg:medals) เรียงจากเก่าไปใหม่
export const completedMonths = (medals) => Object.keys(medals).filter((id) => /^month-\d{4}-\d{2}$/.test(id)).sort();
