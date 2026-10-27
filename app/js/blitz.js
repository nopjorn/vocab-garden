// ท้าทาย 60 วินาที: ตอบเลือกคำแปลให้ได้มากที่สุดก่อนหมดเวลา (ตรรกะล้วน ไม่แตะหน้าเว็บ)

import { choiceQuestion, shuffle } from "./quiz.js";

export const BLITZ_SECONDS = 60;
export const MIN_POOL = 12; // กองคำที่น้อยกว่านี้ ข้อซ้ำเร็วเกินไป

// คิวคำของหนึ่งรอบ: สลับลำดับทั้งกอง เล่นหมดแล้ววนใหม่ได้ (รอบ 60 วินาทีตอบได้ไม่เกินร้อยข้ออยู่แล้ว)
export function blitzQueue(only, rng = Math.random) {
  return only.length < MIN_POOL ? null : shuffle(only, rng);
}

// ข้อถัดไปจากคิว: ข้ามคำที่ทำข้อไม่ได้ (เช่น ไม่มีคำแปลที่เหมาะ) pool = คำทั้งหมดที่ใช้สร้างตัวหลอก
// คืน { word, question, rest } หรือ null ถ้าไม่เหลือคำที่ทำข้อได้เลย
export function nextBlitz(queue, pool, rng = Math.random) {
  for (let index = 0; index < queue.length; index += 1) {
    const question = choiceQuestion(queue[index], pool, rng);
    if (question) return { word: queue[index], question, rest: [...queue.slice(index + 1), ...queue.slice(0, index)] };
  }
  return null;
}

// เวลาที่เหลือเป็นวินาที (ปัดขึ้น ไม่ติดลบ)
export const secondsLeft = (startedAt, now, total = BLITZ_SECONDS) => Math.max(0, Math.ceil(total - (now - startedAt) / 1000));

export const isOver = (startedAt, now, total = BLITZ_SECONDS) => now - startedAt >= total * 1000;

export function blitzSummary(score, answered) {
  if (answered === 0) return "ยังไม่ได้ตอบข้อไหนเลย ลองใหม่อีกรอบนะ";
  return `ตอบถูก ${score} จาก ${answered} ข้อใน ${BLITZ_SECONDS} วินาที (${Math.round((score / answered) * 100)}%)`;
}
