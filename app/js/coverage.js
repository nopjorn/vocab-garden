// รู้กี่คำ อ่านเข้าใจข้อความได้ราวกี่เปอร์เซ็นต์ (ตรรกะล้วน ไม่แตะหน้าเว็บ)
//
// วิธีคำนวณ: ใช้ความถี่ต่อล้านคำ (Adjusted Frequency per Million) จากไฟล์ stats ของ NGSL (app/data/frequency.tsv)
// ส่วนแบ่งของคำที่รู้ = ผลรวมความถี่ของคำที่รู้ ÷ ผลรวมความถี่ของ 2,809 คำ แล้วคูณ 92%
// ตัวเลข 92% มาจากคำอธิบายของทีม NGSL ที่ว่า NGSL 1.2 "gives approximately 92% coverage of most texts"
// จึงเป็นค่าประมาณคร่าว ๆ จาก corpus ของ NGSL ไม่ใช่ผลการทดสอบการอ่านของคุณ

export const NGSL_COVERAGE = 92;
export const MILESTONES = [100, 500, 1000, 2000, 2809]; // คำแรก ๆ ตามอันดับความถี่

// แปลงไฟล์ frequency.tsv เป็น { freq: อาร์เรย์ความถี่ตามอันดับ (index 0 = อันดับ 1), total: ผลรวม }
export function parseFrequency(text) {
  const freq = [];
  for (const line of text.split("\n").slice(1)) {
    if (!line) continue;
    const [rank, value] = line.split("\t");
    freq[Number(rank) - 1] = Number(value);
  }
  return { freq, total: freq.reduce((sum, value) => sum + (value || 0), 0) };
}

// ครอบคลุมกี่เปอร์เซ็นต์เมื่อรู้คำที่มีอันดับตามรายการ ranks (อันดับนอกช่วง เช่น คำเสริม ถูกข้าม)
export function coverageOfRanks(ranks, { freq, total }) {
  if (total === 0) return 0;
  const known = new Set(ranks);
  let sum = 0;
  for (const rank of known) sum += freq[rank - 1] || 0;
  return (sum / total) * NGSL_COVERAGE;
}

// ครอบคลุมกี่เปอร์เซ็นต์เมื่อรู้ n คำแรกตามอันดับ
export function coverageOfTop(n, { freq, total }) {
  if (total === 0) return 0;
  let sum = 0;
  for (let index = 0; index < Math.min(n, freq.length); index += 1) sum += freq[index] || 0;
  return (sum / total) * NGSL_COVERAGE;
}

// คำที่ถือว่ารู้: ปลูกแล้ว (ไม่ใช่เมล็ด) และมีอันดับเป็นตัวเลข
export function knownRanks(words, cards) {
  return words.filter((word) => /^\d+$/.test(word.rank) && cards[word.headword]).map((word) => Number(word.rank));
}

export const percentText = (value) => (value < 1 && value > 0 ? "<1%" : `${Math.round(value)}%`);
