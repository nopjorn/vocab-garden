// ไล่แมลง 🐛: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง #/bugs)
// แมลงหนึ่งตัว = คำที่ลืมบ่อยหนึ่งคำ ตอบให้ถูกทุกขั้นติดกันแล้วแมลงบินหนี ตอบผิดแมลงยังอยู่ ไปตัวต่อไปได้เลย
import { BUG_ROUND, STEP_LABELS, activeBugs, bugSteps, bugSummary } from "../bugs.js";
import { launchConfetti } from "../confetti.js";
import { gradeTyped } from "../quiz.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, state, storage, speakWord, translatedWords, checkMedals;

const hunt = { queue: [], index: 0, steps: [], step: 0, caught: 0, tried: 0, answered: false };

function startHunt() {
  const words = translatedWords();
  const bugs = activeBugs(words, state.cards, storage.loadGarden().bugs);
  // แมลงที่ทำข้อไม่ได้เลย (เช่น คำที่ไม่มีคำแปลที่ใช้เป็นตัวเลือกได้) ข้ามไป
  const queue = bugs.map((word) => ({ word, steps: bugSteps(word, words) })).filter((bug) => bug.steps.length > 0).slice(0, BUG_ROUND);
  if (queue.length === 0) {
    toast("ตอนนี้สวนไม่มีแมลงเลย ต้นไม้แข็งแรงดีมาก 🌳");
    location.hash = "#/garden";
    return;
  }
  Object.assign(hunt, { queue, index: 0, caught: 0, tried: 0 });
  $("bugs-play").hidden = false;
  $("bugs-result").hidden = true;
  show("bugs");
  startBug();
}

function startBug() {
  const bug = hunt.queue[hunt.index];
  Object.assign(hunt, { steps: bug.steps, step: 0 });
  hunt.tried += 1;
  renderStep();
}

function renderStep() {
  const { word } = hunt.queue[hunt.index];
  const question = hunt.steps[hunt.step];
  hunt.answered = false;
  $("bugs-count").textContent = `ตัวที่ ${hunt.index + 1}/${hunt.queue.length}`;
  $("bugs-step").textContent = `ขั้น ${hunt.step + 1}/${hunt.steps.length}: ${STEP_LABELS[question.type]}`;
  // ขั้นพิมพ์คำเองซ่อนตัวคำไว้ (ไม่งั้นลอกได้)
  const hideWord = question.type === "type";
  $("bugs-word").textContent = hideWord ? "?" : word.headword;
  $("bugs-speak").hidden = hideWord;
  $("bugs-feedback").hidden = true;
  $("bugs-next").hidden = true;
  if (question.type === "type") {
    $("bugs-prompt").textContent = question.prompt;
    $("bugs-hint").textContent = `${question.posLabel} · พิมพ์คำภาษาอังกฤษ`;
    $("bugs-options").replaceChildren();
    $("bugs-form").hidden = false;
    $("bugs-input").value = "";
    $("bugs-input").disabled = false;
    $("bugs-input").focus();
    return;
  }
  $("bugs-form").hidden = true;
  if (question.type === "cloze") {
    $("bugs-prompt").replaceChildren(question.before, el("span", "blank", "_____"), question.after);
    $("bugs-prompt").lang = "en";
    $("bugs-hint").textContent = question.hintTh;
  } else {
    $("bugs-prompt").textContent = "คำนี้แปลว่าอะไร?";
    $("bugs-prompt").lang = "th";
    $("bugs-hint").textContent = "";
  }
  $("bugs-options").replaceChildren(
    ...question.options.map((option, index) => {
      const item = el("li");
      const button = el("button", "quiz-option", option.text);
      button.type = "button";
      button.dataset.index = index;
      if (question.type === "cloze") button.lang = "en";
      button.prepend(el("kbd", "", index + 1));
      item.append(button);
      return item;
    }),
  );
}

function choose(index) {
  if (hunt.answered) return;
  const question = hunt.steps[hunt.step];
  const right = index === question.answerIndex;
  $("bugs-options").querySelectorAll("button").forEach((button, position) => {
    button.disabled = true;
    if (position === question.answerIndex) button.classList.add("correct");
    else if (position === index) button.classList.add("wrong");
  });
  answer(right, question.answerText);
}

