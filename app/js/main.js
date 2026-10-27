import { LEVELS, levelTitle, loadWords } from "./data.js";
import { comboMessage, growthSummary, nextCombo, recordGrowth, stageMove, wordList } from "./celebrate.js";
import { launchConfetti } from "./confetti.js";
import { canSpeak, speak } from "./speech.js";
import { buildQuestion, gradeTyped } from "./quiz.js";
import { playSfx } from "./sfx.js";
import { STATUSES, matchingWords, statusOf } from "./flash.js";
import { CARD_HEIGHT, CARD_WIDTH, buildCardData, drawCard } from "./sharecard.js";
import { compareText, weeklyReport } from "./weekly.js";
import { buildIcs, parseTime } from "./reminder.js";
import { buildCalendar, cellLabel } from "./calendar.js";
import { SNAPSHOT_REASONS, backupDue, backupText, canSnapshot, clearSnapshots, daysSinceBackup, formatSnapshotTime, hasSnapshot, listSnapshots, loadSnapshot, markSince, saveSnapshot } from "./backup.js";
import { wordOfDay } from "./daily.js";
import { EXAM_COUNT, bestTier, examReady } from "./exam.js";
import { DECORATIONS, FLOWERS, bloomedLevels, flowerId, flowerOf, ownedDecorations, seasonOf } from "./decor.js";
import { COMEBACK_DAYS, MEDALS, isEarlyBird, isPerfectRound, newMedals } from "./achievements.js";
import { applySky } from "./sky.js";
import { treeEl } from "./tree-art.js";
import { LEECH_LAPSES, PLOT_FILTERS, dueLabel, leechWords, matchesQuery, plantInfo, plantMatchesFilter, plantedInLevel, plotFilterCounts, plotSummary, reviewedToday } from "./garden.js";
import { daysAway, goalProgress, mergeDays, settleRest } from "./habit.js";
import { formatSeconds } from "./match.js";
import { askBadgePermission, canBadge, showBadge } from "./badge.js";
import { LISTEN_COUNT, dictationMax } from "./listen.js";
import { maxScore } from "./scramble.js";
import { allDone, missionProgress } from "./missions.js";
import { AGAIN, GOOD, HARD, STAGES, buildQueue, dayNumber, grade, isDue, knownCard, stageOf } from "./srs.js";
import {
  DAILY_GOAL_CHOICES,
  NEW_PER_DAY_CHOICES,
  NOTE_MAX,
  QUIZ_MODE_CHOICES,
  SCHEDULER_CHOICES,
  REVIEW_CAP_CHOICES,
  ROUND_SIZE_CHOICES,
  MENU_POSITION_CHOICES,
  SPEECH_RATE_CHOICES,
  TEXT_SIZE_CHOICES,
  THEME_CHOICES,
  createStorage,
} from "./storage.js";
import { entriesSince, inlineParts, parseChangelog } from "./changelog.js";
import { issueUrl } from "./report.js";
import { MILESTONES, coverageOfRanks, coverageOfTop, knownRanks, parseFrequency, percentText } from "./coverage.js";
import { describeForms } from "./forms.js";
import { fsrsGrade } from "./fsrs.js";
import { recentDays, stageCounts, streakOf, totalReviews } from "./stats.js";
import { recallBetween, recallStats } from "./recall.js";
import { SUPPORT_LINKS } from "./support.js";
import { isNewer, parseSwVersion } from "./update.js";

const VIEWS = ["loading", "error", "home", "study", "done", "garden", "plot", "play", "match", "flash", "wordle", "scramble", "sentence", "blitz", "confuse", "listen", "dictation", "placement", "exam", "settings", "about", "changelog"];
const TAB_OF_VIEW = { plot: "garden", changelog: "about", match: "play", flash: "play", wordle: "play", scramble: "play", sentence: "play", blitz: "play", confuse: "play", listen: "play", dictation: "play", placement: "settings", exam: "garden" }; // หน้าที่ไม่มีแท็บของตัวเอง ให้ไฮไลต์แท็บนี้แทน
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

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function show(view) {
  VIEWS.forEach((name) => {
    $(`view-${name}`).hidden = name !== view;
  });
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
  toast(`🎯 ถึงเป้าวันนี้แล้ว! ทวนไป ${count} ครั้ง`);
  launchConfetti();
  fx("finish");
}

