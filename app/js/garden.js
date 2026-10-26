// ตัวช่วยของหน้า "สวนของฉัน": ต้นไม้แต่ละต้นคือหนึ่งคำ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ต้นที่ถึงเวลาทวนจะเหี่ยว 🥀 จนกว่าจะรดน้ำ (ทวน) แต่ไม่มีวันตาย

import { shuffle } from "./quiz.js";
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

// คำที่ลืมบ่อย: เคยจำได้แล้วกลับลืมตั้งแต่ LEECH_LAPSES ครั้งขึ้นไป (ลืมมากสุดก่อน เท่ากันเรียงตามอันดับ NGSL)
export const LEECH_LAPSES = 3;

// โหมดฝึกอื่น ๆ (ไม่เปลี่ยนวันทวน): คำที่ตอบไปแล้ววันนี้ และคำที่ปลูกแล้วในแปลงหนึ่ง
// due - ivl คือวันที่ตอบล่าสุดของการ์ด (ตอบวันไหน due = วันนั้น + ivl) จึงรู้ได้โดยไม่ต้องเก็บข้อมูลเพิ่ม
export const PRACTICE_LIMIT = 30;

export function reviewedToday(words, cards, today) {
  return words.filter((word) => {
    const card = cards[word.headword];
    return card && card.reps > 0 && card.due - card.ivl === today;
  });
}

export function plantedInLevel(words, cards, level, rng = Math.random, limit = PRACTICE_LIMIT) {
  const planted = words.filter((word) => word.level === level && cards[word.headword]);
  return shuffle(planted, rng).slice(0, limit);
}

export function leechWords(words, cards, limit = 20) {
  return words
    .filter((word) => (cards[word.headword]?.lapses || 0) >= LEECH_LAPSES)
    .sort((a, b) => cards[b.headword].lapses - cards[a.headword].lapses || a.order - b.order)
    .slice(0, limit);
}

// ตัวกรองต้นไม้ในหน้าแปลง: ทั้งหมด / รอรดน้ำ / ตามระยะ (รหัสระยะตาม STAGES ใน srs.js)
export const PLOT_FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "wilted", label: "💧 รอรดน้ำ" },
  { id: "seed", label: "🌰 เมล็ด" },
  { id: "sprout", label: "🌱 ต้นอ่อน" },
  { id: "growing", label: "🌿 กำลังโต" },
  { id: "tree", label: "🌳 ต้นไม้ใหญ่" },
];

export function plantMatchesFilter(card, today, filter) {
  if (filter === "all") return true;
  const info = plantInfo(card, today);
  return filter === "wilted" ? info.wilted : info.stage.id === filter;
}

// จำนวนต้นไม้ของแต่ละตัวกรอง { all, wilted, seed, sprout, growing, tree }
export function plotFilterCounts(words, cards, today) {
  const counts = Object.fromEntries(PLOT_FILTERS.map((filter) => [filter.id, 0]));
  for (const word of words) {
    for (const filter of PLOT_FILTERS) {
      if (plantMatchesFilter(cards[word.headword], today, filter.id)) counts[filter.id] += 1;
    }
  }
  return counts;
}
