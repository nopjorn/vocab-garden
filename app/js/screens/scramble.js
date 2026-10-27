// เกมเรียงตัวอักษร: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { launchConfetti } from "../confetti.js";
import { SCRAMBLE_COUNT, applyHint, buildScrambleRound, isSolved, maxScore, roundScore } from "../scramble.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, state, storage, translatedWords, poolOrBack, checkMedals;

const scramble = { round: [], index: 0, picked: [], hinted: false, results: [], answered: false };

function startScramble() {
  const pool = poolOrBack();
  if (!pool) return;
  const round = buildScrambleRound(translatedWords(), Math.random, SCRAMBLE_COUNT, pool);
  if (!round) {
    toast("คำที่เลือกไว้ยังไม่พอสำหรับเกมนี้ ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return;
  }
  Object.assign(scramble, { round, index: 0, picked: [], hinted: false, results: [], answered: false });
  $("scramble-play").hidden = false;
  $("scramble-result").hidden = true;
  show("scramble");
  renderScramble();
}

function renderScramble() {
  const item = scramble.round[scramble.index];
  $("scramble-count").textContent = `ข้อ ${scramble.index + 1}/${SCRAMBLE_COUNT}`;
  $("scramble-meaning").textContent = `${item.posLabel} · ${item.meaning}`;
  $("scramble-slots").replaceChildren(
    ...[...item.answer].map((_, position) => {
      const index = scramble.picked[position];
      return el("span", `scramble-slot${index === undefined ? "" : " filled"}`, index === undefined ? "" : item.letters[index]);
    }),
  );
  $("scramble-tiles").replaceChildren(
    ...item.letters.map((letter, index) => {
      const button = el("button", "scramble-tile", letter);
      button.type = "button";
      button.dataset.index = index;
      button.disabled = scramble.answered || scramble.picked.includes(index);
      return button;
    }),
  );
  const done = scramble.answered;
  $("scramble-undo").disabled = done;
  $("scramble-hint").disabled = done;
  $("scramble-skip").disabled = done;
  $("scramble-next").hidden = !done;
}

// ตัดสินข้อนี้: result = clean / hint / skip แล้วเฉลยพร้อมประโยคตัวอย่าง
function settleScramble(result) {
  const item = scramble.round[scramble.index];
  scramble.answered = true;
  scramble.results.push(result);
  if (result === "skip") scramble.picked = item.letters.map((_, index) => index); // ไม่ใช้ในการตรวจ แค่ให้ช่องแสดงผล
  const word = state.words.find((entry) => entry.headword.toLowerCase() === item.answer);
  $("scramble-feedback").textContent =
    result === "skip" ? `💡 คำตอบคือ ${item.answer} · ${word.exampleEn}` : `✅ ถูกต้อง! ${item.answer} · ${word.exampleEn}`;
  $("scramble-feedback").classList.toggle("is-correct", result !== "skip");
  $("scramble-feedback").hidden = false;
  if (result === "skip") {
    $("scramble-slots").replaceChildren(...[...item.answer].map((letter) => el("span", "scramble-slot filled", letter)));
    $("scramble-tiles").querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
    $("scramble-undo").disabled = true;
    $("scramble-hint").disabled = true;
    $("scramble-skip").disabled = true;
    $("scramble-next").hidden = false;
  } else {
    fx("correct");
    renderScramble();
  }
  $("scramble-next").focus({ preventScroll: true });
}

function checkScramble() {
  const item = scramble.round[scramble.index];
  if (scramble.picked.length < item.answer.length) return;
  if (isSolved(item.letters, scramble.picked, item.answer)) {
    settleScramble(scramble.hinted ? "hint" : "clean");
  } else {
    const slots = $("scramble-slots");
    slots.classList.remove("shake");
    void slots.offsetWidth;
    slots.classList.add("shake");
    $("scramble-feedback").textContent = "ยังไม่ใช่ ลองลบแล้วเรียงใหม่ได้นะ";
    $("scramble-feedback").classList.remove("is-correct");
    $("scramble-feedback").hidden = false;
  }
}

function scramblePick(index) {
  const item = scramble.round[scramble.index];
  if (scramble.answered || scramble.picked.includes(index) || scramble.picked.length >= item.answer.length) return;
  scramble.picked.push(index);
  $("scramble-feedback").hidden = true;
  renderScramble();
  checkScramble();
}

function scrambleUndo() {
  if (scramble.answered) return;
  scramble.picked.pop();
  $("scramble-feedback").hidden = true;
  renderScramble();
}

function scrambleHint() {
  const item = scramble.round[scramble.index];
  if (scramble.answered) return;
  scramble.hinted = true;
  scramble.picked = applyHint(item.letters, scramble.picked, item.answer);
  $("scramble-feedback").hidden = true;
  renderScramble();
  checkScramble();
}

function nextScramble() {
  if (!scramble.answered) return;
  if (scramble.index + 1 < scramble.round.length) {
    Object.assign(scramble, { index: scramble.index + 1, picked: [], hinted: false, answered: false });
    $("scramble-feedback").hidden = true;
    renderScramble();
    return;
  }
  finishScramble();
}

function finishScramble() {
  const score = roundScore(scramble.results);
  const isBest = storage.saveBest("scramble", score, (next, best) => next > best);
  storage.addGamePlay(dayNumber());
  checkMedals();
  const marks = { clean: "⭐", hint: "✅", skip: "❌" };
  $("scramble-marks").textContent = scramble.results.map((result) => marks[result]).join(" ");
  $("scramble-title").textContent = score === maxScore() ? "เต็มเลย! เก่งมาก 🎉" : "จบรอบแล้ว!";
  $("scramble-summary").textContent = `${score}/${maxScore()} แต้ม (⭐ ตอบเอง 2 แต้ม · ✅ ใช้ใบ้ 1 แต้ม · ❌ ข้าม)${isBest ? " 🏆 สถิติใหม่!" : ""}`;
  $("scramble-play").hidden = true;
  $("scramble-result").hidden = false;
  if (score >= maxScore() - 2) launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, translatedWords, poolOrBack, checkMedals } = ctx);
  $("scramble-tiles").addEventListener("click", (event) => {
    const button = event.target.closest(".scramble-tile");
    if (button) scramblePick(Number(button.dataset.index));
  });
  $("scramble-undo").addEventListener("click", scrambleUndo);
  $("scramble-hint").addEventListener("click", scrambleHint);
  $("scramble-skip").addEventListener("click", () => {
    if (!scramble.answered) settleScramble("skip");
  });
  $("scramble-next").addEventListener("click", nextScramble);
  $("scramble-again").addEventListener("click", startScramble);
  document.addEventListener("keydown", (event) => {
    if ($("view-scramble").hidden || $("scramble-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^[a-zA-Z]$/.test(event.key)) {
      const item = scramble.round[scramble.index];
      const index = item.letters.findIndex((letter, position) => letter === event.key.toLowerCase() && !scramble.picked.includes(position));
      if (index >= 0) scramblePick(index);
    } else if (event.key === "Backspace") {
      scrambleUndo();
    } else if (event.key === "Enter" && scramble.answered) {
      event.preventDefault();
      nextScramble();
    }
  });
}

export { startScramble as start };