// ตัวเลขบนไอคอนแอป = จำนวนคำที่ถึงเวลาทวนทั้งหมด (ไม่ถูกจำกัดด้วยเพดานต่อวัน) ล้างเมื่อปิดตัวเลือกหรือไม่มีคำค้าง
function updateAppBadge() {
  if (!canBadge()) return;
  const today = dayNumber();
  const due = translatedWords().filter((word) => isDue(state.cards[word.headword], today)).length;
  showBadge(due, state.settings.appBadge);
}

function renderHome() {
  const today = dayNumber();
  const queue = todayQueue(today);
  const dueCount = queue.filter((word) => state.cards[word.headword]).length;
  const habit = refreshHabit(today);
  const totalDue = translatedWords().filter((word) => isDue(state.cards[word.headword], today)).length;
  updateAppBadge();
  renderBackupReminder();
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

  renderMissions(today);
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
  if (!$("view-garden").hidden) renderLeeches();
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
  const word = session.queue.shift();
  const before = state.cards[word.headword];
  let card = before;

  // โหมดฝึกไม่แตะความคืบหน้า ประวัติ หรือเป้าหมายของวัน
  if (!session.practice) {
    card = schedule(word, before, rating, session.day);
    state.cards[word.headword] = card;
    storage.saveCards(state.cards);
    updateAppBadge();
    const count = storage.addReview(session.day);
    storage.addAnswer(session.day, word.headword, rating, before ? before.ivl : 0);
    storage.addLog(session.day, { n: before ? 0 : 1, t: stageMove(before, card)?.stage.id === "tree" ? 1 : 0, a: rating === AGAIN ? 1 : 0 });
    if (!before) storage.saveNewCount(session.day, storage.newCountToday(session.day) + 1);
    session.answered += 1;
    celebrate(word, before, card, rating);
    checkGoal(session.day, count);
    nudgeNote(word, card, rating);
    checkMedals();
  } else {
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
  const word = session.queue.shift();
  const before = state.cards[word.headword];
  state.cards[word.headword] = knownCard(before, session.day);
  const move = stageMove(before, state.cards[word.headword]);
  if (move) recordGrowth(session.grown, word.headword, move);
  storage.saveCards(state.cards);
  const count = storage.addReview(session.day);
  storage.addLog(session.day, { n: before ? 0 : 1, t: move?.stage.id === "tree" ? 1 : 0 });
  session.answered += 1;
  session.learned.add(word.headword);
  toast(`${word.headword} ข้ามไปเป็นต้นไม้ใหญ่แล้ว 🌳`);
  checkGoal(session.day, count);
  checkMedals();
  nextCard();
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
    ...events,
  };
}

