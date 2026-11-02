// สภาพอากาศในหน้าสวน: ฝนตกรดน้ำเมื่อทวนครบเป้าของวัน รุ้งขึ้นเมื่อครบเป้าและท่องติดกันตั้งแต่ 7 วัน (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// กลางคืนรุ้งมองไม่เห็น จึงเป็นฝนดาวตกแทน · ใช้ข้อมูลในเครื่องเท่านั้น ไม่ได้ดึงสภาพอากาศจริง และไม่เปลี่ยนตารางทวน
// วาดด้วย CSS ใน style.css ตาม data-weather บน .sky

export const RAINBOW_STREAK = 7;
export const WEATHERS = ["clear", "rain", "rainbow", "meteor"];

export function weatherOf({ goalReached, streak, sky }) {
  if (!goalReached) return "clear";
  if (streak >= RAINBOW_STREAK) return sky === "night" ? "meteor" : "rainbow";
  return "rain";
}

// ข้อความใต้ท้องฟ้า (บอกว่าทำไมฟ้าเป็นแบบนี้ และทำอะไรถึงจะเปลี่ยน)
export function weatherNote(weather, { streak, left }) {
  if (weather === "rain") return `🌧️ ฝนตกรดน้ำทั้งสวน เพราะวันนี้ทวนครบเป้าแล้ว · ท่องติดกันครบ ${RAINBOW_STREAK} วันจะมีรุ้งขึ้น`;
  if (weather === "rainbow") return `🌈 รุ้งขึ้นแล้ว! ครบเป้าวันนี้และท่องติดกัน ${streak} วัน`;
  if (weather === "meteor") return `🌠 ฝนดาวตกพร่างพราว! ครบเป้าวันนี้และท่องติดกัน ${streak} วัน`;
  return `☁️ อีก ${left} ครั้งจะถึงเป้าวันนี้ แล้วฝนจะตกรดน้ำทั้งสวน`;
}
