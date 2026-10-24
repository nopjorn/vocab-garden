// ตัวช่วยของหน้า "สวนของฉัน": ต้นไม้แต่ละต้นคือหนึ่งคำ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ต้นที่ถึงเวลาทวนจะเหี่ยว 🥀 จนกว่าจะรดน้ำ (ทวน) แต่ไม่มีวันตาย

import { isDue, stageOf } from "./srs.js";

export function plantInfo(card, today) {
  const stage = stageOf(card);
  const planted = Boolean(card);
  const wilted = planted && isDue(card, today);
  return { stage, planted, wilted, overdue: wilted ? today - card.due : 0 };
}

// บอกว่ารดน้ำครั้งถัดไป (ทวนครั้งถัดไป) เมื่อไร
export function dueLabel(card, today) {
  if (!card) return "ยังไม่ได้ปลูก เริ่มเรียนได้จากหน้าหลัก";
  if (card.due <= today) {
    const late = today - card.due;
    return late > 0 ? `ถึงเวลารดน้ำแล้ว 💧 (ค้าง ${late} วัน)` : "ถึงเวลารดน้ำแล้ววันนี้ 💧";
  }
  const days = card.due - today;
  return days === 1 ? "รดน้ำครั้งถัดไป: พรุ่งนี้" : `รดน้ำครั้งถัดไป: อีก ${days} วัน`;
}

// ค้นหาจากคำหลัก รูปคำอื่น หรือคำแปลภาษาไทย (ช่องค้นหาว่าง = ตรงทุกคำ)
export function matchesQuery(word, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [word.headword, ...word.forms, ...word.senses.map((sense) => sense.text)].join(" ").toLowerCase();
  return haystack.includes(needle);
}

// สรุปแปลงหนึ่ง: ปลูกแล้วกี่ต้น และกี่ต้นต้องรดน้ำ
export function plotSummary(words, cards, today) {
  let planted = 0;
  let wilted = 0;
  for (const word of words) {
    const info = plantInfo(cards[word.headword], today);
    if (info.planted) planted += 1;
    if (info.wilted) wilted += 1;
  }
  return { planted, wilted, total: words.length };
}