// ตรวจเหรียญใหม่ บันทึก และแจ้งในแอป (หน่วงเล็กน้อยไม่ให้ป้ายอื่นทับทันที)
function checkMedals(events = {}) {
  checkMissions();
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
  const season = seasonOf();
  $("decor-count").textContent = `${flowers.length + decorations.length}/${LEVELS.length + DECORATIONS.length}`;
  $("decor-preview").textContent = [season?.emoji, ...flowers.map((level) => flowerOf(level, LEVELS).emoji), ...decorations.map((decoration) => decoration.emoji)]
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

// ---------- สวนของฉัน ----------

function renderGarden() {
  const today = dayNumber();
  const { history: days, active, rest } = refreshHabit(today);
  const { current, best } = streakOf(active, today, rest.frozen);
  $("g-rest").textContent = `🧊 วันพักที่เก็บไว้: ${rest.bank} จาก 2 วัน`;
  $("g-streak").textContent = current;
  $("g-best").textContent = best;
  $("g-total").textContent = totalReviews(days).toLocaleString();

  const stages = stageCounts(translatedWords(), state.cards);
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  $("g-stages").replaceChildren(
    ...stages.map((stage) => {
      const row = el("li", "stage-row");
      const bar = el("div", "stage-bar");
      const fill = el("span", `seg seg-${stage.id}`);
      fill.style.width = `${total ? (stage.count / total) * 100 : 0}%`;
      bar.append(fill);
      const name = el("span", "stage-name");
      name.append(treeEl(stage.id), ` ${stage.label}`);
      row.append(name, bar, el("strong", "stage-count", stage.count));
      return row;
    }),
  );

  const week = recentDays(days, today, 7);
  const peak = Math.max(1, ...week.map((entry) => entry.count));
  $("g-week").replaceChildren(
    ...week.map((entry) => {
      const column = el("div", `week-col${entry.day === today ? " today" : ""}`);
      const bar = el("div", "week-bar");
      bar.style.height = `${Math.max(entry.count ? 8 : 3, (entry.count / peak) * 100)}%`;
      column.append(el("span", "week-count", entry.count || ""), bar, el("span", "week-label", entry.label));
      return column;
    }),
  );
  $("g-week").setAttribute("aria-label", `ทวน 7 วันล่าสุด: ${week.map((entry) => entry.count).join(", ")} ครั้ง`);
  $("g-empty").hidden = totalReviews(days) > 0;
  renderRecall(today);
  renderCoverage();
  renderCalendar(active, today, rest.frozen);
  renderPlots(today);
  renderLeeches();
  renderMedals();
}

// อัตราจำได้ย้อนหลัง RECALL_DAYS วัน (นับเฉพาะคำที่เคยเรียนแล้ว) แยกตามระยะของต้นไม้ก่อนตอบ
function renderRecall(today) {
  const stats = recallStats(storage.loadAnswers(), today);
  $("g-recall-empty").hidden = stats.total > 0;
  $("g-recall-body").hidden = stats.total === 0;
  if (stats.total === 0) return;
  $("g-recall-rate").textContent = `${stats.rate}%`;
  $("g-recall-sub").textContent = `จำได้ ${stats.remembered} จาก ${stats.total} ครั้งที่ทวนคำที่เคยเรียนแล้ว`;
  const names = { sprout: "ต้นอ่อน", growing: "กำลังโต", tree: "ต้นไม้ใหญ่" };
  $("g-recall-stages").replaceChildren(
    ...Object.entries(stats.byStage)
      .filter(([, bucket]) => bucket.total > 0)
      .map(([id, bucket]) => {
        const row = el("li", "stage-row");
        const bar = el("div", "stage-bar");
        const fill = el("span", `seg seg-${id}`);
        fill.style.width = `${bucket.rate}%`;
        bar.append(fill);
        const name = el("span", "stage-name");
        name.append(treeEl(id), ` ${names[id]}`);
        row.append(name, bar, el("strong", "stage-count", `${bucket.rate}%`));
        row.title = `จำได้ ${bucket.remembered} จาก ${bucket.total} ครั้ง`;
        return row;
      }),
  );
}

// รู้กี่คำ ≈ อ่านเข้าใจข้อความกี่เปอร์เซ็นต์ (ดู coverage.js) ไฟล์ความถี่โหลดเมื่อเปิดหน้าสวนครั้งแรกเท่านั้น
let frequencyPromise = null;

function loadFrequency() {
  frequencyPromise ||= fetch("data/frequency.tsv")
    .then((response) => {
      if (!response.ok) throw new Error(`โหลดไฟล์ความถี่ไม่สำเร็จ (${response.status})`);
      return response.text();
    })
    .then(parseFrequency)
    .catch(() => {
      frequencyPromise = null; // ลองใหม่ได้ครั้งหน้า
      return null;
    });
  return frequencyPromise;
}

async function renderCoverage() {
  const frequency = await loadFrequency();
  $("g-cover").hidden = !frequency;
  if (!frequency) return;
  const ranks = knownRanks(translatedWords(), state.cards);
  $("g-cover-rate").textContent = percentText(coverageOfRanks(ranks, frequency));
  $("g-cover-sub").textContent = ranks.length > 0 ? `ปลูกแล้ว ${ranks.length.toLocaleString()} คำ ครอบคลุมราวนี้ของข้อความทั่วไป` : "ยังไม่ได้ปลูกคำ เริ่มท่องแล้วตัวเลขจะขึ้นที่นี่";
  $("g-cover-steps").replaceChildren(
    ...MILESTONES.map((count) => {
      const percent = coverageOfTop(count, frequency);
      const reached = ranks.length >= count;
      const row = el("li", `stage-row${reached ? " reached" : ""}`);
      const bar = el("div", "stage-bar");
      const fill = el("span", `seg seg-${reached ? "tree" : "growing"}`);
      fill.style.width = `${percent}%`;
      bar.append(fill);
      row.append(el("span", "stage-name", `${count.toLocaleString()} คำแรก${reached ? " ✅" : ""}`), bar, el("strong", "stage-count", percentText(percent)));
      return row;
    }),
  );
}

// ปฏิทินสวน: ช่องละหนึ่งวัน สีเข้มตามจำนวนที่ทวน (รวมวันที่เล่นเกม) คอลัมน์ละหนึ่งสัปดาห์
function renderCalendar(active, today, frozen) {
  const calendar = buildCalendar(active, today, frozen);
  $("cal-grid").style.setProperty("--weeks", calendar.weeks);
  $("cal-months").style.setProperty("--weeks", calendar.weeks);
  $("cal-months").replaceChildren(...calendar.months.map((name) => el("span", "", name)));
  $("cal-grid").replaceChildren(
    ...calendar.cells.map((cell) => {
      const node = el("span", `cal-cell${cell.future ? " future" : ` l${cell.level}`}${cell.rest ? " rest" : ""}${cell.day === today ? " today" : ""}`);
      node.title = cellLabel(cell);
      return node;
    }),
  );
  $("cal-summary").textContent = `ท่อง ${calendar.activeDays} วัน ใน ${calendar.weeks} สัปดาห์ล่าสุด (ทวนรวม ${calendar.total.toLocaleString()} ครั้ง)`;
  $("cal-grid").setAttribute("aria-label", `ปฏิทินสวน ท่อง ${calendar.activeDays} วัน ใน ${calendar.weeks} สัปดาห์ล่าสุด`);
}

function renderLeeches() {
  const leeches = leechWords(translatedWords(), state.cards, 12);
  $("leech-section").hidden = leeches.length === 0;
  $("leech-list").replaceChildren(
    ...leeches.map((word) => {
      const item = el("li");
      const button = el("button", "leech-item");
      button.type = "button";
      button.dataset.headword = word.headword;
      button.append(
        el("strong", "", word.headword),
        el("span", "muted", word.senses[0]?.text || ""),
        el("span", "leech-count", `ลืม ${state.cards[word.headword].lapses} ครั้ง${state.notes[word.headword] ? " 📝" : ""}`),
      );
      item.append(button);
      return item;
    }),
  );
}

// แปลงสวน: ด่านละแปลง คำละต้น ต้นที่ถึงเวลาทวนเหี่ยวจนกว่าจะรดน้ำ
function plantButton(word, today) {
  const info = plantInfo(state.cards[word.headword], today);
  const button = el("button", `plant${info.planted ? "" : " seed"}${info.wilted ? " wilted" : ""}`);
  button.append(treeEl(info.stage.id, { wilted: info.wilted }));
  button.type = "button";
  button.dataset.headword = word.headword;
  button.title = word.headword;
  button.setAttribute("aria-label", `${word.headword} ${info.stage.label}${info.wilted ? " ต้องรดน้ำ" : ""}`);
  return button;
}

// ปุ่มสอบปลายแปลงใต้ต้นไม้ของแต่ละแปลง (ปลูกครบทั้งแปลงแล้วจึงเปิดสอบ)
function examBox(level, summary, tier) {
  const box = el("div", "exam-box");
  if (summary.planted > 0) {
    const practice = el("a", "button", "🧠 ฝึกทบทวนแปลงนี้");
    practice.href = `#/study/practice-${level}`;
    box.append(practice, el("span", "muted small", "ฝึกกี่ครั้งก็ไม่เปลี่ยนวันทวน"));
  }
  if (examReady(state.words, state.cards, level)) {
    const link = el("a", "button primary", `📝 สอบปลายแปลง ${EXAM_COUNT} ข้อ`);
    link.href = `#/exam/${level}`;
    box.append(link, el("span", "muted small", tier ? `ดีที่สุดที่เคยได้: ${tier.emoji} ${tier.name}` : "ได้เหรียญเมื่อตอบถูก 12 ข้อขึ้นไป"));
  } else {
    box.append(el("span", "muted small", `📝 ปลูกให้ครบทั้งแปลงก่อนจึงเปิดสอบได้ (ปลูกแล้ว ${summary.planted}/${summary.total})`));
  }
  return box;
}

// แถบสีสัดส่วนระยะของต้นไม้ในแปลง (counts = จำนวนต้นของแต่ละระยะ)
function stageBarOf(counts, total) {
  const bar = el("div", "stagebar");
  STAGES.slice(1).forEach((stage) => {
    if (counts[stage.id] === 0) return;
    const segment = el("span", `seg seg-${stage.id}`);
    segment.style.width = `${(counts[stage.id] / total) * 100}%`;
    bar.append(segment);
  });
  return bar;
}

function stageCountsOf(words) {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage.id, 0]));
  words.forEach((word) => {
    counts[stageOf(state.cards[word.headword]).id] += 1;
  });
  return counts;
}

