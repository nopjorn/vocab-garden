import { LEVELS, levelTitle, loadWords } from "./data.js";
import { comboMessage, growthSummary, nextCombo, recordGrowth, stageMove, wordList } from "./celebrate.js";
import { launchConfetti } from "./confetti.js";
import { canSpeak, speak } from "./speech.js";
import { buildQuestion, gradeTyped } from "./quiz.js";
import { playSfx } from "./sfx.js";
import { STATUSES, matchingWords, statusOf } from "./flash.js";
import { CARD_HEIGHT, CARD_WIDTH, buildCardData, drawCard } from "./sharecard.js";
import { compareText, weeklyReport } from "./weekly.js";
import { backupDue, backupText, canSnapshot, daysSinceBackup, hasSnapshot, markSince, saveSnapshot } from "./backup.js";
import { wordOfDay } from "./daily.js";
import { DECORATIONS, bloomedLevels, flowerId, flowerOf, ownedDecorations, seasonOf } from "./decor.js";
import { COMEBACK_DAYS, MEDALS, isEarlyBird, isPerfectRound, newMedals } from "./achievements.js";
import { GIFTS, RARITIES, giftId, giftedOn, ownedGifts, pickGift } from "./gifts.js";
import { applySky } from "./sky.js";
import { treeEl } from "./tree-art.js";
import { LEECH_LAPSES, dueLabel, leechWords, plantInfo, plantedInLevel, reviewedToday } from "./garden.js";
import { daysAway, goalProgress, mergeDays, settleRest } from "./habit.js";
import { formatSeconds } from "./match.js";
import { canBadge, showBadge } from "./badge.js";
import { LISTEN_COUNT, dictationMax } from "./listen.js";
import { maxScore } from "./scramble.js";
import { allDone, missionProgress } from "./missions.js";
import { completedMonths, monthlyProgress } from "./monthly.js";
import { AGAIN, GOOD, HARD, STAGES, buildQueue, dayNumber, grade, isDue, knownCard, stageOf } from "./srs.js";
import { NOTE_MAX, createStorage } from "./storage.js";
import { entriesSince, inlineParts, parseChangelog } from "./changelog.js";
import { issueUrl } from "./report.js";
import { describeForms } from "./forms.js";
import { fsrsGrade } from "./fsrs.js";
import { streakOf, totalReviews } from "./stats.js";
import { recallBetween } from "./recall.js";
import { SUPPORT_LINKS } from "./support.js";
import { isNewer, parseSwVersion } from "./update.js";

const VIEWS = ["loading", "error", "home", "study", "done", "garden", "plot", "play", "match", "flash", "wordle", "scramble", "sentence", "blitz", "confuse", "listen", "dictation", "commute", "placement", "exam", "bugs", "settings", "about", "changelog"];
const TAB_OF_VIEW = { plot: "garden", changelog: "about", match: "play", flash: "play", wordle: "play", scramble: "play", sentence: "play", blitz: "play", confuse: "play", listen: "play", dictation: "play", commute: "play", placement: "settings", exam: "garden", bugs: "garden" }; // หน้าที่ไม่มีแท็บของตัวเอง ให้ไฮไลต์แท็บนี้แทน
const REQUEUE_GAP = 3; // คำที่ตอบ "ยังจำไม่ได้" จะกลับมาอีกครั้งหลังการ์ดใบอื่นอีก 3 ใบ
const SWIPE_DISTANCE = 90; // ปัดเกินกี่ px ถึงนับเป็นการให้คะแนน
const SWIPE_PREVIEW = 40; // ปัดเกินกี่ px ถึงเริ่มขึ้นป้ายบนการ์ด
const UPDATE_CHECK_MS = 30 * 60 * 1000; // ระหว่างเปิดแอปค้างไว้ เช็คเวอร์ชันใหม่ทุก 30 นาที

const storage = createStorage();
const state = {
  words: [],
  cards: storage.loadCards(),
  settings: storage.loadSettings(),
  notes: storage.loadNotes(),
  fsrs: storage.loadFsrs(),
  session: null,
};

const $ = (id) => document.getElementById(id);

// ความคืบหน้า ความจำ FSRS โน้ต และการตั้งค่า ถูกถือไว้ในหน่วยความจำของแต่ละแท็บ ถ้าเปิดแอปไว้หลายแท็บ
// ต้องอ่านค่าล่าสุดจาก storage ก่อนแก้แล้วเขียนกลับทุกครั้ง ไม่งั้นแท็บที่เปิดค้างไว้จะเขียนทับงานของแท็บอื่น
function refreshShared() {
  state.cards = storage.loadCards();
  state.settings = storage.loadSettings();
  state.notes = storage.loadNotes();
  state.fsrs = storage.loadFsrs();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let shownView = null;

function show(view) {
  VIEWS.forEach((name) => {
    $(`view-${name}`).hidden = name !== view;
  });
  // เปลี่ยนหน้า: หน้าใหม่ค่อย ๆ ปรากฏ (CSS .view-enter หยุดเองเมื่อเครื่องตั้ง "ลดการเคลื่อนไหว") วาดหน้าเดิมซ้ำไม่ต้องเล่น
  if (view !== shownView) {
    const page = $(`view-${view}`);
    page.classList.remove("view-enter");
    void page.offsetWidth; // ให้แอนิเมชันเริ่มใหม่ทุกครั้ง
    page.classList.add("view-enter");
    shownView = view;
  }
  document.body.classList.toggle("studying", view === "study");
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    if (tab.dataset.tab === (TAB_OF_VIEW[view] || view)) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

// ธีม (ตามเครื่อง/สว่าง/มืด) และขนาดตัวอักษรตามการตั้งค่า
function applyAppearance() {
  const { theme, textSize, menuPosition } = state.settings;
  const root = document.documentElement;
  if (menuPosition === "top" || menuPosition === "dock") root.dataset.menu = menuPosition;
  else delete root.dataset.menu;
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
  if (textSize === "large") root.dataset.textSize = "large";
  else delete root.dataset.textSize;

  const dark = theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#07110d" : "#059669");
}

function speakWord(text) {
  speak(text, state.settings.speechRate);
}

// เสียงประกอบ (เล่นเมื่อเปิดในตั้งค่าเท่านั้น)
function fx(name) {
  playSfx(name, state.settings.sound);
}

function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    box.hidden = true;
  }, 3000);
}

function translatedWords() {
  return state.words.filter((word) => word.translated);
}

function newLimit(day) {
  return Math.max(0, state.settings.newPerDay - storage.newCountToday(day));
}

// ทวนได้อีกกี่ครั้งในวันนี้ตามเพดานที่ตั้งไว้ (นับจากจำนวนครั้งที่ตอบไปแล้ววันนี้) 0 ในตั้งค่า = ไม่จำกัด
function reviewBudget(day) {
  const cap = state.settings.reviewCap;
  return cap ? Math.max(0, cap - (storage.loadHistory()[day] || 0)) : Infinity;
}

// ลำดับของด่านไว้เทียบกับ "เริ่มคำใหม่จากด่าน" (ด่านพิเศษถือว่าอยู่หลังสุด)
function levelNumber(level) {
  return level === "sup" ? Number.MAX_SAFE_INTEGER : Number(level);
}

// คิวของรอบนี้: ถ้าระบุ level จะเรียนเฉพาะด่านนั้น (คำใหม่ได้วันละตามที่ตั้งไว้ต่อรอบ) ไม่ระบุคือคิวของวันนี้
function todayQueue(day, level = null) {
  const translated = translatedWords();
  if (level) {
    const words = translated.filter((word) => word.level === level);
    return buildQueue(words, state.cards, day, state.settings.newPerDay);
  }
  const fresh = translated.filter((word) => levelNumber(word.level) >= state.settings.startLevel);
  return buildQueue(translated, state.cards, day, newLimit(day), fresh, reviewBudget(day));
}

// ---------- หน้าหลัก ----------

function greeting(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return "สวัสดีตอนเช้า ☀️";
  if (hour >= 12 && hour < 17) return "สวัสดีตอนบ่าย 🌤️";
  if (hour >= 17 && hour < 21) return "สวัสดีตอนเย็น 🌇";
  return "สวัสดีตอนค่ำ 🌙";
}

// ด่านที่ยังไม่แปลรวมเป็นแถวเดียว หน้าหลักจะได้ไม่ยาวตามจำนวนด่าน
function lockedItem(levels) {
  const count = levels.reduce((sum, level) => sum + state.words.filter((word) => word.level === level).length, 0);
  const numbered = levels.filter((level) => level !== "sup").map(Number);
  const range = numbered.length > 1 ? `แปลง ${numbered[0]}–${numbered[numbered.length - 1]}` : `แปลง ${numbered[0]}`;
  const label = levels.includes("sup") ? `${range} และแปลงพิเศษ` : range;
  const item = el("li", "level locked level-rest");
  const info = el("div", "level-info");
  info.append(
    el("p", "level-title", `${levels.length} แปลงที่เหลือ`),
    el("p", "level-sub", `${label} · ${count.toLocaleString()} คำ · กำลังปลูก เร็ว ๆ นี้`),
  );
  item.append(el("span", "level-badge", "🔒"), info);
  return item;
}

const FRESH_VISIBLE = 2; // แปลงที่ยังไม่เริ่มที่แสดงต่อจากแปลงที่เริ่มแล้ว ที่เหลือพับไว้
let freshOpen = false;

const plantedIn = (level) => state.words.filter((word) => word.level === level && stageOf(state.cards[word.headword]).id !== "seed").length;

function levelItem(level) {
  const words = state.words.filter((word) => word.level === level);
  const item = el("li", "level");
  const badge = el("span", "level-badge", level === "sup" ? "★" : String(Number(level)));
  const info = el("div", "level-info");
  info.append(el("p", "level-title", levelTitle(level)));
  item.append(badge, info);

  // แตะที่ด่านเพื่อเรียนเฉพาะด่านนั้น
  item.classList.add("clickable");
  item.tabIndex = 0;
  item.setAttribute("role", "link");
  item.setAttribute("aria-label", `เรียนเฉพาะ${levelTitle(level)}`);
  const open = () => {
    location.hash = `#/study/${level}`;
  };
  item.addEventListener("click", open);
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter") open();
  });

  const counts = Object.fromEntries(STAGES.map((stage) => [stage.id, 0]));
  words.forEach((word) => {
    counts[stageOf(state.cards[word.headword]).id] += 1;
  });
  const planted = words.length - counts.seed;
  if (planted === 0) {
    // แปลงที่ยังไม่เริ่ม: เหลือแค่เลขแปลงกับกรอบจาง ๆ ไม่มีเปอร์เซ็นต์และแถบ
    item.classList.add("level-fresh");
    info.append(el("p", "level-sub", "ยังไม่เริ่ม"));
    return item;
  }
  info.append(el("p", "level-sub", `${planted}/${words.length} คำ`));
  item.append(el("span", "level-pct", `${Math.round((planted / words.length) * 100)}%`));
  item.title = STAGES.map((stage) => `${stage.emoji} ${stage.label} ${counts[stage.id]}`).join(" · ");

  // แถบสีแยกตามระยะของต้นไม้ (ไม่รวมเมล็ด)
  const bar = el("div", "stagebar");
  STAGES.slice(1).forEach((stage) => {
    if (counts[stage.id] === 0) return;
    const segment = el("span", `seg seg-${stage.id}`);
    segment.style.width = `${(counts[stage.id] / words.length) * 100}%`;
    bar.append(segment);
  });
  item.append(bar);
  return item;
}

// ปุ่มพับ/ขยายแปลงที่ยังไม่เริ่ม ใช้ร่วมกันทั้งหน้าหลักและหน้าสวน (สถานะพับ/ขยายใช้ร่วมกัน)
function foldItem(count, tag, container, rebuild) {
  const item = el(tag, "level-fold");
  const button = el("button", "level-fold-btn", `${freshOpen ? "ซ่อน" : "แปลงที่ยังไม่เริ่ม"} (${count}) ${freshOpen ? "▴" : "▾"}`);
  button.type = "button";
  button.setAttribute("aria-expanded", String(freshOpen));
  button.addEventListener("click", () => {
    freshOpen = !freshOpen;
    rebuild();
    container.querySelector(".level-fold-btn")?.focus({ preventScroll: true });
  });
  item.append(button);
  return item;
}

