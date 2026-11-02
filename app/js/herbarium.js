// สมุดพันธุ์ไม้ 📔: คำที่โตเป็นต้นไม้ใหญ่ 🌳 ถูกเก็บเป็นหน้าในสมุด (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// หน้าในสมุดไม่หายแม้ภายหลังลืมคำนั้น (เหมือนดอกไม้ประจำแปลง) แค่บอกว่าต้นนั้นตอนนี้ต้องดูแลเพิ่ม
// ต้นไม้ใหญ่ที่มีอยู่ก่อนมีสมุด จะถูกเก็บในวันแรกที่เปิดแอปเวอร์ชันนี้

import { stageOf } from "./srs.js";

const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// คำที่ตอนนี้เป็นต้นไม้ใหญ่ (ใช้เก็บลงสมุด)
export const treeHeadwords = (words, cards) => words.filter((word) => cards[word.headword] && stageOf(cards[word.headword]).id === "tree").map((word) => word.headword);

// เลขวัน (ดู dayNumber ใน srs.js) → วัน เดือน ปี พ.ศ.
const dateOf = (day) => new Date(day * 86400000);
export const dayLabel = (day) => {
  const date = dateOf(day);
  return `${date.getUTCDate()} ${THAI_MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear() + 543}`;
};
export const monthLabel = (day) => {
  const date = dateOf(day);
  return `${THAI_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear() + 543}`;
};

// หน้าในสมุด เก็บล่าสุดก่อน วันเดียวกันเรียงตามลำดับในชุดข้อมูล
// { word, day, reps, lapses, stillTree } คำที่หาไม่เจอในชุดข้อมูล (เช่น ข้อมูลเก่า) ข้ามไป
export function herbariumPages(words, cards, pressed, spotted = {}) {
  return words
    .filter((word) => word.headword in pressed)
    .map((word) => {
      const card = cards[word.headword];
      return {
        word,
        day: pressed[word.headword],
        reps: card?.reps || 0,
        lapses: card?.lapses || 0,
        spotted: spotted[word.headword] || 0,
        stillTree: Boolean(card) && stageOf(card).id === "tree",
      };
    })
    .sort((a, b) => b.day - a.day || a.word.order - b.word.order);
}

// แบ่งหน้าตามเดือนที่เก็บ [{ label, pages }]
export function byMonth(pages) {
  const groups = [];
  for (const page of pages) {
    const label = monthLabel(page.day);
    if (groups.at(-1)?.label === label) groups.at(-1).pages.push(page);
    else groups.push({ label, pages: [page] });
  }
  return groups;
}

export const pageNote = (page) =>
  `เก็บเมื่อ ${dayLabel(page.day)} · ทวน ${page.reps} ครั้ง${page.lapses ? ` · เคยลืม ${page.lapses} ครั้ง` : ""}${page.spotted ? ` · ✨ เจอจริง ${page.spotted} ครั้ง` : ""}${page.stillTree ? "" : " · ตอนนี้ต้องทวนอีกนิด 💧"}`;
