// นักเดินทางมาเยี่ยมสวน: สัตว์แวะมาถามคำศัพท์ 1 ข้อ วันละ 2 รอบ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
//   รอบเช้า ตี 4 – บ่าย 3 · รอบบ่าย บ่าย 3 – ตี 4 (วันของแอปเริ่มตอนตี 4 เหมือน srs.js)
// ใครมาและถามคำไหนกำหนดจากวันและรอบ เปิดแอปซ้ำในรอบเดียวกันจึงเจอคนเดิม ตอบถูกได้ของฝาก ตอบผิดก็แค่ได้รู้คำแปล
// พลาดรอบไหนไปก็ไม่เสียอะไร (ไม่มีตัวนับต่อเนื่องหรือบทลงโทษ)

import { choiceQuestion, meaningOf } from "./quiz.js";
import { seededRandom } from "./rng.js";

export const AFTERNOON_HOUR = 15;
export const VISIT_KEEP = 60; // จำรอบที่ตอบแล้วล่าสุดกี่รอบ

// ทุกตัวและของฝากคิดขึ้นเอง ใช้อีโมจิของเครื่อง
export const VISITORS = [
  { id: "squirrel", emoji: "🐿️", name: "กระรอก", gift: { id: "acorn", emoji: "🌰", name: "ลูกโอ๊ก" } },
  { id: "hedgehog", emoji: "🦔", name: "เม่นน้อย", gift: { id: "mushroom", emoji: "🍄", name: "เห็ดจิ๋ว" } },
  { id: "bee", emoji: "🐝", name: "ผึ้งงาน", gift: { id: "honey", emoji: "🍯", name: "น้ำผึ้งหนึ่งหยด" } },
  { id: "rabbit", emoji: "🐇", name: "กระต่าย", gift: { id: "carrot", emoji: "🥕", name: "แครอท" } },
  { id: "turtle", emoji: "🐢", name: "เต่าเดินทางไกล", gift: { id: "shell", emoji: "🐚", name: "เปลือกหอย" } },
  { id: "duck", emoji: "🦆", name: "เป็ด", gift: { id: "feather", emoji: "🪶", name: "ขนนก" } },
  { id: "snail", emoji: "🐌", name: "หอยทาก", gift: { id: "clover", emoji: "🍀", name: "ใบโคลเวอร์" } },
  { id: "frog", emoji: "🐸", name: "กบ", gift: { id: "dew", emoji: "💧", name: "หยดน้ำค้าง" } },
  { id: "ladybug", emoji: "🐞", name: "เต่าทอง", gift: { id: "daisy", emoji: "🌼", name: "ดอกเดซี่" } },
  { id: "cat", emoji: "🐈", name: "แมวข้างบ้าน", gift: { id: "yarn", emoji: "🧶", name: "ไหมพรม" } },
];

export const GIFT_OF = Object.fromEntries(VISITORS.map((visitor) => [visitor.gift.id, visitor.gift]));

// รอบของเวลานี้ (hour = ชั่วโมงของเครื่อง)
export const visitSlot = (hour) => (hour >= 4 && hour < AFTERNOON_HOUR ? 0 : 1);

export const visitKey = (day, slot) => `${day}-${slot}`;

const rngFor = (day, slot, salt) => seededRandom((day * 2 + slot) * 7919 + salt);

// ผู้มาเยี่ยมของรอบนี้: รอบบ่ายสุ่มจากทุกตัว รอบเช้าสุ่มจากตัวที่ไม่ใช่รอบบ่ายของวันนี้และของเมื่อวาน
// (สองรอบติดกันจึงไม่ซ้ำตัวกันเสมอ และคำนวณได้โดยไม่ต้องย้อนดูวันก่อน ๆ ไปเรื่อย ๆ)
const afternoonVisitor = (day) => VISITORS[Math.floor(rngFor(day, 1, 1)() * VISITORS.length)];

export function visitorFor(day, slot) {
  if (slot === 1) return afternoonVisitor(day);
  const others = VISITORS.filter((visitor) => visitor !== afternoonVisitor(day) && visitor !== afternoonVisitor(day - 1));
  return others[Math.floor(rngFor(day, 0, 1)() * others.length)];
}

// คำที่ถาม: สุ่มจากคำที่ปลูกแล้ว (ยังไม่ได้ปลูกสักคำ ใช้คำ 30 คำแรกของชุด) คืน { word, question } หรือ null
export function visitQuestion(words, cards, day, slot) {
  const usable = words.filter((word) => word.translated && meaningOf(word));
  const planted = usable.filter((word) => cards[word.headword]);
  const choices = planted.length > 0 ? planted : usable.slice(0, 30);
  if (choices.length === 0) return null;
  const rng = rngFor(day, slot, 2);
  const word = choices[Math.floor(rng() * choices.length)];
  const question = choiceQuestion(word, usable, rng);
  return question ? { word, question } : null;
}

export const visitDone = (visits, day, slot) => visits.includes(visitKey(day, slot));

// เพิ่มรอบที่ตอบแล้ว เก็บล่าสุดไม่เกิน VISIT_KEEP รอบ
export function withVisit(visits, day, slot) {
  const key = visitKey(day, slot);
  return visits.includes(key) ? visits : [...visits, key].slice(-VISIT_KEEP);
}

export const visitGreeting = (visitor, word) => `${visitor.emoji} ${visitor.name}แวะมาที่สวน! อยากรู้ว่าคำว่า “${word.headword}” แปลว่าอะไร`;

export function visitReply(visitor, word, right, answerText) {
  if (right) return `${visitor.name}ดีใจมาก ทิ้ง${visitor.gift.emoji} ${visitor.gift.name}ไว้เป็นของฝาก`;
  return `ไม่เป็นไรเลย ${visitor.name}ขอบคุณที่ช่วยคิดนะ “${word.headword}” แปลว่า ${answerText}`;
}

// ของฝากที่สะสมไว้ { [รหัสของฝาก]: จำนวน } → [{ emoji, name, count }] เรียงตามลำดับใน VISITORS
export const giftShelf = (souvenirs) =>
  VISITORS.map((visitor) => visitor.gift)
    .filter((gift) => souvenirs[gift.id] > 0)
    .map((gift) => ({ ...gift, count: souvenirs[gift.id] }));

// รอบถัดไปที่จะมีคนมา (ใช้บอกหลังตอบแล้ว)
export const nextVisitText = (slot) => (slot === 0 ? "มีคนแวะมาอีกตอนบ่าย 3 โมง" : "พรุ่งนี้เช้ามีคนแวะมาใหม่");