// แปลงที่เริ่มแล้วแสดงเต็ม ตามด้วยแปลงที่ยังไม่เริ่มถัดไป FRESH_VISIBLE แปลง ที่เหลือพับไว้ใต้ปุ่ม
function levelItems() {
  const items = [];
  const folded = [];
  let locked = [];
  let fresh = 0;
  const flush = () => {
    if (locked.length > 0) items.push(lockedItem(locked));
    locked = [];
  };
  for (const level of LEVELS) {
    if (!state.words.some((word) => word.level === level && word.translated)) {
      locked.push(level);
      continue;
    }
    flush();
    if (plantedIn(level) === 0 && (fresh += 1) > FRESH_VISIBLE) folded.push(levelItem(level));
    else items.push(levelItem(level));
  }
  flush();
  if (folded.length > 0) items.push(foldItem(folded.length, "li", $("levels"), () => $("levels").replaceChildren(...levelItems())), ...(freshOpen ? folded : []));
  return items;
}

// สรุปสัปดาห์ที่แล้ว: โชว์ที่หน้าหลังครั้งแรกของสัปดาห์ใหม่ จนกว่าจะกดปิด (สัปดาห์ที่ไม่ได้ท่องเลยไม่โชว์)
function renderWeekly(today, active) {
  const report = weeklyReport(active, storage.loadLog(), today, storage.loadWeekSeen());
  const answers = storage.loadAnswers();
  $("weekly").hidden = !report;
  if (!report) return;
  const { week, previous } = report;
  const lines = [
    `🔁 ทวน ${week.reviews.toLocaleString()} ครั้ง ใน ${week.activeDays} วัน${compareText(week.reviews, previous.reviews) ? ` (${compareText(week.reviews, previous.reviews)})` : ""}`,
  ];
  if (week.hasLog) {
    lines.push(`🌱 ปลูกใหม่ ${week.planted} คำ`, `🌳 โตเป็นต้นไม้ใหญ่ ${week.trees} ต้น`);
    if (week.rate !== null) lines.push(`🎯 ตอบจำได้ ${week.rate}%`);
  }
  const recall = recallBetween(answers, week.start, week.start + 6);
  if (recall.rate !== null) lines.push(`🧠 คำที่เคยเรียนแล้ว จำได้ ${recall.rate}% (แม่น ${recall.good} · พอจำได้ ${recall.hard} · ลืม ${recall.again})`);
  $("weekly-list").replaceChildren(...lines.map((line) => el("li", "", line)));
  $("weekly-dismiss").onclick = () => {
    storage.saveWeekSeen(report.markSeen);
    $("weekly").hidden = true;
  };
}

// ศัพท์ของวันนี้: คำเดียวกันทั้งวัน แตะเพื่อดูรายละเอียด (ไม่เปลี่ยนตารางทวน)
// กดปุ่ม 🎲 เพื่อสุ่มคำอื่นได้ เฉพาะวันนั้น (พรุ่งนี้กลับไปเป็นคำประจำวัน)
let wotdPick = null; // { day, word } คำที่สุ่มเองในวันนั้น

function currentWordOfDay(today) {
  return wotdPick?.day === today ? wotdPick.word : wordOfDay(translatedWords(), today);
}

// คำที่สุ่มได้: อยู่ในแปลงและระยะของต้นไม้ที่ตั้งไว้ในหน้าตั้งค่า
function wotdPool(today) {
  const levels = levelSetOf(state.settings.wotdLevels);
  const stages = new Set(state.settings.wotdStages);
  return translatedWords().filter((word) => levels.has(word.level) && stages.has(plantInfo(state.cards[word.headword], today).stage.id));
}

// ตั้งค่าคำที่สุ่มได้เปลี่ยน: คำที่สุ่มไว้อาจไม่อยู่ในกองใหม่แล้ว
function resetWotdPick() {
  wotdPick = null;
}

function shuffleWordOfDay(today) {
  const current = currentWordOfDay(today);
  const others = wotdPool(today).filter((word) => word !== current);
  if (others.length === 0) {
    toast("ไม่มีคำในแปลงและระยะที่เลือกไว้ ลองเพิ่มในหน้าตั้งค่า");
    return;
  }
  wotdPick = { day: today, word: others[Math.floor(Math.random() * others.length)] };
  renderWordOfDay(today);
}

function renderWordOfDay(today) {
  const word = currentWordOfDay(today);
  $("wotd").hidden = !word;
  if (!word) return;
  const shuffled = wotdPick?.day === today;
  const info = plantInfo(state.cards[word.headword], today);
  const sense = word.senses[0];
  $("wotd-label").textContent = shuffled ? "🎲 คำสุ่ม" : "💡 ศัพท์ของวันนี้";
  $("wotd-word").replaceChildren(treeEl(info.stage.id, { wilted: info.wilted }), word.headword);
  $("wotd-meaning").textContent = sense ? `${sense.label} · ${sense.text}` : "";
  $("wotd-example").textContent = word.exampleEn;
  $("wotd-open").onclick = () => openWordDialog(word);
  $("wotd-speak").hidden = !canSpeak();
  $("wotd-speak").onclick = () => speakWord(word.headword);
  $("wotd-shuffle").onclick = () => shuffleWordOfDay(today);
}

// คำนวณวันพักถึงปัจจุบัน (รันซ้ำได้ ผลเดิม) แล้วคืนประวัติกับสถานะวันพัก
function refreshHabit(day) {
  const history = storage.loadHistory();
  const active = mergeDays(history, storage.loadGames().days); // วันที่ท่องหรือเล่นเกม นับเป็นวันท่องต่อเนื่อง
  const { rest, usedNow, earned } = settleRest(active, storage.loadRest(), day);
  storage.saveRest(rest);
  return { history, active, rest, usedNow, earned };
}

function announceRest({ usedNow, earned, rest }) {
  if (usedNow.length > 0) {
    toast(`🧊 ใช้วันพักให้ ${usedNow.length} วัน สตรีคของคุณไม่หาย (เหลือ ${rest.bank} วัน)`);
  } else if (earned > 0) {
    toast("🧊 ท่องติดกันครบ 7 วัน ได้วันพักเพิ่ม 1 วัน");
  }
}

// ถึงเป้าหมายรายวันครั้งแรกของวัน: ฉลอง
function checkGoal(day, count) {
  if (count < state.settings.dailyGoal || storage.loadDaily(day).goalDone) return;
  storage.saveGoalDone(day);
  const gift = giveGift(day);
  toast(`🎯 ถึงเป้าวันนี้แล้ว! ทวนไป ${count} ครั้ง${gift ? " ได้กล่องของขวัญจากสวน 🎁 เปิดดูได้ตอนจบรอบ" : ""}`);
  launchConfetti();
  fx("finish");
}

// ---------- ของขวัญจากสวน ----------

// ถึงเป้าของวันแล้วได้ของขวัญ 1 ชิ้น (สุ่มจากของที่ยังไม่มี) บันทึกทันทีกันหาย แล้วรอให้ผู้ใช้กดเปิดเอง
let pendingGift = null;

function giveGift(day) {
  const medals = storage.loadMedals();
  if (giftedOn(medals, day)) return null;
  const gift = pickGift(medals);
  if (!gift) return null;
  storage.addMedals([giftId(gift)], day);
  pendingGift = gift;
  renderGiftButtons();
  return gift;
}

function renderGiftButtons() {
  $("done-gift").hidden = !pendingGift;
  $("home-gift").hidden = !pendingGift;
}

function openGift() {
  if (!pendingGift) return;
  const gift = pendingGift;
  const rarity = RARITIES[gift.rarity];
  $("gift-box").hidden = false;
  $("gift-reveal").hidden = true;
  $("gift-open").hidden = false;
  $("gift-close").hidden = true;
  $("gift-emoji").textContent = gift.emoji;
  $("gift-title").textContent = gift.title;
  $("gift-rarity").textContent = `${rarity.stars} ${rarity.label}`;
  $("gift-rarity").dataset.rarity = gift.rarity;
  $("gift-progress").textContent = `เก็บของขวัญได้ ${ownedGifts(storage.loadMedals()).length}/${GIFTS.length} ชิ้น ดูทั้งหมดได้ที่ สวน → ภาพรวม → ดอกไม้และของแต่งสวน`;
  $("gift-dialog").hidden = false;
  $("gift-open").focus();
}

function revealGift() {
  const legendary = pendingGift?.rarity === "legendary";
  pendingGift = null;
  renderGiftButtons();
  $("gift-box").hidden = true;
  $("gift-reveal").hidden = false;
  $("gift-open").hidden = true;
  $("gift-close").hidden = false;
  $("gift-close").focus();
  launchConfetti(legendary ? 64 : 24);
  fx(legendary ? "finish" : "grow");
}

// ตัวเลขบนไอคอนแอป = จำนวนคำที่ถึงเวลาทวนทั้งหมด (ไม่ถูกจำกัดด้วยเพดานต่อวัน) ล้างเมื่อปิดตัวเลือกหรือไม่มีคำค้าง
function updateAppBadge() {
  if (!canBadge()) return;
  const today = dayNumber();
  const due = translatedWords().filter((word) => isDue(state.cards[word.headword], today)).length;
  showBadge(due, state.settings.appBadge);
}

// ---------- ต้อนรับผู้ใช้ใหม่ ----------

// แสดงจนกว่าจะเริ่มปลูกคำแรก ทำแบบทดสอบ หรือกดปิด (จำไว้ใน vg:settings)
let installPrompt = null; // Android / คอม: ปุ่มติดตั้งแอปของเบราว์เซอร์ (beforeinstallprompt)
const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function renderWelcome() {
  const show = !state.settings.welcomed && Object.keys(state.cards).length === 0;
  $("welcome").hidden = !show;
  if (!show) return;
  $("welcome-install").hidden = isInstalled();
  $("welcome-install-btn").hidden = !installPrompt;
}

function closeWelcome() {
  if (!state.settings.welcomed) updateSetting({ welcomed: true });
  $("welcome").hidden = true;
}

function renderHome() {
  const today = dayNumber();
  const queue = todayQueue(today);
  const dueCount = queue.filter((word) => state.cards[word.headword]).length;
  const habit = refreshHabit(today);
  const totalDue = translatedWords().filter((word) => isDue(state.cards[word.headword], today)).length;
  updateAppBadge();
  renderBackupReminder();
  renderWelcome();
  $("greeting").textContent = greeting();
  $("due-count").textContent = dueCount;
  $("new-count").textContent = queue.length - dueCount;
  $("start").hidden = queue.length === 0;
  $("today-empty").hidden = queue.length > 0;
  $("today-empty").textContent =
    totalDue > 0
      ? `วันนี้ทวนครบโควตาแล้ว 🎉 เหลือคำรอทวน ${totalDue} คำ พรุ่งนี้ทยอยทวนต่อ (ปรับโควตาได้ที่ตั้งค่า)`
      : "วันนี้ทวนครบแล้ว 🎉 พรุ่งนี้มาดูสวนกันใหม่นะ";
  $("backlog-note").hidden = !(queue.length > 0 && totalDue > dueCount);
  $("backlog-note").textContent = `📚 มีคำรอทวน ${totalDue} คำ วันนี้ทยอยทวนก่อน ${dueCount} ใบ (ค้างนานสุดก่อน) งดคำใหม่ชั่วคราวจนกว่าคำค้างจะเบาลง`;
  const away = daysAway(habit.active, today);
  $("welcome-back").hidden = !(away >= 3 && totalDue > 0);
  $("welcome-back").textContent = `ยินดีต้อนรับกลับมา 🌱 ห่างไป ${away} วัน ไม่เป็นไรเลย ลิซ่าทยอยให้ทวนทีละส่วน เริ่มจากคำที่ค้างนานสุดก่อนนะ`;

  const goal = goalProgress(habit.history, today, state.settings.dailyGoal);
  $("goal-text").textContent = goal.reached ? `🎯 ถึงเป้าวันนี้แล้ว ${goal.done}/${goal.goal} ✅` : `🎯 เป้าวันนี้ ${goal.done}/${goal.goal}`;
  $("goal-fill").style.width = `${goal.percent}%`;
  $("goal-bar").setAttribute("aria-valuenow", goal.percent);

  const translated = translatedWords();
  const planted = translated.filter((word) => state.cards[word.headword]).length;
  $("garden-count").textContent = planted;
  renderStageLegend();
  $("garden-ring").style.setProperty("--p", translated.length ? (planted / translated.length) * 100 : 0);
  $("garden-ring").setAttribute("aria-label", `ปลูกแล้ว ${planted} จาก ${translated.length} คำ`);
  checkMedals();
  const { current } = streakOf(habit.active, today, habit.rest.frozen);
  $("streak").hidden = current === 0;
  $("streak").textContent = `🔥 ท่องต่อเนื่อง ${current} วัน${habit.rest.bank > 0 ? ` · 🧊 วันพัก ${habit.rest.bank}` : ""}`;
  announceRest(habit);
  $("garden-total").textContent = `แปลแล้ว ${translated.length.toLocaleString()} / ${state.words.length.toLocaleString()} คำ`;

  renderGiftButtons();
  renderMissions(today);
  renderMonthly(today);
  renderWeekly(today, habit.active);
  renderWordOfDay(today);
  $("levels").replaceChildren(...levelItems());
  $("storage-warning").hidden = storage.persistent;
}