function submitTyped(event) {
  event.preventDefault();
  if (hunt.answered) return;
  const question = hunt.steps[hunt.step];
  const typed = $("bugs-input").value;
  if (!typed.trim()) return;
  const { result } = gradeTyped(question, typed);
  $("bugs-input").disabled = true;
  $("bugs-word").textContent = hunt.queue[hunt.index].word.headword;
  answer(result !== "wrong", question.answerText, result === "close");
}

// ตอบแล้ว: ถูกไปขั้นถัดไป (ครบทุกขั้น = แมลงบินหนี) ผิดแมลงยังอยู่ ไปตัวต่อไป
function answer(right, answerText, close = false) {
  hunt.answered = true;
  const { word } = hunt.queue[hunt.index];
  const feedback = $("bugs-feedback");
  const last = hunt.step === hunt.steps.length - 1;
  if (right && last) {
    storage.catchBug(word.headword, state.cards[word.headword]?.lapses || 0);
    hunt.caught += 1;
    feedback.textContent = `🦋 แมลงบินหนีไปแล้ว! ต้น ${word.headword} สบายตัวขึ้นเยอะ${close ? ` (สะกดที่ถูกคือ ${answerText})` : ""}`;
    fx("finish");
  } else if (right) {
    feedback.textContent = close ? `เกือบถูกเป๊ะ! สะกดที่ถูกคือ ${answerText} ✅` : "ถูกต้อง ✅ แมลงเริ่มหวั่นแล้ว";
    fx("correct");
  } else {
    feedback.textContent = `คำตอบคือ ${answerText} · ไม่เป็นไรนะ แมลงตัวนี้ยังอยู่ ไว้มาไล่ใหม่รอบหน้า`;
  }
  feedback.classList.toggle("is-correct", right);
  feedback.hidden = false;
  const nextStep = right && !last;
  $("bugs-next").hidden = false;
  $("bugs-next").textContent = nextStep ? "ขั้นต่อไป ➡️" : hunt.index < hunt.queue.length - 1 ? "แมลงตัวต่อไป ➡️" : "ดูสรุป 🦋";
  $("bugs-next").dataset.move = nextStep ? "step" : "bug";
  $("bugs-next").focus();
}

function next() {
  if ($("bugs-next").dataset.move === "step") {
    hunt.step += 1;
    renderStep();
  } else if (hunt.index < hunt.queue.length - 1) {
    hunt.index += 1;
    startBug();
  } else finishHunt();
}

function finishHunt() {
  storage.addGamePlay(dayNumber());
  checkMedals();
  const left = activeBugs(translatedWords(), state.cards, storage.loadGarden().bugs).length;
  $("bugs-title").textContent = hunt.caught === hunt.tried ? "สวนสะอาดขึ้นเยอะเลย!" : hunt.caught > 0 ? "เก่งมาก!" : "ไม่เป็นไรนะ";
  $("bugs-summary").textContent = bugSummary(hunt.caught, hunt.tried, left);
  $("bugs-again").hidden = left === 0;
  $("bugs-play").hidden = true;
  $("bugs-result").hidden = false;
  if (hunt.caught > 0) launchConfetti(hunt.caught * 8);
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, speakWord, translatedWords, checkMedals } = ctx);
  $("bugs-options").addEventListener("click", (event) => {
    const button = event.target.closest(".quiz-option");
    if (button) choose(Number(button.dataset.index));
  });
  $("bugs-form").addEventListener("submit", submitTyped);
  $("bugs-next").addEventListener("click", next);
  $("bugs-again").addEventListener("click", startHunt);
  $("bugs-speak").addEventListener("click", () => speakWord(hunt.queue[hunt.index].word.headword));
  document.addEventListener("keydown", (event) => {
    if ($("view-bugs").hidden || $("bugs-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])") || event.target.matches("input, textarea")) return;
    if (!hunt.answered && /^[1-4]$/.test(event.key) && $("bugs-form").hidden) choose(Number(event.key) - 1);
  });
}

export { startHunt as start };
