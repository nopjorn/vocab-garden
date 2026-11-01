// หน้าตั้งค่า สำรองข้อมูล และสำเนาอัตโนมัติ: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
// (ส่งออกไฟล์สำรอง แถบเตือนสำรองในหน้าหลัก และสำเนาต้นวัน ยังอยู่ใน main.js เพราะหน้าหลักใช้ด้วย)
import { levelTitle } from "../data.js";
import { SNAPSHOT_REASONS, canSnapshot, clearSnapshots, formatSnapshotTime, listSnapshots, loadSnapshot } from "../backup.js";
import { askBadgePermission, canBadge } from "../badge.js";
import { plantInfo } from "../garden.js";
import { buildIcs, parseTime } from "../reminder.js";
import { canSpeak } from "../speech.js";
import { STAGES, dayNumber } from "../srs.js";
import {
  DAILY_GOAL_CHOICES,
  MENU_POSITION_CHOICES,
  NEW_PER_DAY_CHOICES,
  QUIZ_MODE_CHOICES,
  REVIEW_CAP_CHOICES,
  ROUND_SIZE_CHOICES,
  SCHEDULER_CHOICES,
  SPEECH_RATE_CHOICES,
  TEXT_SIZE_CHOICES,
  THEME_CHOICES,
} from "../storage.js";

let $, el, show, toast, fx, state, storage, speakWord, refreshShared, updateSetting, fillSelect, applyAppearance, updateAppBadge;
let translatedWords, playableLevels, levelSetOf, checkbox, wotdPool, resetWotdPick, plantedIn, takeSnapshot, renderBackupInfo, exportBackup;

const SPEECH_RATE_LABELS = { 0.7: "ช้า", 0.9: "ปกติ", 1.1: "เร็ว" };
const THEME_LABELS = { auto: "ตามเครื่อง", light: "สว่าง", dark: "มืด" };
const TEXT_SIZE_LABELS = { normal: "ปกติ", large: "ใหญ่" };
const MENU_POSITION_LABELS = { bottom: "ด้านล่าง (ลอย)", dock: "ด้านล่าง (ชิดขอบจอ)", top: "ด้านบน" };
const SCHEDULER_LABELS = { sm2: "แบบเดิม (SM-2 ฉบับย่อ)", fsrs: "FSRS (ทดลอง)" };
const QUIZ_MODE_LABELS = { flip: "พลิกการ์ด (แบบเดิม)", mixed: "ผสมหลายแบบ" };
const DAILY_GOAL_LABELS = Object.fromEntries(DAILY_GOAL_CHOICES.map((count) => [count, `${count} ครั้ง`]));
const REVIEW_CAP_LABELS = Object.fromEntries(REVIEW_CAP_CHOICES.map((count) => [count, count ? `ไม่เกิน ${count} ครั้ง` : "ไม่จำกัด"]));

const ROUND_SIZE_LABELS = Object.fromEntries(ROUND_SIZE_CHOICES.map((count) => [count, count ? `${count} ใบ` : "ไม่แบ่งรอบ"]));

function renderSettings() {
  const levels = [...new Set(translatedWords().map((word) => word.level))].filter((level) => level !== "sup");
  const startLevel = $("start-level");
  startLevel.replaceChildren(
    ...levels.map((level) => {
      const option = el("option", "", `แปลง ${Number(level)}`);
      option.value = Number(level);
      option.selected = Number(level) === state.settings.startLevel;
      return option;
    }),
  );
  fillSelect($("speech-rate"), SPEECH_RATE_CHOICES, state.settings.speechRate, SPEECH_RATE_LABELS);
  fillSelect($("theme"), THEME_CHOICES, state.settings.theme, THEME_LABELS);
  fillSelect($("text-size"), TEXT_SIZE_CHOICES, state.settings.textSize, TEXT_SIZE_LABELS);
  fillSelect($("menu-position"), MENU_POSITION_CHOICES, state.settings.menuPosition, MENU_POSITION_LABELS);
  fillSelect($("quiz-mode"), QUIZ_MODE_CHOICES, state.settings.quizMode, QUIZ_MODE_LABELS);
  fillSelect($("scheduler"), SCHEDULER_CHOICES, state.settings.scheduler, SCHEDULER_LABELS);
  $("quiz-typing").checked = state.settings.quizTyping;
  fillSelect($("daily-goal"), DAILY_GOAL_CHOICES, state.settings.dailyGoal, DAILY_GOAL_LABELS);
  fillSelect($("review-cap"), REVIEW_CAP_CHOICES, state.settings.reviewCap, REVIEW_CAP_LABELS);
  fillSelect($("round-size"), ROUND_SIZE_CHOICES, state.settings.roundSize, ROUND_SIZE_LABELS);
  $("auto-speak").checked = state.settings.autoSpeak;
  $("sound-fx").checked = state.settings.sound;
  $("badge-setting").hidden = !canBadge();
  $("app-badge").checked = state.settings.appBadge;
  $("sound-panel").hidden = !canSpeak();
  $("sound-heading").hidden = !canSpeak();
  renderBackupInfo();
  renderSnapshots();
  renderWotdSetup();
  const select = $("new-per-day");
  select.replaceChildren(
    ...NEW_PER_DAY_CHOICES.map((count) => {
      const option = el("option", "", `${count} คำ`);
      option.value = count;
      option.selected = count === state.settings.newPerDay;
      return option;
    }),
  );
}

