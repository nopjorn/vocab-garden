// เกมฟังแล้วเลือก: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { launchConfetti } from "../confetti.js";
import { canSpeak } from "../speech.js";
import { LISTEN_COUNT, buildListenRound, listenSummary } from "../listen.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, storage, speakWord, translatedWords, poolOrBack, checkMedals;

const listen = { items: [], index: 0, results: [], answered: false };

function startListen() {
  if (!canSpeak()) {
    toast("เครื่องนี้ไม่มีเสียงอ่าน เล่นเกมนี้ไม่ได้");
    location.hash = "#/play";
    return;
  }
  const pool = poolOrBack();
  if (!pool) return;
  const items = buildListenRound(translatedWords(), Math.random, LISTEN_COUNT, pool);
  if (!items) {
    toast("คำที่เลือกไว้ยังไม่พอสำหรับเกมนี้ ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return;
  }
  Object.assign(listen, { items, index: 0, results: [], answered: false });
  $("listen-play").hidden = false;
  $("listen-result").hidden = true;
  show("listen");
  renderListen();
}

function renderListen() {
  const { word, question } = listen.items[listen.index];
  listen.answered = false;
  $("listen-count").textContent = `ข้อ ${listen.index + 1}/${LISTEN_COUNT}`;
  $("listen-word").hidden = true;
  $("listen-options").replaceChildren(
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
  $("listen-feedback").hidden = true;
  $("listen-next").hidden = true;
  speakWord(word.headword); // เบราว์เซอร์บางตัว (เช่น iPhone) ไม่ยอมเล่นเองจนกว่าจะแตะ ให้กดปุ่ม 🔊 ได้เสมอ
}

function chooseListenOption(index) {
  if (listen.answered) return;
  const { word, question } = listen.items[listen.index];
  const right = index === question.answerIndex;
  listen.answered = true;
  listen.results.push(right);
  $("listen-options").querySelectorAll("button").forEach((button, position) => {
    button.disabled = true;
    if (position === question.answerIndex) button.classList.add("correct");
    else if (position === index) button.classList.add("wrong");
  });
  $("listen-word").textContent = word.headword;
  $("listen-word").hidden = false;
  $("listen-feedback").textContent = right ? "ถูกต้อง ✅" : `ยังไม่ถูก คำตอบคือ ${question.answerText}`;
  $("listen-feedback").classList.toggle("is-correct", right);
  $("listen-feedback").hidden = false;
  if (right) fx("correct");
  $("listen-next").hidden = false;
  $("listen-next").focus({ preventScroll: true });
}

function nextListen() {
  if (!listen.answered) return;
  listen.index += 1;
  if (listen.index >= LISTEN_COUNT) finishListen();
  else renderListen();
}

function finishListen() {
  const score = listen.results.filter(Boolean).length;
  const isBest = storage.saveBest("listen", score, (next, best) => next > best);
  storage.addGamePlay(dayNumber());
  checkMedals();
  $("listen-marks").textContent = listen.results.map((right) => (right ? "✅" : "❌")).join(" ");
  $("listen-title").textContent = score === LISTEN_COUNT ? "หูไวมาก! 🎉" : "จบรอบแล้ว!";
  $("listen-summary").textContent = `${listenSummary(score, LISTEN_COUNT)}${isBest && score > 0 ? " 🏆 สถิติใหม่!" : ""}`;
  $("listen-play").hidden = true;
  $("listen-result").hidden = false;
  if (score >= LISTEN_COUNT - 1) launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, storage, speakWord, translatedWords, poolOrBack, checkMedals } = ctx);
  $("listen-replay").addEventListener("click", () => listen.items[listen.index] && speakWord(listen.items[listen.index].word.headword));
  $("listen-options").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) chooseListenOption(Number(button.dataset.index));
  });
  $("listen-next").addEventListener("click", nextListen);
  $("listen-again").addEventListener("click", startListen);
  document.addEventListener("keydown", (event) => {
    if ($("view-listen").hidden || $("listen-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^[1-4]$/.test(event.key)) chooseListenOption(Number(event.key) - 1);
    else if (event.key === "Enter" && listen.answered) {
      event.preventDefault();
      nextListen();
    } else if (event.key === "r" || event.key === "R") listen.items[listen.index] && speakWord(listen.items[listen.index].word.headword);
  });
}

export { startListen as start };