// จำนวนต้นของแต่ละระยะ เป็นต้นไม้ SVG ตามด้วยตัวเลข (ชื่อระยะซ่อนไว้ให้โปรแกรมอ่านหน้าจออ่าน)
function stageChipsOf(counts) {
  const wrap = el("span", "stage-chips");
  STAGES.slice(1).forEach((stage) => {
    const chip = el("span", "stage-chip");
    chip.append(treeEl(stage.id), el("span", "sr-only", stage.label), String(counts[stage.id]));
    wrap.append(chip);
  });
  return wrap;
}

// คำอธิบายสัญลักษณ์ระยะในหน้าหลัก
function renderStageLegend() {
  const parts = STAGES.map((stage) => {
    const item = el("span", "legend-item");
    item.append(treeEl(stage.id), ` ${stage.label}`);
    return item;
  });
  $("stage-legend").replaceChildren(...parts.flatMap((part, index) => (index ? [" · ", part] : [part])));
}

function renderPlots(today) {
  const translated = translatedWords();
  const { wilted } = plotSummary(translated, state.cards, today);
  $("water-note").textContent = wilted > 0 ? `💧 ${wilted} ต้นรอรดน้ำ (ถึงเวลาทวนแล้ว)` : "🌤️ ต้นไม้ทุกต้นชุ่มชื้นดี วันนี้ไม่ต้องรดน้ำ";
  $("water-go").hidden = wilted === 0;

  // แต่ละแปลงเป็นแผ่นเล็ก ๆ (บอกสรุปและแถบสี) แตะแล้วไปหน้าของแปลงนั้น แปลงอื่นจึงไม่ถูกดัน
  const levels = [...new Set(translated.map((word) => word.level))];
  const folded = [];
  const items = [];
  let fresh = 0;
  levels.forEach((level) => {
    const words = translated.filter((word) => word.level === level);
    const summary = plotSummary(words, state.cards, today);
    const counts = stageCountsOf(words);
    const plot = el("a", "plot");
    plot.href = `#/garden/${level}`;
    plot.dataset.level = level;
    const head = el("div", "plot-head");
    const info = el("div", "level-info");
    const isFresh = summary.planted === 0;
    // แปลงที่ยังไม่เริ่มเหลือแค่เลขแปลง เหมือนหน้าหลัก
    info.append(el("p", "level-title", levelTitle(level)), el("p", "level-sub", isFresh ? "ยังไม่เริ่ม" : `${summary.planted}/${summary.total} คำ${summary.wilted ? ` · 💧 ${summary.wilted}` : ""}`));
    head.append(el("span", "level-badge", level === "sup" ? "★" : String(Number(level))), info);
    if (isFresh) plot.classList.add("plot-fresh");
    else {
      const tier = bestTier(level, storage.loadMedals());
      const stagesLine = el("p", "level-stages");
      stagesLine.append(stageChipsOf(counts), tier ? `  ${tier.emoji}` : "");
      head.append(stageBarOf(counts, words.length), stagesLine);
    }
    plot.append(head);
    if (isFresh && (fresh += 1) > FRESH_VISIBLE) folded.push(plot);
    else items.push(plot);
  });
  if (folded.length > 0) items.push(foldItem(folded.length, "div", $("plots"), () => renderPlots(today)), ...(freshOpen ? folded : []));
  $("plots").replaceChildren(...items);
  applyGardenSearch();
}