// ตั้งค่าคำที่สุ่มได้ (ปุ่ม 🎲 ในการ์ดศัพท์ของวันนี้): แปลงและระยะของต้นไม้
function saveWotdSetup(change) {
  resetWotdPick(); // คำที่สุ่มไว้อาจไม่อยู่ในกองใหม่แล้ว
  updateSetting(change);
  renderWotdSetup();
}

// บันทึกแปลงที่สุ่มได้ (เลือกครบทุกแปลงเก็บเป็น null = ทุกแปลง เหมือนแปลงที่ใช้เล่น)
function saveWotdLevels(next) {
  const allLevels = playableLevels();
  saveWotdSetup({ wotdLevels: allLevels.every((item) => next.has(item)) ? null : allLevels.filter((item) => next.has(item)) });
}

function renderWotdSetup() {
  const today = dayNumber();
  const allLevels = playableLevels();
  const levels = levelSetOf(state.settings.wotdLevels);
  const stages = new Set(state.settings.wotdStages);
  const words = translatedWords();
  $("wotd-levels").replaceChildren(
    ...allLevels.map((level) => {
      const count = words.filter((word) => word.level === level).length;
      return checkbox(levels.has(level), `${levelTitle(level).replace(/:.*/, "")} (${count})`, (on) => {
        const next = new Set(levels);
        if (on) next.add(level);
        else next.delete(level);
        saveWotdLevels(next);
      });
    }),
  );
  const inChosen = words.filter((word) => levels.has(word.level));
  const stageCount = (id) => inChosen.filter((word) => plantInfo(state.cards[word.headword], today).stage.id === id).length;
  $("wotd-stages").replaceChildren(
    ...STAGES.map((stage) =>
      checkbox(stages.has(stage.id), `${stage.emoji} ${stage.label} (${stageCount(stage.id)})`, (on) => {
        const next = new Set(stages);
        if (on) next.add(stage.id);
        else next.delete(stage.id);
        saveWotdSetup({ wotdStages: STAGES.map((item) => item.id).filter((id) => next.has(id)) });
      }),
    ),
  );
  $("wotd-pool-count").textContent = `สุ่มได้ ${wotdPool(today).length} คำ`;
  const levelText = levels.size === allLevels.length ? "ทุกแปลง" : levels.size === 0 ? "ยังไม่ได้เลือกแปลง" : `${levels.size} แปลง`;
  const chosenStages = STAGES.filter((stage) => stages.has(stage.id));
  const stageText = chosenStages.length === STAGES.length ? "ทุกระยะ" : chosenStages.length === 0 ? "ยังไม่ได้เลือกระยะ" : chosenStages.map((stage) => stage.emoji).join("");
  $("wotd-filter-summary").textContent = `${levelText} · ${stageText}`;
}

// สร้างไฟล์ปฏิทิน (.ics) นัดทุกวัน ให้ดาวน์โหลดไปเปิดด้วยแอปปฏิทิน
function makeReminder() {
  const time = parseTime($("reminder-time").value);
  if (!time) {
    toast("เลือกเวลาที่อยากให้เตือนก่อนนะ");
    return;
  }
  const link = el("a");
  const blob = new Blob([buildIcs(time, new Date(), location.origin + location.pathname)], { type: "text/calendar;charset=utf-8" });
  link.href = URL.createObjectURL(blob);
  link.download = "vocab-garden-reminder.ics";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast("สร้างไฟล์นัดแล้ว เปิดไฟล์ด้วยแอปปฏิทินเพื่อเพิ่มการเตือน 📅");
}

