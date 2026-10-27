// เกมทายคำปริศนา: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { launchConfetti } from "../confetti.js";
import { MAX_GUESSES, WORD_LENGTH, answerPool, dailyAnswer, guessSet, keyStates, nextStats, scoreGuess, shareText } from "../wordle.js";
import { dayNumber } from "../srs.js";

let $, el, show, toast, fx, state, storage, checkMedals;

const wordle = { day: 0, answer: "", word: null, guesses: [], current: "", status: "playing", valid: null };
const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "*zxcvbnm<"]; // * = ส่งคำตอบ, < = ลบ

function startWordle() {
  const day = dayNumber();
  const pool = answerPool(state.words);
  const saved = storage.loadWordle(day);
  const word = saved ? state.words.find((entry) => entry.headword.toLowerCase() === saved.answer) : dailyAnswer(pool, day);
  if (!word) {
    toast("ยังไม่มีคำสำหรับเกมนี้");
    location.hash = "#/play";
    return;
  }
  Object.assign(wordle, {
    day,
    word,
    answer: word.headword.toLowerCase(),
    guesses: saved ? [...saved.guesses] : [],
    status: saved ? saved.status : "playing",
    current: "",
    valid: wordle.valid || guessSet(state.words),
  });
  $("wordle-result").hidden = true;
  $("wordle-message").textContent = "เดาคำอังกฤษ 5 ตัวอักษร";
  show("wordle");
  renderWordle();
  if (wordle.status !== "playing") showWordleResult();
}

function wordleSay(message, shake = false) {
  $("wordle-message").textContent = message;
  if (!shake) return;
  const row = $("wordle-board").children[wordle.guesses.length];
  if (!row) return;
  row.classList.remove("shake");
  void row.offsetWidth;
  row.classList.add("shake");
}

function renderWordle() {
  const { guesses, answer, current } = wordle;
  $("wordle-count").textContent = `${guesses.length}/${MAX_GUESSES}`;
  $("wordle-board").replaceChildren(
    ...Array.from({ length: MAX_GUESSES }, (_, rowIndex) => {
      const row = el("div", "wordle-row");
      const guess = guesses[rowIndex];
      const scores = guess ? scoreGuess(guess, answer) : null;
      for (let col = 0; col < WORD_LENGTH; col += 1) {
        const letter = guess ? guess[col] : rowIndex === guesses.length ? current[col] || "" : "";
        const cell = el("span", `wordle-cell${scores ? ` ${scores[col]}` : letter ? " typed" : ""}`, letter);
        if (scores) cell.setAttribute("aria-label", `${letter} ${{ correct: "ถูกที่", present: "มีแต่ผิดที่", absent: "ไม่มี" }[scores[col]]}`);
        row.append(cell);
      }
      return row;
    }),
  );
  const states = keyStates(guesses, answer);
  $("wordle-keys").replaceChildren(
    ...KEY_ROWS.map((letters) => {
      const row = el("div", "wordle-key-row");
      for (const key of letters) {
        const label = key === "*" ? "ส่ง" : key === "<" ? "⌫" : key;
        const button = el("button", `wordle-key${states[key] ? ` ${states[key]}` : ""}${"*<".includes(key) ? " wide-key" : ""}`, label);
        button.type = "button";
        button.dataset.key = key;
        if (key === "<") button.setAttribute("aria-label", "ลบตัวอักษร");
        if (key === "*") button.setAttribute("aria-label", "ส่งคำตอบ");
        button.disabled = wordle.status !== "playing";
        row.append(button);
      }
      return row;
    }),
  );
  const hintWord = wordle.status === "playing" && guesses.length >= 3;
  $("wordle-hint").hidden = !hintWord;
  if (hintWord) $("wordle-hint").textContent = `💡 ใบ้: คำนี้แปลว่า ${wordle.word.senses[0]?.text || ""}`;
}

function wordleKey(key) {
  if (wordle.status !== "playing") return;
  if (key === "<") wordle.current = wordle.current.slice(0, -1);
  else if (key === "*") return submitWordle();
  else if (wordle.current.length < WORD_LENGTH) wordle.current += key;
  renderWordle();
}

function submitWordle() {
  const guess = wordle.current;
  if (guess.length < WORD_LENGTH) return wordleSay("ใส่ให้ครบ 5 ตัวอักษรก่อนนะ", true);
  if (!wordle.valid.has(guess)) return wordleSay("ไม่มีคำนี้ในรายการคำ NGSL ลองคำอื่น", true);
  wordle.guesses.push(guess);
  wordle.current = "";
  const won = guess === wordle.answer;
  wordle.status = won ? "won" : wordle.guesses.length >= MAX_GUESSES ? "lost" : "playing";
  storage.saveWordle({ day: wordle.day, answer: wordle.answer, guesses: wordle.guesses, status: wordle.status });
  renderWordle();
  if (wordle.status === "playing") {
    wordleSay(`ยังไม่ใช่ เหลืออีก ${MAX_GUESSES - wordle.guesses.length} ครั้ง`);
    fx("correct");
    return;
  }
  storage.saveWordleStats(nextStats(storage.loadWordleStats(), wordle.day, won));
  storage.addGamePlay(wordle.day);
  checkMedals();
  showWordleResult();
  if (won) {
    launchConfetti();
    fx("finish");
  }
}

function showWordleResult() {
  const won = wordle.status === "won";
  const stats = storage.loadWordleStats();
  const { word } = wordle;
  $("wordle-emoji").textContent = won ? "🎉" : "🌰";
  $("wordle-title").textContent = won ? `ทายถูกใน ${wordle.guesses.length} ครั้ง!` : "วันนี้ยังไม่ถูก คำตอบคือ";
  $("wordle-answer").textContent = word.headword;
  $("wordle-meaning").textContent = word.senses.map((sense) => `${sense.label} ${sense.text}`).join(" · ");
  $("wordle-example").textContent = `${word.exampleEn} — ${word.exampleTh}`;
  $("wordle-stats").textContent = `เล่นแล้ว ${stats.played} วัน · ชนะ ${stats.won} · ชนะติดกัน ${stats.streak} วัน (สูงสุด ${stats.best})`;
  $("wordle-message").textContent = won ? "เก่งมาก! พรุ่งนี้มีคำใหม่นะ" : "ไม่เป็นไร พรุ่งนี้มีคำใหม่";
  $("wordle-result").hidden = false;
  document.querySelectorAll(".wordle-key").forEach((key) => {
    key.disabled = true;
  });
}

async function shareWordle() {
  const text = shareText(wordle.guesses, wordle.answer, wordle.day, wordle.status === "won");
  try {
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      toast("คัดลอกผลแล้ว นำไปวางแชร์ได้เลย 📋");
    }
  } catch (error) {
    if (error.name !== "AbortError") toast("แชร์ไม่สำเร็จ ลองจดผลไว้เองนะ"); // AbortError = ผู้ใช้ปิดหน้าต่างแชร์เอง
  }
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, checkMedals } = ctx);
  $("wordle-keys").addEventListener("click", (event) => {
    const button = event.target.closest(".wordle-key");
    if (button) wordleKey(button.dataset.key);
  });
  $("wordle-share").addEventListener("click", shareWordle);
  document.addEventListener("keydown", (event) => {
    if ($("view-wordle").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^[a-zA-Z]$/.test(event.key)) wordleKey(event.key.toLowerCase());
    else if (event.key === "Backspace") wordleKey("<");
    else if (event.key === "Enter") {
      event.preventDefault();
      wordleKey("*");
    }
  });
}

export { startWordle as start };
