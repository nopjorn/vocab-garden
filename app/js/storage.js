// เก็บความคืบหน้าและการตั้งค่าใน localStorage
// คีย์ทุกตัวขึ้นต้นด้วย vg: เพราะทุก repo ใต้ nopjorn.github.io ใช้ storage ร่วมกัน
// ความคืบหน้าผูกกับคำหลัก (ไม่ใช่อันดับ) เพื่อรองรับ NGSL เวอร์ชันใหม่

export const SCHEMA = 1;
const KEYS = {
  progress: "vg:progress",
  settings: "vg:settings",
  daily: "vg:daily",
  history: "vg:history",
  seenVersion: "vg:seen-version",
  rest: "vg:rest",
  notes: "vg:notes",
  games: "vg:games",
  medals: "vg:medals",
};
const HISTORY_KEEP_DAYS = 400; // เก็บประวัติการทวนรายวันย้อนหลังไม่เกินนี้
export const SPEECH_RATE_CHOICES = [0.7, 0.9, 1.1]; // ช้า / ปกติ / เร็ว
export const THEME_CHOICES = ["auto", "light", "dark"];
export const TEXT_SIZE_CHOICES = ["normal", "large"];
export const QUIZ_MODE_CHOICES = ["flip", "mixed"]; // พลิกการ์ดแบบเดิม / ผสมหลายแบบตามระยะของต้นไม้
export const NOTE_MAX = 200; // โน้ตช่วยจำยาวได้ไม่เกินกี่ตัวอักษร
export const DAILY_GOAL_CHOICES = [10, 20, 30]; // เป้าหมายรายวัน (จำนวนครั้งที่ตอบ)
export const REVIEW_CAP_CHOICES = [50, 100, 0]; // ทวนได้ไม่เกินกี่ครั้งต่อวัน (0 = ไม่จำกัด)
export const DEFAULT_SETTINGS = {
  newPerDay: 10,
  startLevel: 1,
  autoSpeak: false,
  speechRate: 0.9,
  theme: "auto",
  textSize: "normal",
  sound: false,
  dailyGoal: 10,
  reviewCap: 100,
  quizMode: "flip",
  quizTyping: true,
};
export const LAST_LEVEL = 28;
export const NEW_PER_DAY_CHOICES = [5, 10, 20];

function memoryStore() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

// บางเบราว์เซอร์ (เช่นโหมดส่วนตัว) ใช้ localStorage ไม่ได้ ให้เก็บในหน่วยความจำแทน
function usableStore(store) {
  try {
    store.setItem("vg:test", "1");
    store.removeItem("vg:test");
    return { store, persistent: true };
  } catch {
    return { store: memoryStore(), persistent: false };
  }
}

function isCardState(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    ["due", "ivl", "ease", "reps", "lapses"].every((key) => Number.isFinite(value[key]))
  );
}

function validCards(cards) {
  if (cards === null || typeof cards !== "object" || Array.isArray(cards)) return null;
  return Object.values(cards).every(isCardState) ? cards : null;
}

// ประวัติการทวนรายวัน { [เลขวัน]: จำนวนครั้ง } ต้องเป็นจำนวนเต็มไม่ติดลบ
function validHistory(days) {
  if (days === null || typeof days !== "object" || Array.isArray(days)) return null;
  const ok = Object.entries(days).every(
    ([day, count]) => Number.isInteger(Number(day)) && Number.isInteger(count) && count >= 0,
  );
  return ok ? days : null;
}

// โน้ตช่วยจำ { [คำหลัก]: ข้อความ } เก็บเฉพาะข้อความที่ไม่ว่างและตัดให้ไม่เกิน NOTE_MAX (ไม่ใช่ object = null)
function validNotes(notes) {
  if (notes === null || typeof notes !== "object" || Array.isArray(notes)) return null;
  const clean = {};
  for (const [headword, text] of Object.entries(notes)) {
    if (headword !== "__proto__" && headword.length <= 64 && typeof text === "string" && text.trim()) {
      clean[headword] = text.trim().slice(0, NOTE_MAX);
    }
  }
  return clean;
}

