// ของขวัญสุ่มจากสวน: ทำครบเป้าของวันแล้วได้กล่องของขวัญ 1 กล่อง ข้างในสุ่มของแต่งหายากที่ยังไม่มี (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// เป็นของตกแต่งเท่านั้น ไม่ได้ล็อกคำศัพท์หรือฟีเจอร์ไว้ · เก็บรวมใน vg:medals ด้วยรหัส "gift-<id>" (ค่า = เลขวันที่ได้)
// แบบเดียวกับดอกไม้ประจำแปลง จึงอยู่ในไฟล์สำรองและถูกล้างพร้อมความคืบหน้าอยู่แล้ว

export const RARITIES = {
  common: { label: "ธรรมดา", stars: "⭐", weight: 6 },
  rare: { label: "หายาก", stars: "⭐⭐", weight: 3 },
  legendary: { label: "หายากมาก", stars: "⭐⭐⭐", weight: 1 },
};

// อีโมจิของเครื่อง จึงไม่ต้องมีไฟล์รูป
export const GIFTS = [
  { id: "snail-shell", emoji: "🐚", title: "เปลือกหอยริมทาง", rarity: "common" },
  { id: "acorn", emoji: "🌰", title: "ลูกโอ๊กนำโชค", rarity: "common" },
  { id: "duck", emoji: "🦆", title: "เป็ดเดินเล่น", rarity: "common" },
  { id: "hedgehog", emoji: "🦔", title: "เม่นขี้อาย", rarity: "common" },
  { id: "turtle", emoji: "🐢", title: "เต่าเดินช้า", rarity: "common" },
  { id: "squirrel", emoji: "🐿️", title: "กระรอกเก็บถั่ว", rarity: "common" },
  { id: "watering-can", emoji: "🪣", title: "ถังรดน้ำ", rarity: "common" },
  { id: "rock", emoji: "🪨", title: "ก้อนหินมีมอส", rarity: "common" },
  { id: "nest", emoji: "🪺", title: "รังนกบนกิ่งไม้", rarity: "common" },
  { id: "worm", emoji: "🪱", title: "ไส้เดือนพรวนดิน", rarity: "common" },
  { id: "fish", emoji: "🐟", title: "ปลาในบ่อ", rarity: "rare" },
  { id: "bird", emoji: "🐦", title: "นกน้อยร้องเพลง", rarity: "rare" },
  { id: "lantern", emoji: "🏮", title: "โคมไฟสวน", rarity: "rare" },
  { id: "bench", emoji: "🪑", title: "เก้าอี้นั่งเล่น", rarity: "rare" },
  { id: "swan", emoji: "🦢", title: "หงส์ขาว", rarity: "rare" },
  { id: "crystal", emoji: "🔮", title: "ลูกแก้ววิเศษ", rarity: "rare" },
  { id: "peacock", emoji: "🦚", title: "นกยูงรำแพน", rarity: "legendary" },
  { id: "shooting-star", emoji: "🌠", title: "ดาวตกเหนือสวน", rarity: "legendary" },
  { id: "dragon", emoji: "🐉", title: "มังกรน้อยเฝ้าสวน", rarity: "legendary" },
  { id: "unicorn", emoji: "🦄", title: "ยูนิคอร์นหลงทาง", rarity: "legendary" },
];

export const giftId = (gift) => `gift-${gift.id}`;

export const ownedGifts = (medals) => GIFTS.filter((gift) => giftId(gift) in medals);

// วันนี้เปิดกล่องของขวัญไปแล้วหรือยัง
export const giftedOn = (medals, day) => GIFTS.some((gift) => medals[giftId(gift)] === day);

// สุ่มของขวัญจากของที่ยังไม่มี ถ่วงน้ำหนักตามความหายาก (มีครบทุกชิ้นแล้ว = null)
export function pickGift(medals, rng = Math.random) {
  const left = GIFTS.filter((gift) => !(giftId(gift) in medals));
  if (left.length === 0) return null;
  const total = left.reduce((sum, gift) => sum + RARITIES[gift.rarity].weight, 0);
  let roll = rng() * total;
  for (const gift of left) {
    roll -= RARITIES[gift.rarity].weight;
    if (roll < 0) return gift;
  }
  return left[left.length - 1];
}