const SNAPSHOT_KIND_LABELS = { daily: "สำเนาต้นวัน", manual: "สำเนาที่เก็บเอง" };
const snapshotLabel = (info) =>
  `${SNAPSHOT_KIND_LABELS[info.kind] || SNAPSHOT_REASONS[info.reason] || "สำเนาก่อนเปลี่ยนข้อมูล"} · เก็บเมื่อ ${formatSnapshotTime(info.at)}`;

async function renderSnapshots() {
  $("snapshots").hidden = !canSnapshot();
  if (!canSnapshot()) return;
  let list = [];
  try {
    list = await listSnapshots();
  } catch {
    $("snapshots").hidden = true;
    return;
  }
  $("snapshot-clear").hidden = list.length === 0;
  $("snapshot-latest").textContent = list.length > 0 ? `สำเนาล่าสุดเก็บเมื่อ ${formatSnapshotTime(list[0].at)}` : "";
  const items = list.map((info) => {
    const button = el("button", "", "กู้คืน");
    button.type = "button";
    button.addEventListener("click", () => restoreSnapshot(info));
    const item = el("li", "snapshot-item");
    item.append(el("span", "", `${snapshotLabel(info)} · ${info.count} คำ`), button);
    return item;
  });
  $("snapshot-list").replaceChildren(...(items.length > 0 ? items : [el("li", "muted small", "ยังไม่มีสำเนา จะเก็บให้ทุกวันที่เปิดแอป")]));
}

async function restoreSnapshot(info) {
  if (!confirm(`กู้คืนสำเนา "${snapshotLabel(info)}" ใช่ไหม? ความคืบหน้าตอนนี้จะถูกแทนที่ (ระบบเก็บสำเนาก่อนกู้คืนไว้ให้ 1 ชุด)`)) return;
  try {
    const snapshot = await loadSnapshot(info.id);
    if (!snapshot) throw new Error("ไม่พบสำเนานี้แล้ว");
    await takeSnapshot("before", "restore");
    storage.importData(snapshot.data);
    reloadFromStorage();
    toast("กู้คืนสำเนาเรียบร้อย");
  } catch (error) {
    toast(error.message || "กู้คืนสำเนาไม่สำเร็จ");
  }
  renderSnapshots();
}

// โหลดข้อมูลจาก localStorage เข้าหน้าจออีกครั้ง หลังนำเข้า กู้คืน หรือล้าง
function reloadFromStorage() {
  state.cards = storage.loadCards();
  state.settings = storage.loadSettings();
  state.notes = storage.loadNotes();
  state.fsrs = storage.loadFsrs();
  applyAppearance();
  renderSettings();
  updateAppBadge();
}

// นำเข้าแบบรวมกับความคืบหน้าในเครื่อง: การ์ดคำเดียวกันเอาฝั่งที่ตอบล่าสุด ใช้ซิงก์ข้ามเครื่องด้วยไฟล์สำรองได้
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    await takeSnapshot("before", "import");
    const count = storage.importData(data, { merge: true });
    reloadFromStorage();
    toast(`รวมความคืบหน้าจากไฟล์แล้ว ตอนนี้มี ${count} คำ`);
  } catch (error) {
    toast(error instanceof SyntaxError ? "อ่านไฟล์ไม่ได้ ไฟล์อาจเสียหาย" : error.message);
  }
}

async function resetProgress() {
  if (!confirm("ล้างความคืบหน้าทั้งหมดใช่ไหม? ระบบจะเก็บสำเนาก่อนล้างไว้ในเครื่อง 1 ชุด กู้คืนได้ที่ ตั้งค่า → สำเนาอัตโนมัติ (แนะนำให้ส่งออกไฟล์สำรองก่อนด้วย)")) return;
  await takeSnapshot("before", "reset");
  storage.reset();
  reloadFromStorage();
  renderSnapshots();
  toast("ล้างความคืบหน้าแล้ว");
}

