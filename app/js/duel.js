// ท้าเพื่อนผ่านลิงก์: เล่นท้าทาย 60 วินาทีด้วยชุดคำถามเดียวกันทั้งสองฝั่ง (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ลิงก์เก็บแค่ เลขสุ่ม (seed) + แปลงที่ใช้ + คะแนนของคนท้า ไม่มีคำศัพท์หรือข้อมูลส่วนตัวในลิงก์
// ทั้งสองฝั่งสร้างคำถามจากชุดข้อมูลในแอปเหมือนกัน ด้วยตัวสุ่มที่ตั้งต้นจาก seed เดียวกัน จึงได้คำและตัวเลือกเรียงเหมือนกันทุกข้อ
// (ถ้าเปิดลิงก์ด้วยแอปคนละเวอร์ชันที่คำแปลต่างกัน คำถามบางข้ออาจต่างไปเล็กน้อย)

import { seededRandom } from "./rng.js";

export { seededRandom };

export const DUEL_FORMAT = "1"; // ขึ้นต้นรหัสลิงก์ ถ้าวันหน้าเปลี่ยนวิธีสร้างคำถาม ให้ขยับเลขนี้ ลิงก์เก่าจะได้ไม่เพี้ยน
export const MAX_SCORE = 999;

export const newSeed = (rng = Math.random) => Math.floor(rng() * 4294967296) >>> 0;

// แปลงที่เลือก → เลขฐาน 36 (บิตที่ i = แปลงลำดับที่ i ใน allLevels)
function levelMask(levels, allLevels) {
  return allLevels.reduce((mask, level, index) => (levels.includes(level) ? mask + 2 ** index : mask), 0);
}

// { seed, levels, score } → "1.<seed>.<แปลง>.<คะแนน>" ใช้ต่อท้าย #/duel/
export function encodeDuel({ seed, levels, score }, allLevels) {
  const mask = levelMask(levels, allLevels);
  if (mask === 0) return null;
  const safeScore = Math.min(MAX_SCORE, Math.max(0, Math.floor(score) || 0));
  return [DUEL_FORMAT, (seed >>> 0).toString(36), mask.toString(36), safeScore.toString(36)].join(".");
}

// อ่านรหัสลิงก์ คืน { seed, levels, score } หรือ null ถ้ารหัสเสียหรือมาจากรูปแบบที่ไม่รู้จัก
export function decodeDuel(code, allLevels) {
  const parts = String(code || "").trim().toLowerCase().split(".");
  if (parts.length !== 4 || parts[0] !== DUEL_FORMAT || !parts.slice(1).every((part) => /^[0-9a-z]{1,8}$/.test(part))) return null;
  const [seed, mask, score] = parts.slice(1).map((part) => parseInt(part, 36));
  if (seed > 0xffffffff || mask <= 0 || mask >= 2 ** allLevels.length || score > MAX_SCORE) return null;
  const levels = allLevels.filter((_, index) => Math.floor(mask / 2 ** index) % 2 === 1);
  return { seed, levels, score };
}

// กองคำของการดวล: ทุกคำที่แปลแล้วในแปลงที่ระบุ เรียงตามลำดับในชุดข้อมูล (ไม่ขึ้นกับความคืบหน้าของใคร)
export const duelPool = (words, levels) => {
  const chosen = new Set(levels);
  return words.filter((word) => word.translated && chosen.has(word.level)).sort((a, b) => a.order - b.order);
};

// "แปลง 1–3, 5 และแปลงพิเศษ" ย่อแปลงที่ติดกันเป็นช่วง
export function levelsText(levels) {
  const numbers = levels.filter((level) => level !== "sup").map(Number).sort((a, b) => a - b);
  const ranges = [];
  for (const number of numbers) {
    const last = ranges.at(-1);
    if (last && number === last[1] + 1) last[1] = number;
    else ranges.push([number, number]);
  }
  const parts = ranges.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`));
  const main = parts.length ? `แปลง ${parts.join(", ")}` : "";
  if (!levels.includes("sup")) return main;
  return main ? `${main} และแปลงพิเศษ` : "แปลงพิเศษ";
}

// ผลการดวล เทียบกับคะแนนของคนท้า
export function duelVerdict(mine, theirs) {
  if (mine > theirs) return { result: "win", emoji: "🏆", title: "ชนะเพื่อนแล้ว!", text: `คุณได้ ${mine} ข้อ เพื่อนได้ ${theirs} ข้อ` };
  if (mine === theirs) return { result: "tie", emoji: "🤝", title: "เสมอกันพอดี!", text: `ได้ ${mine} ข้อเท่ากันเลย` };
  return { result: "lose", emoji: "🌱", title: "เกือบแล้ว!", text: `คุณได้ ${mine} ข้อ เพื่อนได้ ${theirs} ข้อ ลองท้ากลับได้นะ` };
}

export const duelShareText = (score, levels) =>
  `ฉันตอบถูก ${score} ข้อใน 60 วินาที (คำจาก${levelsText(levels)}) ใน Vocab Garden 🌱 ลองเล่นชุดคำถามเดียวกันแล้วแข่งกันไหม?`;
