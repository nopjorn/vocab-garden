// ตัวสุ่มที่กำหนดผลได้ (mulberry32): seed เดียวกันได้ลำดับเลขเดียวกันทุกเครื่อง
// ใช้กับเกมท้าเพื่อน (สองเครื่องได้คำถามชุดเดียวกัน) และนักเดินทางมาเยี่ยมสวน (เปิดแอปซ้ำในวันเดียวกันได้ผู้มาเยี่ยมคนเดิม)
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
