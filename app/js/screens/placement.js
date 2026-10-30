// แบบทดสอบวัดระดับ: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { launchConfetti } from "../confetti.js";
import { canSpeak } from "../speech.js";
import { buildPlacement, estimateKnown, knownWords, recommendLevel, scorePlacement } from "../placement.js";
import { dayNumber, knownCard } from "../srs.js";

let $, el, show, toast, fx, state, storage, speakWord, translatedWords, checkMedals, updateSetting, refreshShared;

const placement = { items: [], answers: [], index: 0, result: null };

function showPlacementIntro() {
  $("placement-intro").hidden = false;
  $("placement-play").hidden = true;
  $("placement-result").hidden = true;
  $("placement-count").textContent = "";
  show("placement");
}

function startPlacement() {
  const items = buildPlacement(translatedWords());
  if (items.length === 0) {
    toast("ยังไม่มีคำให้ทดสอบ");
    location.hash = "#/settings";
    return;
  }
  Object.assign(placement, { items, answers: [], index: 0, result: null });
  $("placement-intro").hidden = true;
  $("placement-play").hidden = false;
  renderPlacementQuestion();
}

function renderPlacementQuestion() {
  const item = placement.items[placement.index];
  const total = placement.items.length;
  const text = item.kind === "word" ? item.word.headword : item.text;
  $("placement-count").textContent = `${placement.index + 1}/${total}`;
  $("placement-word").textContent = text;
  const percent = Math.round((placement.index / total) * 100);
  $("placement-bar").style.width = `${percent}%`;
  $("placement-progress").setAttribute("aria-valuenow", percent);
  $("placement-speak").hidden = !canSpeak();
}

function answerPlacement(knows) {
  if ($("placement-play").hidden) return;
  placement.answers.push(knows);
  placement.index += 1;
  if (placement.index >= placement.items.length) finishPlacement();
  else renderPlacementQuestion();
}

function finishPlacement() {
  const result = scorePlacement(placement.items, placement.answers);
  placement.result = result;
  const sizes = {};
  translatedWords().forEach((word) => {
    sizes[word.level] = (sizes[word.level] || 0) + 1;
  });
  const total = result.levels.reduce((sum, entry) => sum + (sizes[entry.level] || 0), 0);
  const recommended = recommendLevel(result);
  $("placement-title").textContent = result.reliable ? `แนะนำให้เริ่มจากแปลง ${recommended}` : "ผลยังไม่แน่นอน";
  $("placement-summary").textContent = result.reliable
    ? `คุณน่าจะรู้ราว ${estimateKnown(result, sizes)} จาก ${total} คำที่แปลแล้ว`
    : `ตอบว่ารู้จักคำปลอม ${Math.round(result.falseRate * 100)}% ของคำปลอมทั้งหมด จึงเชื่อผลไม่ได้เต็มที่`;
  $("placement-levels").replaceChildren(
    ...result.levels.map((entry) => {
      const item = el("li");
      const percent = Math.round(entry.known * 100);
      const bar = el("span", "placement-bar");
      const fill = el("span", "");
      fill.style.width = `${percent}%`;
      bar.append(fill);
      item.append(el("span", "placement-name", `แปลง ${Number(entry.level)}`), bar, el("span", "placement-pct", `${percent}%`));
      return item;
    }),
  );
  $("placement-warning").hidden = result.reliable;
  $("placement-apply").textContent = `🌱 เริ่มคำใหม่จากแปลง ${recommended}`;
  $("placement-apply").dataset.level = recommended;
  const fresh = knownWords(placement.items, placement.answers, result.reliable).filter((word) => !state.cards[word.headword]);
  placement.fresh = fresh;
  $("placement-skip").hidden = fresh.length === 0;
  $("placement-skip").textContent = `🌳 ข้ามคำที่ตอบว่ารู้จัก (${fresh.length} คำ) เป็นต้นไม้ใหญ่`;
  $("placement-play").hidden = true;
  $("placement-result").hidden = false;
  $("placement-count").textContent = "";
  launchConfetti(24);
  fx("finish");
}

function applyPlacementLevel() {
  const level = Number($("placement-apply").dataset.level);
  updateSetting({ startLevel: level });
  toast(`คำใหม่จะมาจากแปลง ${level} เป็นต้นไป`);
  location.hash = "#/settings";
}

function skipPlacementKnown() {
  const words = placement.fresh || [];
  if (words.length === 0) return;
  if (!confirm(`ข้าม ${words.length} คำที่ตอบว่ารู้จักให้เป็นต้นไม้ใหญ่เลยใช่ไหม? (คำเหล่านี้จะมาทวนอีกทีในอีก 30 วัน)`)) return;
  refreshShared(); // อ่านค่าล่าสุดก่อนแก้ เผื่อเปิดแอปไว้หลายแท็บ
  const day = dayNumber();
  words.forEach((word) => {
    state.cards[word.headword] = knownCard(state.cards[word.headword], day);
  });
  storage.saveCards(state.cards);
  storage.addLog(day, { n: words.length, t: words.length });
  checkMedals();
  placement.fresh = [];
  $("placement-skip").hidden = true;
  toast(`ข้าม ${words.length} คำเป็นต้นไม้ใหญ่แล้ว 🌳`);
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, speakWord, translatedWords, checkMedals, updateSetting, refreshShared } = ctx);
  $("placement-start").addEventListener("click", startPlacement);
  $("placement-yes").addEventListener("click", () => answerPlacement(true));
  $("placement-no").addEventListener("click", () => answerPlacement(false));
  $("placement-speak").addEventListener("click", () => {
    const item = placement.items[placement.index];
    if (item) speakWord(item.kind === "word" ? item.word.headword : item.text);
  });
  $("placement-apply").addEventListener("click", applyPlacementLevel);
  $("placement-skip").addEventListener("click", skipPlacementKnown);
  $("placement-again").addEventListener("click", startPlacement);
  document.addEventListener("keydown", (event) => {
    if ($("view-placement").hidden || $("placement-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (event.key === "1" || event.key === "ArrowRight") answerPlacement(true);
    else if (event.key === "2" || event.key === "ArrowLeft") answerPlacement(false);
  });
}

export { showPlacementIntro as start };
