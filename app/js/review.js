// ข้อความสถานะการตรวจทานในหน้าเกี่ยวกับ (โหลดเมื่อเปิดหน้าเกี่ยวกับเท่านั้น)
import { LEVELS, REVIEWED_LEVELS } from "./data.js";

// สรุปสถานะการตรวจทานเป็นข้อความ เช่น "ตรวจทานแล้ว: แปลง 1–4 · แปลงอื่นยังเป็นฉบับร่าง"
export function reviewSummary(reviewed = REVIEWED_LEVELS) {
  if (LEVELS.every((level) => reviewed.includes(level))) return "ตรวจทานครบทุกแปลงแล้ว";
  if (reviewed.length === 0) return "ทุกแปลงยังเป็นฉบับร่างที่รอตรวจทาน";
  const numbers = reviewed.filter((level) => level !== "sup").map(Number).sort((a, b) => a - b);
  const ranges = [];
  for (const number of numbers) {
    const last = ranges.at(-1);
    if (last && number === last[1] + 1) last[1] = number;
    else ranges.push([number, number]);
  }
  const parts = ranges.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`));
  const names = [parts.length ? `แปลง ${parts.join(", ")}` : "", reviewed.includes("sup") ? "แปลงพิเศษ" : ""].filter(Boolean);
  return `ตรวจทานแล้ว: ${names.join(" และ ")} · แปลงอื่นยังเป็นฉบับร่าง`;
}
