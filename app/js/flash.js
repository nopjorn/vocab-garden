// เกมแฟลชการ์ด: เลือกแปลงและสถานะของคำ แล้วพลิกการ์ดทบทวนเล่น ๆ ตามใจ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// เป็นโหมดฝึก ไม่เปลี่ยนวันทวนของคำ ไม่นับเป็นเป้าหมายรายวัน

import { shuffle } from "./quiz.js";
import { stageOf } from "./srs.js";

// สถานะของคำ: ยังไม่เรียน = ยังไม่มีการ์ด · กำลังเรียน = 🌱 ต้นอ่อนหรือ 🌿 กำลังโต · เรียนแล้ว = 🌳 ต้นไม้ใหญ่
export const STATUSES = [
  { id: "new", emoji: "🌰", label: "ยังไม่เรียน" },
  { id: "learning", emoji: "🌱", label: "กำลังเรียน" },
  { id: "done", emoji: "🌳", label: "เรียนแล้ว" },
];

export function statusOf(card) {
  if (!card) return "new";
  return stageOf(card).id === "tree" ? "done" : "learning";
}

export const DECK_SIZE_CHOICES = [10, 20, 50, 0]; // จำนวนการ์ดต่อรอบ (0 = ทั้งหมดที่เลือก)
export const SIDE_CHOICES = ["en", "th"]; // ด้านหน้าการ์ด: คำอังกฤษ / คำแปลไทย

// คำที่ตรงกับแปลง (levels) และสถานะ (statuses) ที่เลือก เรียงตามลำดับ NGSL (ไม่เลือกอะไรเลย = ไม่มีคำ)
export function matchingWords(words, cards, { levels, statuses }) {
  return words.filter(
    (word) => word.translated && levels.has(word.level) && statuses.has(statusOf(cards[word.headword])),
  );
}

// สุ่มสำรับ limit ใบ (0 = ทั้งหมด)
export function buildDeck(words, limit = 0, rng = Math.random) {
  const deck = shuffle(words, rng);
  return limit > 0 ? deck.slice(0, limit) : deck;
}

// ยังไม่แน่ใจ: ใบนี้ไปแทรกท้ายคิวอีก gap ใบ (ไม่เกินท้ายคิว) จะได้ได้ลองใหม่ในรอบเดียวกัน
export function requeue(queue, gap = 3) {
  const [first, ...rest] = queue;
  rest.splice(Math.min(gap, rest.length), 0, first);
  return rest;
}

// ข้อความสรุปจบรอบ
export function summaryText(total, unsureTaps) {
  if (unsureTaps === 0) return `จำได้ครบทั้ง ${total} ใบในครั้งแรกเลย เยี่ยมมาก! 🎉`;
  return `ผ่านครบ ${total} ใบ มีกดว่ายังไม่แน่ใจ ${unsureTaps} ครั้ง ลองเล่นอีกรอบให้แม่นขึ้นนะ`;
}
