// ตัวกำหนดวันทวนแบบ FSRS (ตัวเลือกทดลองในตั้งค่า) ตรรกะล้วน ไม่แตะหน้าเว็บ
// FSRS = Free Spaced Repetition Scheduler ของ Jarrett Ye และชุมชน open-spaced-repetition (ใบอนุญาต MIT)
// ไฟล์นี้เขียนใหม่ตามสูตรที่เผยแพร่ ใช้ค่าพารามิเตอร์เริ่มต้นของ FSRS-5 ไม่ได้ปรับตามข้อมูลของผู้ใช้
//
// ความจำของแต่ละคำเก็บแยกจากการ์ด (คีย์ vg:fsrs) เป็น [s, d]
//   s = stability วันที่ใช้ให้โอกาสจำได้ลดลงเหลือ 90%
//   d = difficulty 1 (ง่าย) ถึง 10 (ยาก)
// การ์ดยังมี due / ivl / ease / reps / lapses เหมือนเดิม จึงใช้ระยะต้นไม้ สวน และเกมต่าง ๆ ได้ตามปกติ
// ปุ่ม 3 ปุ่มตรงกับเกรดของ FSRS: ยังจำไม่ได้ = 1 (Again), พอจำได้ = 2 (Hard), จำได้แม่น = 3 (Good)

import { AGAIN, fuzzRange } from "./srs.js";

export const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
export const DESIRED_RETENTION = 0.9;
const DECAY = -0.5;
const FACTOR = 19 / 81; // ทำให้ R(S, S) = 90%
const MIN_S = 0.1;
const MAX_S = 36500;
const START_EASE = 2.5;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const round3 = (value) => Math.round(value * 1000) / 1000;

// โอกาสจำได้เมื่อผ่านไป t วันหลังทวนครั้งล่าสุด
export const retrievability = (t, s) => (1 + (FACTOR * t) / s) ** DECAY;

// ระยะทวน (วัน) ที่ทำให้โอกาสจำได้เหลือเท่าที่ต้องการ อย่างน้อย 1 วัน
export const intervalFor = (s, retention = DESIRED_RETENTION) => Math.max(1, Math.round((s / FACTOR) * (retention ** (1 / DECAY) - 1)));

export const initialStability = (grade) => Math.max(MIN_S, W[grade - 1]);
export const initialDifficulty = (grade) => clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, 1, 10);

function nextDifficulty(d, grade) {
  const stepped = d - W[6] * (grade - 3);
  const damped = d + ((stepped - d) * (10 - d)) / 9;
  return clamp(W[7] * initialDifficulty(4) + (1 - W[7]) * damped, 1, 10);
}

// เรียนผ่านครั้งแรกในวันเดียวกัน (ทวนซ้ำในรอบเดียว) สูตรแยกต่างหากของ FSRS-5
const sameDayStability = (s, grade) => clamp(s * Math.exp(W[17] * (grade - 3 + W[18])), MIN_S, MAX_S);

function recalledStability(s, d, r, grade) {
  const hardPenalty = grade === 2 ? W[15] : 1;
  const gain = Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp(W[10] * (1 - r)) - 1) * hardPenalty;
  return clamp(s * (1 + gain), MIN_S, MAX_S);
}

function forgottenStability(s, d, r) {
  const next = W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r));
  return clamp(Math.min(next, s / Math.exp(W[17] * W[18])), MIN_S, MAX_S);
}

// ความจำเริ่มต้นของคำที่เรียนมาด้วยแบบเดิม (ยังไม่มีค่า FSRS): ใช้ระยะทวนเป็น stability และแปลง ease เป็นความยาก (ease 2.5 ≈ 5, 1.3 ≈ 9)
export function memoryFromCard(card) {
  const ease = Number.isFinite(card.ease) ? card.ease : START_EASE;
  return [round3(Math.max(card.ivl, 1)), round3(clamp(5 + ((START_EASE - ease) * 4) / 1.2, 1, 10))];
}

// ตอบหนึ่งครั้ง: คืน { card, mem } ใหม่ (ไม่แก้ของเดิม)
// card = null เมื่อเป็นคำใหม่ · mem = [s, d] หรือ null ถ้ายังไม่มี · rng = ฟังก์ชันสุ่มสำหรับขยับระยะเล็กน้อยเหมือนแบบเดิม
export function fsrsGrade(card, mem, rating, today, rng = null) {
  const fresh = !card;
  const next = card ? { ...card } : { due: today, ivl: 0, ease: START_EASE, reps: 0, lapses: 0 };
  let s;
  let d;
  if (fresh) {
    s = initialStability(rating);
    d = initialDifficulty(rating);
  } else {
    const [s0, d0] = mem || memoryFromCard(card);
    // ทวนครั้งล่าสุดเมื่อ due - ivl วัน (ivl = 0 คือกำลังเรียนซ้ำในวันนี้)
    const elapsed = card.ivl > 0 ? Math.max(0, today - (card.due - card.ivl)) : 0;
    d = nextDifficulty(d0, rating);
    if (elapsed === 0) s = sameDayStability(s0, rating);
    else {
      const r = retrievability(elapsed, s0);
      s = rating === AGAIN ? forgottenStability(s0, d0, r) : recalledStability(s0, d0, r, rating);
    }
  }

  if (rating === AGAIN) {
    if (next.ivl > 0) next.lapses += 1;
    next.ivl = 0;
  } else {
    next.reps += 1;
    next.ivl = intervalFor(s);
    const range = rng ? fuzzRange(next.ivl) : 0;
    if (range > 0) next.ivl = Math.max(1, next.ivl + Math.floor(rng() * (2 * range + 1)) - range);
  }
  next.due = today + next.ivl;
  return { card: next, mem: [round3(s), round3(d)] };
}
