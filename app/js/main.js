import { LEVELS, levelTitle, loadWords } from "./data.js";
import { canSpeak, speak } from "./speech.js";
import { AGAIN, GOOD, HARD, STAGES, buildQueue, dayNumber, grade, knownCard, stageOf } from "./srs.js";
import { NEW_PER_DAY_CHOICES, SPEECH_RATE_CHOICES, TEXT_SIZE_CHOICES, THEME_CHOICES, createStorage } from "./storage.js";
import { entriesSince, inlineParts, parseChangelog } from "./changelog.js";
import { issueUrl } from "./report.js";
import { recentDays, stageCounts, streakOf, totalReviews } from "./stats.js";
import { SUPPORT_LINKS } from "./support.js";
import { isNewer, parseSwVersion } from "./update.js";

const VIEWS = ["loading", "error", "home", "study", "done", "garden", "settings", "about", "changelog"];
const TAB_OF_VIEW = { changelog: "about" }; // หน้าที่ไม่มีแท็บของตัวเอง ให้ไฮไลต์แท็บนี้แทน
const REQUEUE_GAP = 3; // คำที่ตอบ "ยังจำไม่ได้" จะกลับมาอีกครั้งหลังการ์ดใบอื่นอีก 3 ใบ
const SWIPE_DISTANCE = 90; // ปัดเกินกี่ px ถึงนับเป็นการให้คะแนน
const SWIPE_PREVIEW = 40; // ปัดเกินกี่ px ถึงเริ่มขึ้นป้ายบนการ์ด
const UPDATE_CHECK_MS = 30 * 60 * 1000; // ระหว่างเปิดแอปค้างไว้ เช็คเวอร์ชันใหม่ทุก 30 นาที