// ---------- รู้แล้ว ข้ามเป็นต้นไม้ใหญ่ ----------

// คำที่ยังไม่เป็นต้นไม้ใหญ่ ข้ามได้
const canSkip = (word) => stageOf(state.cards[word.headword]).id !== "tree";

// ข้ามคำที่ผู้เรียนรู้อยู่แล้วให้เป็นต้นไม้ใหญ่เลย (ทวนอีกทีในอีก 30 วัน) ไม่นับเป็นการทวนของวัน
function skipWordsAsKnown(words) {
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
  if (!$("view-plot").hidden) renderPlotPage(plotPage.level);
  if (!$("view-garden").hidden) renderGarden();
}

// ---------- หน้าของแต่ละแปลง (#/garden/<แปลง>) ----------

// แถวในมุมมองรายการ: ช่องติ๊ก "รู้แล้ว" + ตัวคำและความหมาย แตะที่คำเพื่อดูรายละเอียด
function wordRow(word, today) {
  const info = plantInfo(state.cards[word.headword], today);
  const row = el("li", `word-row${info.wilted ? " wilted" : ""}`);
  if (canSkip(word)) {
    const label = el("label", "word-check");
    const box = el("input");
    box.type = "checkbox";
    box.checked = plotPage.selected.has(word.headword);
    box.setAttribute("aria-label", `รู้คำว่า ${word.headword} แล้ว (เลือกเพื่อข้าม)`);
    box.addEventListener("change", () => {
      if (box.checked) plotPage.selected.add(word.headword);
      else plotPage.selected.delete(word.headword);
      updateSelectBar();
    });
    label.append(box);
    row.append(label);
  } else {
    row.append(el("span", "word-check done", "✓"));
  }
  const main = el("button", "word-row-main");
  main.type = "button";
  main.dataset.headword = word.headword;
  const emoji = el("span", "word-row-emoji");
  emoji.append(treeEl(info.stage.id, { wilted: info.wilted }));
  emoji.setAttribute("aria-hidden", "true");
  const name = el("strong", "", word.headword);
  name.lang = "en";
  main.append(emoji, name, el("span", "word-row-meaning", word.senses[0]?.text || ""));
  main.setAttribute("aria-label", `${word.headword} ${info.stage.label}${info.wilted ? " ต้องรดน้ำ" : ""}`);
  row.append(main);
  return row;
}