// ---------- ท่องศัพท์ ----------

// level = เรียนเฉพาะด่านนั้น · practice = โหมดฝึก ไม่เปลี่ยนวันทวน ไม่นับเป็นการทวน:
//   "leech" คำที่ลืมบ่อย · "today" คำที่ตอบไปแล้ววันนี้ · "level" คำที่ปลูกแล้วในแปลง level
// คำใหม่เพิ่มอีกไม่กี่คำ (ปุ่มท้ายรอบ) เลือกตามลำดับ NGSL เหมือนคำใหม่ปกติ
const EXTRA_NEW_COUNT = 5;

function extraQueue() {
  const fresh = translatedWords().filter((word) => levelNumber(word.level) >= state.settings.startLevel);
  return fresh.filter((word) => !state.cards[word.headword]).slice(0, EXTRA_NEW_COUNT);
}

// คิวของโหมดฝึก (ไม่ใช่โหมดฝึก = null)
function practiceQueue(practice, level, day) {
  if (practice === "leech") return leechWords(translatedWords(), state.cards);
  if (practice === "today") return reviewedToday(translatedWords(), state.cards, day);
  if (practice === "level") return plantedInLevel(translatedWords(), state.cards, level);
  return null;
}

function startSession(level = null, practice = null, extra = false) {
  const day = dayNumber();
  const queue = extra ? extraQueue() : practiceQueue(practice, level, day) || todayQueue(day, level);
  if (queue.length === 0) {
    if (extra) toast("ตอนนี้ไม่มีคำใหม่เหลือให้เรียนเพิ่ม");
    else if (practice === "today") toast("วันนี้ยังไม่ได้ตอบคำไหนเลย ไปท่องศัพท์ก่อนนะ");
    else if (practice === "level") toast(`${levelTitle(level)} ยังไม่มีคำที่ปลูกแล้วให้ฝึก`);
    else if (practice) toast("ยังไม่มีคำที่ลืมบ่อย เก่งมาก 🎉");
    else if (level) toast(`${levelTitle(level)} ไม่มีคำให้เรียนตอนนี้ ไว้ทวนใหม่วันหลังนะ`);
    location.hash = practice ? "#/garden" : "#/";
    return;
  }
  state.session = {
    day,
    queue,
    total: queue.length,
    answered: 0,
    learned: new Set(),
    combo: 0,
    bestCombo: 0,
    grown: new Map(),
    quiz: null,
    practice: Boolean(practice),
    nudged: new Set(),
    hadAgain: false,
    roundStart: 0,
    away: practice ? null : daysAway(mergeDays(storage.loadHistory(), storage.loadGames().days), day),
  };
  forgetAnswer();
  $("practice-note").hidden = !practice;
  $("know").hidden = Boolean(practice);
  show("study");
  renderCombo();
  showCard();
}

function currentWord() {
  return state.session.queue[0];
}

function showCard() {
  const word = currentWord();
  const { queue, total, learned } = state.session;
  $("study-progress").textContent = `เหลือ ${queue.length} ใบ`;
  const percent = Math.round((learned.size / total) * 100);
  $("study-bar").style.width = `${percent}%`;
  $("study-progressbar").setAttribute("aria-valuenow", percent);
  $("card-level").textContent = `${levelTitle(word.level)} · อันดับ ${word.rank}`;
  $("card-word").textContent = word.headword;
  $("card-hint").hidden = false;
  $("card-back").hidden = true;
  $("grades").hidden = true;
  $("flip").hidden = false;

  $("card-senses").replaceChildren(
    ...word.senses.map((sense) => {
      const item = el("li");
      item.append(el("span", `pos pos-${sense.pos}`, sense.label), document.createTextNode(sense.text));
      return item;
    }),
  );
  $("card-emoji").textContent = word.emoji;
  $("card-emoji").hidden = !word.emoji;
  renderForms($("card-forms"), word);
  $("card-example-en").textContent = word.exampleEn;
  $("card-example-th").textContent = word.exampleTh;
  renderExtra("card", word);
  $("card-note").textContent = word.note ? `💡 ${word.note}` : "";
  $("card-note").hidden = !word.note;
  renderCardNote(word);
  $("report").href = issueUrl(word, self.VG_VERSION);
  $("card").focus({ preventScroll: true });
  state.session.quiz = quizFor(word);
  renderQuiz(word); // ข้อพิมพ์ย้ายโฟกัสไปที่ช่องพิมพ์
  if (state.settings.autoSpeak && !["cloze", "type"].includes(state.session.quiz?.type)) speakWord(word.headword);
}

// รูปคำอื่นของคำ (คอลัมน์ forms ของ NGSL) พร้อมคำอธิบายว่าแต่ละรูปคืออะไร เช่น worked = อดีต (V2) · ไม่แน่ใจ = แสดงเฉพาะรูปคำ
function renderForms(container, word) {
  const forms = describeForms(word);
  container.hidden = forms.length === 0;
  if (forms.length === 0) return;
  container.replaceChildren(
    "รูปคำอื่น: ",
    ...forms.flatMap(({ form, label }, index) => {
      const item = el("span", "form-item");
      item.append(el("strong", "", form));
      item.lastChild.lang = "en";
      if (label) item.append(" ", el("span", "form-label", label));
      return index === 0 ? [item] : [" · ", item];
    }),
  );
}

// ประโยคตัวอย่างที่ 2 และคำที่มักใช้คู่กัน (มีเฉพาะคำที่เขียนข้อมูลเพิ่มไว้ ดู data/extra/) prefix = card หรือ word
function renderExtra(prefix, word) {
  const hasExample = Boolean(word.example2En);
  const hasColloc = word.collocations.length > 0;
  $(`${prefix}-extra`).hidden = !hasExample && !hasColloc;
  $(`${prefix}-example2-en`).textContent = word.example2En;
  $(`${prefix}-example2-th`).textContent = word.example2Th;
  $(`${prefix}-example2-en`).parentElement.hidden = !hasExample;
  $(`${prefix}-example2-th`).hidden = !hasExample;
  $(`${prefix}-colloc-title`).hidden = !hasColloc;
  $(`${prefix}-colloc`).hidden = !hasColloc;
  $(`${prefix}-colloc`).replaceChildren(
    ...word.collocations.map(({ phrase, meaning }) => {
      const item = el("li");
      const english = el("strong", "", phrase);
      english.lang = "en";
      item.append(english, el("span", "muted", ` — ${meaning}`));
      return item;
    }),
  );
}

// ---------- โน้ตช่วยจำ ----------

function renderCardNote(word) {
  const note = state.notes[word.headword];
  $("card-mynote").hidden = !note;
  $("card-mynote").textContent = note ? `📝 ${note}` : "";
  $("edit-note").textContent = note ? "✏️ แก้โน้ตช่วยจำ" : "✏️ เพิ่มโน้ตช่วยจำ";
}

let noteWord = null;

function openNoteDialog(word) {
  noteWord = word;
  $("note-word").textContent = word.headword;
  $("note-text").value = state.notes[word.headword] || "";
  $("note-count").textContent = `${$("note-text").value.length}/${NOTE_MAX}`;
  $("note-delete").hidden = !state.notes[word.headword];
  $("note-dialog").hidden = false;
  $("note-text").focus();
}

function saveNote(text) {
  state.notes = storage.saveNote(noteWord.headword, text);
  checkMedals();
  $("note-dialog").hidden = true;
  if (state.session && currentWord()?.headword === noteWord.headword) renderCardNote(noteWord);
  if (!$("word-dialog").hidden) renderWordNote(noteWord);
  if (!$("view-garden").hidden) loaded.garden?.renderLeeches();
  toast(text.trim() ? "บันทึกโน้ตแล้ว 📝" : "ลบโน้ตแล้ว");
}

// ---------- ทวนแบบผสม (เลือกคำแปล / เติมคำในประโยค) ----------

// คำถามของการ์ดใบนี้ (null = พลิกการ์ดแบบเดิม): ใช้เฉพาะโหมด "ผสมหลายแบบ" และกับคำที่เคยเห็นแล้ว
function quizFor(word) {
  if (state.settings.quizMode !== "mixed") return null;
  const question = buildQuestion(word, state.cards[word.headword], translatedWords(), Math.random, { typing: state.settings.quizTyping });
  return question && { ...question, answered: false, rating: null, hinted: false };
}

function renderQuiz(word) {
  const quiz = state.session.quiz;
  $("quiz-options").hidden = !quiz || quiz.type === "type";
  $("quiz-type").hidden = quiz?.type !== "type";
  $("quiz-feedback").hidden = true;
  $("quiz-next").hidden = true;
  $("quiz-skip").hidden = !quiz;
  $("swipe-hint").hidden = Boolean(quiz); // ทวนแบบผสมไม่ปัดการ์ด
  $("flip").hidden = Boolean(quiz);
  $("speak-word").hidden = quiz?.type === "cloze" || quiz?.type === "type";
  $("card-word").classList.toggle("sentence", quiz?.type === "cloze" || quiz?.type === "type");
  if (!quiz) return;

  if (quiz.type === "type") {
    $("card-word").textContent = quiz.prompt;
    $("card-hint").textContent = `พิมพ์คำภาษาอังกฤษ (${quiz.posLabel} · ${quiz.answerText.length} ตัวอักษร)`;
    $("quiz-input").value = "";
    $("quiz-input").disabled = false;
    $("quiz-check").disabled = false;
    $("quiz-hint").disabled = false;
    $("quiz-input").focus({ preventScroll: true });
    return;
  }
  if (quiz.type === "cloze") {
    $("card-word").replaceChildren(quiz.before, el("span", "blank", "＿＿＿＿"), quiz.after);
    $("card-hint").textContent = `เติมคำที่หายไป · ${quiz.hintTh || word.exampleTh}`;
  } else {
    $("card-hint").textContent = "เลือกคำแปลที่ถูกต้อง";
  }
  $("quiz-options").replaceChildren(
    ...quiz.options.map((option, index) => {
      const item = el("li");
      const button = el("button", "quiz-option", option.text);
      button.type = "button";
      button.dataset.index = index;
      if (quiz.type === "cloze") button.lang = "en";
      button.prepend(el("kbd", "", index + 1));
      item.append(button);
      return item;
    }),
  );
}

// จบคำถามหนึ่งข้อ: บอกผล เปิดด้านหลังการ์ด แล้วรอให้กด "ต่อไป"
function settleQuiz(rating, message, good) {
  const quiz = state.session.quiz;
  quiz.answered = true;
  quiz.rating = rating;
  $("quiz-feedback").textContent = message;
  $("quiz-feedback").classList.toggle("is-correct", good);
  $("quiz-feedback").hidden = false;
  $("quiz-skip").hidden = true;
  flip();
  $("quiz-next").hidden = false;
  $("quiz-next").focus({ preventScroll: true });
}

// index = ตัวเลือกที่แตะ (-1 = กด "ไม่รู้ ดูคำตอบ") ตอบถูก = จำได้แม่น นอกนั้น = ยังจำไม่ได้
function chooseOption(index) {
  const quiz = state.session?.quiz;
  if (!quiz || quiz.answered) return;
  const correct = index === quiz.answerIndex;
  if (quiz.type === "type") {
    // ข้ามข้อพิมพ์ (กด "ไม่รู้")
    revealTyped();
    settleQuiz(AGAIN, `💡 คำตอบคือ ${quiz.answerText}`, false);
    return;
  }

  $("quiz-options")
    .querySelectorAll(".quiz-option")
    .forEach((button, position) => {
      button.disabled = true;
      button.classList.toggle("correct", position === quiz.answerIndex);
      button.classList.toggle("wrong", position === index && !correct);
    });
  if (quiz.type === "cloze") $("card-word").replaceChildren(quiz.before, el("span", "blank filled", quiz.answerText), quiz.after);
  settleQuiz(correct ? GOOD : AGAIN, correct ? "✅ ถูกต้อง!" : `${index < 0 ? "💡" : "❌ ยังไม่ถูก"} คำตอบคือ ${quiz.answerText}`, correct);
}

// ข้อพิมพ์: ล็อกช่องพิมพ์ แล้วเฉลยเป็นคำอังกฤษบนการ์ด
function revealTyped() {
  const quiz = state.session.quiz;
  $("quiz-input").disabled = true;
  $("quiz-check").disabled = true;
  $("quiz-hint").disabled = true;
  $("card-word").classList.remove("sentence");
  $("card-word").textContent = quiz.answerText;
  $("speak-word").hidden = false;
}

