// โหลดชุดข้อมูลคำศัพท์จาก data/levels/*.tsv (รูปแบบตาม docs/translation-guide.md)

export const LEVELS = [...Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(2, "0")), "sup"];

export const POS_LABELS = {
  n: "คำนาม",
  v: "คำกริยา",
  adj: "คำคุณศัพท์",
  adv: "คำกริยาวิเศษณ์",
  pron: "คำสรรพนาม",
  prep: "คำบุพบท",
  conj: "คำสันธาน",
  det: "คำนำหน้านาม",
  num: "คำบอกจำนวน",
  int: "คำอุทาน",
  aux: "กริยาช่วย",
  modal: "กริยาช่วย",
};

export function levelTitle(level) {
  return level === "sup" ? "แปลงพิเศษ: วัน เดือน ตัวเลข" : `แปลง ${Number(level)}`;
}

function parseSenses(meanings) {
  if (!meanings) return [];
  return meanings.split(" | ").map((sense) => {
    const [pos, ...rest] = sense.split(": ");
    return { pos, label: POS_LABELS[pos] || pos, text: rest.join(": ") };
  });
}

export function parseLevel(text, level) {
  const [header, ...lines] = text.split("\n").filter((line) => line !== "");
  const columns = header.split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    const field = (name) => cells[columns.indexOf(name)] || "";
    return {
      level,
      rank: field("rank"),
      headword: field("headword"),
      forms: field("forms") ? field("forms").split(", ") : [],
      senses: parseSenses(field("meanings")),
      exampleEn: field("example_en"),
      exampleTh: field("example_th"),
      note: field("note"),
      emoji: field("emoji"),
    };
  });
}

// ด่านที่มีไฟล์ข้อมูลเพิ่ม data/extra/NN.tsv (ประโยคตัวอย่างที่ 2 และคำที่มักใช้คู่กัน) เพิ่มเลขด่านที่นี่เมื่อเขียนเพิ่มและใส่ไฟล์ใน sw.js
export const EXTRA_LEVELS = ["01", "02", "03", "04"];

// "make a decision=ตัดสินใจ; make a mistake=ทำผิดพลาด" → [{ phrase, meaning }]
export function parseCollocations(text) {
  if (!text) return [];
  return text.split("; ").map((item) => {
    const [phrase, ...rest] = item.split("=");
    return { phrase, meaning: rest.join("=") };
  });
}

// ไฟล์ข้อมูลเพิ่มของด่านเดียว → { [คำหลัก]: { example2En, example2Th, collocations } }
export function parseExtra(text) {
  const [header, ...lines] = text.split("\n").filter((line) => line !== "");
  const columns = header.split("\t");
  const extra = {};
  for (const line of lines) {
    const cells = line.split("\t");
    const field = (name) => cells[columns.indexOf(name)] || "";
    extra[field("headword")] = { example2En: field("example2_en"), example2Th: field("example2_th"), collocations: parseCollocations(field("collocations")) };
  }
  return extra;
}

// คืนคำทั้งหมดเรียงตามด่าน พร้อมลำดับ (order) และสถานะว่าแปลแล้วหรือยัง
// ข้อมูลเพิ่มโหลดแบบไม่บังคับ: โหลดไม่ได้ก็ใช้แอปต่อได้ แค่ไม่มีประโยคที่ 2 กับคำคู่
export async function loadWords(fetchText = defaultFetchText) {
  const [texts, extras] = await Promise.all([
    Promise.all(LEVELS.map((level) => fetchText(`data/levels/${level}.tsv`))),
    Promise.all(EXTRA_LEVELS.map((level) => fetchText(`data/extra/${level}.tsv`).then(parseExtra, () => ({})))),
  ]);
  const extra = Object.assign({}, ...extras);
  const words = texts.flatMap((text, index) => parseLevel(text, LEVELS[index]));
  return words.map((word, order) => ({ example2En: "", example2Th: "", collocations: [], ...extra[word.headword], ...word, order, translated: word.senses.length > 0 }));
}

async function defaultFetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`โหลด ${url} ไม่สำเร็จ (${response.status})`);
  return response.text();
}
