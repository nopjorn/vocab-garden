// เรื่องสั้นจากคำที่ปลูกแล้ว 📖 (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// เรื่องอยู่ใน data/stories.json แต่งขึ้นเองทั้งหมด (CC BY-SA 4.0) ตรวจรูปแบบด้วย scripts/validate_data.py
// ไม่ล็อกเรื่องไหนไว้ อ่านได้ทุกเรื่อง แค่บอกว่าปลูกคำสำคัญของเรื่องไปแล้วกี่คำ และเรียงเรื่องที่พร้อมอ่านขึ้นก่อน

import { shuffle } from "./quiz.js";

// ปลูกคำสำคัญของเรื่องแล้วกี่คำ (ready = ครบทุกคำ)
export function storyReadiness(story, cards) {
  const planted = story.words.filter((headword) => cards[headword]).length;
  return { planted, total: story.words.length, ready: planted === story.words.length };
}

// เรียงเรื่อง: ยังไม่อ่านก่อนอ่านแล้ว แล้วเรียงตามสัดส่วนคำที่ปลูกแล้ว (มากก่อน) เท่ากันคงลำดับเดิมในไฟล์
export function sortStories(stories, cards, read = {}) {
  return stories
    .map((story, index) => ({ story, index, done: story.id in read, share: storyReadiness(story, cards).planted / story.words.length }))
    .sort((a, b) => a.done - b.done || b.share - a.share || a.index - b.index)
    .map((entry) => entry.story);
}

export function readinessText({ planted, total, ready }) {
  if (ready) return `🌳 พร้อมอ่าน ปลูกคำในเรื่องครบ ${total} คำแล้ว`;
  if (planted === 0) return `ยังไม่ได้ปลูกคำในเรื่องนี้ (${total} คำ) อ่านได้เลย หรือปลูกก่อนก็ได้`;
  return `ปลูกคำในเรื่องแล้ว ${planted}/${total} คำ`;
}

// รูปคำทั้งหมดของคำสำคัญ → คำหลัก (ตัวพิมพ์เล็ก) ใช้ไฮไลต์คำในเรื่อง
export function formIndex(story, wordsByHeadword) {
  const index = new Map();
  for (const headword of story.words) {
    const word = wordsByHeadword.get(headword);
    for (const form of [headword, ...(word?.forms || [])]) index.set(form.toLowerCase(), headword);
  }
  return index;
}

// แยกข้อความเป็นช่วง ๆ: [{ text, headword }] headword = คำสำคัญที่ตรงกับช่วงนั้น (ไม่ใช่คำสำคัญ = null)
export function splitStory(text, index) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(/[A-Za-z]+/g)) {
    const headword = index.get(match[0].toLowerCase());
    if (!headword) continue;
    if (match.index > last) parts.push({ text: text.slice(last, match.index), headword: null });
    parts.push({ text: match[0], headword });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), headword: null });
  return parts;
}

// คำถามท้ายเรื่อง: สลับตัวเลือก คืน { q, options, answerIndex }
export function storyQuestions(story, rng = Math.random) {
  return story.questions.map((question) => {
    const options = shuffle(question.options.map((text, index) => ({ text, correct: index === question.answer })), rng);
    return { q: question.q, options: options.map((option) => option.text), answerIndex: options.findIndex((option) => option.correct) };
  });
}

export function storyResult(right, total) {
  if (right === total) return `ตอบถูกครบ ${total} ข้อ เข้าใจเรื่องนี้ทะลุปรุโปร่ง 🎉`;
  if (right === 0) return `ยังไม่ถูกสักข้อ ไม่เป็นไรนะ ลองกด "แสดงคำแปล" แล้วอ่านอีกรอบ`;
  return `ตอบถูก ${right} จาก ${total} ข้อ เก่งมาก!`;
}
