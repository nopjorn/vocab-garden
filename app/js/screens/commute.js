// ฟังทวนระหว่างเดินทาง: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// อ่านคำอังกฤษ → เว้นจังหวะให้นึก → อ่านความหมายไทย (ถ้าเครื่องมีเสียงไทย) วนคำในชุดที่เลือกไว้ที่หน้าเกม
// ไม่เปลี่ยนวันทวนของคำ ฟังครบ COMMUTE_PLAY_AFTER คำนับเป็นการเล่นเกม 1 รอบของวันนั้น
import { COMMUTE_PLAY_AFTER, buildPlaylist, speechTimeout, stepsFor, thaiLine } from "../commute.js";
import { canSpeak, hasVoice, speakLine } from "../speech.js";
import { COMMUTE_PAUSE_CHOICES } from "../storage.js";
import { dayNumber } from "../srs.js";

let $, show, toast, state, storage, poolOrBack, checkMedals, updateSetting, fillSelect;

const PAUSE_LABELS = Object.fromEntries(COMMUTE_PAUSE_CHOICES.map((seconds) => [seconds, `${seconds} วินาที`]));

const radio = { list: [], index: 0, step: 0, playing: false, timer: null, token: 0, heard: 0, counted: false, wakeLock: null };

const thaiVoice = () => hasVoice("th");

function clearTimer() {
  clearTimeout(radio.timer);
  radio.timer = null;
}

// หยุดเสียงทั้งหมด (ออกจากหน้า กดหยุด หรือข้ามคำ) token กัน onend ของเสียงเก่าไม่ให้เล่นขั้นถัดไปซ้อน
function silence() {
  radio.token += 1;
  clearTimer();
  if (canSpeak()) speechSynthesis.cancel();
}

async function keepScreenOn(on) {
  try {
    if (on && !radio.wakeLock && "wakeLock" in navigator) {
      radio.wakeLock = await navigator.wakeLock.request("screen");
      radio.wakeLock.addEventListener("release", () => {
        radio.wakeLock = null;
      });
    } else if (!on && radio.wakeLock) {
      await radio.wakeLock.release();
      radio.wakeLock = null;
    }
  } catch {
    radio.wakeLock = null; // เครื่องไม่ยอมให้จอเปิดค้าง (เช่น แบตต่ำ) ก็ฟังต่อได้
  }
}

function currentWord() {
  return radio.list[radio.index];
}

function renderWord() {
  const word = currentWord();
  $("commute-count").textContent = `คำที่ ${radio.index + 1}/${radio.list.length}`;
  $("commute-word").textContent = word.headword;
  $("commute-meaning").textContent = thaiLine(word);
  $("commute-example").textContent = word.exampleEn;
  $("commute-example").hidden = !state.settings.commuteExample || !word.exampleEn;
  revealMeaning(false);
}

// ซ่อนความหมายไว้ระหว่างเว้นจังหวะ ให้นึกเองก่อน แล้วค่อยเฉลยพร้อมเสียงไทย
function revealMeaning(shown) {
  $("commute-meaning").classList.toggle("is-hidden", !shown);
  $("commute-meaning").setAttribute("aria-hidden", String(!shown));
}

function renderButton() {
  $("commute-toggle").textContent = radio.playing ? "⏸️ หยุดชั่วคราว" : "▶️ เริ่มฟัง";
  $("commute-toggle").setAttribute("aria-pressed", String(radio.playing));
}

function playStep() {
  if (!radio.playing) return;
  const word = currentWord();
  const steps = stepsFor(word, { thai: thaiVoice(), example: state.settings.commuteExample, pause: state.settings.commutePause });
  if (radio.step >= steps.length) {
    finishWord();
    return;
  }
  const step = steps[radio.step];
  if (step.part === "meaning") revealMeaning(true);
  const token = radio.token;
  let done = false;
  const next = () => {
    if (done || token !== radio.token) return;
    done = true;
    clearTimer();
    radio.timer = setTimeout(() => {
      if (step.part === "word") revealMeaning(true); // เว้นจังหวะให้นึกเสร็จแล้วค่อยเฉลยบนจอ (เครื่องที่ไม่มีเสียงไทยก็เห็น)
      radio.step += 1;
      playStep();
    }, step.after * 1000);
  };
  const rate = step.lang === "en-US" ? state.settings.speechRate : 1;
  speakLine(step.text, { lang: step.lang, rate, onEnd: next });
  radio.timer = setTimeout(next, speechTimeout(step.text, rate)); // บางเบราว์เซอร์ไม่ส่ง onend มา
}

