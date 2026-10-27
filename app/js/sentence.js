// เกมเรียงคำเป็นประโยค: ดูคำแปลไทยของประโยคตัวอย่างแล้วเรียงคำที่สลับไว้ให้เป็นประโยคอังกฤษ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ใช้ประโยคตัวอย่างที่แต่งไว้ในชุดข้อมูลแล้ว ไม่มีข้อมูลใหม่

import { shuffle } from "./quiz.js";

export const SENTENCE_COUNT = 5;
export const MIN_TOKENS = 4; // ประโยคที่สั้นกว่านี้เรียงแล้วไม่ท้าทาย
export const MAX_TOKENS = 9; // ยาวกว่านี้จอมือถือไม่พอ
export const POINTS = { clean: 2, hint: 1, skip: 0 }; // ตอบเองล้วน / ใช้ใบ้ / ข้าม

// แยกประโยคเป็นก้อนตามช่องว่าง เครื่องหมายวรรคตอนติดไปกับคำ (เช่น "pool.") แผ่นคำจึงเป็นก้อนเดียวกับที่เห็นในประโยค
export const tokensOf = (sentence) => sentence.trim().split(/\s+/).filter(Boolean);

// สลับก้อนคำ ไม่ให้ได้ลำดับเดิม (ยกเว้นทุกก้อนเหมือนกัน)
export function scrambleTokens(tokens, rng = Math.random) {
  if (new Set(tokens).size < 2) return [...tokens];
  let result;
  do {
    result = shuffle(tokens, rng);
  } while (result.join(" ") === tokens.join(" "));
  return result;
}

// ข้อหนึ่งรอบ: ประโยคตัวอย่างของคำที่แปลแล้ว ยาว MIN_TOKENS–MAX_TOKENS ก้อน ไม่ซ้ำประโยค คืน null ถ้าไม่พอ
// only = เลือกข้อจากคำกลุ่มนี้เท่านั้น (กองคำที่ผู้เล่นเลือกไว้)
export function buildSentenceRound(only, rng = Math.random, count = SENTENCE_COUNT) {
  const seen = new Set();
  const eligible = [];
  for (const word of only) {
    if (!word.translated) continue;
    // ประโยคตัวอย่างที่ใช้ได้ของคำนี้ (ประโยคที่ 1 และ 2 ถ้ามี) สุ่มหนึ่งประโยคต่อคำ
    const options = [
      [word.exampleEn, word.exampleTh],
      [word.example2En, word.example2Th],
    ].filter(([en, th]) => {
      if (!en || !th) return false;
      const size = tokensOf(en).length;
      return size >= MIN_TOKENS && size <= MAX_TOKENS && !seen.has(en);
    });
    if (options.length === 0) continue;
    const [en, th] = options.length > 1 ? options[Math.floor(rng() * options.length)] : options[0];
    seen.add(en);
    eligible.push({ word, answer: en, meaning: th, tokens: tokensOf(en) });
  }
  if (eligible.length < count) return null;
  return shuffle(eligible, rng)
    .slice(0, count)
    .map((item) => ({ ...item, chips: scrambleTokens(item.tokens, rng) }));
}

// picked = ลำดับ index ของแผ่นคำที่เลือกไว้แล้ว เทียบด้วยตัวอักษร ไม่ใช่ตำแหน่ง คำซ้ำสลับกันได้
export const pickedTokens = (chips, picked) => picked.map((index) => chips[index]);

export const isSolved = (chips, picked, tokens) =>
  picked.length === tokens.length && pickedTokens(chips, picked).every((token, position) => token === tokens[position]);

// ใบ้: เก็บเฉพาะส่วนต้นที่ถูกไว้ (ถ้าที่เลือกไว้ผิดจะตัดส่วนที่ผิดทิ้ง) แล้ววางคำถัดไปที่ถูกต้องให้ คืน picked ใหม่
export function applyHint(chips, picked, tokens) {
  const current = [];
  for (const index of picked) {
    if (chips[index] !== tokens[current.length]) break;
    current.push(index);
  }
  if (current.length >= tokens.length) return current;
  const wanted = tokens[current.length];
  const index = chips.findIndex((chip, position) => chip === wanted && !current.includes(position));
  return index >= 0 ? [...current, index] : current;
}

export const roundScore = (results) => results.reduce((sum, result) => sum + POINTS[result], 0);

export const maxScore = (count = SENTENCE_COUNT) => count * POINTS.clean;
