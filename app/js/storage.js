// เก็บความคืบหน้าและการตั้งค่าใน localStorage
// คีย์ทุกตัวขึ้นต้นด้วย vg: เพราะทุก repo ใต้ nopjorn.github.io ใช้ storage ร่วมกัน
// ความคืบหน้าผูกกับคำหลัก (ไม่ใช่อันดับ) เพื่อรองรับ NGSL เวอร์ชันใหม่

export const SCHEMA = 1;
const KEYS = { progress: "vg:progress", settings: "vg:settings", daily: "vg:daily", history: "vg:history" };
const HISTORY_KEEP_DAYS = 400; // เก็บประวัติการทวนรายวันย้อนหลังไม่เกินนี้
export const DEFAULT_SETTINGS = { newPerDay: 10, startLevel: 1 };
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
      return { ...DEFAULT_SETTINGS, newPerDay, startLevel };
    },
    saveSettings(settings) {
      write(KEYS.settings, settings);
    },

    loadHistory() {
      const saved = read(KEYS.history, null);
      return (saved && saved.schema === SCHEMA && validHistory(saved.days)) || {};
    },
    saveHistory(days) {
      write(KEYS.history, { schema: SCHEMA, days });
    },
    // นับการทวนหนึ่งครั้งของวันนั้น
    addReview(today) {
      const days = this.loadHistory();
      days[today] = (days[today] || 0) + 1;
      Object.keys(days).forEach((day) => {
        if (Number(day) < today - HISTORY_KEEP_DAYS) delete days[day];
      });
      this.saveHistory(days);
    },

    // จำนวนคำใหม่ที่เริ่มเรียนไปแล้วในวันนี้
    newCountToday(today) {
      const saved = read(KEYS.daily, null);
      return saved && saved.day === today && Number.isFinite(saved.newCount) ? saved.newCount : 0;
    },
    saveNewCount(today, newCount) {
      write(KEYS.daily, { day: today, newCount });
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
      if (history) this.saveHistory(history);
      return Object.keys(cards).length;
    },

    reset() {
      Object.values(KEYS).forEach((key) => target.removeItem(key));
    },
  };
}