function submitTyped() {
  const quiz = state.session?.quiz;
  if (!quiz || quiz.type !== "type" || quiz.answered) return;
  const text = $("quiz-input").value;
  if (!text.trim()) return;
  const { result, rating } = gradeTyped(quiz, text, quiz.hinted);
  revealTyped();
  const messages = {
    correct: quiz.hinted ? "✅ ถูก (ใช้ตัวช่วยใบ้)" : "✅ ถูกต้อง!",
    close: `🙂 เกือบถูก! สะกดว่า ${quiz.answerText}`,
    wrong: `❌ ยังไม่ถูก คำตอบคือ ${quiz.answerText}`,
  };
  settleQuiz(rating, messages[result], result !== "wrong");
}

// ใบ้: บอกตัวอักษรแรก (ถ้าพิมพ์ถูกจะนับเป็น "พอจำได้")
function hintTyped() {
  const quiz = state.session?.quiz;
  if (!quiz || quiz.type !== "type" || quiz.answered) return;
  quiz.hinted = true;
  $("quiz-hint").disabled = true;
  $("card-hint").textContent = `ใบ้: ขึ้นต้นด้วย "${quiz.answerText[0]}" · ${quiz.answerText.length} ตัวอักษร`;
  $("quiz-input").focus({ preventScroll: true });
}

function nextQuiz() {
  const quiz = state.session?.quiz;
  if (quiz && quiz.answered) answer(quiz.rating);
}

function isFlipped() {
  return !$("card-back").hidden;
}

function flip() {
  if (isFlipped()) return;
  $("card-back").hidden = false;
  $("card-hint").hidden = true;
  $("flip").hidden = true;
  $("grades").hidden = Boolean(state.session?.quiz); // โหมดทวนแบบผสมให้คะแนนเอง
}

// คอมโบ: ตอบ "พอจำได้" / "จำได้แม่น" ติดกันกี่ใบ แสดงตั้งแต่ใบที่ 2
function renderCombo() {
  const box = $("combo");
  const combo = state.session ? state.session.combo : 0;
  box.hidden = combo < 2;
  if (combo < 2) return;
  box.textContent = `🔥 ${combo}`;
  box.classList.remove("pop");
  void box.offsetWidth; // ให้แอนิเมชันเล่นใหม่ทุกครั้ง
  box.classList.add("pop");
}

// ฉลองหลังตอบแต่ละใบ: คอมโบ และต้นไม้โตขึ้นระยะ (ต้นอ่อนโตเป็นกำลังโตหรือต้นไม้ใหญ่ ขึ้นป้ายบอก)
function celebrate(word, before, after, rating) {
  const session = state.session;
  session.combo = nextCombo(session.combo, rating);
  session.bestCombo = Math.max(session.bestCombo, session.combo);
  renderCombo();

  const move = stageMove(before, after);
  if (move) recordGrowth(session.grown, word.headword, move);
  if (move && move.toIndex >= 2) {
    toast(`${word.headword} โตเป็น ${move.stage.emoji} ${move.stage.label} แล้ว`);
    fx("grow");
    return;
  }
  const message = comboMessage(session.combo);
  if (message) {
    toast(message);
    fx("combo");
  } else if (rating !== AGAIN) {
    fx("correct");
  }
}

// กำหนดวันทวนตามตัวกำหนดที่เลือกในตั้งค่า (แบบเดิม หรือ FSRS ที่เก็บความจำแยกไว้ใน vg:fsrs)
function schedule(word, before, rating, day) {
  if (state.settings.scheduler !== "fsrs") return grade(before, rating, day, Math.random);
  const result = fsrsGrade(before, state.fsrs[word.headword], rating, day, Math.random);
  state.fsrs[word.headword] = result.mem;
  storage.saveFsrs(state.fsrs);
  return result.card;
}

function answer(rating) {
  const session = state.session;
  if (!session.practice) refreshShared();
  const snapshot = snapshotSession(session);
  const word = session.queue.shift();
  const before = state.cards[word.headword];
  let card = before;

  // โหมดฝึกไม่แตะความคืบหน้า ประวัติ หรือเป้าหมายของวัน
  if (!session.practice) {
    const usesFsrs = state.settings.scheduler === "fsrs";
    const fsrsBefore = state.fsrs[word.headword];
    card = schedule(word, before, rating, session.day);
    state.cards[word.headword] = card;
    storage.saveCards(state.cards);
    updateAppBadge();
    const count = storage.addReview(session.day);
    storage.addAnswer(session.day, word.headword, rating, before ? before.ivl : 0);
    const log = { n: before ? 0 : 1, t: stageMove(before, card)?.stage.id === "tree" ? 1 : 0, a: rating === AGAIN ? 1 : 0 };
    storage.addLog(session.day, log);
    if (!before) storage.saveNewCount(session.day, storage.newCountToday(session.day) + 1);
    rememberAnswer(snapshot, word, { headword: word.headword, card: before, ...(usesFsrs ? { fsrs: fsrsBefore } : {}), log, answer: true, newCard: !before });
    session.answered += 1;
    celebrate(word, before, card, rating);
    checkGoal(session.day, count);
    nudgeNote(word, card, rating);
    checkMedals();
  } else {
    rememberAnswer(snapshot, word, null);
    session.answered += 1;
    celebrate(word, before, card, rating);
  }

  if (rating === AGAIN) {
    session.hadAgain = true;
    session.queue.splice(Math.min(REQUEUE_GAP, session.queue.length), 0, word);
  } else {
    session.learned.add(word.headword);
  }

  nextCard();
}

// ลืมคำเดิมซ้ำหลายครั้ง: ชวนเขียนโน้ตช่วยจำ (เตือนครั้งเดียวต่อคำต่อรอบ)
function nudgeNote(word, card, rating) {
  const session = state.session;
  if (rating !== AGAIN || card.lapses < LEECH_LAPSES || state.notes[word.headword] || session.nudged.has(word.headword)) return;
  session.nudged.add(word.headword);
  toast(`${word.headword} ลืมบ่อย ลองเขียนโน้ตช่วยจำดูนะ ✏️ (ปุ่มอยู่ที่ด้านหลังการ์ด)`);
}

function nextCard() {
  const session = state.session;
  if (session.queue.length === 0) {
    finishSession();
  } else if (state.settings.roundSize > 0 && session.answered - session.roundStart >= state.settings.roundSize) {
    pauseRound();
  } else {
    showCard();
  }
}

// จบรอบย่อย: ถามว่าจะไปต่อหรือพักก่อน (ที่ทวนไปแล้วบันทึกครบ ออกจากหน้านี้ได้เลย)
function pauseRound() {
  const session = state.session;
  $("done-title").textContent = "พักหายใจก่อนไหม? 🌤️";
  $("done-summary").textContent = `ทวนไปแล้ว ${session.answered} ใบ เหลืออีก ${session.queue.length} ใบ ทำได้ดีมาก`;
  $("done-growth").hidden = true;
  $("done-tomorrow").hidden = true;
  $("done-more").hidden = true;
  $("done-continue").hidden = false;
  $("done-undo").hidden = !lastAnswer;
  renderGiftButtons();
  $("done-continue").textContent = `▶️ ไปต่ออีก ${Math.min(state.settings.roundSize, session.queue.length)} ใบ`;
  $("done-home").textContent = "พักก่อน กลับไปดูสวน 🌳";
  $("done-home").classList.remove("primary");
  show("done");
  fx("correct");
}

function continueRound() {
  if (!state.session) return;
  state.session.roundStart = state.session.answered;
  show("study");
  showCard();
}

// รู้อยู่แล้ว: ข้ามไปเป็นต้นไม้ใหญ่ทันที ไม่นับเป็นคำใหม่ของวันนี้
function markKnown() {
  const session = state.session;
  if (session.practice) return;
  refreshShared();
  const snapshot = snapshotSession(session);
  const word = session.queue.shift();
  const before = state.cards[word.headword];
  state.cards[word.headword] = knownCard(before, session.day);
  const move = stageMove(before, state.cards[word.headword]);
  if (move) recordGrowth(session.grown, word.headword, move);
  storage.saveCards(state.cards);
  const count = storage.addReview(session.day);
  const log = { n: before ? 0 : 1, t: move?.stage.id === "tree" ? 1 : 0 };
  storage.addLog(session.day, log);
  rememberAnswer(snapshot, word, { headword: word.headword, card: before, log });
  session.answered += 1;
  session.learned.add(word.headword);
  toast(`${word.headword} ข้ามไปเป็นต้นไม้ใหญ่แล้ว 🌳`);
  checkGoal(session.day, count);
  checkMedals();
  nextCard();
}

// ---------- ย้อนคำตอบล่าสุด ----------

// ปัดพลาดหรือกดเลขผิดแล้วย้อนได้ 1 ใบ: เก็บสำเนารอบก่อนตอบ และข้อมูลที่ต้องคืนใน storage (null = โหมดฝึก ไม่ได้บันทึกอะไร)
// เหรียญ ภารกิจ และการฉลองถึงเป้าที่เกิดไปแล้วไม่ถูกถอนคืน ย้อนได้จนกว่าจะตอบใบถัดไปหรือออกจากหน้านี้
let lastAnswer = null;

function snapshotSession(session) {
  return { ...session, queue: [...session.queue], learned: new Set(session.learned), grown: new Map(session.grown), nudged: new Set(session.nudged), quiz: null };
}

function rememberAnswer(snapshot, word, undo) {
  lastAnswer = { snapshot, headword: word.headword, undo };
  $("undo").hidden = false;
}

function forgetAnswer() {
  lastAnswer = null;
  $("undo").hidden = true;
  $("done-undo").hidden = true;
}

function undoLastAnswer() {
  const last = lastAnswer;
  if (!last || swipe.busy) return;
  forgetAnswer();
  if (last.snapshot.day !== dayNumber()) {
    toast("ขึ้นวันใหม่แล้ว ย้อนคำตอบของเมื่อวานไม่ได้");
    return;
  }
  if (last.undo) {
    storage.undoAnswer(last.snapshot.day, last.undo);
    refreshShared();
    updateAppBadge();
  }
  state.session = last.snapshot;
  show("study");
  renderCombo();
  showCard();
  toast(`↩️ ย้อนคำตอบของ ${last.headword} แล้ว ตอบใหม่ได้เลย`);
}

// ---------- ปัดการ์ด ----------

const swipe = { start: null, dragging: false, justSwiped: false, busy: false };