// เหรียญที่ได้แล้ว { [รหัสเหรียญ]: เลขวันที่ได้ } เหรียญไม่หาย แม้เงื่อนไขเปลี่ยนภายหลัง
function validMedals(medals) {
  if (medals === null || typeof medals !== "object" || Array.isArray(medals)) return null;
  const clean = {};
  for (const [id, day] of Object.entries(medals)) {
    if (/^[a-z0-9-]{1,30}$/.test(id) && Number.isInteger(day)) clean[id] = day;
  }
  return clean;
}

// ข้อมูลเกม { days: { [เลขวัน]: จำนวนรอบที่เล่น }, best: { [ชื่อเกม]: สถิติ } } ส่วนที่ผิดรูปแบบถูกตัดทิ้ง
function validGames(games) {
  if (games === null || typeof games !== "object" || Array.isArray(games)) return null;
  const days = validHistory(games.days) || {};
  const best = {};
  if (games.best && typeof games.best === "object" && !Array.isArray(games.best)) {
    for (const [name, value] of Object.entries(games.best)) {
      if (/^[a-z]{1,20}$/.test(name) && Number.isFinite(value) && value > 0) best[name] = value;
    }
  }
  const result = { days, best };
  // เกมทายคำปริศนาของวันนี้ และสถิติรวม (มีเมื่อเคยเล่นเท่านั้น)
  const w = games.wordle;
  if (
    w && Number.isInteger(w.day) && /^[a-z]{5}$/.test(w.answer) && Array.isArray(w.guesses) && w.guesses.length <= 6 &&
    w.guesses.every((guess) => /^[a-z]{5}$/.test(guess)) && ["playing", "won", "lost"].includes(w.status)
  ) {
    result.wordle = { day: w.day, answer: w.answer, guesses: w.guesses, status: w.status };
  }
  const t = games.wordleStats;
  if (t && ["played", "won", "streak", "best"].every((key) => Number.isInteger(t[key]) && t[key] >= 0) && (t.lastWon === null || Number.isInteger(t.lastWon))) {
    result.wordleStats = { played: t.played, won: t.won, streak: t.streak, best: t.best, lastWon: t.lastWon };
  }
  return result;
}

// สถานะวันพัก { bank, run, upTo, frozen } (ดู habit.js) ต้องเป็นจำนวนเต็มทั้งหมด
function validRest(rest) {
  if (rest === null || typeof rest !== "object" || Array.isArray(rest)) return null;
  const whole = (value) => Number.isInteger(value) && value >= 0;
  const ok =
    whole(rest.bank) &&
    whole(rest.run) &&
    (rest.upTo === null || Number.isInteger(rest.upTo)) &&
    Array.isArray(rest.frozen) &&
    rest.frozen.every(Number.isInteger);
  return ok ? { bank: rest.bank, run: rest.run, upTo: rest.upTo, frozen: rest.frozen } : null;
}

