// เตือนให้มาท่อง: สร้างไฟล์ปฏิทิน (.ics) นัดทุกวัน ไม่ต้องมีเซิร์ฟเวอร์และไม่มีข้อมูลออกจากเครื่อง (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// เวลาเป็นเวลาท้องถิ่นของผู้ใช้ (floating time ไม่ผูกเขตเวลา) แอปปฏิทินจะแจ้งเตือนเองตามที่ตั้งไว้

export const DEFAULT_TIME = "19:00";

// "HH:MM" ที่ถูกต้องเท่านั้น (ไม่ถูกต้อง = null)
export function parseTime(text) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(text || ""));
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

const pad = (value, length = 2) => String(value).padStart(length, "0");

function localStamp(date) {
  return `${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function utcStamp(date) {
  return `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

// วันเริ่มนัด: วันนี้ถ้ายังไม่เลยเวลานั้น ไม่งั้นพรุ่งนี้
export function firstOccurrence(now, time) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0);
  if (start <= now) start.setDate(start.getDate() + 1);
  return start;
}

// ข้อความใน .ics ต้องใส่ \ ก่อน \ ; , และขึ้นบรรทัดใหม่
export const escapeText = (text) => text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// ตัดบรรทัดยาวเกิน 75 ไบต์ (UTF-8) ตามมาตรฐาน โดยไม่ตัดกลางตัวอักษร บรรทัดต่อเว้นหนึ่งช่องว่างนำหน้า
export function foldLine(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = " ";
      bytes = 1;
      limit = 75;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n");
}

// สร้างไฟล์ปฏิทิน: นัดซ้ำทุกวันที่เวลา time พร้อมแจ้งเตือน ณ เวลานั้น (url = ลิงก์เปิดแอป ไม่ใส่ก็ได้)
export function buildIcs(time, now = new Date(), url = "") {
  const start = firstOccurrence(now, time);
  const summary = "🌱 ถึงเวลาท่องศัพท์ Vocab Garden";
  const description = `มารดน้ำต้นไม้ในสวนคำศัพท์กัน แค่ไม่กี่นาทีก็พอ${url ? `\n${url}` : ""}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vocab Garden//Daily reminder//TH",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:vocab-garden-daily-${pad(time.hour)}${pad(time.minute)}@vocab-garden`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(start)}`,
    "DURATION:PT10M",
    "RRULE:FREQ=DAILY",
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(url ? [`URL:${url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0S",
    `DESCRIPTION:${escapeText(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