function setCardOffset(dx) {
  const card = $("card");
  card.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 20}deg)` : "";
  card.dataset.swipe = dx > SWIPE_PREVIEW ? "good" : dx < -SWIPE_PREVIEW ? "again" : "";
}

// ปัดขวา = จำได้แม่น, ปัดซ้าย = ยังจำไม่ได้ (ปัดได้ทั้งก่อนและหลังพลิกการ์ด)
function swipeAnswer(rating) {
  if (swipe.busy) return;
  const card = $("card");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finish = () => {
    card.classList.remove("fly-left", "fly-right");
    setCardOffset(0);
    swipe.busy = false;
    answer(rating);
  };
  if (reduceMotion) {
    finish();
    return;
  }
  swipe.busy = true;
  card.classList.add(rating === GOOD ? "fly-right" : "fly-left");
  setTimeout(finish, 200);
}

function bindSwipe() {
  const card = $("card");
  card.addEventListener("pointerdown", (event) => {
    if (swipe.busy || state.session?.quiz || event.target.closest("button")) return;
    swipe.start = { x: event.clientX, y: event.clientY };
    swipe.dragging = false;
  });
  card.addEventListener("pointermove", (event) => {
    if (!swipe.start) return;
    const dx = event.clientX - swipe.start.x;
    const dy = event.clientY - swipe.start.y;
    if (!swipe.dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      swipe.dragging = true;
      card.setPointerCapture(event.pointerId);
      card.classList.add("dragging");
    }
    if (swipe.dragging) setCardOffset(dx);
  });
  const end = (event) => {
    if (!swipe.start) return;
    const dx = event.clientX - swipe.start.x;
    const wasDragging = swipe.dragging;
    swipe.start = null;
    swipe.dragging = false;
    card.classList.remove("dragging");
    if (!wasDragging) return;
    swipe.justSwiped = true; // กันไม่ให้ click หลังปัดไปพลิกการ์ด
    setTimeout(() => {
      swipe.justSwiped = false;
    }, 0);
    if (Math.abs(dx) >= SWIPE_DISTANCE && event.type === "pointerup") {
      swipeAnswer(dx > 0 ? GOOD : AGAIN);
    } else {
      setCardOffset(0);
    }
  };
  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", end);
}

function finishSession() {
  const { answered, learned, bestCombo, grown } = state.session;
  $("done-title").textContent = "เก่งมาก!";
  $("done-continue").hidden = true;
  $("done-home").textContent = "กลับไปดูสวน 🌳";
  $("done-home").classList.add("primary");
  // พรุ่งนี้มีคำรอทวนกี่คำ และเรียนคำใหม่เพิ่มได้ (ไม่ใช่โหมดฝึก)
  const tomorrow = state.session.day + 1;
  const waiting = translatedWords().filter((word) => state.cards[word.headword]?.due <= tomorrow).length;
  $("done-tomorrow").hidden = state.session.practice;
  $("done-tomorrow").textContent = waiting > 0 ? `📅 พรุ่งนี้มีคำรอทวน ${waiting} คำ` : "📅 พรุ่งนี้ยังไม่มีคำรอทวน";
  $("done-more").hidden = state.session.practice || extraQueue().length === 0;
  $("done-practice").hidden = state.session.practice || reviewedToday(translatedWords(), state.cards, state.session.day).length === 0;
  $("done-summary").textContent = state.session.practice
    ? `ฝึกไป ${answered} ครั้ง จำได้ ${learned.size} คำ 🧠 (โหมดฝึกไม่เปลี่ยนวันทวน)`
    : `วันนี้ทวนไป ${answered} ครั้ง รดน้ำต้นไม้ไป ${learned.size} ต้น 🌱`;

  const summary = growthSummary(grown);
  const lines = [];
  if (summary.planted > 0) lines.push(`🌱 ปลูกใหม่ ${summary.planted} ต้น`);
  if (summary.growing.length > 0) lines.push(`🌿 โตเป็นกำลังโต: ${wordList(summary.growing)}`);
  if (summary.trees.length > 0) lines.push(`🌳 โตเป็นต้นไม้ใหญ่: ${wordList(summary.trees)}`);
  if (bestCombo >= 3) lines.push(`🔥 คอมโบสูงสุด ${bestCombo} ใบติด`);
  $("done-growth").replaceChildren(...lines.map((line) => el("li", "", line)));
  $("done-growth").hidden = lines.length === 0;

  $("done-undo").hidden = !lastAnswer;
  renderGiftButtons();
  const { practice, answered: total, hadAgain, away } = state.session;
  state.session = null;
  show("done");
  launchConfetti();
  fx("finish");
  if (!practice) {
    checkMedals({
      perfectRound: isPerfectRound(total, hadAgain),
      earlyBird: isEarlyBird(new Date().getHours()),
      comeback: away !== null && away >= COMEBACK_DAYS,
    });
  }
}

// ---------- ภารกิจประจำวัน ----------

// ภารกิจ 3 ข้อของวันนี้ คำนวณจากข้อมูลที่เก็บอยู่แล้ว (ดู missions.js) ครบแล้วบันทึกวันนั้นไว้ครั้งเดียว
function todayMissions(day) {
  return missionProgress(day, state.settings.dailyGoal, {
    reviews: storage.loadHistory()[day] || 0,
    games: storage.loadGames().days[day] || 0,
    planted: storage.loadLog()[day]?.n || 0,
    answers: storage.loadAnswers(),
  });
}

function checkMissions() {
  const day = dayNumber();
  if (!allDone(todayMissions(day)) || !storage.markMissionsDone(day)) return;
  setTimeout(() => {
    toast("🎯 ทำภารกิจวันนี้ครบทั้ง 3 ข้อแล้ว เก่งมาก!");
    launchConfetti(24);
    fx("finish");
  }, 1200);
}

function renderMissions(day) {
  const progress = todayMissions(day);
  $("missions").hidden = translatedWords().length === 0;
  $("missions-list").replaceChildren(
    ...progress.map((mission) => {
      const item = el("li", `mission${mission.done ? " done" : ""}`);
      item.append(el("span", "mission-mark", mission.done ? "✅" : mission.emoji), el("span", "mission-title", mission.title));
      item.append(el("span", "mission-count muted small", mission.done ? "ครบ" : `${mission.value}/${mission.target}`));
      return item;
    }),
  );
  const days = storage.loadMissions().length;
  $("missions-note").textContent = allDone(progress) ? "🎉 ครบทั้ง 3 ข้อแล้ว พรุ่งนี้มีภารกิจใหม่" : days > 0 ? `ทำครบมาแล้ว ${days} วัน` : "ภารกิจเป็นของสนุก ๆ ไม่ได้ล็อกอะไรไว้ ข้ามได้เสมอ";
}

// ---------- ชาเลนจ์ประจำเดือน ----------

function monthlyNow(day) {
  return monthlyProgress(day, { history: storage.loadHistory(), log: storage.loadLog(), games: storage.loadGames().days });
}

// ทำสำเร็จแล้วเก็บรหัสเดือนไว้ใน vg:medals ครั้งเดียว
function checkMonthly() {
  const day = dayNumber();
  const progress = monthlyNow(day);
  if (!progress.done || progress.month.id in storage.loadMedals()) return;
  storage.addMedals([progress.month.id], day);
  setTimeout(() => {
    toast(`🏆 ทำชาเลนจ์เดือน${progress.month.name}สำเร็จแล้ว! ${progress.title}`);
    launchConfetti(48);
    fx("finish");
  }, 1800);
}

function renderMonthly(day) {
  const progress = monthlyNow(day);
  const done = completedMonths(storage.loadMedals()).length;
  $("monthly").hidden = translatedWords().length === 0;
  $("monthly-title").textContent = `🏆 ชาเลนจ์เดือน${progress.month.name}`;
  $("monthly-goal").textContent = `${progress.challenge.emoji} ${progress.title}`;
  $("monthly-count").textContent = progress.done ? "สำเร็จ ✅" : `${progress.value}/${progress.target} ${progress.challenge.unit}`;
  $("monthly-fill").style.width = `${progress.percent}%`;
  $("monthly-bar").setAttribute("aria-valuenow", progress.percent);
  const left = progress.daysLeft === 0 ? "วันนี้วันสุดท้ายของเดือน" : `เหลืออีก ${progress.daysLeft} วัน`;
  $("monthly-note").textContent = progress.done
    ? `🎉 สำเร็จแล้ว เดือนหน้ามีชาเลนจ์ใหม่${done > 1 ? ` · ทำสำเร็จมาแล้ว ${done} เดือน` : ""}`
    : `${left}${done > 0 ? ` · ทำสำเร็จมาแล้ว ${done} เดือน` : ""}`;
}

// ---------- เหรียญความสำเร็จ ----------

// ข้อมูลที่ใช้ตัดสินเหรียญ ณ ตอนนี้ (events = เหตุการณ์ตอนจบรอบ)
function medalContext(events = {}) {
  const today = dayNumber();
  const games = storage.loadGames();
  const frozen = storage.loadRest()?.frozen || [];
  const cards = translatedWords().map((word) => state.cards[word.headword]).filter(Boolean);
  return {
    planted: cards.length,
    trees: cards.filter((card) => stageOf(card).id === "tree").length,
    bestStreak: streakOf(mergeDays(storage.loadHistory(), games.days), today, frozen).best,
    notes: Object.keys(state.notes).length,
    gamePlays: Object.values(games.days).reduce((sum, count) => sum + count, 0),
    wordleWins: games.wordleStats?.won || 0,
    matchBest: games.best.match ?? null,
    scrambleBest: games.best.scramble || 0,
    bugsCaught: storage.loadGarden().caught,
    ...events,
  };
}

// ตรวจเหรียญใหม่ บันทึก และแจ้งในแอป (หน่วงเล็กน้อยไม่ให้ป้ายอื่นทับทันที)
function checkMedals(events = {}) {
  checkMissions();
  checkMonthly();
  checkFlowers();
  const fresh = newMedals(medalContext(events), storage.loadMedals());
  if (fresh.length === 0) return;
  storage.addMedals(
    fresh.map((medal) => medal.id),
    dayNumber(),
  );
  const names = fresh.map((medal) => `${medal.emoji} ${medal.title}`).join(", ");
  setTimeout(() => {
    toast(fresh.length === 1 ? `🏅 ได้เหรียญใหม่: ${names}` : `🏅 ได้เหรียญใหม่ ${fresh.length} เหรียญ: ${names}`);
    fx("grow");
  }, 1600);
}

// แปลงที่ทุกต้นโตถึง 🌿 แล้วออกดอก ได้ดอกไม้ประจำแปลง (เก็บรวมกับเหรียญ ไม่หายแม้ภายหลังมีคำที่ลืม)
function checkFlowers() {
  const unlocked = storage.loadMedals();
  const fresh = bloomedLevels(state.words, state.cards, LEVELS).filter((level) => !(flowerId(level) in unlocked));
  if (fresh.length === 0) return;
  storage.addMedals(fresh.map(flowerId), dayNumber());
  const names = fresh.map((level) => `${flowerOf(level, LEVELS).emoji} ${levelTitle(level)}`).join(", ");
  setTimeout(() => {
    toast(`${names} ออกดอกแล้ว! ได้ดอกไม้ประจำแปลง`);
    launchConfetti();
    fx("finish");
  }, 2400);
}

// ดอกไม้ประจำแปลงและของแต่งสวน (ปลดล็อกจากเหรียญ) พับเก็บไว้เหมือนเหรียญ
function renderDecor(unlocked) {
  const flowers = LEVELS.filter((level) => flowerId(level) in unlocked);
  const decorations = ownedDecorations(unlocked);
  const gifts = ownedGifts(unlocked);
  const season = seasonOf();
  $("decor-count").textContent = `${flowers.length + decorations.length + gifts.length}/${LEVELS.length + DECORATIONS.length + GIFTS.length}`;
  $("decor-preview").textContent = [season?.emoji, ...flowers.map((level) => flowerOf(level, LEVELS).emoji), ...decorations.map((decoration) => decoration.emoji), ...gifts.map((gift) => gift.emoji)]
    .filter(Boolean)
    .join("");
  $("season-note").hidden = !season;
  $("season-note").textContent = season ? `${season.emoji} ${season.title}!` : "";
  const chip = (emoji, title, hint, got) => {
    const item = el("li", `chip${got ? "" : " locked"}`);
    item.append(el("span", "chip-emoji", got ? emoji : "🔒"), el("span", "chip-title", title));
    item.title = hint;
    item.setAttribute("aria-label", `${title} ${got ? "ได้แล้ว" : `ยังไม่ได้ ${hint}`}`);
    return item;
  };
  $("flower-list").replaceChildren(
    ...LEVELS.map((level) => {
      const flower = flowerOf(level, LEVELS);
      const got = flowerId(level) in unlocked;
      const plot = levelTitle(level).replace(/:.*/, "");
      return chip(flower.emoji, got ? `${flower.name} · ${plot}` : plot, `ทำให้ทุกคำใน${levelTitle(level)}โตถึง 🌿 ขึ้นไป`, got);
    }),
  );
  const medalTitle = (id) => MEDALS.find((medal) => medal.id === id)?.title || id;
  $("decor-list").replaceChildren(
    ...DECORATIONS.map((decoration) =>
      chip(decoration.emoji, decoration.title, `ได้จากเหรียญ "${medalTitle(decoration.medal)}"`, decoration.medal in unlocked),
    ),
  );
  // ของขวัญที่ยังไม่ได้ไม่บอกชื่อ ให้ลุ้นตอนเปิดกล่อง
  $("gift-list").replaceChildren(
    ...GIFTS.map((gift) => {
      const got = giftId(gift) in unlocked;
      const rarity = RARITIES[gift.rarity];
      const item = chip(gift.emoji, got ? gift.title : rarity.stars, "สุ่มได้จากกล่องของขวัญเมื่อทำครบเป้าของวัน", got);
      if (!got) item.firstChild.textContent = "❔";
      return item;
    }),
  );
}

function renderMedals() {
  checkMedals();
  const unlocked = storage.loadMedals();
  const owned = MEDALS.filter((medal) => medal.id in unlocked);
  $("medal-count").textContent = `${owned.length}/${MEDALS.length}`;
  $("medal-preview").textContent = owned.map((medal) => medal.emoji).join("");
  renderDecor(unlocked);
  $("medal-list").replaceChildren(
    ...MEDALS.map((medal) => {
      const got = medal.id in unlocked;
      const item = el("li", `medal${got ? "" : " locked"}`);
      const text = el("span", "medal-text");
      text.append(el("strong", "", medal.title), el("span", "muted small", medal.desc));
      item.append(el("span", "medal-emoji", got ? medal.emoji : "🔒"), text);
      item.setAttribute("aria-label", `${medal.title} ${got ? "ได้แล้ว" : "ยังไม่ได้"} ${medal.desc}`);
      return item;
    }),
  );
}

// ---------- เล่น (เกม) ----------

function renderPlay() {
  renderPlayFilter();
  const best = storage.loadGames().best.match;
  $("match-best").textContent = best ? `🏆 ดีที่สุด ${formatSeconds(best)}` : "";
  const scrambleBest = storage.loadGames().best.scramble;
  $("scramble-best").textContent = scrambleBest ? `🏆 คะแนนสูงสุด ${scrambleBest}/${maxScore()}` : "";
  const sentenceBest = storage.loadGames().best.sentence;
  $("sentence-best").textContent = sentenceBest ? `🏆 คะแนนสูงสุด ${sentenceBest} แต้ม` : "";
  const confuseBest = storage.loadGames().best.confuse;
  $("confuse-best").textContent = confuseBest ? `🏆 ถูกมากสุด ${confuseBest}/8` : "";
  const blitzBest = storage.loadGames().best.blitz;
  $("blitz-best").textContent = blitzBest ? `🏆 ทำได้สูงสุด ${blitzBest} ข้อ` : "";
  $("listen-card").hidden = !canSpeak();
  $("dictation-card").hidden = !canSpeak();
  $("commute-card").hidden = !canSpeak();
  const dictationBest = storage.loadGames().best.dictation;
  $("dictation-best").textContent = dictationBest ? `🏆 คะแนนสูงสุด ${dictationBest}/${dictationMax()}` : "";
  const listenBest = storage.loadGames().best.listen;
  $("listen-best").textContent = listenBest ? `🏆 ถูกมากสุด ${listenBest}/${LISTEN_COUNT}` : "";
  const today = storage.loadWordle(dayNumber());
  $("wordle-status").textContent =
    today?.status === "won" ? `✅ วันนี้ทายถูกใน ${today.guesses.length} ครั้ง`
    : today?.status === "lost" ? "วันนี้จบแล้ว พรุ่งนี้มาลองใหม่"
    : today ? `🔄 เล่นค้างอยู่ ทายไปแล้ว ${today.guesses.length} ครั้ง`
    : "ยังไม่ได้เล่นวันนี้";
}

// ---------- การ์ดแชร์สวน ----------

// วาดการ์ดสวนของฉันเป็นรูป PNG แล้วแชร์ผ่านเมนูแชร์ของเครื่อง (ไม่รองรับ = ดาวน์โหลดรูปแทน)
async function shareGarden() {
  const today = dayNumber();
  const { history, active, rest } = refreshHabit(today);
  const unlocked = storage.loadMedals();
  const cards = translatedWords().map((word) => state.cards[word.headword]).filter(Boolean);
  const data = buildCardData({
    planted: cards.length,
    trees: cards.filter((card) => stageOf(card).id === "tree").length,
    streak: streakOf(active, today, rest.frozen).current,
    reviews: totalReviews(history),
    flowers: LEVELS.filter((level) => flowerId(level) in unlocked).map((level) => flowerOf(level, LEVELS).emoji),
    medals: MEDALS.filter((medal) => medal.id in unlocked).map((medal) => medal.emoji),
    decorations: ownedDecorations(unlocked).map((decoration) => decoration.emoji),
  });
  const canvas = el("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  drawCard(canvas.getContext("2d"), data);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    toast("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้งนะ");
    return;
  }
  const file = new File([blob], "vocab-garden.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "สวนคำศัพท์ของฉัน" });
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return; // ผู้ใช้ปิดหน้าต่างแชร์เอง
  }
  const link = el("a");
  link.href = URL.createObjectURL(blob);
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast("บันทึกรูปการ์ดแล้ว นำไปแชร์ได้เลย 📤");
}


// ---------- คำที่ใช้เล่น (ใช้ร่วมกันทุกเกม) ----------

const playableLevels = () => LEVELS.filter((level) => state.words.some((word) => word.level === level && word.translated));

// แปลงที่เลือกอยู่ (ยังไม่เคยเลือก = ทุกแปลงที่แปลแล้ว)
function levelSetOf(saved) {
  const all = playableLevels();
  return new Set(saved ? saved.filter((level) => all.includes(level)) : all);
}

function playLevelSet() {
  return levelSetOf(state.settings.playLevels);
}

// คำที่ตรงกับแปลงและสถานะที่เลือก ใช้เป็นกองคำของเกมต่าง ๆ
function playPool() {
  return matchingWords(translatedWords(), state.cards, { levels: playLevelSet(), statuses: new Set(state.settings.playStatuses) });
}

function savePlayLevels(levels) {
  const all = playableLevels();
  updateSetting({ playLevels: all.every((level) => levels.has(level)) ? null : all.filter((level) => levels.has(level)) });
  renderPlayFilter();
}

function savePlayStatuses(statuses) {
  updateSetting({ playStatuses: STATUSES.map((status) => status.id).filter((id) => statuses.has(id)) });
  renderPlayFilter();
}

function playFilterText() {
  const levels = playLevelSet();
  const all = playableLevels();
  const levelText = levels.size === all.length ? "ทุกแปลง" : levels.size === 0 ? "ยังไม่ได้เลือกแปลง" : `${levels.size} แปลง`;
  const statuses = STATUSES.filter((status) => state.settings.playStatuses.includes(status.id));
  const statusText = statuses.length === STATUSES.length ? "ทุกสถานะ" : statuses.length === 0 ? "ยังไม่ได้เลือกสถานะ" : statuses.map((status) => status.emoji).join("");
  return `${levelText} · ${statusText}`;
}

// ส่วนเลือกคำในหน้าเกม: แปลง สถานะ (ตัวเลขข้างสถานะนับเฉพาะแปลงที่เลือก) และสรุปจำนวนคำ
// ช่องติ๊กพร้อมข้อความ ใช้ร่วมกันในส่วนเลือกคำของเกมและตั้งค่าคำที่สุ่มได้
function checkbox(checked, text, onChange) {
  const label = el("label", "check");
  const input = el("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  label.append(input, ` ${text}`);
  return label;
}

function renderPlayFilter() {
  const levels = playLevelSet();
  const words = translatedWords();
  $("play-levels").replaceChildren(
    ...playableLevels().map((level) => {
      const count = words.filter((word) => word.level === level).length;
      return checkbox(levels.has(level), `${levelTitle(level).replace(/:.*/, "")} (${count})`, (on) => {
        const next = new Set(levels);
        if (on) next.add(level);
        else next.delete(level);
        savePlayLevels(next);
      });
    }),
  );
  const inChosen = words.filter((word) => levels.has(word.level));
  const chosenStatuses = new Set(state.settings.playStatuses);
  $("play-statuses").replaceChildren(
    ...STATUSES.map((status) => {
      const count = inChosen.filter((word) => statusOf(state.cards[word.headword]) === status.id).length;
      return checkbox(chosenStatuses.has(status.id), `${status.emoji} ${status.label} (${count})`, (on) => {
        const next = new Set(chosenStatuses);
        if (on) next.add(status.id);
        else next.delete(status.id);
        savePlayStatuses(next);
      });
    }),
  );
  $("play-pool-count").textContent = `${playPool().length} คำ`;
  $("play-filter-summary").textContent = playFilterText();
}

// เกมที่ใช้กองคำนี้ ถ้าคำไม่พอให้กลับไปปรับที่หน้าเกม
function poolOrBack() {
  const pool = playPool();
  if (pool.length === 0) {
    toast("ยังไม่มีคำที่ตรงเงื่อนไข ลองเลือกแปลงหรือสถานะเพิ่มที่หน้าเกมนะ");
    location.hash = "#/play";
    return null;
  }
  return pool;
}

// ---------- หน้าต่างรายละเอียดคำ (ใช้ทั้งหน้าหลักและหน้าสวน) ----------

// คำอธิบายสัญลักษณ์ระยะในหน้าหลัก
function renderStageLegend() {
  const parts = STAGES.map((stage) => {
    const item = el("span", "legend-item");
    item.append(treeEl(stage.id), ` ${stage.label}`);
    return item;
  });
  $("stage-legend").replaceChildren(...parts.flatMap((part, index) => (index ? [" · ", part] : [part])));
}

// คำที่ยังไม่เป็นต้นไม้ใหญ่ ข้ามได้
const canSkip = (word) => stageOf(state.cards[word.headword]).id !== "tree";

// ข้ามคำที่ผู้เรียนรู้อยู่แล้วให้เป็นต้นไม้ใหญ่เลย (ทวนอีกทีในอีก 30 วัน) ไม่นับเป็นการทวนของวัน
function skipWordsAsKnown(words) {
  refreshShared();
  const day = dayNumber();
  let fresh = 0;
  let grown = 0;
  words.forEach((word) => {
    const before = state.cards[word.headword];
    if (!before) fresh += 1;
    if (stageOf(before).id !== "tree") grown += 1;
    state.cards[word.headword] = knownCard(before, day);
  });
  storage.saveCards(state.cards);
  storage.addLog(day, { n: fresh, t: grown });
  checkMedals();
  updateAppBadge();
  loaded.garden?.redraw();
}

function renderWordNote(word) {
  const note = state.notes[word.headword];
  $("word-note").hidden = !note;
  $("word-note").textContent = note ? `📝 ${note}` : "";
  $("word-edit-note").textContent = note ? "✏️ แก้โน้ตช่วยจำ" : "✏️ เพิ่มโน้ตช่วยจำ";
}

function openWordDialog(word) {
  const today = dayNumber();
  const card = state.cards[word.headword];
  const info = plantInfo(card, today);
  $("word-stage").replaceChildren(treeEl(info.stage.id, { wilted: info.wilted }));
  $("word-title").textContent = word.emoji ? `${word.headword} ${word.emoji}` : word.headword;
  $("word-stage-label").textContent = `${levelTitle(word.level)} · อันดับ ${word.rank} · ${info.stage.label}`;
  $("word-due").textContent = dueLabel(card, today);
  $("word-senses").replaceChildren(
    ...word.senses.map((sense) => {
      const item = el("li");
      item.append(el("span", `pos pos-${sense.pos}`, sense.label), document.createTextNode(sense.text));
      return item;
    }),
  );
  renderForms($("word-forms"), word);
  $("word-example-en").textContent = word.exampleEn;
  $("word-example-th").textContent = word.exampleTh;
  renderExtra("word", word);
  $("word-stats").textContent = card ? `ทวนไปแล้ว ${card.reps} ครั้ง · เคยลืม ${card.lapses} ครั้ง` : "";
  renderWordNote(word);
  $("word-edit-note").onclick = () => openNoteDialog(word);
  $("word-speak").hidden = !canSpeak();
  $("word-speak").onclick = () => speakWord(word.headword);
  $("word-know").hidden = !canSkip(word);
  $("word-know").onclick = () => {
    $("word-dialog").hidden = true;
    skipWordsAsKnown([word]);
    toast(`${word.headword} ข้ามไปเป็นต้นไม้ใหญ่แล้ว 🌳`);
  };
  $("word-dialog").hidden = false;
  $("word-close").focus();
}

// ---------- มีอะไรใหม่ ----------

// CHANGELOG ถูกคัดลอกมาไว้ที่ changelog.md ตอน deploy (ตอนพัฒนาในเครื่องอาจไม่มีไฟล์นี้)
async function loadChangelog() {
  try {
    const response = await fetch("changelog.md", { cache: "no-store" });
    return response.ok ? parseChangelog(await response.text()) : [];
  } catch {
    return [];
  }
}

function inlineNodes(text) {
  return inlineParts(text).map((part) => (part.code ? el("code", "", part.text) : document.createTextNode(part.text)));
}

function changelogEntry(entry) {
  const box = el("article", "cl-entry");
  const head = el("h2", "cl-head");
  head.append(el("span", "cl-version", `v${entry.version}`), el("span", "cl-date", entry.date));
  box.append(head);
  if (entry.intro) box.append(el("p", "cl-intro", entry.intro));
  entry.sections.forEach((section) => {
    box.append(el("p", `cl-section cl-${section.title === "ข้อมูลคำศัพท์" ? "data" : "change"}`, section.title));
    const list = el("ul", "cl-items");
    section.items.forEach((text) => {
      const item = el("li");
      item.append(...inlineNodes(text));
      list.append(item);
    });
    box.append(list);
  });
  return box;
}

async function renderChangelog() {
  $("changelog-list").replaceChildren();
  $("changelog-empty").hidden = true;
  const entries = await loadChangelog();
  $("changelog-list").replaceChildren(...entries.map(changelogEntry));
  $("changelog-empty").hidden = entries.length > 0;
}

// หลังอัปเดตเวอร์ชัน แสดงสิ่งที่เปลี่ยนตั้งแต่เวอร์ชันที่เคยเปิดครั้งก่อน (เปิดแอปครั้งแรกจะไม่แสดง)
async function maybeShowWhatsNew() {
  const seen = storage.loadSeenVersion();
  storage.saveSeenVersion(self.VG_VERSION);
  if (!seen) return;
  const entries = entriesSince(await loadChangelog(), seen, self.VG_VERSION).slice(0, 5);
  if (entries.length === 0) return;
  $("whatsnew-title").textContent = `มีอะไรใหม่ใน v${self.VG_VERSION}`;
  $("whatsnew-body").replaceChildren(...entries.map(changelogEntry));
  $("whatsnew-dialog").hidden = false;
  $("whatsnew-ok").focus();
}

// ---------- สนับสนุนโครงการ ----------

// แสดงเฉพาะเมื่อมีลิงก์ช่องทางสนับสนุน เป็นลิงก์ออกไปภายนอกเท่านั้น
function renderSupport() {
  const visible = SUPPORT_LINKS.length > 0;
  $("support").hidden = !visible;
  $("support-heading").hidden = !visible;
  $("support-links").replaceChildren(
    ...SUPPORT_LINKS.map((link) => {
      const anchor = el("a", "button", link.label);
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      return anchor;
    }),
  );
}

// ---------- ตั้งค่า ----------

function fillSelect(select, choices, current, labels) {
  select.replaceChildren(
    ...choices.map((choice) => {
      const option = el("option", "", labels[choice]);
      option.value = choice;
      option.selected = choice === current;
      return option;
    }),
  );
}

function updateSetting(change) {
  refreshShared();
  state.settings = { ...state.settings, ...change };
  storage.saveSettings(state.settings);
  applyAppearance();
}

// ส่งออกไฟล์สำรอง: เครื่องที่รองรับจะเปิดเมนูแชร์ให้เลือกปลายทางเอง (บันทึกลงไฟล์ AirDrop เมล ฯลฯ) ไม่รองรับก็ดาวน์โหลดตรง ๆ
async function exportBackup() {
  const data = storage.exportData(self.VG_VERSION);
  const name = `vocab-garden-backup-${data.exportedAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  try {
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "ไฟล์สำรอง Vocab Garden" });
      recordBackup();
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return; // ผู้ใช้ปิดเมนูแชร์เอง
  }
  const link = el("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  recordBackup();
}

