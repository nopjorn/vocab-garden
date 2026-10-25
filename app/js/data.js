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
    };
  });
}

// คืนคำทั้งหมดเรียงตามด่าน พร้อมลำดับ (order) และสถานะว่าแปลแล้วหรือยัง
export async function loadWords(fetchText = defaultFetchText) {
  const texts = await Promise.all(LEVELS.map((level) => fetchText(`data/levels/${level}.tsv`)));
  const words = texts.flatMap((text, index) => parseLevel(text, LEVELS[index]));
  return words.map((word, order) => ({ ...word, order, translated: word.senses.length > 0 }));
}

async function defaultFetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`โหลด ${url} ไม่สำเร็จ (${response.status})`);
  return response.text();
}
