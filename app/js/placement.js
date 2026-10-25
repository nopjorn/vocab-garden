// แบบทดสอบวัดระดับ: ถามว่า "รู้จักคำนี้ไหม" คำจริงจากทุกแปลงที่แปลแล้ว ผสมคำปลอมที่แต่งเองไว้จับการตอบว่ารู้ทั้งที่ไม่รู้
// ผลแค่แนะนำแปลงเริ่มต้น ไม่เปลี่ยนความคืบหน้าจนกว่าผู้ใช้จะกดนำไปใช้ (ตรรกะล้วน ไม่แตะหน้าเว็บ)

import { shuffle } from "./quiz.js";

export const PER_LEVEL = 8;
export const FAKE_COUNT = 8;
export const PASS_RATE = 0.8; // รู้เกินเท่านี้ในแปลงหนึ่ง ถือว่าข้ามแปลงนั้นได้
export const MAX_FALSE_RATE = 0.4; // ตอบว่ารู้จักคำปลอมเกินเท่านี้ ผลไม่น่าเชื่อถือ

// คำปลอมที่ไม่ใช่คำในภาษาอังกฤษ (ตรวจแล้วว่าไม่ซ้ำกับคำหลักหรือรูปคำใน NGSL) ออกเสียงได้เหมือนคำจริง
export const FAKE_WORDS = [
  "plurvish", "dovrane", "kestrum", "bolimate", "fronnel", "splorb", "mestable", "quindle",
  "trobbing", "vandrel", "gorvish", "lentrope", "snarvel", "drepsion",
];

// รายการคำถามทั้งรอบ: แปลงละ PER_LEVEL คำ (ไม่รวมแปลงพิเศษ) + คำปลอม FAKE_COUNT คำ สลับลำดับกัน
export function buildPlacement(words, rng = Math.random, perLevel = PER_LEVEL, fakeCount = FAKE_COUNT) {
  const byLevel = new Map();
  for (const word of words) {
    if (word.level === "sup") continue;
    if (!byLevel.has(word.level)) byLevel.set(word.level, []);
    byLevel.get(word.level).push(word);
  }
  const items = [];
  for (const [level, list] of byLevel) {
    for (const word of shuffle(list, rng).slice(0, perLevel)) items.push({ kind: "word", level, word });
  }
  for (const text of shuffle(FAKE_WORDS, rng).slice(0, fakeCount)) items.push({ kind: "fake", text });
  return shuffle(items, rng);
}

// answers[i] = true ถ้าตอบว่ารู้จักคำที่ i
// known = สัดส่วนที่รู้จริงในแปลงนั้น หักส่วนที่น่าจะเดาออกไปตามอัตราที่ตอบว่ารู้จักคำปลอม
export function scorePlacement(items, answers) {
  const fakes = items.map((item, index) => ({ item, yes: answers[index] === true })).filter(({ item }) => item.kind === "fake");
  const falseRate = fakes.length ? fakes.filter(({ yes }) => yes).length / fakes.length : 0;
  const stats = new Map();
  items.forEach((item, index) => {
    if (item.kind !== "word") return;
    const entry = stats.get(item.level) || { level: item.level, asked: 0, yes: 0 };
    entry.asked += 1;
    if (answers[index] === true) entry.yes += 1;
    stats.set(item.level, entry);
  });
  const levels = [...stats.values()]
    .sort((a, b) => Number(a.level) - Number(b.level))
    .map((entry) => {
      const raw = entry.yes / entry.asked;
      const known = falseRate >= 1 ? 0 : Math.min(1, Math.max(0, (raw - falseRate) / (1 - falseRate)));
      return { ...entry, raw, known };
    });
  return { levels, falseRate, reliable: falseRate <= MAX_FALSE_RATE };
}

// แปลงที่แนะนำให้เริ่ม: แปลงแรกที่รู้ไม่ถึง PASS_RATE (ถ้ารู้หมดทุกแปลง = แปลงสุดท้าย) ผลไม่น่าเชื่อถือ = แปลงแรก
export function recommendLevel(result) {
  const { levels, reliable } = result;
  if (levels.length === 0) return null;
  if (!reliable) return Number(levels[0].level);
  const first = levels.find((entry) => entry.known < PASS_RATE);
  return Number((first || levels[levels.length - 1]).level);
}

// ประมาณจำนวนคำที่รู้แล้วจากทุกแปลงที่ทดสอบ (sizes = จำนวนคำของแต่ละแปลง)
export function estimateKnown(result, sizes) {
  return Math.round(result.levels.reduce((sum, entry) => sum + entry.known * (sizes[entry.level] || 0), 0));
}

// คำจริงที่ตอบว่ารู้จัก (ใช้เสนอให้ข้ามเป็นต้นไม้ใหญ่) ถ้าผลไม่น่าเชื่อถือจะไม่เสนอ
export function knownWords(items, answers, reliable = true) {
  if (!reliable) return [];
  return items.filter((item, index) => item.kind === "word" && answers[index] === true).map((item) => item.word);
}
