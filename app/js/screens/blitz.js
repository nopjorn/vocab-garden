// ท้าทาย 60 วินาที: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { BLITZ_SECONDS, blitzQueue, blitzSummary, isOver, nextBlitz, secondsLeft } from "../blitz.js";
import { launchConfetti } from "../confetti.js";
import { LEVELS } from "../data.js";
import { decodeDuel, duelPool, duelShareText, duelVerdict, encodeDuel, levelsText, newSeed, seededRandom } from "../duel.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, state, storage, poolOrBack, checkMedals, translatedWords, playableLevels, levelSetOf;

// duel = null (เล่นปกติ) หรือ { seed, levels, rival } rival = คะแนนของเพื่อนที่ท้ามา (null = เราเป็นคนท้า)
const blitz = { pool: [], queue: [], current: null, score: 0, answered: 0, startedAt: 0, timer: null, locked: false, duel: null, rng: Math.random };
let rematchLevels = null; // แปลงที่ใช้ตอนกด "ท้ากลับ"
const NEXT_DELAY = { right: 350, wrong: 900 }; // หน่วงให้เห็นเฉลยก่อนข้อถัดไป (เวลายังเดินอยู่)

function stopTimer() {
  clearInterval(blitz.timer);
  blitz.timer = null;
}

// เปิดหน้า: "blitz" = เล่นปกติ · "duel" = สร้างคำท้าใหม่ · { code } = เปิดลิงก์ที่เพื่อนส่งมา
function openBlitz(argument) {
  stopTimer();
  if (argument === "duel") return introDuel({ seed: newSeed(), levels: takeRematchLevels(), rival: null });
  if (argument?.code !== undefined) {
    const duel = decodeDuel(argument.code, LEVELS);
    if (!duel) {
      toast("ลิงก์ท้านี้อ่านไม่ได้ อาจคัดลอกมาไม่ครบ ลองขอลิงก์ใหม่จากเพื่อนนะ");
      location.hash = "#/play";
      return;
    }
    return introDuel({ seed: duel.seed, levels: duel.levels, rival: duel.score });
  }
  blitz.duel = null;
  startBlitz();
}

// แปลงของคำท้าใหม่: ท้ากลับใช้แปลงเดิมของเพื่อน ไม่งั้นใช้แปลงที่เลือกไว้ในหน้าเกม (ทุกคำในแปลง ไม่สนสถานะ)
function takeRematchLevels() {
  const levels = rematchLevels || [...levelSetOf(state.settings.playLevels)];
  rematchLevels = null;
  return levels.length ? levels : playableLevels();
}

function introDuel(duel) {
  blitz.duel = duel;
  const accepting = duel.rival !== null;
  $("blitz-heading").textContent = "🤝 ท้าเพื่อน";
  $("blitz-intro-emoji").textContent = accepting ? "📨" : "🤝";
  $("blitz-intro-title").textContent = accepting ? `เพื่อนท้าคุณ! เพื่อนตอบถูก ${duel.rival} ข้อ` : "ท้าเพื่อนด้วยชุดคำถามเดียวกัน";
  $("blitz-intro-text").textContent = accepting
    ? `คำถามมาจาก${levelsText(duel.levels)} มีเวลา ${BLITZ_SECONDS} วินาที ทำให้ได้มากกว่า ${duel.rival} ข้อเพื่อชนะ`
    : `คำถามมาจากทุกคำใน${levelsText(duel.levels)} (ตามแปลงที่เลือกไว้ในหน้าเกม) เล่นจบแล้วกดส่งลิงก์ให้เพื่อนได้เลย`;
  $("blitz-intro").hidden = false;
  $("blitz-play").hidden = true;
  $("blitz-result").hidden = true;
  $("blitz-score").textContent = "";
  show("blitz");
}

