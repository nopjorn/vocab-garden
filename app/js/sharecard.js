// การ์ดแชร์ความคืบหน้า: วาดรูปสวนของฉันด้วย canvas แล้วแชร์ผ่านเมนูแชร์ของเครื่อง ไม่ต้องมีบัญชีและไม่มีข้อมูลออกจากเครื่องเอง
// ในรูปมีแค่ตัวเลขสรุปกับอีโมจิ ไม่มีชื่อหรือข้อมูลส่วนตัว และไม่ทำให้ดูเหมือนได้รับการรับรองจากทีม NGSL (ตรรกะวาดล้วน ไม่แตะหน้าเว็บ)

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const NGSL_NOTE = "คำศัพท์จาก NGSL 1.2 (CC BY-SA 4.0) · แอปนี้ไม่ใช่แอปทางการของ NGSL";

// ข้อมูลที่จะวาด (summary = ตัวเลขจากหน้าสวน) emojis ที่ยาวเกินจะถูกตัดให้พอดีบรรทัด
export function buildCardData(summary, date = new Date()) {
  const stats = [
    { emoji: "🌱", value: summary.planted, label: "คำในสวน" },
    { emoji: "🌳", value: summary.trees, label: "ต้นไม้ใหญ่" },
    { emoji: "🔥", value: summary.streak, label: "วันติดต่อกัน" },
    { emoji: "🔁", value: summary.reviews, label: "ครั้งที่ทวน" },
  ].map((stat) => ({ ...stat, value: Number(stat.value) || 0 }));
  const rows = [
    { title: "ดอกไม้ประจำแปลง", emojis: [...summary.flowers] },
    { title: "เหรียญ", emojis: [...summary.medals] },
    { title: "ของแต่งสวน", emojis: [...summary.decorations] },
  ].filter((row) => row.emojis.length > 0);
  const thaiYear = date.getFullYear() + 543;
  const dateText = `${date.getDate()}/${date.getMonth() + 1}/${thaiYear}`;
  return { title: "Vocab Garden", subtitle: "สวนคำศัพท์ภาษาอังกฤษของฉัน", stats, rows, dateText, note: NGSL_NOTE };
}

// ตัดข้อความให้ไม่กว้างเกิน maxWidth (ต่อ … ท้าย) ต้องมี ctx.measureText
export function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = [...text];
  while (chars.length > 1 && ctx.measureText(`${chars.join("")}…`).width > maxWidth) chars.pop();
  return `${chars.join("")}…`;
}

const FONT = '"Anuphan", "Noto Sans Thai", "Sarabun", system-ui, -apple-system, "Segoe UI", sans-serif';

// วาดการ์ดลง ctx (canvas 2D) ขนาด CARD_WIDTH × CARD_HEIGHT
export function drawCard(ctx, data) {
  const width = CARD_WIDTH;
  const height = CARD_HEIGHT;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#047857");
  gradient.addColorStop(0.55, "#0f766e");
  gradient.addColorStop(1, "#155e75");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 96px ${FONT}`;
  ctx.fillText(`🌱 ${data.title}`, width / 2, 170);
  ctx.font = `500 44px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(data.subtitle, width / 2, 240);

  // กล่องตัวเลข 2 × 2
  const boxWidth = 440;
  const boxHeight = 190;
  const gap = 30;
  const left = (width - boxWidth * 2 - gap) / 2;
  data.stats.forEach((stat, index) => {
    const x = left + (index % 2) * (boxWidth + gap);
    const y = 300 + Math.floor(index / 2) * (boxHeight + gap);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 92px ${FONT}`;
    ctx.fillText(fitText(ctx, `${stat.emoji} ${stat.value.toLocaleString("en-US")}`, boxWidth - 40), x + boxWidth / 2, y + 100);
    ctx.font = `500 40px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(stat.label, x + boxWidth / 2, y + 172);
  });

  // แถวอีโมจิ (ดอกไม้ เหรียญ ของแต่งสวน)
  let y = 300 + 2 * (boxHeight + gap) + 50; // แถวอีโมจิเริ่มใต้กล่องตัวเลข
  for (const row of data.rows) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `600 38px ${FONT}`;
    ctx.fillText(row.title, width / 2, y);
    ctx.font = `60px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(fitText(ctx, row.emojis.join(" "), width - 140), width / 2, y + 72);
    y += 135;
  }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(data.dateText, width / 2, height - 110);
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText(fitText(ctx, data.note, width - 80), width / 2, height - 60);
}
