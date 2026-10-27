// สอบปลายแปลง: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { LEVELS, levelTitle } from "../data.js";
import { launchConfetti } from "../confetti.js";
import { EXAM_COUNT, TIERS, buildExam, examMedalIds, examReady, rescheduleMissed, tierOf } from "../exam.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, state, storage, checkMedals;

const exam = { level: null, items: [], index: 0, results: [], answered: false };

function startExam(level) {
  const words = state.words.filter((word) => word.level === level);
  const items = LEVELS.includes(level) && examReady(state.words, state.cards, level) ? buildExam(words) : null;
  if (!items) {
    toast("ปลูกให้ครบทั้งแปลงก่อนจึงเปิดสอบได้");
    location.hash = LEVELS.includes(level) ? `#/garden/${level}` : "#/garden";
    return;
  }
  Object.assign(exam, { level, items, index: 0, results: [], answered: false });
  $("exam-title").textContent = `📝 สอบ${levelTitle(level).replace(/:.*/, "")}`;
  $("exam-close").href = `#/garden/${level}`;
  $("exam-back").href = `#/garden/${level}`;
  $("exam-back").textContent = "กลับไปแปลง";
  $("exam-play").hidden = false;
  $("exam-result").hidden = true;
  renderExamQuestion();
  show("exam");
}

function renderExamQuestion() {
  const { word, question } = exam.items[exam.index];
  exam.answered = false;
  $("exam-count").textContent = `ข้อ ${exam.index + 1}/${EXAM_COUNT}`;
  if (question.type === "cloze") {
    $("exam-prompt").replaceChildren(question.before, el("span", "blank", "＿＿＿＿"), question.after);
    $("exam-hint").textContent = `เติมคำที่หายไป · ${question.hintTh || word.exampleTh}`;
  } else {
    $("exam-prompt").textContent = word.headword;
    $("exam-hint").textContent = "เลือกคำแปลที่ถูกต้อง";
  }
  $("exam-prompt").lang = "en";
  $("exam-options").replaceChildren(
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
  $("exam-feedback").hidden = true;
  $("exam-next").hidden = true;
  $("exam-next").textContent = exam.index === EXAM_COUNT - 1 ? "ดูผลสอบ 🏁" : "ต่อไป ➡️";
}

function chooseExamOption(index) {
  if (exam.answered) return;
  const { question } = exam.items[exam.index];
  const right = index === question.answerIndex;
  exam.answered = true;
  exam.results.push(right);
  $("exam-options").querySelectorAll("button").forEach((button, position) => {
    button.disabled = true;
    if (position === question.answerIndex) button.classList.add("correct");
    else if (position === index) button.classList.add("wrong");
  });
  $("exam-feedback").textContent = right ? "ถูกต้อง ✅" : `ยังไม่ถูก คำตอบคือ ${question.answerText}`;
  $("exam-feedback").classList.toggle("is-correct", right);
  $("exam-feedback").hidden = false;
  if (right) fx("correct");
  $("exam-next").hidden = false;
  $("exam-next").focus({ preventScroll: true });
}

function nextExam() {
  if (!exam.answered) return;
  exam.index += 1;
  if (exam.index >= EXAM_COUNT) finishExam();
  else renderExamQuestion();
}

function finishExam() {
  const today = dayNumber();
  const score = exam.results.filter(Boolean).length;
  const tier = tierOf(score);
  const missed = exam.items.filter((_, index) => !exam.results[index]).map((item) => item.word);

  // คำที่ตอบผิดถูกนัดทวนเร็วขึ้น ระยะห่างการทวนไม่เปลี่ยน
  missed.forEach((word) => {
    state.cards[word.headword] = rescheduleMissed(state.cards[word.headword], today);
  });
  storage.saveCards(state.cards);
  storage.addMedals(examMedalIds(exam.level, score), today);
  storage.addGamePlay(today); // นับเป็นวันท่องต่อเนื่องเหมือนเกมอื่น แต่ไม่นับเป็นเป้าหมายรายวัน
  checkMedals({ examTier: tier?.id ?? null });

  $("exam-play").hidden = true;
  $("exam-count").textContent = "";
  $("exam-result").hidden = false;
  $("exam-emoji").textContent = tier ? tier.emoji : "💪";
  $("exam-score").textContent = tier ? `${tier.name}! ตอบถูก ${score}/${EXAM_COUNT} ข้อ` : `ตอบถูก ${score}/${EXAM_COUNT} ข้อ`;
  $("exam-summary").textContent = tier
    ? missed.length > 0
      ? `คำที่ตอบผิด ${missed.length} คำ ลิซ่านัดมาทวนพรุ่งนี้ให้แล้ว`
      : "ถูกทุกข้อเลย! สุดยอดมาก 🎉"
    : `ต้องตอบถูก ${TIERS[TIERS.length - 1].min} ข้อขึ้นไปจึงได้เหรียญ ลองทบทวนแล้วสอบใหม่ได้เสมอ${missed.length > 0 ? " คำที่ตอบผิดถูกนัดมาทวนพรุ่งนี้แล้ว" : ""}`;
  $("exam-missed").hidden = missed.length === 0;
  $("exam-missed-list").replaceChildren(
    ...missed.map((word) => {
      const item = el("li");
      item.append(el("strong", "", word.headword), el("span", "muted", ` ${word.senses[0]?.text || ""}`));
      return item;
    }),
  );
  if (tier) {
    launchConfetti();
    fx("finish");
  }
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, checkMedals } = ctx);
  $("exam-options").addEventListener("click", (event) => {
    const button = event.target.closest(".quiz-option");
    if (button) chooseExamOption(Number(button.dataset.index));
  });
  $("exam-next").addEventListener("click", nextExam);
  $("exam-again").addEventListener("click", () => startExam(exam.level));
  document.addEventListener("keydown", (event) => {
    if ($("view-exam").hidden || $("exam-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^[1-4]$/.test(event.key)) chooseExamOption(Number(event.key) - 1);
    else if (event.key === "Enter" && exam.answered) {
      event.preventDefault();
      nextExam();
    }
  });
}

export { startExam as start };
