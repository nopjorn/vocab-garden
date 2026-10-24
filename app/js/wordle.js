// เกมทายคำปริศนาวันละข้อ: เดาคำ 5 ตัวอักษรภายใน 6 ครั้ง (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ทุกคนได้คำเดียวกันในวันเดียวกัน เลือกจากเลขวัน จึงไม่ต้องมีเซิร์ฟเวอร์
// คำตอบมาจากคำที่แปลแล้ว ส่วนคำที่พิมพ์เดาได้คือคำหลักและรูปคำ 5 ตัวอักษรของ NGSL ทั้งหมด

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
const FIVE = /^[a-z]{5}$/;

const lower = (text) => text.toLowerCase();

// คำที่เป็นคำตอบได้: แปลแล้ว และคำหลักมี 5 ตัวอักษร
export function answerPool(words) {
  return words.filter((word) => word.translated && FIVE.test(lower(word.headword)));
}

// คำที่พิมพ์เดาได้ (คำหลักและรูปคำ 5 ตัวอักษรของทุกคำ รวมคำที่ยังไม่แปล)
export function guessSet(words) {
  const guesses = new Set();
  for (const word of words) {
    for (const form of [word.headword, ...word.forms]) {
      if (FIVE.test(lower(form))) guesses.add(lower(form));
    }
  }
  return guesses;
}

// คำตอบของวันนั้น (ผสมเลขวันให้คำเรียงไม่เป็นลำดับ ค่าเดียวกันทุกเครื่อง)
export function dailyAnswer(pool, day) {
  if (pool.length === 0) return null;
  const mixed = Math.imul((day ^ 0x9e3779b1) >>> 0, 2654435761) >>> 0;
  return pool[mixed % pool.length];
}

// ให้คะแนนการเดา: correct = ถูกที่ · present = มีในคำแต่ผิดที่ · absent = ไม่มี (จัดการตัวอักษรซ้ำแบบมาตรฐาน)
export function scoreGuess(guess, answer) {
  const result = Array(WORD_LENGTH).fill("absent");
  const left = {};
  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (guess[index] === answer[index]) result[index] = "correct";
    else left[answer[index]] = (left[answer[index]] || 0) + 1;
  }
  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (result[index] === "correct") continue;
    if (left[guess[index]] > 0) {
      result[index] = "present";
      left[guess[index]] -= 1;
    }
  }
  return result;
}

const RANK = { absent: 1, present: 2, correct: 3 };

// สถานะที่ดีที่สุดของแต่ละตัวอักษรบนคีย์บอร์ด
export function keyStates(guesses, answer) {
  const states = {};
  for (const guess of guesses) {
    scoreGuess(guess, answer).forEach((status, index) => {
      const letter = guess[index];
      if (!states[letter] || RANK[status] > RANK[states[letter]]) states[letter] = status;
    });
  }
  return states;
}

const SQUARE = { correct: "🟩", present: "🟨", absent: "⬛" };

// ข้อความแชร์ผล (ไม่บอกคำตอบ)
export function shareText(guesses, answer, day, won) {
  const date = new Date(day * 86400000);
  const label = `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
  const rows = guesses.map((guess) => scoreGuess(guess, answer).map((status) => SQUARE[status]).join(""));
  return [`🌱 Vocab Garden · ทายคำปริศนา ${label} ${won ? guesses.length : "X"}/${MAX_GUESSES}`, ...rows].join("\n");
}

// สถิติรวม: เล่นกี่ครั้ง ชนะกี่ครั้ง ชนะติดกันกี่วัน (นับเฉพาะวันที่ชนะต่อเนื่อง)
export function nextStats(stats, day, won) {
  const base = { played: 0, won: 0, streak: 0, best: 0, lastWon: null, ...stats };
  const next = { ...base, played: base.played + 1 };
  if (won) {
    next.won += 1;
    next.streak = base.lastWon === day - 1 ? base.streak + 1 : 1;
    next.best = Math.max(base.best, next.streak);
    next.lastWon = day;
  } else {
    next.streak = 0;
  }
  return next;
}
