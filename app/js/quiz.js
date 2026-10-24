// สร้างคำถามสำหรับโหมดทวนแบบผสม (ตรรกะล้วน ไม่แตะหน้าเว็บ)
//   🌱 ต้นอ่อน  → เลือกคำแปลภาษาไทย 4 ตัวเลือก
//   🌿 กำลังโต  → เติมคำในประโยคตัวอย่าง (เลือกจาก 4 ตัวเลือก) ถ้าประโยคของคำนั้นเติมไม่ได้ก็ใช้แบบเลือกคำแปล
//   🌳 ต้นไม้ใหญ่ → ดูคำแปลไทยแล้วพิมพ์คำอังกฤษเอง (ปิดได้ในตั้งค่า) ถ้าคำนั้นไม่เหมาะก็ใช้แบบเติมคำ
// คำใหม่ที่ยังไม่เคยเห็นไม่ถูกถามในโหมดนี้ ให้ดูการ์ดก่อนเสมอ (buildQuestion คืน null)
// ตอบถูก = จำได้แม่น · ตอบผิดหรือกดไม่รู้ = ยังจำไม่ได้ (ตัดสินใน main.js)

import { stageIndex } from "./celebrate.js";
import { AGAIN, GOOD, HARD } from "./srs.js";

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

// ระยะห่างการสะกด (จำนวนตัวอักษรที่ต้องแก้ เพิ่ม หรือลบ) ใช้จับคำที่พิมพ์ผิดนิดเดียว
export function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

// พิมพ์คำอังกฤษจากคำแปลไทย: ใช้เฉพาะคำที่คำแปลชี้ไปที่คำเดียวจริง ๆ
// ถ้ามีคำอื่นในกลุ่มที่แปลทับกัน (เช่น กับ ของ and และ with) ตอบได้หลายคำ จึงไม่ถามแบบนี้
export function typeQuestion(word, pool) {
  const meaning = meaningOf(word);
  if (!meaning || !/^[A-Za-z]{3,}$/.test(word.headword)) return null;
  const glosses = new Set(glossesOf(meaning));
  const ambiguous = pool.some((other) => {
    if (other.headword === word.headword) return false;
    const otherMeaning = meaningOf(other);
    return otherMeaning && glossesOf(otherMeaning).some((gloss) => glosses.has(gloss));
  });
  if (ambiguous) return null;
  const accepted = [word.headword, ...word.forms].map((form) => form.toLowerCase()).filter((form) => /^[a-z]{2,}$/.test(form));
  return {
    type: "type",
    prompt: meaning,
    posLabel: word.senses[0].label,
    answerText: word.headword,
    accepted: [...new Set(accepted)],
  };
}

const normalizeTyped = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/, "");

// ตรวจคำที่พิมพ์ ถูก (ไม่ใช้ใบ้ = จำได้แม่น, ใช้ใบ้ = พอจำได้) · เกือบถูก (สะกดผิดหนึ่งตัวในคำยาว 5 ตัวขึ้นไป = พอจำได้) · ผิด (ยังจำไม่ได้)
export function gradeTyped(question, input, hinted = false) {
  const typed = normalizeTyped(input);
  if (question.accepted.includes(typed)) return { result: "correct", rating: hinted ? HARD : GOOD };
  if (question.accepted.some((form) => form.length >= 5 && editDistance(typed, form) === 1)) {
    return { result: "close", rating: HARD };
  }
  return { result: "wrong", rating: AGAIN };
}

// คำถามของการ์ดใบนี้ (null = ให้ใช้การ์ดพลิกแบบเดิม) typing = เปิดให้ต้นไม้ใหญ่พิมพ์คำตอบเอง
export function buildQuestion(word, cardState, pool, rng = Math.random, { typing = true } = {}) {
  if (!cardState) return null;
  const stage = stageIndex(cardState);
  const makers = stage >= 3 && typing ? [typeQuestion, clozeQuestion, choiceQuestion] : stage >= 2 ? [clozeQuestion, choiceQuestion] : [choiceQuestion];
  for (const make of makers) {
    const question = make(word, pool, rng);
    if (question) return question;
  }
  return null;
}
