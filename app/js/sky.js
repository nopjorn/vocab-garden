// ท้องฟ้าในหน้าสวนเปลี่ยนตามเวลาของเครื่อง: รุ่งเช้า / กลางวัน / ใกล้ค่ำ / กลางคืน (วาดด้วย CSS ใน style.css)
// ใช้เวลาท้องถิ่นของเครื่องเท่านั้น ไม่ส่งข้อมูลหรือขอตำแหน่งที่ตั้ง และไม่เปลี่ยนตารางทวน

export const SKIES = ["dawn", "day", "dusk", "night"];

export function skyOf(hour) {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "dusk";
  return "night";
}

export function applySky(root = document.documentElement, date = new Date()) {
  const sky = skyOf(date.getHours());
  if (root.dataset.sky !== sky) root.dataset.sky = sky;
  return sky;
}
