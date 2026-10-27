// คู่คำที่คนไทยมักสับสน: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { CONFUSE_COUNT, BLANK, buildConfuseRound, confuseSummary, filled, isCorrect } from "../confuse.js";
import { launchConfetti } from "../confetti.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, storage, checkMedals;

const confuse = { pairs: null, round: [], index: 0, score: 0, answered: false };

async function loadPairs() {
  if (confuse.pairs) return confuse.pairs;
  const response = await fetch("data/confusables.json");
  if (!response.ok) throw new Error(`โหลดคู่คำไม่สำเร็จ (${response.status})`);
  confuse.pairs = (await response.json()).pairs;
  return confuse.pairs;
}

// หน้าแรก: คำอธิบายทุกคู่ (พับเก็บ) และปุ่มเริ่มฝึก
async function showConfuseIntro() {
  let pairs;
  try {
    pairs = await loadPairs();
  } catch {
    toast("โหลดข้อมูลคู่คำไม่สำเร็จ ลองใหม่อีกครั้งนะ");
    location.hash = "#/play";
    return;
  }
  $("confuse-intro").hidden = false;
  $("confuse-play").hidden = true;
  $("confuse-result").hidden = true;
  $("confuse-count").textContent = "";
  $("confuse-list").replaceChildren(
    ...pairs.map((pair) => {
      const details = el("details", "fold");
      const summary = el("summary");
      summary.append(el("strong", "", pair.words.join(" · ")));
      summary.lastChild.lang = "en";
      details.append(summary, el("p", "confuse-note", pair.note));
      const examples = el("ul", "confuse-examples");
      examples.append(
        ...pair.items.map((item) => {
          const row = el("li");
          const english = el("span", "", filled(item));
          english.lang = "en";
          row.append(english, el("span", "muted small", ` — ${item.th}`));
          return row;
        }),
      );
      details.append(examples);
      return details;
    }),
  );
  show("confuse");
}

function startConfuse() {
  const round = buildConfuseRound(confuse.pairs);
  if (!round) {
    toast("ข้อฝึกยังไม่พอ");
    return;
  }
  Object.assign(confuse, { round, index: 0, score: 0, answered: false });
  $("confuse-intro").hidden = true;
  $("confuse-result").hidden = true;
  $("confuse-play").hidden = false;
  renderConfuse();
}

function renderConfuse() {
  const item = confuse.round[confuse.index];
  confuse.answered = false;
  $("confuse-count").textContent = `ข้อ ${confuse.index + 1}/${CONFUSE_COUNT}`;
  $("confuse-sentence").textContent = item.en.replace(BLANK, "＿＿＿＿");
  $("confuse-th").textContent = item.th;
  $("confuse-options").replaceChildren(
    ...item.options.map((option, index) => {
      const row = el("li");
      const button = el("button", "quiz-option", option);
      button.type = "button";
      button.dataset.index = index;
      button.lang = "en";
      button.prepend(el("kbd", "", index + 1));
      row.append(button);
      return row;
    }),
  );
  $("confuse-feedback").hidden = true;
  $("confuse-next").hidden = true;
  $("confuse-next").textContent = confuse.index === CONFUSE_COUNT - 1 ? "ดูผล 🏁" : "ต่อไป ➡️";
}

function chooseConfuse(index) {
  if (confuse.answered) return;
  const item = confuse.round[confuse.index];
  const right = isCorrect(item, item.options[index]);
  confuse.answered = true;
  if (right) confuse.score += 1;
  $("confuse-options").querySelectorAll("button").forEach((button, position) => {
    button.disabled = true;
    if (isCorrect(item, item.options[position])) button.classList.add("correct");
    else if (position === index) button.classList.add("wrong");
  });
  $("confuse-sentence").textContent = filled(item);
  $("confuse-feedback").textContent = `${right ? "ถูกต้อง ✅" : `ยังไม่ถูก คำตอบคือ ${item.answer}`} · ${item.why}`;
  $("confuse-feedback").classList.toggle("is-correct", right);
  $("confuse-feedback").hidden = false;
  if (right) fx("correct");
  $("confuse-next").hidden = false;
  $("confuse-next").focus({ preventScroll: true });
}

function nextConfuse() {
  if (!confuse.answered) return;
  confuse.index += 1;
  if (confuse.index >= CONFUSE_COUNT) finishConfuse();
  else renderConfuse();
}

function finishConfuse() {
  const isBest = storage.saveBest("confuse", confuse.score, (next, best) => next > best);
  storage.addGamePlay(dayNumber());
  checkMedals();
  $("confuse-title").textContent = confuse.score === CONFUSE_COUNT ? "เต็มเลย! 🎉" : "จบรอบแล้ว!";
  $("confuse-summary").textContent = `${confuseSummary(confuse.score, CONFUSE_COUNT)}${isBest && confuse.score > 0 ? " 🏆 สถิติใหม่!" : ""}`;
  // คู่ที่ตอบพลาดไว้ให้กลับไปอ่านในหน้าคำอธิบาย
  $("confuse-play").hidden = true;
  $("confuse-result").hidden = false;
  if (confuse.score >= CONFUSE_COUNT - 1) launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, storage, checkMedals } = ctx);
  $("confuse-start").addEventListener("click", startConfuse);
  $("confuse-options").addEventListener("click", (event) => {
    const button = event.target.closest(".quiz-option");
    if (button) chooseConfuse(Number(button.dataset.index));
  });
  $("confuse-next").addEventListener("click", nextConfuse);
  $("confuse-again").addEventListener("click", startConfuse);
  $("confuse-back").addEventListener("click", showConfuseIntro);
  document.addEventListener("keydown", (event) => {
    if ($("view-confuse").hidden || $("confuse-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^[1-3]$/.test(event.key)) chooseConfuse(Number(event.key) - 1);
    else if (event.key === "Enter" && confuse.answered) {
      event.preventDefault();
      nextConfuse();
    }
  });
}

export { showConfuseIntro as start };
