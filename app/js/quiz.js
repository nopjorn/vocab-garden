// สร้างคำถามสำหรับโหมดทวนแบบผสม (ตรรกะล้วน ไม่แตะหน้าเว็บ)
//   🌱 ต้นอ่อน  → เลือกคำแปลภาษาไทย 4 ตัวเลือก
//   🌿🌳 โตแล้ว → เติมคำในประโยคตัวอย่าง (เลือกจาก 4 ตัวเลือก) ถ้าประโยคของคำนั้นเติมไม่ได้ก็ใช้แบบเลือกคำแปล
// คำใหม่ที่ยังไม่เคยเห็นไม่ถูกถามในโหมดนี้ ให้ดูการ์ดก่อนเสมอ (buildQuestion คืน null)
// ตอบถูก = จำได้แม่น · ตอบผิดหรือกดไม่รู้ = ยังจำไม่ได้ (ตัดสินใน main.js)

import { stageIndex } from "./celebrate.js";

const OPTION_COUNT = 4;
const MAX_MEANING_LENGTH = 40; // คำแปลยาวกว่านี้ไม่เหมาะเป็นตัวเลือก

export function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(rng() * (index + 1));
    [result[index], result[pick]] = [result[pick], result[index]];
  }
  return result;
}

// ความหมายแรกของคำ ใช้เป็นคำตอบหรือตัวหลอก (ไม่มี หรือไม่เหมาะ = null)
export function meaningOf(word) {
  const sense = word.senses[0];
  if (!sense) return null;
  const text = sense.text.trim();
  if (!text || text.includes("ไม่มีคำแปลตรงตัว") || text.length > MAX_MEANING_LENGTH) return null;
  return text;
}

const glossesOf = (text) => text.split(/,\s*/);

function withAnswer(answer, wrong) {
  const options = shuffle([{ text: answer, correct: true }, ...wrong.map((text) => ({ text, correct: false }))]);
  return { options, answerIndex: options.findIndex((option) => option.correct), answerText: answer };
}

// เลือกคำแปลที่ถูก: ตัวหลอกมาจากคำอื่นที่ชนิดคำเหมือนกันก่อน และไม่มีคำแปลซ้ำหรือทับกับคำตอบ
export function choiceQuestion(word, pool, rng = Math.random) {
  const answer = meaningOf(word);
  if (!answer) return null;
  const answerGlosses = new Set(glossesOf(answer));
  const pos = word.senses[0].pos;
  const candidates = pool
    .filter((other) => other.headword !== word.headword)
    .map((other) => ({ pos: other.senses[0]?.pos, text: meaningOf(other) }))
    .filter((candidate) => candidate.text && !glossesOf(candidate.text).some((gloss) => answerGlosses.has(gloss)));
  const ordered = [
    ...shuffle(candidates.filter((candidate) => candidate.pos === pos), rng),
    ...shuffle(candidates.filter((candidate) => candidate.pos !== pos), rng),
  ];
  const wrong = [];
  for (const candidate of ordered) {
    if (wrong.length === OPTION_COUNT - 1) break;
    if (!wrong.includes(candidate.text)) wrong.push(candidate.text);
  }
  if (wrong.length < OPTION_COUNT - 1) return null;
  return { type: "choice", ...withAnswer(answer, wrong) };
}

// รูปของคำที่ปรากฏในประโยคเทียบกับคำหลัก ใช้เลือกตัวหลอกให้หน้าตาคล้ายกัน (คำตอบจะได้ไม่โดดเด่น)
export function shapeOf(token, headword) {
  const lower = token.toLowerCase();
  if (lower === headword.toLowerCase()) return "base";
  if (lower.endsWith("ing")) return "ing";
  if (lower.endsWith("ed")) return "ed";
  if (lower.endsWith("s")) return "s";
  return "other";
}

// หาคำที่จะเว้นว่างในประโยคตัวอย่าง (คำหลักหรือรูปคำอื่นของมัน ยาวอย่างน้อย 3 ตัวอักษร และไม่ใช่ส่วนของคำย่อ เช่น don't)
export function findBlank(word) {
  const sentence = word.exampleEn;
  const wanted = new Set([word.headword, ...word.forms].map((form) => form.toLowerCase()));
  for (const match of sentence.matchAll(/[A-Za-z]+/g)) {
    const token = match[0];
    const before = sentence[match.index - 1];
    const after = sentence[match.index + token.length];
    if (token.length < 3 || !wanted.has(token.toLowerCase())) continue;
    if ("'’".includes(before || " ") || "'’".includes(after || " ")) continue;
    const shape = shapeOf(token, word.headword);
    if (shape === "other") return null; // รูปไม่ปกติ (เช่น are ของ be) ตัวหลอกจะหน้าตาไม่เหมือนกัน ไม่ถามแบบเติมคำ
    return { before: sentence.slice(0, match.index), answer: token, after: sentence.slice(match.index + token.length), shape };
  }
  return null;
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// เติมคำในประโยค: ตัวหลอกเป็นคำอื่นรูปเดียวกัน (คำหลัก / -s / -ing / -ed) ชนิดคำเดียวกันก่อน
export function clozeQuestion(word, pool, rng = Math.random) {
  const blank = findBlank(word);
  if (!blank) return null;
  const pos = word.senses[0]?.pos;
  const capital = blank.answer[0] !== blank.answer[0].toLowerCase();
  const shown = (text) => (capital ? capitalize(text) : text);

  const variants = (other) =>
    [other.headword, ...other.forms].filter((form) => /^[a-z]{3,}$/.test(form) && shapeOf(form, other.headword) === blank.shape);
  const own = new Set([word.headword, ...word.forms].map((form) => form.toLowerCase()));
  const candidates = pool
    .filter((other) => other.headword !== word.headword)
    .map((other) => ({ pos: other.senses[0]?.pos, text: variants(other)[0] }))
    .filter((candidate) => candidate.text && !own.has(candidate.text));
  const ordered = [
    ...shuffle(candidates.filter((candidate) => candidate.pos === pos), rng),
    ...shuffle(candidates.filter((candidate) => candidate.pos !== pos), rng),
  ];
  const wrong = [];
  for (const candidate of ordered) {
    if (wrong.length === OPTION_COUNT - 1) break;
    if (!wrong.includes(candidate.text)) wrong.push(candidate.text);
  }
  if (wrong.length < OPTION_COUNT - 1) return null;
  return {
    type: "cloze",
    before: blank.before,
    after: blank.after,
    ...withAnswer(blank.answer, wrong.map(shown)),
  };
}

// คำถามของการ์ดใบนี้ (null = ให้ใช้การ์ดพลิกแบบเดิม)
export function buildQuestion(word, cardState, pool, rng = Math.random) {
  if (!cardState) return null;
  const makers = stageIndex(cardState) >= 2 ? [clozeQuestion, choiceQuestion] : [choiceQuestion];
  for (const make of makers) {
    const question = make(word, pool, rng);
    if (question) return question;
  }
  return null;
}