// จดว่าสำรองไฟล์เมื่อไหร่ ใช้ตัดสินใจเตือน
function recordBackup() {
  storage.saveBackupMeta({ ...storage.loadBackupMeta(), last: dayNumber(), asked: null });
  renderBackupInfo();
  renderBackupReminder();
}

// บอกข้อความ "สำรองล่าสุด" ใต้ปุ่มสำรอง
function renderBackupInfo() {
  $("backup-last").textContent = backupText(storage.loadBackupMeta(), dayNumber());
}

// แถบเตือนในหน้าหลัก: ไม่ได้สำรองมานานและมีความคืบหน้าพอ
function renderBackupReminder() {
  const today = dayNumber();
  const count = Object.keys(state.cards).length;
  let meta = storage.loadBackupMeta();
  const marked = markSince(meta, count, today);
  if (marked !== meta) {
    meta = marked;
    storage.saveBackupMeta(meta);
  }
  const due = backupDue(meta, count, today);
  $("backup-reminder").hidden = !due;
  if (due) {
    const days = daysSinceBackup(meta, today);
    $("backup-reminder-text").textContent = `📦 ${meta.last === null ? "ยังไม่เคยสำรองไฟล์" : "ไม่ได้สำรองมา"} ${days} วันแล้ว สำรองไว้กันข้อมูลหาย แตะครั้งเดียว`;
  }
}

