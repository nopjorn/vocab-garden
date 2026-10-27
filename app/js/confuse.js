// คู่คำที่คนไทยมักสับสน: อ่านคำอธิบายและฝึกเลือกคำให้ถูกกับประโยค (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ข้อมูลอยู่ที่ data/confusables.json (แต่งเอง ตรวจรูปแบบด้วย scripts/validate_data.py)

import { shuffle } from "./quiz.js";

export const CONFUSE_COUNT = 8;
export const BLANK = "___";

// ข้อฝึกทั้งหมดจากทุกคู่ พร้อมอ้างกลับไปที่คู่คำของข้อนั้น
export function allItems(pairs) {
  return pairs.flatMap((pair) => pair.items.map((item) => ({ ...item, pairId: pair.id, words: pair.words })));
}

// ข้อหนึ่งรอบ: สุ่มข้อฝึกจากหลายคู่ (คู่ละไม่เกิน 1 ข้อก่อน เพื่อให้ได้ฝึกหลายคู่) สลับตัวเลือก คืน null ถ้าข้อไม่พอ
export function buildConfuseRound(pairs, rng = Math.random, count = CONFUSE_COUNT) {
  const items = allItems(pairs);
  if (items.length < count) return null;
  const picked = [];
  const usedPairs = new Set();
  for (const item of shuffle(items, rng)) {
    if (picked.length === count) break;
    if (usedPairs.has(item.pairId)) continue;
    usedPairs.add(item.pairId);
    picked.push(item);
  }
  // คู่ไม่พอให้ได้ครบ ก็เติมจากข้อที่เหลือ
  for (const item of shuffle(items, rng)) {
    if (picked.length === count) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.map((item) => ({ ...item, options: shuffle(item.options, rng) }));
}

// ประโยคที่เติมคำตอบแล้ว
export const filled = (item, text = item.answer) => item.en.replace(BLANK, text);

export const isCorrect = (item, option) => option === item.answer;

export function confuseSummary(score, total) {
  if (score === total) return `เลือกถูกทุกข้อ ${score}/${total} เก่งมาก 🎉`;
  if (score >= total - 2) return `เลือกถูก ${score}/${total} เกือบเต็มแล้ว`;
  return `เลือกถูก ${score}/${total} ลองอ่านคำอธิบายของคู่ที่พลาดแล้วเล่นใหม่ได้นะ`;
}
