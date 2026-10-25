// ดอกไม้ประจำแปลง ของแต่งสวน และธีมตามเทศกาล: เป็นของตกแต่งเท่านั้น ไม่ได้ล็อกคำศัพท์หรือฟีเจอร์ไว้ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ดอกไม้เก็บรวมใน vg:medals ด้วยรหัส "flower-<แปลง>" ส่วนของแต่งสวนปลดล็อกจากเหรียญ จึงไม่ต้องมีที่เก็บข้อมูลเพิ่ม

import { stageIndex } from "./celebrate.js";

// 29 แบบ ตามลำดับแปลง 1–28 และแปลงพิเศษ (เป็นอีโมจิของเครื่อง จึงไม่ต้องมีไฟล์รูป)
export const FLOWERS = [
  { emoji: "🌸", name: "ซากุระ" },
  { emoji: "🌼", name: "เดซี่" },
  { emoji: "🌻", name: "ทานตะวัน" },
  { emoji: "🌹", name: "กุหลาบ" },
  { emoji: "🌷", name: "ทิวลิป" },
  { emoji: "🌺", name: "ชบา" },
  { emoji: "🪷", name: "บัว" },
  { emoji: "💐", name: "ช่อดอกไม้" },
  { emoji: "🏵️", name: "ดอกไม้ประดับ" },
  { emoji: "💮", name: "ดอกไม้ขาว" },
  { emoji: "🪻", name: "ไฮยาซินธ์" },
  { emoji: "🌾", name: "รวงข้าว" },
  { emoji: "🍀", name: "โคลเวอร์สี่แฉก" },
  { emoji: "☘️", name: "แชมร็อก" },
  { emoji: "🌵", name: "กระบองเพชร" },
  { emoji: "🎋", name: "ต้นไผ่ประดับ" },
  { emoji: "🎍", name: "ไผ่มงคล" },
  { emoji: "🌴", name: "ปาล์ม" },
  { emoji: "🍁", name: "ใบเมเปิล" },
  { emoji: "🍂", name: "ใบไม้ร่วง" },
  { emoji: "🌲", name: "ต้นสน" },
  { emoji: "🎄", name: "ต้นคริสต์มาส" },
  { emoji: "🍃", name: "ใบไม้ปลิว" },
  { emoji: "🪴", name: "ไม้กระถาง" },
  { emoji: "🍓", name: "สตรอว์เบอร์รี" },
  { emoji: "🍊", name: "ส้ม" },
  { emoji: "🍇", name: "องุ่น" },
  { emoji: "🌱", name: "ต้นกล้า" },
  { emoji: "🌟", name: "ดาวประดับสวน" },
];

export const flowerId = (level) => `flower-${level}`;

// ดอกไม้ของแปลงนั้น (levels = รายการแปลงทั้งหมดตามลำดับ)
export function flowerOf(level, levels) {
  const index = levels.indexOf(level);
  return index >= 0 ? FLOWERS[index % FLOWERS.length] : null;
}

// แปลงที่ออกดอกแล้ว: แปลได้ครบทุกคำ และทุกคำโตถึง 🌿 กำลังโต ขึ้นไป
export function bloomedLevels(words, cards, levels) {
  return levels.filter((level) => {
    const inLevel = words.filter((word) => word.level === level);
    return inLevel.length > 0 && inLevel.every((word) => word.translated && stageIndex(cards[word.headword]) >= 2);
  });
}

// ของแต่งสวน: ได้เมื่อได้เหรียญที่กำหนด (medal = รหัสเหรียญใน achievements.js)
export const DECORATIONS = [
  { id: "mushroom", emoji: "🍄", title: "เห็ดน้อย", medal: "plant-1" },
  { id: "bee", emoji: "🐝", title: "ผึ้งงานยุ่ง", medal: "plant-50" },
  { id: "butterfly", emoji: "🦋", title: "ผีเสื้อ", medal: "plant-100" },
  { id: "fountain", emoji: "⛲", title: "น้ำพุกลางสวน", medal: "plant-200" },
  { id: "ladybug", emoji: "🐞", title: "เต่าทอง", medal: "tree-1" },
  { id: "owl", emoji: "🦉", title: "นกฮูกยามค่ำ", medal: "tree-50" },
  { id: "cottage", emoji: "🏡", title: "กระท่อมชาวสวน", medal: "streak-7" },
  { id: "kite", emoji: "🪁", title: "ว่าวลอยลม", medal: "streak-3" },
  { id: "rainbow", emoji: "🌈", title: "รุ้งกินน้ำ", medal: "streak-30" },
  { id: "rabbit", emoji: "🐇", title: "กระต่ายน้อย", medal: "comeback" },
  { id: "rooster", emoji: "🐓", title: "ไก่ขันเช้า", medal: "early-bird" },
  { id: "snail", emoji: "🐌", title: "หอยทากใจเย็น", medal: "perfect-round" },
  { id: "frog", emoji: "🐸", title: "กบริมสระ", medal: "first-game" },
  { id: "mailbox", emoji: "📮", title: "ตู้จดหมายช่วยจำ", medal: "first-note" },
];

export const ownedDecorations = (medals) => DECORATIONS.filter((decoration) => decoration.medal in medals);

// ธีมตามเทศกาลที่ผูกกับวันที่แน่นอนของปี (วันที่ลอยกระทงเปลี่ยนตามดวงจันทร์ จึงยังไม่ทำ)
const SEASONS = [
  { id: "songkran", emoji: "💦", title: "สุขสันต์วันสงกรานต์", months: [[3, 13, 15]] },
  { id: "newyear", emoji: "🎆", title: "สุขสันต์ปีใหม่", months: [[11, 29, 31], [0, 1, 3]] },
];

// เทศกาลของวันนั้น (ไม่ใช่ช่วงเทศกาล = null) month นับจาก 0 ตาม JavaScript
export function seasonOf(date = new Date()) {
  const month = date.getMonth();
  const day = date.getDate();
  return SEASONS.find((season) => season.months.some(([m, from, to]) => m === month && day >= from && day <= to)) || null;
}
