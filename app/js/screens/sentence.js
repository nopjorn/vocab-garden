// เกมเรียงคำเป็นประโยค: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { launchConfetti } from "../confetti.js";
import { SENTENCE_COUNT, applyHint, buildSentenceRound, isSolved, maxScore, roundScore } from "../sentence.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, storage, speakWord, poolOrBack, checkMedals;

const sentence = { round: [], index: 0, picked: [], hinted: false, results: [], answered: false, revealed: false };

function startSentence() {
  const pool = poolOrBack();
  if (!pool) return;
  const round = buildSentenceRound(pool, Math.random, SENTENCE_COUNT);
  if (!round) {
    toast("ประโยคตัวอย่างของคำที่เลือกไว้ยังไม่พอสำหรับเกมนี้ ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return;
  }
  Object.assign(sentence, { round, index: 0, picked: [], hinted: false, results: [], answered: false, revealed: false });
  $("sentence-play").hidden = false;
  $("sentence-result").hidden = true;
  show("sentence");
  renderSentence();
}

function chipButton(text, index, onClick, disabled = false) {
  const button = el("button", "sentence-chip", text);
  button.type = "button";
  button.dataset.index = index;
  button.lang = "en";
  button.disabled = disabled;
  if (onClick) button.addEventListener("click", onClick);
  return button;
}

function renderSentence() {
  const item = sentence.round[sentence.index];
  const done = sentence.answered;
  $("sentence-count").textContent = `ข้อ ${sentence.index + 1}/${SENTENCE_COUNT}`;
  $("sentence-meaning").textContent = item.meaning;
  // แตะคำที่วางแล้วเพื่อเอากลับ (ล็อกเมื่อจบข้อ)
  const placed = sentence.revealed ? item.tokens.map((token, position) => chipButton(token, position, null, true)) : sentence.picked.map((index, position) => chipButton(item.chips[index], index, () => sentenceRemove(position), done));
  $("sentence-slots").replaceChildren(...placed);
  $("sentence-slots").classList.toggle("empty", placed.length === 0);
  $("sentence-tiles").replaceChildren(
    ...item.chips.map((chip, index) => chipButton(chip, index, () => sentencePick(index), done || sentence.picked.includes(index))),
  );
  $("sentence-undo").disabled = done;
  $("sentence-hint").disabled = done;
  $("sentence-skip").disabled = done;
  $("sentence-next").hidden = !done;
}

// ตัดสินข้อนี้: result = clean / hint / skip แล้วเฉลยพร้อมคำแปล
function settleSentence(result) {
  const item = sentence.round[sentence.index];
  sentence.answered = true;
  sentence.results.push(result);
  sentence.revealed = result === "skip"; // ข้าม = เฉลยประโยคที่ถูกในช่องเรียง
  $("sentence-feedback").textContent = result === "skip" ? `💡 ประโยคคือ ${item.answer}` : `✅ ถูกต้อง! ${item.answer}`;
  $("sentence-feedback").classList.toggle("is-correct", result !== "skip");
  $("sentence-feedback").hidden = false;
  if (result !== "skip") fx("correct");
  renderSentence();
  $("sentence-next").focus({ preventScroll: true });
}

function checkSentence() {
  const item = sentence.round[sentence.index];
  if (sentence.picked.length < item.tokens.length) return;
  if (isSolved(item.chips, sentence.picked, item.tokens)) {
    settleSentence(sentence.hinted ? "hint" : "clean");
  } else {
    const slots = $("sentence-slots");
    slots.classList.remove("shake");
    void slots.offsetWidth;
    slots.classList.add("shake");
    $("sentence-feedback").textContent = "ยังไม่ใช่ แตะคำที่วางแล้วเพื่อเอากลับ แล้วเรียงใหม่ได้นะ";
    $("sentence-feedback").classList.remove("is-correct");
    $("sentence-feedback").hidden = false;
  }
}

function sentencePick(index) {
  const item = sentence.round[sentence.index];
  if (sentence.answered || sentence.picked.includes(index) || sentence.picked.length >= item.tokens.length) return;
  sentence.picked.push(index);
  $("sentence-feedback").hidden = true;
  renderSentence();
  checkSentence();
}

function sentenceRemove(position) {
  if (sentence.answered) return;
  sentence.picked.splice(position, 1);
  $("sentence-feedback").hidden = true;
  renderSentence();
}

function sentenceUndo() {
  if (sentence.answered) return;
  sentence.picked.pop();
  $("sentence-feedback").hidden = true;
  renderSentence();
}

function sentenceHint() {
  const item = sentence.round[sentence.index];
  if (sentence.answered) return;
  sentence.hinted = true;
  sentence.picked = applyHint(item.chips, sentence.picked, item.tokens);
  $("sentence-feedback").hidden = true;
  renderSentence();
  checkSentence();
}

function nextSentence() {
  if (!sentence.answered) return;
  if (sentence.index + 1 < sentence.round.length) {
    Object.assign(sentence, { index: sentence.index + 1, picked: [], hinted: false, answered: false, revealed: false });
    $("sentence-feedback").hidden = true;
    renderSentence();
    return;
  }
  finishSentence();
}

function finishSentence() {
  const score = roundScore(sentence.results);
  const isBest = storage.saveBest("sentence", score, (next, best) => next > best);
  storage.addGamePlay(dayNumber());
  checkMedals();
  const marks = { clean: "⭐", hint: "✅", skip: "❌" };
  $("sentence-marks").textContent = sentence.results.map((result) => marks[result]).join(" ");
  $("sentence-title").textContent = score === maxScore() ? "เต็มเลย! เก่งมาก 🎉" : "จบรอบแล้ว!";
  $("sentence-summary").textContent = `${score}/${maxScore()} แต้ม (⭐ ตอบเอง 2 แต้ม · ✅ ใช้ใบ้ 1 แต้ม · ❌ ข้าม)${isBest && score > 0 ? " 🏆 สถิติใหม่!" : ""}`;
  $("sentence-play").hidden = true;
  $("sentence-result").hidden = false;
  if (score >= maxScore() - 2) launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, storage, speakWord, poolOrBack, checkMedals } = ctx);
  $("sentence-undo").addEventListener("click", sentenceUndo);
  $("sentence-hint").addEventListener("click", sentenceHint);
  $("sentence-skip").addEventListener("click", () => {
    if (!sentence.answered) settleSentence("skip");
  });
  $("sentence-next").addEventListener("click", nextSentence);
  $("sentence-speak").addEventListener("click", () => {
    const item = sentence.round[sentence.index];
    if (item) speakWord(item.answer);
  });
  $("sentence-again").addEventListener("click", startSentence);
  document.addEventListener("keydown", (event) => {
    if ($("view-sentence").hidden || $("sentence-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      sentenceUndo();
    } else if (event.key === "Enter" && sentence.answered) {
      event.preventDefault();
      nextSentence();
    }
  });
}

export { startSentence as start };