// สำเนาอัตโนมัติในเครื่อง (IndexedDB): รายวัน 1 ชุดต้นวัน และก่อนนำเข้า / ล้าง / กู้คืน เก็บไว้กันกดผิด
// ล้มเหลวได้เงียบ ๆ (โหมดส่วนตัวหรือเครื่องที่ไม่รองรับ) ต้องไม่ขวางงานหลัก
// คืน true เมื่อเก็บสำเนาใหม่สำเร็จ
async function takeSnapshot(kind, reason = null) {
  if (!canSnapshot()) return false;
  const data = storage.exportData(self.VG_VERSION);
  const count = Object.keys(data.cards).length;
  if (count === 0) return false;
  const day = dayNumber();
  const at = new Date().toISOString();
  const id = kind === "daily" ? `daily-${day}` : `${kind}-${at}`;
  try {
    if (kind === "daily" && (await hasSnapshot(id))) return false;
    await saveSnapshot({ id, kind, day, at, count, reason }, data);
    return true;
  } catch {
    return false; // เก็บสำเนาไม่ได้ก็ข้ามไป
  }
}

// ---------- หน้าที่โหลดเมื่อเปิดใช้ (เกม สอบ ทดสอบวัดระดับ) ----------

// แต่ละหน้าอยู่ในไฟล์ของตัวเองใน screens/ ดึงมาเมื่อเข้าเส้นทางครั้งแรก หน้าแรกจึงโหลดน้อยลง
// (service worker ยังเก็บทุกไฟล์ไว้ ใช้ offline ได้เหมือนเดิม)
const SCREEN_LOADERS = {
  exam: () => import("./screens/exam.js"),
  flash: () => import("./screens/flash.js"),
  match: () => import("./screens/match.js"),
  scramble: () => import("./screens/scramble.js"),
  sentence: () => import("./screens/sentence.js"),
  blitz: () => import("./screens/blitz.js"),
  confuse: () => import("./screens/confuse.js"),
  placement: () => import("./screens/placement.js"),
  dictation: () => import("./screens/dictation.js"),
  listen: () => import("./screens/listen.js"),
  commute: () => import("./screens/commute.js"),
  wordle: () => import("./screens/wordle.js"),
  settings: () => import("./screens/settings.js"),
  garden: () => import("./screens/garden.js"),
  bugs: () => import("./screens/bugs.js"),
};
const loaded = {};
const pending = {};

// ของที่หน้าเหล่านี้ใช้ร่วมกับ main.js
const screenContext = () => ({
  ...{ $, el, show, toast, fx, state, storage, speakWord, translatedWords, poolOrBack, checkMedals, updateSetting, playPool, playFilterText, fillSelect, refreshShared },
  ...{ applyAppearance, updateAppBadge, playableLevels, levelSetOf, checkbox, wotdPool, resetWotdPick, plantedIn, takeSnapshot, renderBackupInfo, exportBackup },
  ...{ FRESH_VISIBLE, foldItem, isFreshOpen: () => freshOpen, refreshHabit, renderMedals, canSkip, skipWordsAsKnown, openWordDialog, takeGardenScroll },
});

function screenFor(page, argument) {
  if (page === "exam" || page === "placement" || page === "settings" || page === "garden" || page === "bugs") return page;
  if (page === "play" && argument === "duel") return "blitz"; // ท้าเพื่อนใช้หน้าเดียวกับท้าทาย 60 วินาที
  if (page === "play" && Object.hasOwn(SCREEN_LOADERS, argument)) return argument;
  return null;
}

function loadScreen(name) {
  pending[name] ||= SCREEN_LOADERS[name]().then((module) => {
    module.bind(screenContext());
    loaded[name] = module;
    return module;
  });
  return pending[name];
}

async function openScreen(name, argument) {
  const hash = location.hash;
  let module;
  try {
    module = await loadScreen(name);
  } catch {
    delete pending[name]; // ให้ลองโหลดใหม่ได้ถ้าครั้งนี้พลาด (เช่น เน็ตหลุดตอนยังไม่มีไฟล์ในเครื่อง)
    toast("เปิดหน้านี้ไม่สำเร็จ ลองใหม่อีกครั้งนะ");
    location.hash = "#/play";
    return;
  }
  if (location.hash === hash) module.start(argument); // ผู้ใช้อาจกดไปหน้าอื่นระหว่างรอโหลด
}

// ---------- เส้นทาง ----------

let gardenScroll = 0; // ตำแหน่งเลื่อนของหน้าสวนก่อนเข้าหน้าแปลง
let gardenReturn = null; // ตำแหน่งที่หน้าสวนต้องเลื่อนกลับไป (null = ไม่ได้กลับมาจากหน้าแปลง)
const takeGardenScroll = () => {
  const scroll = gardenReturn;
  gardenReturn = null;
  return scroll;
};

function route() {
  if (state.words.length === 0) return;
  applySky();
  // เปลี่ยนหน้า (เช่น กดย้อนกลับหรือเปิดลิงก์) ต้องปิดหน้าต่างรายละเอียดคำและโน้ตที่เปิดค้างอยู่ด้วย ไม่งั้นจะบังหน้าใหม่
  $("word-dialog").hidden = true;
  $("note-dialog").hidden = true;
  // กลับจากหน้าแปลงมาหน้าสวน ให้เลื่อนกลับไปตำแหน่งเดิม
  const fromPlot = !$("view-plot").hidden;
  if (!$("view-garden").hidden) gardenScroll = window.scrollY;
  const [page, argument] = (location.hash.replace(/^#\/?/, "") || "home").split("/");
  if (page === "study") {
    if (argument === "more") startSession(null, null, true);
    else if (argument === "leech") startSession(null, "leech");
    else if (argument === "today") startSession(null, "today");
    else if (argument?.startsWith("practice-") && LEVELS.includes(argument.slice(9))) startSession(argument.slice(9), "level");
    else startSession(LEVELS.includes(argument) ? argument : null);
    return;
  }
  state.session = null;
  forgetAnswer();
  loaded.match?.stop();
  loaded.blitz?.stop();
  loaded.commute?.stop();
  gardenReturn = fromPlot ? gardenScroll : null;
  if (page === "duel") {
    openScreen("blitz", { code: argument || "" }); // ลิงก์ท้าที่เพื่อนส่งมา #/duel/<รหัส>
    return;
  }
  const screen = screenFor(page, argument);
  if (screen) {
    openScreen(screen, argument);
    return;
  }
  if (page === "play") {
    renderPlay();
    show("play");
  } else if (page === "about") {
    show("about");
  } else if (page === "changelog") {
    renderChangelog();
    show("changelog");
  } else {
    renderHome();
    show("home");
  }
}

function bindEvents() {
  window.addEventListener("hashchange", route);
  $("retry").addEventListener("click", init);
  $("done-continue").addEventListener("click", continueRound);

  $("card").addEventListener("click", () => {
    if (!swipe.justSwiped && !state.session?.quiz) flip();
  });
  $("quiz-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (button) chooseOption(Number(button.dataset.index));
  });
  $("quiz-skip").addEventListener("click", () => chooseOption(-1));
  $("quiz-check").addEventListener("click", submitTyped);
  $("quiz-hint").addEventListener("click", hintTyped);
  $("quiz-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitTyped();
    }
  });
  $("quiz-next").addEventListener("click", nextQuiz);
  bindSwipe();
  $("flip").addEventListener("click", flip);
  $("know").addEventListener("click", markKnown);
  $("undo").addEventListener("click", undoLastAnswer);
  for (const id of ["welcome-start", "welcome-placement", "welcome-close"]) $(id).addEventListener("click", closeWelcome);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    if (!$("welcome").hidden) $("welcome-install-btn").hidden = false;
  });
  $("welcome-install-btn").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    $("welcome-install-btn").hidden = true;
  });
  $("done-gift").addEventListener("click", openGift);
  $("home-gift").addEventListener("click", openGift);
  $("gift-open").addEventListener("click", revealGift);
  $("gift-close").addEventListener("click", () => {
    $("gift-dialog").hidden = true;
  });
  $("done-undo").addEventListener("click", undoLastAnswer);
  $("report").addEventListener("click", (event) => event.stopPropagation());
  $("share-garden").addEventListener("click", shareGarden);
  $("play-all").addEventListener("click", () => savePlayLevels(new Set(playableLevels())));
  $("play-none").addEventListener("click", () => savePlayLevels(new Set()));
  $("edit-note").addEventListener("click", (event) => {
    event.stopPropagation();
    openNoteDialog(currentWord());
  });
  $("note-text").addEventListener("input", () => {
    $("note-count").textContent = `${$("note-text").value.length}/${NOTE_MAX}`;
  });
  $("note-save").addEventListener("click", () => saveNote($("note-text").value));
  $("note-delete").addEventListener("click", () => saveNote(""));
  $("note-cancel").addEventListener("click", () => {
    $("note-dialog").hidden = true;
  });
  $("word-close").addEventListener("click", () => {
    $("word-dialog").hidden = true;
  });
  $("word-dialog").addEventListener("click", (event) => {
    if (event.target === $("word-dialog")) $("word-dialog").hidden = true;
  });
  $("whatsnew-ok").addEventListener("click", () => {
    $("whatsnew-dialog").hidden = true;
  });
  $("whatsnew-all").addEventListener("click", () => {
    $("whatsnew-dialog").hidden = true;
  });
  $("speak-word").addEventListener("click", (event) => {
    event.stopPropagation();
    speakWord(currentWord().headword);
  });
  $("speak-example").addEventListener("click", (event) => {
    event.stopPropagation();
    speakWord(currentWord().exampleEn);
  });
  $("grades").addEventListener("click", (event) => {
    const button = event.target.closest("[data-grade]");
    if (button) answer(Number(button.dataset.grade));
  });

  // Esc ปิดหน้าต่างที่เด้งขึ้นมา (อัปเดต / มีอะไรใหม่)
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = [...document.querySelectorAll(".modal:not([hidden])")].pop(); // ตัวบนสุด
    if (open) open.hidden = true;
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, select, textarea")) return;
    if (document.querySelector(".modal:not([hidden])")) return; // กำลังเปิดหน้าต่างอยู่ (เช่น โน้ตช่วยจำ)
    // Z หรือ Backspace = ย้อนคำตอบล่าสุด (ใช้ได้ทั้งระหว่างท่องและหน้าจบรอบ)
    if ((event.key === "z" || event.key === "Z" || event.key === "Backspace") && lastAnswer && (!$("view-study").hidden || !$("view-done").hidden)) {
      event.preventDefault();
      undoLastAnswer();
      return;
    }
    if (!state.session) return;
    const quiz = state.session.quiz;
    if (quiz) {
      // ทวนแบบผสม: 1–4 เลือกคำตอบ เว้นวรรค/Enter ไปต่อ (ไม่ปัดการ์ด ไม่ให้คะแนนเอง)
      if (quiz.type !== "type" && !quiz.answered && /^[1-4]$/.test(event.key)) {
        if (Number(event.key) <= quiz.options.length) chooseOption(Number(event.key) - 1);
      } else if (quiz.answered && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        nextQuiz();
      } else if (event.key === "k" || event.key === "K") {
        markKnown();
      }
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      swipeAnswer(event.key === "ArrowRight" ? GOOD : AGAIN);
    } else if (!isFlipped() && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      flip();
    } else if (event.key === "k" || event.key === "K") {
      markKnown();
    } else if (isFlipped() && ["1", "2", "3"].includes(event.key)) {
      answer({ 1: AGAIN, 2: HARD, 3: GOOD }[event.key]);
    }
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyAppearance);
  $("backup-now").addEventListener("click", exportBackup);
  $("backup-later").addEventListener("click", () => {
    storage.saveBackupMeta({ ...storage.loadBackupMeta(), asked: dayNumber() });
    renderBackupReminder();
  });
}

