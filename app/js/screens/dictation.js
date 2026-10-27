// เกมฟังแล้วพิมพ์: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { launchConfetti } from "../confetti.js";
import { canSpeak } from "../speech.js";
import { DICTATION_COUNT, buildDictationRound, dictationMax, dictationScore, gradeDictation } from "../listen.js";
import { dayNumber } from "../srs.js";

let $, show, toast, fx, storage, speakWord, translatedWords, poolOrBack, checkMedals;

const dictation = { items: [], index: 0, results: [], hinted: false, answered: false };

function startDictation() {
  if (!canSpeak()) {
    toast("เครื่องนี้ไม่มีเสียงอ่าน เล่นเกมนี้ไม่ได้");
    location.hash = "#/play";
    return;
  }
  const pool = poolOrBack();
  if (!pool) return;
  const items = buildDictationRound(translatedWords(), Math.random, DICTATION_COUNT, pool);
  if (!items) {
    toast("คำที่เลือกไว้ยังไม่พอสำหรับเกมนี้ ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return;
  }
  Object.assign(dictation, { items, index: 0, results: [], hinted: false, answered: false });
  $("dictation-play").hidden = false;
  $("dictation-result").hidden = true;
  show("dictation");
  renderDictation();
}

function renderDictation() {
  const item = dictation.items[dictation.index];
  Object.assign(dictation, { hinted: false, answered: false });
  $("dictation-count").textContent = `ข้อ ${dictation.index + 1}/${DICTATION_COUNT}`;
  $("dictation-blanks").textContent = [...item.answer].map(() => "＿").join(" ");
  $("dictation-hint").hidden = true;
  $("dictation-input").value = "";
  $("dictation-input").disabled = false;
  $("dictation-check").disabled = false;
  $("dictation-hint-btn").disabled = false;
  $("dictation-skip").disabled = false;
  $("dictation-feedback").hidden = true;
  $("dictation-next").hidden = true;
  speakWord(item.word.headword);
  $("dictation-input").focus({ preventScroll: true });
}

function settleDictation(result) {
  const item = dictation.items[dictation.index];
  dictation.answered = true;
  dictation.results.push(result);
  $("dictation-input").disabled = true;
  $("dictation-check").disabled = true;
  $("dictation-hint-btn").disabled = true;
  $("dictation-skip").disabled = true;
  $("dictation-blanks").textContent = [...item.answer].join(" ");
  const messages = {
    clean: "ถูกต้อง ✅",
    hint: "ถูกต้อง ✅ (ใช้ใบ้)",
    close: `เกือบถูก สะกดคือ ${item.answer}`,
    wrong: `ยังไม่ถูก คำที่ถูกคือ ${item.answer}`,
  };
  $("dictation-feedback").textContent = `${messages[result]} · ${item.meaning}`;
  $("dictation-feedback").classList.toggle("is-correct", result === "clean" || result === "hint");
  $("dictation-feedback").hidden = false;
  if (result === "clean" || result === "hint") fx("correct");
  $("dictation-next").hidden = false;
  $("dictation-next").focus({ preventScroll: true });
}

function checkDictation() {
  if (dictation.answered) return;
  const input = $("dictation-input").value;
  if (!input.trim()) return;
  settleDictation(gradeDictation(dictation.items[dictation.index], input, dictation.hinted));
}

function nextDictation() {
  if (!dictation.answered) return;
  dictation.index += 1;
  if (dictation.index >= DICTATION_COUNT) finishDictation();
  else renderDictation();
}

function finishDictation() {
  const score = dictationScore(dictation.results);
  const max = dictationMax();
  const isBest = storage.saveBest("dictation", score, (next, best) => next > best);
  storage.addGamePlay(dayNumber());
  checkMedals();
  const marks = { clean: "⭐", hint: "✅", close: "🔸", wrong: "❌" };
  $("dictation-marks").textContent = dictation.results.map((result) => marks[result]).join(" ");
  $("dictation-title").textContent = score === max ? "หูไวมือไวมาก! 🎉" : "จบรอบแล้ว!";
  $("dictation-summary").textContent = `${score}/${max} แต้ม (⭐ พิมพ์ถูกเอง 2 แต้ม · ✅ ใช้ใบ้ · 🔸 สะกดผิดตัวเดียว 1 แต้ม · ❌ ผิดหรือข้าม)${isBest && score > 0 ? " 🏆 สถิติใหม่!" : ""}`;
  $("dictation-play").hidden = true;
  $("dictation-result").hidden = false;
  if (score >= max - 2) launchConfetti(isBest ? 48 : 24);
  fx("finish");
}

export function bind(ctx) {
  ({ $, show, toast, fx, storage, speakWord, translatedWords, poolOrBack, checkMedals } = ctx);
  $("dictation-replay").addEventListener("click", () => {
    const item = dictation.items[dictation.index];
    if (item) speakWord(item.word.headword);
    $("dictation-input").focus({ preventScroll: true });
  });
  $("dictation-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (dictation.answered) nextDictation();
    else checkDictation();
  });
  $("dictation-hint-btn").addEventListener("click", () => {
    if (dictation.answered) return;
    dictation.hinted = true;
    $("dictation-hint").textContent = `ใบ้: ${dictation.items[dictation.index].meaning}`;
    $("dictation-hint").hidden = false;
    $("dictation-input").focus({ preventScroll: true });
  });
  $("dictation-skip").addEventListener("click", () => {
    if (!dictation.answered) settleDictation("wrong");
  });
  $("dictation-next").addEventListener("click", nextDictation);
  $("dictation-again").addEventListener("click", startDictation);
}

export { startDictation as start };
