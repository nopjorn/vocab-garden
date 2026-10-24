// นิสัยการท่อง: วันพักกันสตรีคขาด และข้อความต้อนรับกลับ (ตรรกะล้วน คำนวณจากประวัติการทวนรายวัน)
//
// วันพัก 🧊: ท่องติดกันครบ REST_EVERY วันได้ 1 วัน (เก็บได้ไม่เกิน REST_MAX วัน)
// ถ้าพลาดไปหนึ่งวันตอนที่สตรีคยังอยู่ ระบบใช้วันพักให้เอง สตรีคจึงไม่ขาด
// สถานะเก็บเป็น { bank, run, upTo, frozen }
//   bank   = วันพักที่เหลือ      run    = จำนวนวันที่ท่องจริงนับตั้งแต่ได้วันพักครั้งล่าสุด
//   upTo   = คำนวณถึงวันที่เท่าไร  frozen = วันที่ถูกใช้วันพักไปแล้ว

export const REST_EVERY = 7;
export const REST_MAX = 2;
const KEEP_DAYS = 400; // เก็บรายการวันที่ใช้วันพักย้อนหลังไม่เกินนี้ (เท่ากับประวัติรายวัน)

export function emptyRest() {
  return { bank: 0, run: 0, upTo: null, frozen: [] };
}

// ไล่คำนวณวันพักจากประวัติ รันซ้ำได้ผลเดิม (คำนวณต่อจาก upTo ที่เก็บไว้)
// คืน { rest, usedNow: วันที่เพิ่งใช้วันพัก, earned: จำนวนวันพักที่เพิ่งได้ }
export function settleRest(days, saved, today) {
  const rest = { ...emptyRest(), ...saved, frozen: [...((saved && saved.frozen) || [])] };
  const studied = (day) => (days[day] || 0) > 0;

  if (rest.upTo === null) {
    const first = Object.keys(days)
      .map(Number)
      .filter(studied)
      .sort((a, b) => a - b)[0];
    // ยังไม่เคยท่อง: เริ่มนับจากเมื่อวาน ไม่ต้องไล่ย้อนหลัง
    rest.upTo = first === undefined || first >= today ? today - 1 : first - 1;
  }

  const lastDay = studied(today) ? today : today - 1; // วันนี้ยังไม่จบ จึงนับถึงเมื่อวานถ้ายังไม่ได้ท่อง
  const frozen = new Set(rest.frozen);
  let alive = studied(rest.upTo) || frozen.has(rest.upTo);
  const usedNow = [];
  let earned = 0;

  for (let day = rest.upTo + 1; day <= lastDay; day += 1) {
    if (studied(day)) {
      alive = true;
      rest.run += 1;
      if (rest.run % REST_EVERY === 0 && rest.bank < REST_MAX) {
        rest.bank += 1;
        earned += 1;
      }
    } else if (alive && rest.bank > 0) {
      rest.bank -= 1;
      rest.frozen.push(day);
      usedNow.push(day);
    } else {
      alive = false;
      rest.run = 0;
    }
  }

  rest.upTo = Math.max(rest.upTo, lastDay);
  rest.frozen = rest.frozen.filter((day) => day >= today - KEEP_DAYS);
  return { rest, usedNow, earned };
}

// ผ่านมากี่วันแล้วตั้งแต่ท่องครั้งล่าสุด (วันนี้ท่องแล้ว หรือไม่เคยท่อง = null)
export function daysAway(days, today) {
  if ((days[today] || 0) > 0) return null;
  const studied = Object.keys(days)
    .map(Number)
    .filter((day) => day < today && days[day] > 0);
  return studied.length === 0 ? null : today - Math.max(...studied);
}

// ความคืบหน้าเป้าหมายรายวัน
export function goalProgress(days, today, goal) {
  const done = days[today] || 0;
  return { done, goal, percent: Math.min(100, Math.round((done / goal) * 100)), reached: done >= goal };
}
