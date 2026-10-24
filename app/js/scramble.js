// เกมเรียงตัวอักษร: ดูคำแปลไทยแล้วเรียงตัวอักษรที่สลับไว้ให้เป็นคำอังกฤษ (ตรรกะล้วน ไม่แตะหน้าเว็บ)

import { shuffle, typeQuestion } from "./quiz.js";

export const SCRAMBLE_COUNT = 5;
export const POINTS = { clean: 2, hint: 1, skip: 0 }; // ตอบเองล้วน / ใช้ใบ้ / ข้าม

// สลับตัวอักษรของคำ ไม่ให้ได้ลำดับเดิม (ยกเว้นคำที่มีตัวอักษรเหมือนกันหมด)
export function scrambleLetters(answer, rng = Math.random) {
  const letters = [...answer];
  if (new Set(letters).size < 2) return letters;
  let result;
  do {
    result = shuffle(letters, rng);
  } while (result.join("") === answer);
  return result;
}

// ข้อหนึ่งรอบ: คำที่ยาว 3–8 ตัวอักษรและคำแปลชี้ไปที่คำเดียวจริง ๆ (ไม่มีคำอื่นแปลทับกัน) คืน null ถ้าคำไม่พอ
export function buildScrambleRound(pool, rng = Math.random, count = SCRAMBLE_COUNT) {
  const eligible = [];
  for (const word of pool) {
    const answer = word.headword.toLowerCase();
    if (!/^[a-z]{3,8}$/.test(answer)) continue;
    const question = typeQuestion(word, pool);
    if (question) eligible.push({ word, answer, meaning: question.prompt, posLabel: question.posLabel });
  }
  if (eligible.length < count) return null;
  return shuffle(eligible, rng)
    .slice(0, count)
    .map((item) => ({ ...item, letters: scrambleLetters(item.answer, rng) }));
}

// picked = ลำดับ index ของแผ่นตัวอักษรที่เลือกไว้แล้ว
export const pickedText = (letters, picked) => picked.map((index) => letters[index]).join("");

export const isSolved = (letters, picked, answer) => picked.length === answer.length && pickedText(letters, picked) === answer;

// ใบ้: ถ้าที่เลือกไว้ผิดให้ล้างก่อน แล้ววางตัวอักษรถัดไปที่ถูกต้องให้ (คืน picked ใหม่ หรือเท่าเดิมถ้าเสร็จแล้ว)
export function applyHint(letters, picked, answer) {
  let current = answer.startsWith(pickedText(letters, picked)) ? [...picked] : [];
  if (current.length >= answer.length) return current;
  const wanted = answer[current.length];
  const index = letters.findIndex((letter, position) => letter === wanted && !current.includes(position));
  if (index >= 0) current = [...current, index];
  return current;
}

export const roundScore = (results) => results.reduce((sum, result) => sum + POINTS[result], 0);

export const maxScore = (count = SCRAMBLE_COUNT) => count * POINTS.clean;