export function createStorage(store = globalThis.localStorage) {
  const { store: target, persistent } = usableStore(store);

  const read = (key, fallback) => {
    try {
      const raw = target.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => target.setItem(key, JSON.stringify(value));

  return {
    persistent,

    loadCards() {
      const saved = read(KEYS.progress, null);
      return (saved && saved.schema === SCHEMA && validCards(saved.cards)) || {};
    },
    saveCards(cards) {
      write(KEYS.progress, { schema: SCHEMA, cards });
    },

    loadSettings() {
      const saved = read(KEYS.settings, {});
      const newPerDay = NEW_PER_DAY_CHOICES.includes(saved.newPerDay) ? saved.newPerDay : DEFAULT_SETTINGS.newPerDay;
      const startLevel =
        Number.isInteger(saved.startLevel) && saved.startLevel >= 1 && saved.startLevel <= LAST_LEVEL
          ? saved.startLevel
          : DEFAULT_SETTINGS.startLevel;
      const pick = (choices, value, fallback) => (choices.includes(value) ? value : fallback);
      return {
        newPerDay,
        startLevel,
        autoSpeak: saved.autoSpeak === true,
        speechRate: pick(SPEECH_RATE_CHOICES, saved.speechRate, DEFAULT_SETTINGS.speechRate),
        theme: pick(THEME_CHOICES, saved.theme, DEFAULT_SETTINGS.theme),
        textSize: pick(TEXT_SIZE_CHOICES, saved.textSize, DEFAULT_SETTINGS.textSize),
        sound: saved.sound === true,
        dailyGoal: pick(DAILY_GOAL_CHOICES, saved.dailyGoal, DEFAULT_SETTINGS.dailyGoal),
        reviewCap: pick(REVIEW_CAP_CHOICES, saved.reviewCap, DEFAULT_SETTINGS.reviewCap),
        quizMode: pick(QUIZ_MODE_CHOICES, saved.quizMode, DEFAULT_SETTINGS.quizMode),
        quizTyping: saved.quizTyping !== false,
      };
    },
    saveSettings(settings) {
      write(KEYS.settings, settings);
    },

    // เลขเวอร์ชันล่าสุดที่เคยเปิดแอป ใช้ตัดสินว่าต้องแสดง "มีอะไรใหม่" ไหม
    loadSeenVersion() {
      const saved = read(KEYS.seenVersion, null);
      return typeof saved === "string" && /^\d+\.\d+\.\d+$/.test(saved) ? saved : null;
    },
    saveSeenVersion(version) {
      write(KEYS.seenVersion, version);
    },

    loadHistory() {
      const saved = read(KEYS.history, null);
      return (saved && saved.schema === SCHEMA && validHistory(saved.days)) || {};
    },
    saveHistory(days) {
      write(KEYS.history, { schema: SCHEMA, days });
    },
    // นับการทวนหนึ่งครั้งของวันนั้น คืนจำนวนครั้งของวันนั้นหลังนับ
    addReview(today) {
      const days = this.loadHistory();
      days[today] = (days[today] || 0) + 1;
      Object.keys(days).forEach((day) => {
        if (Number(day) < today - HISTORY_KEEP_DAYS) delete days[day];
      });
      this.saveHistory(days);
      return days[today];
    },

    // ข้อมูลรายวัน: จำนวนคำใหม่ที่เริ่มเรียนไปแล้ว และฉลองถึงเป้าหมายไปแล้วหรือยัง (วันใหม่เริ่มต้นใหม่)
    loadDaily(today) {
      const saved = read(KEYS.daily, null);
      if (!saved || saved.day !== today) return { newCount: 0, goalDone: false };
      return { newCount: Number.isFinite(saved.newCount) ? saved.newCount : 0, goalDone: saved.goalDone === true };
    },
    newCountToday(today) {
      return this.loadDaily(today).newCount;
    },
    saveNewCount(today, newCount) {
      write(KEYS.daily, { day: today, newCount, goalDone: this.loadDaily(today).goalDone });
    },
    saveGoalDone(today) {
      write(KEYS.daily, { day: today, newCount: this.loadDaily(today).newCount, goalDone: true });
    },

    // เหรียญความสำเร็จ
    loadMedals() {
      return validMedals(read(KEYS.medals, null)) || {};
    },
    // บันทึกเหรียญใหม่ (ที่เคยได้แล้วไม่ถูกเขียนทับ) คืนเหรียญทั้งหมด
    addMedals(ids, today) {
      const medals = this.loadMedals();
      ids.forEach((id) => {
        if (!(id in medals)) medals[id] = today;
      });
      write(KEYS.medals, medals);
      return medals;
    },

    // เกมในแท็บ "เล่น": วันที่เล่น (นับเป็นวันท่องต่อเนื่อง) และสถิติดีที่สุดของแต่ละเกม
    loadGames() {
      return validGames(read(KEYS.games, null)) || { days: {}, best: {} };
    },
    addGamePlay(today) {
      const games = this.loadGames();
      games.days[today] = (games.days[today] || 0) + 1;
      Object.keys(games.days).forEach((day) => {
        if (Number(day) < today - HISTORY_KEEP_DAYS) delete games.days[day];
      });
      write(KEYS.games, games);
    },
    // เกมทายคำปริศนา: สถานะของวันนี้ (วันอื่น = null) และสถิติรวม
    loadWordle(today) {
      const saved = this.loadGames().wordle;
      return saved && saved.day === today ? saved : null;
    },
    saveWordle(wordle) {
      write(KEYS.games, { ...this.loadGames(), wordle });
    },
    loadWordleStats() {
      return this.loadGames().wordleStats || { played: 0, won: 0, streak: 0, best: 0, lastWon: null };
    },
    saveWordleStats(wordleStats) {
      write(KEYS.games, { ...this.loadGames(), wordleStats });
    },
    // เก็บสถิติของเกม ถ้า better(ใหม่, เดิม) เป็นจริงหรือยังไม่มีสถิติ คืน true เมื่อเป็นสถิติใหม่
    saveBest(name, value, better = (a, b) => a < b) {
      const games = this.loadGames();
      if (name in games.best && !better(value, games.best[name])) return false;
      games.best[name] = value;
      write(KEYS.games, games);
      return true;
    },

    // โน้ตช่วยจำของผู้ใช้ (เขียนเองต่อคำ)
    loadNotes() {
      return validNotes(read(KEYS.notes, null)) || {};
    },
    // เก็บโน้ตของคำหนึ่ง (ข้อความว่าง = ลบโน้ต) คืนโน้ตทั้งหมดหลังบันทึก
    saveNote(headword, text) {
      const notes = this.loadNotes();
      const clean = text.trim().slice(0, NOTE_MAX);
      if (clean) notes[headword] = clean;
      else delete notes[headword];
      write(KEYS.notes, notes);
      return notes;
    },

    // วันพักกันสตรีคขาด (null = ยังไม่เคยคำนวณ)
    loadRest() {
      return validRest(read(KEYS.rest, null));
    },
    saveRest(rest) {
      write(KEYS.rest, rest);
    },

    exportData(version, now = new Date()) {
      return {
        app: "vocab-garden",
        schema: SCHEMA,
        version,
        exportedAt: now.toISOString(),
        cards: this.loadCards(),
        settings: this.loadSettings(),
        history: this.loadHistory(),
        rest: this.loadRest(),
        notes: this.loadNotes(),
        games: this.loadGames(),
        medals: this.loadMedals(),
      };
    },
    // คืนจำนวนคำที่นำเข้า หรือโยน Error ถ้าไฟล์ไม่ถูกต้อง
    importData(data) {
      if (!data || data.app !== "vocab-garden" || data.schema !== SCHEMA) {
        throw new Error("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Vocab Garden");
      }
      const cards = validCards(data.cards);
      if (!cards) throw new Error("ข้อมูลความคืบหน้าในไฟล์ไม่ถูกต้อง");
      this.saveCards(cards);
      if (data.settings) this.saveSettings({ ...this.loadSettings(), ...data.settings });
      // ไฟล์สำรองเก่า (ก่อน v0.6.0) ไม่มีประวัติ ให้คงประวัติเดิมไว้
      const history = validHistory(data.history);
      if (history) {
        this.saveHistory(history);
        // วันพักคำนวณจากประวัติ ถ้าไฟล์ไม่มีวันพักให้ลบของเดิมทิ้ง แล้วคำนวณใหม่จากประวัติที่นำเข้า
        const rest = validRest(data.rest);
        if (rest) this.saveRest(rest);
        else target.removeItem(KEYS.rest);
      }
      // ไฟล์สำรองเก่า (ก่อน v0.15.0) ไม่มีโน้ต ให้คงโน้ตเดิมไว้
      const notes = data.notes === undefined ? null : validNotes(data.notes);
      if (notes) write(KEYS.notes, notes);
      // ไฟล์สำรองเก่า (ก่อน v0.16.0) ไม่มีข้อมูลเกม ให้คงของเดิมไว้
      const games = data.games === undefined ? null : validGames(data.games);
      if (games) write(KEYS.games, games);
      // ไฟล์สำรองเก่า (ก่อน v0.19.0) ไม่มีเหรียญ ให้คงของเดิมไว้ ไฟล์ใหม่รวมเหรียญเข้ากับที่มีอยู่ (เหรียญไม่หาย)
      const medals = data.medals === undefined ? null : validMedals(data.medals);
      if (medals) write(KEYS.medals, { ...this.loadMedals(), ...medals });
      return Object.keys(cards).length;
    },

    reset() {
      Object.values(KEYS).forEach((key) => target.removeItem(key));
    },
  };
}