function updateSelectBar() {
  const count = plotPage.selected.size;
  $("plot-select-count").textContent = count > 0 ? `เลือกแล้ว ${count} คำ` : "ติ๊กคำที่รู้อยู่แล้ว";
  $("plot-skip").disabled = count === 0;
  $("plot-select-none").hidden = count === 0;
}

function skipSelected() {
  const words = (plotPage.shown || []).filter((word) => plotPage.selected.has(word.headword) && canSkip(word));
  if (words.length === 0) return;
  if (!confirm(`ข้าม ${words.length} คำที่เลือกให้เป็นต้นไม้ใหญ่เลยใช่ไหม? (คำเหล่านี้จะมาทวนอีกทีในอีก 30 วัน และย้อนกลับไม่ได้)`)) return;
  plotPage.selected.clear();
  skipWordsAsKnown(words);
  toast(`ข้าม ${words.length} คำเป็นต้นไม้ใหญ่แล้ว 🌳`);
}

const plotPage = { level: null, filter: "all", view: "grid", selected: new Set() };

function renderPlotPage(level) {
  if (plotPage.level !== level) Object.assign(plotPage, { level, filter: "all", selected: new Set() });
  const today = dayNumber();
  const translated = translatedWords();
  const levels = [...new Set(translated.map((word) => word.level))];
  const words = translated.filter((word) => word.level === level);
  const summary = plotSummary(words, state.cards, today);
  const counts = stageCountsOf(words);
  const tier = bestTier(level, storage.loadMedals());

  $("plot-title").textContent = levelTitle(level);
  $("plot-sub").replaceChildren(
    `ปลูกแล้ว ${summary.planted}/${summary.total} คำ${summary.wilted ? ` · 💧 ${summary.wilted} ต้นรอรดน้ำ` : ""}  `,
    stageChipsOf(counts),
    tier ? `  ${tier.emoji}` : "",
  );
  $("plot-stagebar").replaceChildren(...stageBarOf(counts, words.length).childNodes);

  // ลูกศรสลับไปแปลงก่อนหน้า/ถัดไป โดยไม่ต้องกลับไปหน้าสวน
  const index = levels.indexOf(level);
  for (const [id, target] of [["plot-prev", levels[index - 1]], ["plot-next", levels[index + 1]]]) {
    $(id).hidden = target === undefined;
    if (target !== undefined) $(id).href = `#/garden/${target}`;
  }

  const filterCounts = plotFilterCounts(words, state.cards, today);
  if (filterCounts[plotPage.filter] === 0) plotPage.filter = "all";
  $("plot-filters").replaceChildren(
    ...PLOT_FILTERS.filter((filter) => filter.id === "all" || filter.id === plotPage.filter || filterCounts[filter.id] > 0).map((filter) => {
      const isStage = STAGES.some((stage) => stage.id === filter.id);
      // ตัวกรองตามระยะใช้ต้นไม้ SVG แทนอีโมจิหน้าป้าย (label ใน garden.js ขึ้นต้นด้วยอีโมจิ 1 ตัวแล้วเว้นวรรค)
      const chip = el("button", "plot-filter", `${isStage ? filter.label.replace(/^\S+\s/, "") : filter.label} ${filterCounts[filter.id]}`);
      if (isStage) chip.prepend(treeEl(filter.id));
      chip.type = "button";
      chip.setAttribute("aria-pressed", String(filter.id === plotPage.filter));
      chip.addEventListener("click", () => {
        plotPage.filter = filter.id;
        plotPage.selected.clear();
        renderPlotPage(level);
      });
      return chip;
    }),
  );
  const shown = words.filter((word) => plantMatchesFilter(state.cards[word.headword], today, plotPage.filter));
  const list = plotPage.view === "list";
  for (const [id, view] of [["plot-view-grid", "grid"], ["plot-view-list", "list"]]) $(id).setAttribute("aria-pressed", String(plotPage.view === view));
  $("plot-grid").hidden = list;
  $("plot-list").hidden = !list;
  $("plot-grid").replaceChildren(...(list ? [] : shown.map((word) => plantButton(word, today))));
  $("plot-list").replaceChildren(...(list ? shown.map((word) => wordRow(word, today)) : []));
  $("plot-select-bar").hidden = !list || !shown.some(canSkip);
  plotPage.shown = shown;
  updateSelectBar();
  $("plot-empty").hidden = shown.length > 0;
  $("plot-exam").replaceChildren(examBox(level, summary, tier));
}

