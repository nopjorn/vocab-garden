// ฟังทวนระหว่างเดินทาง: อ่านคำอังกฤษ เว้นจังหวะ แล้วอ่านความหมายไทย วนไปเรื่อย ๆ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ใช้เสียงอ่านของเครื่อง (Web Speech API) จึงไม่มีไฟล์เสียงและไม่ติดเรื่อง license · ไม่เปลี่ยนวันทวนของคำ

import { shuffle } from "./quiz.js";
import { isDue } from "./srs.js";

export const COMMUTE_PLAY_AFTER = 10; // ฟังครบกี่คำถึงนับเป็นการเล่นเกม 1 รอบของวันนั้น (ต่อวันท่องต่อเนื่องและภารกิจ)
export const MAX_SENSES = 2;

// ลำดับคำที่จะฟัง: คำที่ถึงเวลาทวน → คำอื่นที่ปลูกแล้ว (สองกลุ่มนี้สลับลำดับกันเอง) → คำที่ยังไม่ปลูก เรียงตามอันดับความถี่
// (คนที่เพิ่งเริ่มจึงได้ฟังคำที่ใช้บ่อยที่สุดก่อน)
export function buildPlaylist(words, cards, day, rng = Math.random) {
  const due = [];
  const planted = [];
  const fresh = [];
  for (const word of words) {
    const card = cards[word.headword];
    if (!card) fresh.push(word);
    else if (isDue(card, day)) due.push(word);
    else planted.push(word);
  }
  return [...shuffle(due, rng), ...shuffle(planted, rng), ...fresh.sort((a, b) => a.rank - b.rank)];
}

// ความหมายไทยสำหรับอ่านออกเสียง: ความหมายแรกของแต่ละชนิดคำ ไม่เกิน MAX_SENSES ข้อ
export function thaiLine(word) {
  return word.senses
    .slice(0, MAX_SENSES)
    .map((sense) => sense.text.trim())
    .filter(Boolean)
    .join(" , ");
}

// ขั้นตอนของคำหนึ่งคำ: [{ text, lang, after }] after = เว้นกี่วินาทีหลังอ่านจบ
// thai = เครื่องมีเสียงไทยไหม (ไม่มี = ข้ามขั้นอ่านไทย แต่หน้าจอยังแสดงความหมาย)
export function stepsFor(word, { thai = true, example = false, pause = 2 } = {}) {
  const steps = [{ part: "word", text: word.headword, lang: "en-US", after: pause }];
  const meaning = thaiLine(word);
  if (thai && meaning) steps.push({ part: "meaning", text: meaning, lang: "th-TH", after: 1 });
  if (example && word.exampleEn) steps.push({ part: "example", text: word.exampleEn, lang: "en-US", after: 1 });
  steps[steps.length - 1].after += 1; // เว้นก่อนขึ้นคำใหม่นานขึ้นอีกนิด
  return steps;
}

// รอเสียงอ่านจบนานสุดกี่ ms (บางเบราว์เซอร์ไม่ส่ง onend มา ต้องไปต่อเอง)
export function speechTimeout(text, rate = 1) {
  return Math.round((2500 + text.length * 180) / Math.max(rate, 0.5));
}
