// แมลงในสวน 🐛: คำที่ลืมบ่อยกลายเป็นแมลงเกาะต้นไม้ ไล่ได้ด้วยการฝึกคำนั้น 3 แบบติดกัน (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ไล่ได้แล้วจำจำนวนครั้งที่ลืมไว้ ถ้าลืมเพิ่มภายหลังแมลงจะกลับมาเกาะอีก ตอบผิดไม่เสียอะไร แมลงแค่ยังอยู่
// การไล่แมลงเป็นการฝึก ไม่เปลี่ยนวันทวนของคำ

import { leechWords } from "./garden.js";
import { choiceQuestion, clozeQuestion, typeQuestion } from "./quiz.js";

export const BUG_ROUND = 5; // ไล่ได้รอบละกี่ตัว

// แมลงที่ยังเกาะอยู่: คำที่ลืมบ่อย (ตามเกณฑ์ใน garden.js) ที่ยังไม่เคยไล่ หรือลืมเพิ่มหลังจากไล่ไปแล้ว
export function activeBugs(words, cards, caught = {}) {
  return leechWords(words, cards, Infinity).filter((word) => !(word.headword in caught) || caught[word.headword] < cards[word.headword].lapses);
}

export const bugSet = (words, cards, caught) => new Set(activeBugs(words, cards, caught).map((word) => word.headword));

// ขั้นของการไล่แมลงหนึ่งตัว: ดูคำแล้วเลือกคำแปล → เติมคำในประโยค → ดูคำแปลแล้วพิมพ์คำเอง
// แบบไหนที่คำนั้นทำข้อไม่ได้ก็ข้ามไป คืน [] ถ้าทำข้อไม่ได้เลยสักแบบ
export function bugSteps(word, pool, rng = Math.random) {
  return [choiceQuestion(word, pool, rng), clozeQuestion(word, pool, rng), typeQuestion(word, pool)].filter(Boolean);
}

export const STEP_LABELS = { choice: "เลือกคำแปล", cloze: "เติมคำในประโยค", type: "พิมพ์คำเอง" };

// ข้อความสรุปท้ายรอบ
export function bugSummary(caught, tried, left) {
  if (tried === 0) return "ยังไม่ได้ไล่แมลงตัวไหนเลย";
  const head = caught === tried ? `ไล่แมลงได้ครบทั้ง ${tried} ตัว 🦋` : `ไล่แมลงได้ ${caught} จาก ${tried} ตัว`;
  const tail = left === 0 ? "สวนไม่มีแมลงแล้ว ต้นไม้สบายใจสุด ๆ" : `ยังเหลือแมลงในสวนอีก ${left} ตัว ค่อย ๆ ไล่ได้ ไม่ต้องรีบ`;
  return `${head} · ${tail}`;
}
