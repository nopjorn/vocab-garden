// สอบปลายแปลง: ปลูกครบทั้งแปลงแล้วเปิดสอบ 20 ข้อจากคำในแปลงนั้น ได้เหรียญทองแดง / เงิน / ทองตามคะแนน (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// เหรียญสอบเป็นของตกแต่งเท่านั้น เก็บรวมใน vg:medals ด้วยรหัส "exam-<แปลง>-<ระดับ>" จึงไม่ต้องมีที่เก็บข้อมูลเพิ่ม
// ข้อที่ตอบผิดจะถูกนัดทวนเร็วขึ้น (ไม่เกินพรุ่งนี้) โดยไม่แตะระยะห่างการทวนของคำ

import { choiceQuestion, clozeQuestion, shuffle } from "./quiz.js";

export const EXAM_COUNT = 20;

// เรียงจากสูงไปต่ำ min = คะแนนต่ำสุดที่ได้เหรียญนั้น
export const TIERS = [
  { id: "gold", emoji: "🥇", name: "เหรียญทอง", min: 19 },
  { id: "silver", emoji: "🥈", name: "เหรียญเงิน", min: 16 },
  { id: "bronze", emoji: "🥉", name: "เหรียญทองแดง", min: 12 },
];

export const tierOf = (score) => TIERS.find((tier) => score >= tier.min) || null;

// เปิดสอบได้เมื่อแปลครบทุกคำของแปลง และปลูกครบทุกคำแล้ว (เรียนอย่างน้อยหนึ่งครั้ง)
export function examReady(words, cards, level) {
  const inLevel = words.filter((word) => word.level === level);
  return inLevel.length > 0 && inLevel.every((word) => word.translated && Boolean(cards[word.headword]));
}

// ข้อสอบ: สุ่มคำในแปลง ข้อสลับกันระหว่างเติมคำในประโยคกับเลือกคำแปล ตัวหลอกมาจากคำอื่นในแปลงเดียวกัน
// คืน [{ word, question }] หรือ null ถ้าสร้างได้น้อยกว่า count
export function buildExam(levelWords, rng = Math.random, count = EXAM_COUNT) {
  const items = [];
  for (const word of shuffle(levelWords, rng)) {
    if (items.length === count) break;
    const makers = items.length % 2 === 0 ? [clozeQuestion, choiceQuestion] : [choiceQuestion, clozeQuestion];
    for (const make of makers) {
      const question = make(word, levelWords, rng);
      if (question) {
        items.push({ word, question });
        break;
      }
    }
  }
  return items.length === count ? items : null;
}

export const examMedalId = (level, tier) => `exam-${level}-${tier.id}`;

// เหรียญที่ได้จากคะแนนนี้: ระดับที่ทำได้และระดับที่ต่ำกว่าทั้งหมด (ทองได้ทั้งทอง เงิน ทองแดง)
export function examMedalIds(level, score) {
  const earned = tierOf(score);
  return earned ? TIERS.filter((tier) => tier.min <= earned.min).map((tier) => examMedalId(level, tier)) : [];
}

// ระดับสูงสุดที่เคยได้ของแปลงนั้น (ไม่เคย = null)
export function bestTier(level, medals) {
  return TIERS.find((tier) => examMedalId(level, tier) in medals) || null;
}

// นัดทวนเร็วขึ้นสำหรับคำที่ตอบผิด: ครบกำหนดไม่เกินพรุ่งนี้ ระยะห่างการทวนเดิมไม่เปลี่ยน (ไม่มีไพ่ = ไม่ทำอะไร)
export function rescheduleMissed(card, today) {
  if (!card) return card;
  return card.due > today + 1 ? { ...card, due: today + 1 } : card;
}
