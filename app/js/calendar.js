// ปฏิทินสวน: ตารางย้อนหลังหลายสัปดาห์แบบหน้า contributions ของ GitHub สีเข้มตามจำนวนที่ทวน (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// เลขวันคือจำนวนวันนับจาก 1970-01-01 (ดู dayNumber ใน srs.js) วันที่ 0 เป็นวันพฤหัสบดี

export const CALENDAR_WEEKS = 26;
export const MONTH_ABBR = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// 0 = ไม่ได้ท่อง · 1–4 ยิ่งมากยิ่งเข้ม
export function levelOf(count) {
  if (!count || count <= 0) return 0;
  if (count < 5) return 1;
  if (count < 10) return 2;
  if (count < 20) return 3;
  return 4;
}

// วันในสัปดาห์ของเลขวัน 0 = อาทิตย์ … 6 = เสาร์
export const weekdayOf = (day) => (((day + 4) % 7) + 7) % 7;

// วันที่ตามปฏิทิน (UTC เพราะเลขวันนับแบบ UTC อยู่แล้ว)
const dateOf = (day) => new Date(day * 86400000);

// สร้างปฏิทิน: weeks คอลัมน์ ๆ ละ 7 วัน (อาทิตย์ถึงเสาร์) คอลัมน์สุดท้ายคือสัปดาห์ของวันนี้
// counts = { [เลขวัน]: จำนวนครั้ง } frozen = วันพักที่ใช้แล้ว (ไม่มีกิจกรรมแต่ไม่ทำให้สตรีคขาด)
export function buildCalendar(counts, today, frozen = [], weeks = CALENDAR_WEEKS) {
  const lastSunday = today - weekdayOf(today);
  const firstDay = lastSunday - (weeks - 1) * 7;
  const frozenSet = new Set(frozen);
  const cells = [];
  let activeDays = 0;
  let total = 0;
  for (let day = firstDay; day < firstDay + weeks * 7; day += 1) {
    const future = day > today;
    const count = future ? 0 : counts[day] || 0;
    if (count > 0) {
      activeDays += 1;
      total += count;
    }
    cells.push({ day, count, level: levelOf(count), future, rest: !future && count === 0 && frozenSet.has(day) });
  }
  // ชื่อเดือนวางไว้ที่คอลัมน์แรกที่เดือนเปลี่ยน
  const months = [];
  let lastMonth = -1;
  for (let week = 0; week < weeks; week += 1) {
    const month = dateOf(firstDay + week * 7).getUTCMonth();
    months.push(month !== lastMonth ? MONTH_ABBR[month] : "");
    lastMonth = month;
  }
  return { cells, months, activeDays, total, weeks };
}

// ข้อความบอกวันของช่อง เช่น "25 ต.ค.: ทวน 12 ครั้ง"
export function cellLabel(cell) {
  const date = dateOf(cell.day);
  const when = `${date.getUTCDate()} ${MONTH_ABBR[date.getUTCMonth()]}`;
  if (cell.future) return when;
  if (cell.count > 0) return `${when}: ทวน ${cell.count} ครั้ง`;
  return cell.rest ? `${when}: วันพัก 🧊` : `${when}: ไม่ได้ท่อง`;
}