async function init() {
  show("loading");
  try {
    state.words = await loadWords();
  } catch (error) {
    $("error-message").textContent = error.message;
    show("error");
    return;
  }
  takeSnapshot("daily"); // สำเนาต้นวัน ทำก่อนเริ่มท่อง ไม่ต้องรอ
  updateAppBadge(); // เปิดแอปที่หน้าไหนก็ตาม ตัวเลขบนไอคอนต้องตรงกับคำที่ค้างทวน
  route();
}

// ---------- ใช้ offline (service worker) ----------

// ถามเลขเวอร์ชันจาก service worker ตัวใหม่ที่รอติดตั้งอยู่
function workerVersion(worker) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data);
    };
    worker.postMessage("version", [channel.port2]);
  });
}

function showUpdateDialog(next, apply) {
  $("update-versions").textContent = next ? `v${self.VG_VERSION} → v${next}` : `ตอนนี้ใช้ v${self.VG_VERSION}`;
  $("update-dialog").hidden = false;
  $("update-now").disabled = false;
  $("update-now").textContent = "ดาวน์โหลดเวอร์ชันใหม่";
  $("update-now").focus();
  $("update-now").onclick = () => {
    $("update-now").disabled = true;
    $("update-now").textContent = "กำลังอัปเดต…";
    apply();
  };
  $("update-later").onclick = () => {
    $("update-dialog").hidden = true;
  };
}

async function showUpdate(worker) {
  showUpdateDialog(await workerVersion(worker), () => worker.postMessage("skip-waiting"));
}

// ถามเลขเวอร์ชันล่าสุดจากเซิร์ฟเวอร์ตรง ๆ โดยไม่พึ่งการตรวจอัปเดตของ service worker
// (iOS บางครั้งไม่ติดตั้ง service worker ตัวใหม่ ทำให้ค้างเวอร์ชันเก่า) sw.js ไม่อยู่ใน cache ของแอป จึงถึงเซิร์ฟเวอร์จริง
async function fetchLatestVersion() {
  try {
    const response = await fetch(`sw.js?check=${Date.now()}`, { cache: "no-store" });
    return response.ok ? parseSwVersion(await response.text()) : null;
  } catch {
    return null;
  }
}

// อัปเดตแบบบังคับ: ล้าง cache และ service worker เดิมของแอปนี้ ลงทะเบียนตัวใหม่ให้ดึงไฟล์สดจากเซิร์ฟเวอร์ แล้วค่อยโหลดหน้าใหม่
// (ความคืบหน้าอยู่ใน localStorage ไม่หาย) ห้ามโหลดหน้าใหม่ทันที เพราะ GitHub Pages ให้เบราว์เซอร์จำไฟล์ไว้ 10 นาที จะได้ไฟล์เก่ากลับมา
// อัปเดตแบบบังคับ: ล้าง cache และ service worker เดิมของแอปนี้ แล้วโหลดหน้าใหม่ (ความคืบหน้าอยู่ใน localStorage ไม่หาย)
// หน้าที่โหลดใหม่จะลงทะเบียน service worker ตัวใหม่ซึ่งดึงไฟล์สดจากเซิร์ฟเวอร์ แล้วโหลดหน้าอีกรอบให้เอง (ดู registerServiceWorker)
const FORCE_UPDATE_FLAG = "vg:force-update";

async function forceUpdate() {
  try {
    // ลบเฉพาะ cache ของแอปนี้ (repo อื่นใต้ nopjorn.github.io ใช้ origin เดียวกัน)
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("vg-")).map((key) => caches.delete(key)));
    await (await navigator.serviceWorker?.getRegistration())?.unregister();
    sessionStorage.setItem(FORCE_UPDATE_FLAG, "1");
  } catch (error) {
    console.warn("ล้าง cache ไม่สำเร็จ", error);
  }
  location.reload();
}

async function checkForNewVersion({ manual = false } = {}) {
  if (!manual && !$("update-dialog").hidden) return;
  const latest = await fetchLatestVersion();
  if (!latest) {
    if (manual) toast("ตรวจเวอร์ชันไม่สำเร็จ ลองเช็คอินเทอร์เน็ตแล้วลองใหม่นะ");
  } else if (isNewer(latest, self.VG_VERSION)) {
    showUpdateDialog(latest, forceUpdate);
  } else if (manual) {
    toast(`ใช้เวอร์ชันล่าสุดแล้ว (v${self.VG_VERSION}) 🎉`);
  }
}

// แอปที่เปิดจากไอคอนบนหน้าจอโฮมควรเหมือนแอปทั่วไป ไม่ให้ซูมหน้าได้ (เปิดผ่านเบราว์เซอร์ปกติยังซูมได้เพื่อการเข้าถึง)
function lockZoomInInstalledApp() {
  if (!isInstalled()) return;
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");
  // iOS ไม่สนใจ user-scalable=no ต้องกันท่าถ่างนิ้วด้วย gesturestart
  document.addEventListener("gesturestart", (event) => event.preventDefault());
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // ถ้ามี service worker คุมหน้าอยู่แล้ว การเปลี่ยนตัวคุมคือการอัปเดต ให้โหลดหน้าใหม่ด้วยไฟล์เวอร์ชันใหม่
  let forced = false;
  try {
    forced = sessionStorage.getItem(FORCE_UPDATE_FLAG) === "1";
    sessionStorage.removeItem(FORCE_UPDATE_FLAG);
  } catch {
    // ไม่มี sessionStorage ก็ข้ามไป
  }
  const updating = Boolean(navigator.serviceWorker.controller) || forced;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updating) location.reload();
  });
  try {
    // updateViaCache: "none" ให้เบราว์เซอร์โหลด sw.js และ version.js จาก server ทุกครั้งที่เช็ค ไม่ใช้ HTTP cache
    const registration = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting);
    // แอปที่เปิดจากหน้าจอโฮมมักถูกพักไว้แทนการเปิดใหม่ จึงต้องเช็คเวอร์ชันใหม่เองตอนกลับมาใช้
    const checkForUpdate = () => registration.update().catch(() => {});
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    setInterval(checkForUpdate, UPDATE_CHECK_MS);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate(worker);
      });
    });
  } catch (error) {
    console.warn("ลงทะเบียน service worker ไม่สำเร็จ", error);
  }
}

// ---------- ข้ามวัน หลายแท็บ และพื้นที่เก็บข้อมูลเต็ม ----------

// หน้าที่วาดใหม่ได้เองโดยไม่รบกวนผู้ใช้ (เกมที่เล่นค้างอยู่ไม่ถูกเริ่มใหม่)
function redrawablePage() {
  const page = location.hash.replace(/^#\/?/, "").split("/")[0] || "home";
  return ["home", "garden", "settings"].includes(page);
}

// แอปที่เปิดค้างไว้ข้ามตี 4 (เช่น แอปบนหน้าจอโฮมที่ถูกพักไว้) ต้องขึ้นวันใหม่เอง ไม่ใช่ค้างตัวเลขของเมื่อวานจนกว่าจะกดเปลี่ยนหน้า
let shownDay = dayNumber();
function checkNewDay() {
  const day = dayNumber();
  if (day === shownDay || state.words.length === 0) return;
  shownDay = day;
  refreshShared();
  if (state.session) {
    // รอบท่องที่ค้างข้ามวันยังบันทึกเป็นวันเดิม จบรอบนั้น (ที่ตอบไปแล้วบันทึกครบ) แล้วเริ่มวันใหม่จากหน้าหลัก
    state.session = null;
    toast("ขึ้นวันใหม่แล้ว 🌅 ที่ตอบไปแล้วบันทึกไว้ครบ เริ่มรอบของวันนี้ได้เลย");
    if (location.hash === "#/") route();
    else location.hash = "#/";
  } else if (redrawablePage()) {
    route();
  }
}

// แท็บอื่นเปลี่ยนความคืบหน้า (เปิดแอปหลายแท็บ) อ่านค่าใหม่เข้ามา จะได้ไม่เขียนทับงานของแท็บอื่น
let storageRedraw = 0;
window.addEventListener("storage", (event) => {
  if ((event.key !== null && !event.key.startsWith("vg:")) || event.newValue === event.oldValue) return;
  refreshShared();
  // รอสักครู่ให้เขียนครบหลายคีย์ก่อนค่อยวาดใหม่ (การวาดหน้าหลักเขียนข้อมูลบางอย่างด้วย จึงไม่วาดทันทีทุกครั้ง)
  clearTimeout(storageRedraw);
  storageRedraw = setTimeout(() => {
    if (!state.session && state.words.length > 0 && redrawablePage()) route();
  }, 300);
});

// เขียนข้อมูลไม่สำเร็จ (พื้นที่เต็ม): แจ้งเตือนให้ส่งออกไฟล์สำรอง ไม่เตือนถี่เกินไป
let lastWriteWarning = 0;
storage.setWriteErrorHandler(() => {
  if (Date.now() - lastWriteWarning < 20000) return;
  lastWriteWarning = Date.now();
  toast("⚠️ บันทึกไม่สำเร็จ พื้นที่เก็บข้อมูลของเบราว์เซอร์อาจเต็ม ไปที่ ตั้งค่า แล้วส่งออกไฟล์สำรองไว้ก่อนนะ");
});

document.querySelectorAll(".app-version").forEach((node) => {
  node.textContent = self.VG_VERSION;
});
$("speak-word").hidden = !canSpeak();
$("speak-example").hidden = !canSpeak();
navigator.storage?.persist?.();
applyAppearance();
renderSupport();
lockZoomInInstalledApp();
$("check-update").onclick = () => checkForNewVersion({ manual: true });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkNewDay();
    checkForNewVersion();
  }
});
setInterval(checkNewDay, 60 * 1000);
setInterval(checkForNewVersion, UPDATE_CHECK_MS);
checkForNewVersion();
bindEvents();
init();
maybeShowWhatsNew();
registerServiceWorker();
