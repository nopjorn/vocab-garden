// เกมจับคู่คำ: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { launchConfetti } from "../confetti.js";
import { buildMatchRound, formatSeconds, isMatch, isNewBest } from "../match.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, storage, poolOrBack, checkMedals;

const match = { round: null, open: [], matched: 0, moves: 0, startedAt: null, timer: null, locked: false };

function stopMatchTimer() {
  clearInterval(match.timer);
  match.timer = null;
}

function renderMatchStats() {
  const ms = match.startedAt ? Date.now() - match.startedAt : 0;
  $("match-stats").textContent = `⏱ ${formatSeconds(ms)} · ${match.moves} ครั้ง`;
}

function startMatch() {
  stopMatchTimer();
  const pool = poolOrBack();
  if (!pool) return;
  const round = buildMatchRound(pool);
  if (!round) {
    toast("คำที่เลือกไว้ยังไม่พอสำหรับเกมนี้ ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return;
  }
  Object.assign(match, { round, open: [], matched: 0, moves: 0, startedAt: null, locked: false });
  $("match-result").hidden = true;
  $("match-board").hidden = false;
  // คำอังกฤษอยู่คอลัมน์ซ้าย คำแปลอยู่คอลัมน์ขวา (สลับลำดับในแต่ละฝั่งแล้ว)
  const column = (lang) => {
    const side = el("div", "match-column");
    side.append(
      ...round.tiles
        .filter((tile) => tile.lang === lang)
        .map((tile) => {
          const button = el("button", `tile tile-${tile.lang}`, tile.text);
          button.type = "button";
          button.dataset.id = tile.id;
          button.setAttribute("aria-pressed", "false");
          if (tile.lang === "en") button.lang = "en";
          return button;
        }),
    );
    return side;
  };
  $("match-board").replaceChildren(column("en"), column("th"));
  renderMatchStats();
  show("match");
}

function tapTile(button) {
  if (match.locked || button.disabled || match.open.includes(button)) return;
  if (!match.startedAt) {
    match.startedAt = Date.now();
    match.timer = setInterval(renderMatchStats, 200);
  }
  button.classList.add("picked");
  button.setAttribute("aria-pressed", "true");
  match.open.push(button);
  if (match.open.length < 2) return;

  match.moves += 1;
  const [first, second] = match.open.map((tile) => match.round.tiles.find((entry) => entry.id === tile.dataset.id));
  const buttons = match.open;
  match.open = [];
  if (isMatch(first, second)) {
    buttons.forEach((tile) => {
      tile.classList.remove("picked");
      tile.classList.add("matched");
      tile.disabled = true;
    });
    match.matched += 1;
    fx("correct");
    if (match.matched === match.round.tiles.length / 2) finishMatch();
  } else {
    match.locked = true;
    buttons.forEach((tile) => tile.classList.add("wrong"));
    setTimeout(() => {
      buttons.forEach((tile) => {
        tile.classList.remove("picked", "wrong");
        tile.setAttribute("aria-pressed", "false");
      });
      match.locked = false;
    }, 600);
  }
  renderMatchStats();
}

function finishMatch() {
  stopMatchTimer();
  const ms = Date.now() - match.startedAt;
  const isBest = isNewBest(storage.loadGames().best.match, ms);
  if (isBest) storage.saveBest("match", ms);
  storage.addGamePlay(dayNumber());
  checkMedals();
  renderMatchStats();
  $("match-summary").textContent = `${formatSeconds(ms)} · ${match.moves} ครั้ง${isBest ? " 🏆 สถิติใหม่!" : ""}`;
  $("match-board").hidden = true;
  $("match-result").hidden = false;
  launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, storage, poolOrBack, checkMedals } = ctx);
  $("match-board").addEventListener("click", (event) => {
    const button = event.target.closest(".tile");
    if (button) tapTile(button);
  });
  $("match-again").addEventListener("click", startMatch);
}

export { startMatch as start, stopMatchTimer as stop };