// ช่องค้นหา: พิมพ์แล้วแสดงรายการคำที่ตรงแทนแปลง (ไม่ต้องไล่หาในตาราง)
function applyGardenSearch() {
  const query = $("garden-search").value.trim();
  const today = dayNumber();
  const matches = query ? translatedWords().filter((word) => matchesQuery(word, query)) : [];
  $("plots").hidden = Boolean(query);
  $("garden-matches").hidden = !query;
  $("garden-matches").replaceChildren(
    ...matches.slice(0, 40).map((word) => {
      const info = plantInfo(state.cards[word.headword], today);
      const item = el("li");
      const button = el("button", `match-item${info.wilted ? " wilted" : ""}`);
      button.type = "button";
      button.dataset.headword = word.headword;
      const matchIcon = el("span", "match-emoji");
      matchIcon.append(treeEl(info.stage.id, { wilted: info.wilted }));
      matchIcon.setAttribute("aria-hidden", "true");
      button.append(matchIcon, el("strong", "", word.headword), el("span", "muted", word.senses[0]?.text || ""));
      item.append(button);
      return item;
    }),
  );
  $("garden-found").textContent = query ? (matches.length > 40 ? `พบ ${matches.length} คำ (แสดง 40 คำแรก)` : `พบ ${matches.length} คำ`) : "";
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

const SPEECH_RATE_LABELS = { 0.7: "ช้า", 0.9: "ปกติ", 1.1: "เร็ว" };
const THEME_LABELS = { auto: "ตามเครื่อง", light: "สว่าง", dark: "มืด" };
const TEXT_SIZE_LABELS = { normal: "ปกติ", large: "ใหญ่" };
const MENU_POSITION_LABELS = { bottom: "ด้านล่าง (ลอย)", dock: "ด้านล่าง (ชิดขอบจอ)", top: "ด้านบน" };
const SCHEDULER_LABELS = { sm2: "แบบเดิม (SM-2 ฉบับย่อ)", fsrs: "FSRS (ทดลอง)" };
const QUIZ_MODE_LABELS = { flip: "พลิกการ์ด (แบบเดิม)", mixed: "ผสมหลายแบบ" };
const DAILY_GOAL_LABELS = Object.fromEntries(DAILY_GOAL_CHOICES.map((count) => [count, `${count} ครั้ง`]));
const REVIEW_CAP_LABELS = Object.fromEntries(REVIEW_CAP_CHOICES.map((count) => [count, count ? `ไม่เกิน ${count} ครั้ง` : "ไม่จำกัด"]));

const ROUND_SIZE_LABELS = Object.fromEntries(ROUND_SIZE_CHOICES.map((count) => [count, count ? `${count} ใบ` : "ไม่แบ่งรอบ"]));

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
  state.settings = { ...state.settings, ...change };
  storage.saveSettings(state.settings);
  applyAppearance();
}

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
  wotdPick = null; // คำที่สุ่มไว้อาจไม่อยู่ในกองใหม่แล้ว
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
  wordle: () => import("./screens/wordle.js"),
};
const loaded = {};
const pending = {};

// ของที่หน้าเหล่านี้ใช้ร่วมกับ main.js
const screenContext = () => ({ $, el, show, toast, fx, state, storage, speakWord, translatedWords, poolOrBack, checkMedals, updateSetting, playPool, playFilterText, fillSelect });