function finishWord() {
  radio.heard += 1;
  if (!radio.counted && radio.heard >= COMMUTE_PLAY_AFTER) {
    radio.counted = true;
    storage.addGamePlay(dayNumber());
    checkMedals();
    toast(`ฟังครบ ${COMMUTE_PLAY_AFTER} คำแล้ว นับเป็นการเล่นของวันนี้ 🎧`);
  }
  goTo(radio.index + 1);
}

function goTo(index) {
  silence();
  if (index >= radio.list.length) {
    radio.list = buildPlaylist(radio.list, state.cards, dayNumber()); // ครบชุดแล้ววนใหม่ (สลับลำดับใหม่)
    index = 0;
  }
  radio.index = Math.max(0, index);
  radio.step = 0;
  renderWord();
  if (radio.playing) playStep();
}

function toggle() {
  radio.playing = !radio.playing;
  renderButton();
  if (radio.playing) {
    keepScreenOn(true);
    radio.step = 0;
    renderWord();
    playStep();
  } else {
    silence();
    keepScreenOn(false);
  }
}

function startCommute() {
  if (!canSpeak()) {
    toast("เครื่องนี้ไม่มีเสียงอ่าน ใช้ฟังทวนไม่ได้");
    location.hash = "#/play";
    return;
  }
  const pool = poolOrBack();
  if (!pool) return;
  silence();
  Object.assign(radio, { list: buildPlaylist(pool, state.cards, dayNumber()), index: 0, step: 0, playing: false, heard: 0, counted: false });
  fillSelect($("commute-pause"), COMMUTE_PAUSE_CHOICES, state.settings.commutePause, PAUSE_LABELS);
  $("commute-example-on").checked = state.settings.commuteExample;
  renderVoiceNote();
  renderButton();
  renderWord();
  show("commute");
}

function renderVoiceNote() {
  $("commute-no-thai").hidden = thaiVoice();
}

// ออกจากหน้านี้ (main.js เรียกตอนเปลี่ยนเส้นทาง)
export function stop() {
  if (!radio.playing && !radio.wakeLock) return;
  radio.playing = false;
  silence();
  keepScreenOn(false);
}

export function bind(ctx) {
  ({ $, show, toast, state, storage, poolOrBack, checkMedals, updateSetting, fillSelect } = ctx);
  $("commute-toggle").addEventListener("click", toggle);
  $("commute-next").addEventListener("click", () => goTo(radio.index + 1));
  $("commute-prev").addEventListener("click", () => goTo(radio.index - 1));
  $("commute-pause").addEventListener("change", (event) => updateSetting({ commutePause: Number(event.target.value) }));
  $("commute-example-on").addEventListener("change", (event) => {
    updateSetting({ commuteExample: event.target.checked });
    $("commute-example").hidden = !event.target.checked || !currentWord()?.exampleEn;
  });
  if (canSpeak()) speechSynthesis.addEventListener?.("voiceschanged", renderVoiceNote);
  // กลับมาที่แอปหลังสลับแอป: ขอให้จอเปิดค้างใหม่ (เบราว์เซอร์ปล่อยเองตอนซ่อนหน้า)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && radio.playing && !$("view-commute").hidden) keepScreenOn(true);
  });
  document.addEventListener("keydown", (event) => {
    if ($("view-commute").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, select, textarea") || document.querySelector(".modal:not([hidden])")) return;
    if (event.key === " ") {
      event.preventDefault();
      toggle();
    } else if (event.key === "ArrowRight") goTo(radio.index + 1);
    else if (event.key === "ArrowLeft") goTo(radio.index - 1);
  });
}

export { startCommute as start };