function startBlitz() {
  stopTimer();
  const duel = blitz.duel;
  const pool = duel ? duelPool(translatedWords(), duel.levels) : poolOrBack();
  if (!pool) return;
  const rng = duel ? seededRandom(duel.seed) : Math.random;
  const queue = blitzQueue(pool, rng);
  const first = queue && nextBlitz(queue, pool, rng);
  if (!first) {
    toast(duel ? "คำในแปลงของลิงก์นี้ยังไม่พอสำหรับเกม ลองอัปเดตแอปเป็นเวอร์ชันล่าสุดนะ" : "คำที่เลือกไว้ยังไม่พอสำหรับเกมนี้ (ต้องมีอย่างน้อย 12 คำ) ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return;
  }
  Object.assign(blitz, { pool, rng, queue: first.rest, current: first, score: 0, answered: 0, startedAt: Date.now(), locked: false });
  if (!duel) $("blitz-heading").textContent = "⚡ ท้าทาย 60 วินาที";
  $("blitz-intro").hidden = true;
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
    const next = nextBlitz(blitz.queue, blitz.pool, blitz.rng);
    if (!next) return finishBlitz();
    Object.assign(blitz, { queue: next.rest, current: next });
    renderBlitz();
  }, right ? NEXT_DELAY.right : NEXT_DELAY.wrong);
}

function finishBlitz() {
  if (!blitz.timer) return;
  stopTimer();
  const duel = blitz.duel;
  // สถิติสูงสุดนับเฉพาะรอบปกติ เพราะรอบดวลใช้กองคำคนละชุดกับที่ตั้งไว้ในหน้าเกม
  const isBest = !duel && storage.saveBest("blitz", blitz.score, (next, best) => next > best);
  storage.addGamePlay(dayNumber());
  checkMedals();
  const verdict = duel && duel.rival !== null ? duelVerdict(blitz.score, duel.rival) : null;
  $("blitz-title").textContent = verdict ? `${verdict.title} ${verdict.emoji}` : blitz.score >= 20 ? "เร็วมาก! 🎉" : "หมดเวลา!";
  $("blitz-final").textContent = `${blitz.score} ข้อ`;
  $("blitz-summary").textContent = `${blitzSummary(blitz.score, blitz.answered)}${isBest && blitz.score > 0 ? " 🏆 สถิติใหม่!" : ""}`;
  $("blitz-verdict").hidden = !verdict;
  $("blitz-verdict").textContent = verdict ? verdict.text : "";
  $("blitz-share").hidden = !duel || duel.rival !== null;
  $("blitz-rematch").hidden = !verdict;
  $("blitz-again").hidden = Boolean(duel);
  $("blitz-play").hidden = true;
  $("blitz-result").hidden = false;
  if (verdict?.result === "win" || (!verdict && blitz.score >= 15)) launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

function duelLink() {
  const { seed, levels } = blitz.duel;
  const code = encodeDuel({ seed, levels, score: blitz.score }, LEVELS);
  return `${location.href.split("#")[0]}#/duel/${code}`;
}

async function shareDuel() {
  const url = duelLink();
  const text = duelShareText(blitz.score, blitz.duel.levels);
  try {
    if (navigator.share) await navigator.share({ title: "ท้าเพื่อนใน Vocab Garden", text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast("คัดลอกลิงก์ท้าแล้ว นำไปวางส่งเพื่อนได้เลย 📋");
    }
  } catch (error) {
    if (error.name !== "AbortError") toast("แชร์ไม่สำเร็จ ลองใหม่อีกครั้งนะ"); // AbortError = ผู้ใช้ปิดหน้าต่างแชร์เอง
  }
}

function rematch() {
  rematchLevels = blitz.duel?.levels || null;
  if (location.hash === "#/play/duel") openBlitz("duel");
  else location.hash = "#/play/duel";
}

// ออกจากหน้านี้ระหว่างเล่น (เปลี่ยนเส้นทาง) ให้หยุดเวลา ไม่นับเป็นการเล่น
function stopBlitz() {
  stopTimer();
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, poolOrBack, checkMedals, translatedWords, playableLevels, levelSetOf } = ctx);
  $("blitz-options").addEventListener("click", (event) => {
    const button = event.target.closest(".quiz-option");
    if (button) chooseBlitz(Number(button.dataset.index));
  });
  $("blitz-again").addEventListener("click", startBlitz);
  $("blitz-intro-start").addEventListener("click", startBlitz);
  $("blitz-share").addEventListener("click", shareDuel);
  $("blitz-rematch").addEventListener("click", rematch);
  document.addEventListener("keydown", (event) => {
    if ($("view-blitz").hidden || $("blitz-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^[1-4]$/.test(event.key)) chooseBlitz(Number(event.key) - 1);
  });
}

export { openBlitz as start, stopBlitz as stop };
