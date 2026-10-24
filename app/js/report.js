// ลิงก์แจ้งคำแปลผิด: เปิดหน้าสร้าง GitHub Issue พร้อมข้อมูลของคำนั้น ผู้ใช้ตรวจและกดส่งเอง แอปไม่ส่งอะไรออกไปเอง

export const REPO_URL = "https://github.com/nopjorn/vocab-garden";

// ฟอร์มอยู่ที่ .github/ISSUE_TEMPLATE/wrong-translation.yml ชื่อพารามิเตอร์ต้องตรงกับ id ของช่องในฟอร์ม
export function issueUrl(word, version) {
  const meanings = word.senses.map((sense) => `${sense.pos}: ${sense.text}`).join(" | ");
  const query = new URLSearchParams({
    template: "wrong-translation.yml",
    title: `แจ้งคำแปลผิด: ${word.headword}`,
    word: `${word.headword} (อันดับ ${word.rank}, ด่าน ${word.level})`,
    current: `${meanings}\n${word.exampleEn}\n${word.exampleTh}`,
    version: `v${version} · NGSL 1.2`,
  });
  return `${REPO_URL}/issues/new?${query}`;
}
