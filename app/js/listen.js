// เกมฟังแล้วเลือก: ได้ยินแต่เสียงอ่าน แล้วเลือกคำแปลไทยที่ถูก (ตรรกะล้วน ไม่แตะหน้าเว็บ)

import { choiceQuestion, shuffle } from "./quiz.js";

export const LISTEN_COUNT = 8;

// คำที่ออกเสียงเหมือนคำอื่น ฟังอย่างเดียวแยกไม่ได้ว่าเป็นคำไหน จึงไม่ใช้ออกข้อสอบ
const HOMOPHONES = new Set(
  ("to too two for four one won no know write right there their here hear by buy bye be bee see sea son sun week weak " +
    "which witch wear where whether weather would wood new knew sale sail tale tail wait weight read red meet meat " +
    "peace piece plane plain road rode through threw hour our allowed aloud bear bare break brake eye i flower flour " +
    "main mane mind mined plan whole hole way weigh").split(" "),
);

export const canListenTo = (word) => !HOMOPHONES.has(word.headword.toLowerCase());

// ข้อสอบหนึ่งรอบ: คำละหนึ่งข้อ (เลือกคำแปล 4 ตัวเลือก) คืน null ถ้าคำไม่พอ
// pool = คำทั้งหมดที่ใช้สร้างตัวหลอก · only = เลือกออกข้อสอบจากคำกลุ่มนี้เท่านั้น (ค่าเริ่มต้นคือทั้ง pool)
export function buildListenRound(pool, rng = Math.random, count = LISTEN_COUNT, only = pool) {
  const items = [];
  for (const word of shuffle(only.filter(canListenTo), rng)) {
    if (items.length === count) break;
    const question = choiceQuestion(word, pool, rng);
    if (question) items.push({ word, question });
  }
  return items.length === count ? items : null;
}

export function listenSummary(score, total) {
  if (score === total) return `ได้ยินถูกทุกข้อ ${score}/${total} เก่งมาก 🎉`;
  return `ฟังถูก ${score}/${total} ข้อ ลองเล่นอีกรอบเพื่อฝึกหูให้คุ้นกับเสียงนะ`;
}
