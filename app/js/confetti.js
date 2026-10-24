// คอนเฟตตีด้วย HTML/CSS ล้วน (ไม่มี library) เครื่องที่ตั้ง "ลดการเคลื่อนไหว" จะไม่แสดง

const COLORS = 5; // สีของชิ้นคอนเฟตตีอยู่ใน CSS (.confetti-piece.c0 – .c4)
const LIFETIME_MS = 3200;

export function launchConfetti(count = 36) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const layer = document.createElement("div");
  layer.className = "confetti";
  layer.setAttribute("aria-hidden", "true");
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = `confetti-piece c${index % COLORS}`;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 160)}px`);
    piece.style.setProperty("--spin", `${Math.round(360 + Math.random() * 540)}deg`);
    piece.style.animationDelay = `${(Math.random() * 0.5).toFixed(2)}s`;
    piece.style.animationDuration = `${(1.8 + Math.random() * 1.2).toFixed(2)}s`;
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), LIFETIME_MS);
  return true;
}