function screenFor(page, argument) {
  if (page === "exam" || page === "placement") return page;
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
  loaded.match?.stop();
  loaded.blitz?.stop();
  const screen = screenFor(page, argument);
  if (screen) {
    openScreen(screen, argument);
    return;
  }
  if (page === "play") {
    renderPlay();
    show("play");
  } else if (page === "garden" && argument && translatedWords().some((word) => word.level === argument)) {
    renderPlotPage(argument);
    show("plot");
  } else if (page === "garden") {
    renderGarden();
    show("garden");
    if (fromPlot) window.scrollTo(0, gardenScroll);
  } else if (page === "settings") {
    renderSettings();
    show("settings");
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
  $("report").addEventListener("click", (event) => event.stopPropagation());
  $("share-garden").addEventListener("click", shareGarden);
  $("play-all").addEventListener("click", () => savePlayLevels(new Set(playableLevels())));
  $("play-none").addEventListener("click", () => savePlayLevels(new Set()));
  $("wotd-levels-all").addEventListener("click", () => saveWotdLevels(new Set(playableLevels())));
  $("wotd-levels-none").addEventListener("click", () => saveWotdLevels(new Set()));
  $("wotd-levels-learned").addEventListener("click", () => saveWotdLevels(new Set(playableLevels().filter((level) => plantedIn(level) > 0))));
  $("wotd-levels-fresh").addEventListener("click", () => saveWotdLevels(new Set(playableLevels().filter((level) => plantedIn(level) === 0))));
  // สลับไปแปลงก่อนหน้า/ถัดไปโดยแทนที่หน้าเดิมในประวัติ ปุ่มย้อนกลับจะกลับไปหน้าสวนทีเดียว ไม่ต้องไล่กลับทีละแปลง
  for (const id of ["plot-prev", "plot-next"]) {
    $(id).addEventListener("click", (event) => {
      event.preventDefault();
      location.replace($(id).href);
    });
  }
  for (const [id, view] of [["plot-view-grid", "grid"], ["plot-view-list", "list"]]) {
    $(id).addEventListener("click", () => {
      plotPage.view = view;
      plotPage.selected.clear();
      renderPlotPage(plotPage.level);
    });
  }
  $("plot-select-all").addEventListener("click", () => {
    (plotPage.shown || []).filter(canSkip).forEach((word) => plotPage.selected.add(word.headword));
    $("plot-list").querySelectorAll(".word-check input").forEach((box) => {
      box.checked = true;
    });
    updateSelectBar();
  });
  $("plot-select-none").addEventListener("click", () => {
    plotPage.selected.clear();
    $("plot-list").querySelectorAll(".word-check input").forEach((box) => {
      box.checked = false;
    });
    updateSelectBar();
  });
  $("plot-skip").addEventListener("click", skipSelected);
  $("plot-list").addEventListener("click", (event) => {
    const button = event.target.closest(".word-row-main");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
  $("plot-grid").addEventListener("click", (event) => {
    const button = event.target.closest(".plant");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
  $("garden-search").addEventListener("input", applyGardenSearch);
  $("garden-matches").addEventListener("click", (event) => {
    const button = event.target.closest(".match-item");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
  $("leech-list").addEventListener("click", (event) => {
    const button = event.target.closest(".leech-item");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
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
    if (!state.session || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, select, textarea")) return;
    if (document.querySelector(".modal:not([hidden])")) return; // กำลังเปิดหน้าต่างอยู่ (เช่น โน้ตช่วยจำ)
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

  $("new-per-day").addEventListener("change", (event) => {
    state.settings = { ...state.settings, newPerDay: Number(event.target.value) };
    storage.saveSettings(state.settings);
    toast(`ตั้งคำใหม่เป็นวันละ ${state.settings.newPerDay} คำแล้ว`);
  });
  $("start-level").addEventListener("change", (event) => {
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
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyAppearance);
  $("reminder-make").addEventListener("click", makeReminder);
  $("export").addEventListener("click", exportBackup);
  $("backup-now").addEventListener("click", exportBackup);
  $("backup-later").addEventListener("click", () => {
    storage.saveBackupMeta({ ...storage.loadBackupMeta(), asked: dayNumber() });
    renderBackupReminder();
  });
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
  const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (!installed) return;
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
  if (document.visibilityState === "visible") checkForNewVersion();
});
setInterval(checkForNewVersion, UPDATE_CHECK_MS);
checkForNewVersion();
bindEvents();
init();
maybeShowWhatsNew();
registerServiceWorker();
