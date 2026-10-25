// ศัพท์ของวันนี้: วันละหนึ่งคำจากคำที่แปลแล้ว ทุกคนได้คำเดียวกันในวันเดียวกัน (คำนวณจากเลขวัน ไม่ต้องมีเซิร์ฟเวอร์) (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// คำไล่ไปทั่วทั้งชุดโดยไม่ซ้ำกันจนกว่าจะครบรอบ ขยับทีละก้าวใหญ่ ๆ จึงไม่เรียงตามอันดับ NGSL ให้เดาได้ง่าย

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// ก้าวต่อวัน: ใกล้ n × 0.618 และเป็นจำนวนเฉพาะสัมพัทธ์กับ n (ไม่ซ้ำคำเดิมจนกว่าจะครบ n วัน)
export function dailyStride(n) {
  if (n <= 2) return 1;
  let stride = Math.max(1, Math.round(n * 0.618));
  while (gcd(stride, n) !== 1) stride += 1;
  return stride;
}

// คำของวันนั้น (ไม่มีคำให้เลือก = null) day = เลขวัน (dayNumber)
export function wordOfDay(words, day) {
  if (words.length === 0) return null;
  const n = words.length;
  return words[(((day * dailyStride(n)) % n) + n) % n];
}
