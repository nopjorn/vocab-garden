// ระบบทวนตามช่วงเวลา (spaced repetition) แบบ SM-2 ฉบับย่อ
// สถานะของการ์ด: { due, ivl, ease, reps, lapses }
//   due  = วันที่ต้องทวน (นับเป็นเลขวัน ดู dayNumber)
//   ivl  = ระยะห่างการทวนเป็นวัน (0 = กำลังเรียนอยู่ในรอบนี้)
//   reps = จำนวนครั้งที่ตอบ "พอจำได้" หรือ "จำได้แม่น"

export const AGAIN = 1; // ยังจำไม่ได้
export const HARD = 2; // พอจำได้
export const GOOD = 3; // จำได้แม่น

const START_EASE = 2.5;
const MIN_EASE = 1.3;
const DAY_START_HOUR = 4; // วันใหม่เริ่มตอนตี 4 ตามเวลาเครื่อง

// เลขวันตามเวลาเครื่อง โดยนับว่าก่อนตี 4 ยังเป็นวันเดิม
export function dayNumber(date = new Date()) {
  const shifted = new Date(date.getTime() - DAY_START_HOUR * 3600 * 1000);
  return Math.floor(Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()) / 86400000);
}

export function grade(state, rating, today) {
  const card = state ? { ...state } : { due: today, ivl: 0, ease: START_EASE, reps: 0, lapses: 0 };

  if (rating === AGAIN) {
    if (card.ivl > 0) {
      card.lapses += 1;
      card.ease = Math.max(MIN_EASE, card.ease - 0.2);
    }
    card.ivl = 0;
  } else if (card.ivl === 0) {
    // คำใหม่ หรือคำที่เพิ่งลืมแล้วกำลังทวนใหม่
    const isNew = card.reps === 0 && card.lapses === 0;
    card.ivl = rating === GOOD && isNew ? 3 : 1;
    card.reps += 1;
  } else if (rating === HARD) {
    card.ivl = Math.max(1, Math.round(card.ivl * 1.2));
    card.ease = Math.max(MIN_EASE, card.ease - 0.15);
    card.reps += 1;
  } else {
    card.ivl = Math.max(card.ivl + 1, Math.round(card.ivl * card.ease));
    card.reps += 1;
  }

  card.due = today + card.ivl;
  return card;
}

// คำที่ผู้เรียนรู้อยู่แล้ว กด "รู้แล้ว" ข้ามไปเป็นต้นไม้ใหญ่ทันที (ทวนอีกทีในอีก 30 วัน)
export const KNOWN_IVL = 30;

export function knownCard(state, today) {
  const card = state ? { ...state } : { due: today, ivl: 0, ease: START_EASE, reps: 0, lapses: 0 };
  card.ivl = Math.max(KNOWN_IVL, card.ivl);
  card.reps += 1;
  card.due = today + card.ivl;
  return card;
}

export function isDue(state, today) {
  return Boolean(state) && state.due <= today;
}

// ระยะของต้นไม้ในสวน
export const STAGES = [
  { id: "seed", emoji: "🌰", label: "เมล็ด" },
  { id: "sprout", emoji: "🌱", label: "ต้นอ่อน" },
  { id: "growing", emoji: "🌿", label: "กำลังโต" },
  { id: "tree", emoji: "🌳", label: "ต้นไม้ใหญ่" },
];

export function stageOf(state) {
  if (!state) return STAGES[0];
  if (state.ivl < 7) return STAGES[1];
  if (state.ivl < 21) return STAGES[2];
  return STAGES[3];
}

// คิวการ์ดของรอบนี้: คำที่ถึงกำหนดทวนก่อน (ค้างนานสุดก่อน) แล้วจึงเป็นคำใหม่ตามลำดับ NGSL
// freshWords = กลุ่มคำที่เลือกคำใหม่ได้ (ค่าเริ่มต้นคือทุกคำใน words)
// dueLimit = ทวนได้อีกไม่เกินกี่ใบ (ค่าเริ่มต้นไม่จำกัด) ถ้าคำค้างเกินกว่านี้ จะทวนเฉพาะที่ค้างนานสุดก่อน
// และงดคำใหม่ไว้จนกว่าคำค้างจะเบาลง
export function buildQueue(words, cards, today, newLimit, freshWords = words, dueLimit = Infinity) {
  const dueAll = words
    .filter((word) => isDue(cards[word.headword], today))
    .sort((a, b) => cards[a.headword].due - cards[b.headword].due || a.order - b.order);
  const backlog = dueAll.length > dueLimit;
  const fresh = backlog ? [] : freshWords.filter((word) => !cards[word.headword]).slice(0, Math.max(0, newLimit));
  return [...dueAll.slice(0, dueLimit), ...fresh];
}
