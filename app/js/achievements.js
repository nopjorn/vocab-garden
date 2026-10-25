// เหรียญความสำเร็จ: เป็นรางวัลชวนให้สนุกเท่านั้น ไม่ได้ล็อกคำศัพท์หรือฟีเจอร์ไว้ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// context ที่ใช้ตัดสิน:
//   planted trees        = จำนวนคำที่เริ่มเรียนแล้ว / ที่เป็นต้นไม้ใหญ่
//   bestStreak           = สตรีคที่ยาวที่สุด
//   notes                = จำนวนโน้ตช่วยจำที่เขียน
//   gamePlays wordleWins matchBest(ms) scrambleBest = สถิติเกมในแท็บ เล่น
//   examTier = ระดับเหรียญของการสอบปลายแปลงที่เพิ่งจบ (bronze / silver / gold ไม่ผ่าน = null)
//   perfectRound earlyBird comeback = เหตุการณ์ตอนจบรอบ (ไม่เก็บถาวร ตัดสินตอนจบรอบเท่านั้น)

export const MEDALS = [
  { id: "plant-1", emoji: "🌱", title: "ปลูกคำแรก", desc: "เริ่มเรียนคำแรกของคุณ", test: (c) => c.planted >= 1 },
  { id: "plant-50", emoji: "🌿", title: "สวนเล็ก ๆ", desc: "ปลูกครบ 50 ต้น", test: (c) => c.planted >= 50 },
  { id: "plant-100", emoji: "🪴", title: "สวนกำลังงาม", desc: "ปลูกครบ 100 ต้น", test: (c) => c.planted >= 100 },
  { id: "plant-200", emoji: "🌻", title: "สวนเต็มแปลง", desc: "ปลูกครบ 200 ต้น", test: (c) => c.planted >= 200 },
  { id: "tree-1", emoji: "🌳", title: "ต้นไม้ใหญ่ต้นแรก", desc: "มีคำที่โตเป็นต้นไม้ใหญ่ต้นแรก", test: (c) => c.trees >= 1 },
  { id: "tree-50", emoji: "🏞️", title: "ป่าเล็ก ๆ", desc: "มีต้นไม้ใหญ่ครบ 50 ต้น", test: (c) => c.trees >= 50 },
  { id: "streak-3", emoji: "🔥", title: "ติดลม", desc: "ท่องติดกัน 3 วัน", test: (c) => c.bestStreak >= 3 },
  { id: "streak-7", emoji: "⚡", title: "หนึ่งสัปดาห์เต็ม", desc: "ท่องติดกัน 7 วัน", test: (c) => c.bestStreak >= 7 },
  { id: "streak-30", emoji: "👑", title: "ราชาแห่งความต่อเนื่อง", desc: "ท่องติดกัน 30 วัน", test: (c) => c.bestStreak >= 30 },
  { id: "perfect-round", emoji: "🎯", title: "ไม่พลาดเลย", desc: "จบรอบที่ทวนอย่างน้อย 10 ใบโดยไม่ตอบ \"ยังจำไม่ได้\" สักครั้ง", test: (c) => c.perfectRound },
  { id: "early-bird", emoji: "🌅", title: "นกตื่นเช้า", desc: "ท่องจบรอบก่อน 8 โมงเช้า", test: (c) => c.earlyBird },
  { id: "comeback", emoji: "🤗", title: "ยินดีต้อนรับกลับ", desc: "กลับมาท่องจบรอบหลังหายไป 7 วันขึ้นไป", test: (c) => c.comeback },
  { id: "first-note", emoji: "📝", title: "นักจดช่วยจำ", desc: "เขียนโน้ตช่วยจำแรก", test: (c) => c.notes >= 1 },
  { id: "first-game", emoji: "🎮", title: "นักเล่นหน้าใหม่", desc: "เล่นเกมในแท็บ เล่น จบหนึ่งรอบ", test: (c) => c.gamePlays >= 1 },
  { id: "wordle-win", emoji: "🔤", title: "นักเดาคำ", desc: "ทายคำปริศนาถูกหนึ่งครั้ง", test: (c) => c.wordleWins >= 1 },
  { id: "match-fast", emoji: "⏱️", title: "มือไว", desc: "จับคู่คำให้เสร็จภายใน 20 วินาที", test: (c) => c.matchBest !== null && c.matchBest <= 20000 },
  { id: "exam-first", emoji: "🎓", title: "นักสอบ", desc: "สอบปลายแปลงผ่านครั้งแรก (ได้เหรียญทองแดงขึ้นไป)", test: (c) => c.examTier !== null },
  { id: "exam-gold", emoji: "🥇", title: "ยอดเยี่ยม", desc: "สอบปลายแปลงได้เหรียญทอง", test: (c) => c.examTier === "gold" },
  { id: "scramble-perfect", emoji: "🧠", title: "เรียงเก่ง", desc: "เรียงตัวอักษรได้เต็ม 10 แต้ม", test: (c) => c.scrambleBest >= 10 },
];

export const EMPTY_CONTEXT = {
  planted: 0,
  trees: 0,
  bestStreak: 0,
  notes: 0,
  gamePlays: 0,
  wordleWins: 0,
  matchBest: null,
  scrambleBest: 0,
  examTier: null,
  perfectRound: false,
  earlyBird: false,
  comeback: false,
};

// เหรียญที่ได้ใหม่ตอนนี้ (ที่ยังไม่เคยได้) เรียงตามลำดับใน MEDALS
export function newMedals(context, unlocked) {
  const full = { ...EMPTY_CONTEXT, ...context };
  return MEDALS.filter((medal) => !(medal.id in unlocked) && medal.test(full));
}

// ก่อน 8 โมงเช้า แต่หลังตี 4 (วันใหม่ของแอปเริ่มตอนตี 4) ตามเวลาเครื่อง
export const isEarlyBird = (hour) => hour >= 4 && hour < 8;

// รอบที่ทวนอย่างน้อย minAnswers ใบโดยไม่เคยตอบ "ยังจำไม่ได้"
export const isPerfectRound = (answered, hadAgain, minAnswers = 10) => answered >= minAnswers && !hadAgain;

export const COMEBACK_DAYS = 7;
