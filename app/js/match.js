// เกมจับคู่คำ: จับคู่คำอังกฤษกับคำแปลไทยให้ครบทุกคู่เร็วที่สุด (ตรรกะล้วน ไม่แตะหน้าเว็บ)

import { meaningOf, shuffle } from "./quiz.js";

export const MATCH_PAIRS = 6;

// สร้างกระดานหนึ่งรอบจากคำที่แปลแล้ว: เลือกคำที่ความหมายไม่ทับกัน (ไม่งั้นจับคู่ได้หลายแบบ)
// คืน { tiles } แต่ละแผ่น { id, pairId, text, lang } สลับตำแหน่งแล้ว หรือ null ถ้าคำไม่พอ
export function buildMatchRound(pool, rng = Math.random, pairs = MATCH_PAIRS) {
  const candidates = shuffle(
    pool.filter((word) => meaningOf(word) && /^[A-Za-z]+$/.test(word.headword)),
    rng,
  );
  const chosen = [];
  const used = new Set();
  for (const word of candidates) {
    const text = meaningOf(word);
    const glosses = text.split(/,\s*/);
    if (glosses.some((gloss) => used.has(gloss))) continue;
    glosses.forEach((gloss) => used.add(gloss));
    chosen.push({ headword: word.headword, text });
    if (chosen.length === pairs) break;
  }
  if (chosen.length < pairs) return null;
  const tiles = chosen.flatMap((entry, pairId) => [
    { id: `${pairId}-en`, pairId, text: entry.headword, lang: "en" },
    { id: `${pairId}-th`, pairId, text: entry.text, lang: "th" },
  ]);
  return { tiles: shuffle(tiles, rng) };
}

export const isMatch = (a, b) => a.id !== b.id && a.pairId === b.pairId;

// เวลาใหม่ดีกว่าสถิติเดิมไหม (ยังไม่มีสถิติ = ดีที่สุดทันที)
export const isNewBest = (best, ms) => best === null || best === undefined || ms < best;

export const formatSeconds = (ms) => `${(ms / 1000).toFixed(1)} วิ`;
