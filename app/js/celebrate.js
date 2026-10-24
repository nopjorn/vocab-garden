// ตัวช่วยฉลองระหว่างท่อง: คอมโบ ต้นไม้โตขึ้น และสรุปท้ายรอบ (ตรรกะล้วน ไม่แตะหน้าเว็บ)

import { AGAIN, STAGES, stageOf } from "./srs.js";

const COMBO_MESSAGES = {
  3: "🔥 ติดกัน 3 ใบแล้ว!",
  5: "⚡ 5 ใบติด ๆ เก่งมาก!",
  10: "🚀 10 ใบติด สุดยอด!",
  20: "🏆 20 ใบติด เทพแล้ว!",
};

// ตอบ "พอจำได้" หรือ "จำได้แม่น" คอมโบเพิ่ม ตอบ "ยังจำไม่ได้" คอมโบเริ่มใหม่
export function nextCombo(combo, rating) {
  return rating === AGAIN ? 0 : combo + 1;
}

// ข้อความฉลองเมื่อคอมโบถึงหลักที่กำหนด (ไม่ถึงหลัก = null)
export function comboMessage(combo) {
  return COMBO_MESSAGES[combo] || null;
}

export function stageIndex(state) {
  const id = stageOf(state).id;
  return STAGES.findIndex((stage) => stage.id === id);
}

// ต้นไม้โตขึ้นไปอีกระยะหรือไม่ (ถอยกลับหรือเท่าเดิม = null)
export function stageMove(before, after) {
  const from = stageIndex(before);
  const to = stageIndex(after);
  return to > from ? { fromIndex: from, toIndex: to, stage: STAGES[to] } : null;
}

// บันทึกการโตของคำหนึ่งลงใน Map ของรอบนี้ (จำระยะสูงสุดที่ไปถึง และจำว่าเริ่มจากเมล็ดไหม)
export function recordGrowth(grown, headword, move) {
  const previous = grown.get(headword);
  grown.set(headword, {
    fromSeed: previous ? previous.fromSeed : move.fromIndex === 0,
    toIndex: Math.max(previous ? previous.toIndex : 0, move.toIndex),
  });
  return grown;
}

// สรุปท้ายรอบ: ปลูกใหม่กี่ต้น ต้นไหนโตเป็นกำลังโต / ต้นไม้ใหญ่
export function growthSummary(grown) {
  const summary = { planted: 0, growing: [], trees: [] };
  for (const [headword, entry] of grown) {
    if (entry.fromSeed) summary.planted += 1;
    if (entry.toIndex === 2) summary.growing.push(headword);
    if (entry.toIndex === 3) summary.trees.push(headword);
  }
  return summary;
}

// ต่อรายชื่อคำให้สั้น แสดงไม่เกิน limit คำ ที่เหลือบอกเป็นจำนวน
export function wordList(words, limit = 6) {
  const shown = words.slice(0, limit).join(", ");
  return words.length > limit ? `${shown} และอีก ${words.length - limit} คำ` : shown;
}
