// ท้าทาย 60 วินาที: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { BLITZ_SECONDS, blitzQueue, blitzSummary, isOver, nextBlitz, secondsLeft } from "../blitz.js";
import { launchConfetti } from "../confetti.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, storage, poolOrBack, checkMedals;

const blitz = { pool: [], queue: [], current: null, score: 0, answered: 0, startedAt: 0, timer: null, locked: false };
const NEXT_DELAY = { right: 350, wrong: 900 }; // หน่วงให้เห็นเฉลยก่อนข้อถัดไป (เวลายังเดินอยู่)

function stopTimer() {
  clearInterval(blitz.timer);
  blitz.timer = null;
}

function startBlitz() {
  stopTimer();
  const pool = poolOrBack();
  if (!pool) return;
  const queue = blitzQueue(pool);
  const first = queue && nextBlitz(queue, pool);
  if (!first) {
    toast("คำที่เลือกไว้ยังไม่พอสำหรับเกมนี้ (ต้องมีอย่างน้อย 12 คำ) ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return;
  }
  Object.assign(blitz, { pool, queue: first.rest, current: first, score: 0, answered: 0, startedAt: Date.now(), locked: false });
  $("blitz-play").hidden = false;
  $("blitz-result").hidden = true;
  show("blitz");
  renderBlitz();
  renderClock();
  blitz.timer = setInterval(tick, 200);
}

function tick() {
  if (isOver(blitz.startedAt, Date.now())) finishBlitz();
  else renderClock();
}

function renderClock() {
  const left = secondsLeft(blitz.startedAt, Date.now());
  $("blitz-time").textContent = `⏱ ${left} วินาที`;
  $("blitz-fill").style.width = `${Math.max(0, 100 - ((Date.now() - blitz.startedAt) / (BLITZ_SECONDS * 1000)) * 100)}%`;
  $("blitz-bar").setAttribute("aria-valuenow", left);
  $("blitz-score").textContent = `✅ ${blitz.score}`;
}

function renderBlitz() {
  const { word, question } = blitz.current;
  blitz.locked = false;
  $("blitz-word").textContent = word.headword;
  $("blitz-options").replaceChildren(
    ...question.options.map((option, index) => {
      const item = el("li");
      const button = el("button", "quiz-option", option.text);
      button.type = "button";
      button.dataset.index = index;
      button.prepend(el("kbd", "", index + 1));
      item.append(button);
      return item;
    }),
  );
}

function chooseBlitz(index) {
  if (blitz.locked || !blitz.current) return;
  const { question } = blitz.current;
  const right = index === question.answerIndex;
  blitz.locked = true;
  blitz.answered += 1;
  if (right) blitz.score += 1;
  $("blitz-options").querySelectorAll("button").forEach((button, position) => {
    button.disabled = true;
    if (position === question.answerIndex) button.classList.add("correct");
    else if (position === index) button.classList.add("wrong");
  });
  if (right) fx("correct");
  renderClock();
  setTimeout(() => {
    if (!blitz.timer) return; // หมดเวลาหรือออกจากหน้านี้ไปแล้ว
    const next = nextBlitz(blitz.queue, blitz.pool);
    if (!next) return finishBlitz();
    Object.assign(blitz, { queue: next.rest, current: next });
    renderBlitz();
  }, right ? NEXT_DELAY.right : NEXT_DELAY.wrong);
}

function finishBlitz() {
  if (!blitz.timer) return;
  stopTimer();
  const isBest = storage.saveBest("blitz", blitz.score, (next, best) => next > best);
  storage.addGamePlay(dayNumber());
  checkMedals();
  $("blitz-title").textContent = blitz.score >= 20 ? "เร็วมาก! 🎉" : "หมดเวลา!";
  $("blitz-final").textContent = `${blitz.score} ข้อ`;
  $("blitz-summary").textContent = `${blitzSummary(blitz.score, blitz.answered)}${isBest && blitz.score > 0 ? " 🏆 สถิติใหม่!" : ""}`;
  $("blitz-play").hidden = true;
  $("blitz-result").hidden = false;
  if (blitz.score >= 15) launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

// ออกจากหน้านี้ระหว่างเล่น (เปลี่ยนเส้นทาง) ให้หยุดเวลา ไม่นับเป็นการเล่น
function stopBlitz() {
  stopTimer();
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, storage, poolOrBack, checkMedals } = ctx);
  $("blitz-options").addEventListener("click", (event) => {
    const button = event.target.closest(".quiz-option");
    if (button) chooseBlitz(Number(button.dataset.index));
  });
  $("blitz-again").addEventListener("click", startBlitz);
  document.addEventListener("keydown", (event) => {
    if ($("view-blitz").hidden || $("blitz-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^[1-4]$/.test(event.key)) chooseBlitz(Number(event.key) - 1);
  });
}

export { startBlitz as start, stopBlitz as stop };