function startSettings() {
  renderSettings();
  show("settings");
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, speakWord, refreshShared, updateSetting, fillSelect, applyAppearance, updateAppBadge } = ctx);
  ({ translatedWords, playableLevels, levelSetOf, checkbox, wotdPool, resetWotdPick, plantedIn, takeSnapshot, renderBackupInfo, exportBackup } = ctx);
  $("wotd-levels-all").addEventListener("click", () => saveWotdLevels(new Set(playableLevels())));
  $("wotd-levels-none").addEventListener("click", () => saveWotdLevels(new Set()));
  $("wotd-levels-learned").addEventListener("click", () => saveWotdLevels(new Set(playableLevels().filter((level) => plantedIn(level) > 0))));
  $("wotd-levels-fresh").addEventListener("click", () => saveWotdLevels(new Set(playableLevels().filter((level) => plantedIn(level) === 0))));
  $("new-per-day").addEventListener("change", (event) => {
    refreshShared();
    state.settings = { ...state.settings, newPerDay: Number(event.target.value) };
    storage.saveSettings(state.settings);
    toast(`ตั้งคำใหม่เป็นวันละ ${state.settings.newPerDay} คำแล้ว`);
  });
  $("start-level").addEventListener("change", (event) => {
    refreshShared();
    state.settings = { ...state.settings, startLevel: Number(event.target.value) };
    storage.saveSettings(state.settings);
    toast(`คำใหม่จะมาจากแปลง ${state.settings.startLevel} เป็นต้นไป`);
  });
  $("auto-speak").addEventListener("change", (event) => updateSetting({ autoSpeak: event.target.checked }));
  $("speech-rate").addEventListener("change", (event) => {
    updateSetting({ speechRate: Number(event.target.value) });
    speakWord("Hello, welcome to Vocab Garden");
  });
  $("sound-fx").addEventListener("change", (event) => {
    updateSetting({ sound: event.target.checked });
    fx("combo"); // ลองฟังทันทีที่เปิด (การแตะเป็นการกระทำของผู้ใช้ เบราว์เซอร์จึงยอมให้เล่นเสียง)
  });
  $("app-badge").addEventListener("change", async (event) => {
    const box = event.target;
    if (box.checked && !(await askBadgePermission())) {
      box.checked = false;
      toast("ต้องอนุญาตการแจ้งเตือนของแอปนี้ก่อน ตัวเลขบนไอคอนจึงจะขึ้นได้");
      return;
    }
    updateSetting({ appBadge: box.checked });
    updateAppBadge();
    toast(box.checked ? "จะแสดงตัวเลขคำที่ต้องทวนบนไอคอนแอปแล้ว 🔢" : "ปิดตัวเลขบนไอคอนแอปแล้ว");
  });
  $("speech-test").addEventListener("click", () => speakWord("Hello, welcome to Vocab Garden"));
  $("theme").addEventListener("change", (event) => updateSetting({ theme: event.target.value }));
  $("text-size").addEventListener("change", (event) => updateSetting({ textSize: event.target.value }));
  $("menu-position").addEventListener("change", (event) => updateSetting({ menuPosition: event.target.value }));
  $("quiz-mode").addEventListener("change", (event) => updateSetting({ quizMode: event.target.value }));
  $("scheduler").addEventListener("change", (event) => updateSetting({ scheduler: event.target.value }));
  $("quiz-typing").addEventListener("change", (event) => updateSetting({ quizTyping: event.target.checked }));
  $("daily-goal").addEventListener("change", (event) => {
    updateSetting({ dailyGoal: Number(event.target.value) });
    toast(`ตั้งเป้าหมายวันละ ${state.settings.dailyGoal} ครั้งแล้ว`);
  });
  $("round-size").addEventListener("change", (event) => {
    updateSetting({ roundSize: Number(event.target.value) });
    toast(state.settings.roundSize ? `พักถามทุก ๆ ${state.settings.roundSize} ใบแล้ว` : "ไม่แบ่งรอบแล้ว ท่องรวดเดียวจนจบ");
  });
  $("review-cap").addEventListener("change", (event) => {
    updateSetting({ reviewCap: Number(event.target.value) });
    toast(state.settings.reviewCap ? `วันนี้ทวนได้ไม่เกิน ${state.settings.reviewCap} ครั้ง` : "ทวนได้ไม่จำกัดต่อวัน");
  });
  $("reminder-make").addEventListener("click", makeReminder);
  $("export").addEventListener("click", exportBackup);
  $("snapshot-now").addEventListener("click", async () => {
    const saved = await takeSnapshot("manual");
    toast(saved ? "เก็บสำเนาตอนนี้แล้ว 💾" : "เก็บสำเนาไม่ได้ ยังไม่มีความคืบหน้า หรือเบราว์เซอร์ไม่รองรับ");
    renderSnapshots();
  });
  $("snapshot-clear").addEventListener("click", async () => {
    if (!confirm("ลบสำเนาอัตโนมัติทั้งหมดในเครื่องนี้ใช่ไหม? ความคืบหน้าปัจจุบันไม่หาย")) return;
    try {
      await clearSnapshots();
    } catch {
      // ลบไม่ได้ก็แสดงรายการเดิม
    }
    renderSnapshots();
  });
  $("import").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importBackup(file);
    event.target.value = "";
  });
  $("reset").addEventListener("click", resetProgress);
}

export { startSettings as start };