const storage = createStorage();
const state = {
  words: [],
  cards: storage.loadCards(),
  settings: storage.loadSettings(),
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
  document.querySelectorAll(".tabbar a").forEach((tab) => {
    if (tab.dataset.tab === (TAB_OF_VIEW[view] || view)) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

// ธีม (ตามเครื่อง/สว่าง/มืด) และขนาดตัวอักษรตามการตั้งค่า
function applyAppearance() {
  const { theme, textSize } = state.settings;
  const root = document.documentElement;
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
  return buildQueue(translated, state.cards, day, newLimit(day), fresh);
}

// ---------- หน้าหลัก ----------

function greeting(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return "สวัสดีตอนเช้า ☀️";
  if (hour >= 12 && hour < 17) return "สวัสดีตอนบ่าย 🌤️";
  if (hour >= 17 && hour < 21) return "สวัสดีตอนเย็น 🌇";
  return "สวัสดีตอนค่ำ 🌙";
}

function levelItem(level) {
  const words = state.words.filter((word) => word.level === level);
  const item = el("li", "level");
  const badge = el("span", "level-badge", level === "sup" ? "★" : String(Number(level)));
  const info = el("div", "level-info");
  info.append(el("p", "level-title", levelTitle(level)));
  item.append(badge, info);

  if (!words.some((word) => word.translated)) {
    item.classList.add("locked");
    badge.textContent = "🔒";
    info.append(el("p", "level-sub", `${words.length} คำ · กำลังปลูก เร็ว ๆ นี้`));
    return item;
  }

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
  info.append(el("p", "level-sub", `${words.length} คำ · ปลูกแล้ว ${planted}`));
  item.append(el("span", "level-pct", `${Math.round((planted / words.length) * 100)}%`));

  // แถบสีแยกตามระยะของต้นไม้ (ไม่รวมเมล็ด)
  const bar = el("div", "stagebar");
  STAGES.slice(1).forEach((stage) => {
    if (counts[stage.id] === 0) return;
    const segment = el("span", `seg seg-${stage.id}`);
    segment.style.width = `${(counts[stage.id] / words.length) * 100}%`;
    bar.append(segment);
  });
  const stages = el("p", "level-stages", STAGES.map((stage) => `${stage.emoji} ${counts[stage.id]}`).join("   "));
  item.append(bar, stages);
  return item;
}

function renderHome() {
  const queue = todayQueue(dayNumber());
  const dueCount = queue.filter((word) => state.cards[word.headword]).length;
  $("greeting").textContent = greeting();
  $("due-count").textContent = dueCount;
  $("new-count").textContent = queue.length - dueCount;
  $("start").hidden = queue.length === 0;
  $("today-empty").hidden = queue.length > 0;

  const translated = translatedWords();
  const planted = translated.filter((word) => state.cards[word.headword]).length;
  $("garden-count").textContent = planted;
  $("garden-ring").style.setProperty("--p", translated.length ? (planted / translated.length) * 100 : 0);
  $("garden-ring").setAttribute("aria-label", `ปลูกแล้ว ${planted} จาก ${translated.length} คำ`);
  const { current } = streakOf(storage.loadHistory(), dayNumber());
  $("streak").hidden = current === 0;
  $("streak").textContent = `🔥 ท่องต่อเนื่อง ${current} วัน`;
  $("garden-total").textContent = `แปลแล้ว ${translated.length.toLocaleString()} / ${state.words.length.toLocaleString()} คำ`;

  $("levels").replaceChildren(...LEVELS.map(levelItem));
  $("storage-warning").hidden = storage.persistent;
}

// ---------- ท่องศัพท์ ----------

function startSession(level = null) {
  const day = dayNumber();
  const queue = todayQueue(day, level);
  if (queue.length === 0) {
    if (level) toast(`${levelTitle(level)} ไม่มีคำให้เรียนตอนนี้ ไว้ทวนใหม่วันหลังนะ`);
    location.hash = "#/";
    return;
  }
  state.session = { day, queue, total: queue.length, answered: 0, learned: new Set() };
  show("study");
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
  $("card-forms").textContent = word.forms.length ? `รูปคำอื่น: ${word.forms.join(", ")}` : "";
  $("card-forms").hidden = word.forms.length === 0;
  $("card-example-en").textContent = word.exampleEn;
  $("card-example-th").textContent = word.exampleTh;
  $("card-note").textContent = word.note ? `💡 ${word.note}` : "";
  $("card-note").hidden = !word.note;
  $("report").href = issueUrl(word, self.VG_VERSION);
  if (state.settings.autoSpeak) speakWord(word.headword);
  $("card").focus({ preventScroll: true });
}

function isFlipped() {
  return !$("card-back").hidden;
}

function flip() {
  if (isFlipped()) return;
  $("card-back").hidden = false;
  $("card-hint").hidden = true;
  $("flip").hidden = true;
  $("grades").hidden = false;
}

function answer(rating) {
  const session = state.session;
  const word = session.queue.shift();
  const isNew = !state.cards[word.headword];
  const card = grade(state.cards[word.headword], rating, session.day);

  state.cards[word.headword] = card;
  storage.saveCards(state.cards);
  storage.addReview(session.day);
  if (isNew) storage.saveNewCount(session.day, storage.newCountToday(session.day) + 1);
  session.answered += 1;

  if (card.ivl === 0) {
    session.queue.splice(Math.min(REQUEUE_GAP, session.queue.length), 0, word);
  } else {
    session.learned.add(word.headword);
  }

  nextCard();
}

function nextCard() {
  if (state.session.queue.length > 0) {
    showCard();
  } else {
    finishSession();
  }
}

// รู้อยู่แล้ว: ข้ามไปเป็นต้นไม้ใหญ่ทันที ไม่นับเป็นคำใหม่ของวันนี้
function markKnown() {
  const session = state.session;
  const word = session.queue.shift();
  state.cards[word.headword] = knownCard(state.cards[word.headword], session.day);
  storage.saveCards(state.cards);
  storage.addReview(session.day);
  session.answered += 1;
  session.learned.add(word.headword);
  toast(`${word.headword} ข้ามไปเป็นต้นไม้ใหญ่แล้ว 🌳`);
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
    if (swipe.busy || event.target.closest("button")) return;
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
  const { answered, learned } = state.session;
  $("done-summary").textContent = `วันนี้ทวนไป ${answered} ครั้ง รดน้ำต้นไม้ไป ${learned.size} ต้น 🌱`;
  state.session = null;
  show("done");
}

// ---------- สวนของฉัน ----------

function renderGarden() {
  const days = storage.loadHistory();
  const today = dayNumber();
  const { current, best } = streakOf(days, today);
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
      row.append(el("span", "stage-name", `${stage.emoji} ${stage.label}`), bar, el("strong", "stage-count", stage.count));
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
      const option = el("option", "", `ด่าน ${Number(level)}`);
      option.value = Number(level);
      option.selected = Number(level) === state.settings.startLevel;
      return option;
    }),
  );
  fillSelect($("speech-rate"), SPEECH_RATE_CHOICES, state.settings.speechRate, SPEECH_RATE_LABELS);
  fillSelect($("theme"), THEME_CHOICES, state.settings.theme, THEME_LABELS);
  fillSelect($("text-size"), TEXT_SIZE_CHOICES, state.settings.textSize, TEXT_SIZE_LABELS);
  $("auto-speak").checked = state.settings.autoSpeak;
  $("sound-panel").hidden = !canSpeak();
  $("sound-heading").hidden = !canSpeak();
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

function exportBackup() {
  const data = storage.exportData(self.VG_VERSION);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = el("a");
  link.href = URL.createObjectURL(blob);
  link.download = `vocab-garden-backup-${data.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importBackup(file) {
  try {
    const count = storage.importData(JSON.parse(await file.text()));
    state.cards = storage.loadCards();
    state.settings = storage.loadSettings();
    applyAppearance();
    renderSettings();
    toast(`นำเข้าความคืบหน้า ${count} คำเรียบร้อย`);
  } catch (error) {
    toast(error instanceof SyntaxError ? "อ่านไฟล์ไม่ได้ ไฟล์อาจเสียหาย" : error.message);
  }
}

function resetProgress() {
  if (!confirm("ล้างความคืบหน้าทั้งหมดใช่ไหม? ย้อนกลับไม่ได้นะ (แนะนำให้ดาวน์โหลดไฟล์สำรองก่อน)")) return;
  storage.reset();
  state.cards = storage.loadCards();
  state.settings = storage.loadSettings();
  applyAppearance();
  renderSettings();
  toast("ล้างความคืบหน้าแล้ว");
}

// ---------- เส้นทาง ----------

function route() {
  if (state.words.length === 0) return;
  const [page, argument] = (location.hash.replace(/^#\/?/, "") || "home").split("/");
  if (page === "study") {
    const level = LEVELS.includes(argument) ? argument : null;
    startSession(level);
    return;
  }
  state.session = null;
  if (page === "garden") {
    renderGarden();
    show("garden");
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

  $("card").addEventListener("click", () => {
    if (!swipe.justSwiped) flip();
  });
  bindSwipe();
  $("flip").addEventListener("click", flip);
  $("know").addEventListener("click", markKnown);
  $("report").addEventListener("click", (event) => event.stopPropagation());
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
    const open = document.querySelector(".modal:not([hidden])");
    if (open) open.hidden = true;
  });

  document.addEventListener("keydown", (event) => {
    if (!state.session || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, select, textarea")) return;
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
    toast(`คำใหม่จะมาจากด่าน ${state.settings.startLevel} เป็นต้นไป`);
  });
  $("auto-speak").addEventListener("change", (event) => updateSetting({ autoSpeak: event.target.checked }));
  $("speech-rate").addEventListener("change", (event) => {
    updateSetting({ speechRate: Number(event.target.value) });
    speakWord("Hello, welcome to Vocab Garden");
  });
  $("speech-test").addEventListener("click", () => speakWord("Hello, welcome to Vocab Garden"));
  $("theme").addEventListener("change", (event) => updateSetting({ theme: event.target.value }));
  $("text-size").addEventListener("change", (event) => updateSetting({ textSize: event.target.value }));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyAppearance);
  $("export").addEventListener("click", exportBackup);
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
