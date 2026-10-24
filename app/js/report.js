// ลิงก์แจ้งคำแปลผิด: เปิดหน้าสร้าง GitHub Issue พร้อมข้อมูลของคำนั้น ผู้ใช้ตรวจและกดส่งเอง แอปไม่ส่งอะไรออกไปเอง

export const REPO_URL = "https://github.com/nopjorn/vocab-garden";

export function issueUrl(word, version) {
  const meanings = word.senses.map((sense) => `${sense.pos}: ${sense.text}`).join(" | ");
  const body = [
    `**คำที่แจ้ง:** ${word.headword} (อันดับ ${word.rank}, ด่าน ${word.level})`,
    `**คำแปลในแอป:** ${meanings}`,
    `**ประโยคตัวอย่าง:** ${word.exampleEn} / ${word.exampleTh}`,
    `**เวอร์ชัน:** Vocab Garden v${version} · NGSL 1.2`,
    "",
    "### ผิดตรงไหน และควรเป็นอย่างไร",
    "<!-- เขียนต่อจากบรรทัดนี้ได้เลยค่ะ -->",
    "",
  ].join("\n");
  const query = new URLSearchParams({ title: `แจ้งคำแปลผิด: ${word.headword}`, body });
  return `${REPO_URL}/issues/new?${query}`;
}
