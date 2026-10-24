import { LEVELS, levelTitle, loadWords } from "./data.js";
import { canSpeak, speak } from "./speech.js";
import { AGAIN, GOOD, HARD, STAGES, buildQueue, dayNumber, grade, stageOf } from "./srs.js";
import { NEW_PER_DAY_CHOICES, createStorage } from "./storage.js";

const VIEWS = ["loading", "error", "home", "study", "done", "settings", "about"];
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
    if (tab.dataset.tab === view) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
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

function todayQueue(day) {
  return buildQueue(translatedWords(), state.cards, day, newLimit(day));
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
  $("garden-total").textContent = `แปลแล้ว ${translated.length.toLocaleString()} / ${state.words.length.toLocaleString()} คำ`;

  $("levels").replaceChildren(...LEVELS.map(levelItem));
  $("storage-warning").hidden = storage.persistent;
}

// ---------- ท่องศัพท์ ----------

function startSession() {
  const day = dayNumber();
  const queue = todayQueue(day);
  if (queue.length === 0) {
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
  $("study-bar").style.width = `${(learned.size / total) * 100}%`;
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
  if (isNew) storage.saveNewCount(session.day, storage.newCountToday(session.day) + 1);
  session.answered += 1;

  if (card.ivl === 0) {
    session.queue.splice(Math.min(REQUEUE_GAP, session.queue.length), 0, word);
  } else {
    session.learned.add(word.headword);
  }

  if (session.queue.length > 0) {
    showCard();
  } else {
    finishSession();
  }
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

// ---------- ตั้งค่า ----------

function renderSettings() {
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
  renderSettings();
  toast("ล้างความคืบหน้าแล้ว");
}

// ---------- เส้นทาง ----------

function route() {
  if (state.words.length === 0) return;
  const page = location.hash.replace(/^#\/?/, "") || "home";
  if (page === "study") {
    startSession();
    return;
  }
  state.session = null;
  if (page === "settings") {
    renderSettings();
    show("settings");
  } else if (page === "about") {
    show("about");
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
  $("speak-word").addEventListener("click", (event) => {
    event.stopPropagation();
    speak(currentWord().headword);
  });
  $("speak-example").addEventListener("click", (event) => {
    event.stopPropagation();
    speak(currentWord().exampleEn);
  });
  $("grades").addEventListener("click", (event) => {
    const button = event.target.closest("[data-grade]");
    if (button) answer(Number(button.dataset.grade));
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
    } else if (isFlipped() && ["1", "2", "3"].includes(event.key)) {
      answer({ 1: AGAIN, 2: HARD, 3: GOOD }[event.key]);
    }
  });

  $("new-per-day").addEventListener("change", (event) => {
    state.settings = { ...state.settings, newPerDay: Number(event.target.value) };
    storage.saveSettings(state.settings);
    toast(`ตั้งคำใหม่เป็นวันละ ${state.settings.newPerDay} คำแล้ว`);
  });
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

async function showUpdate(worker) {
  const next = await workerVersion(worker);
  $("update-versions").textContent = next ? `v${self.VG_VERSION} → v${next}` : `ตอนนี้ใช้ v${self.VG_VERSION}`;
  $("update-dialog").hidden = false;
  $("update-now").onclick = () => {
    $("update-now").disabled = true;
    $("update-now").textContent = "กำลังอัปเดต…";
    worker.postMessage("skip-waiting");
  };
  $("update-later").onclick = () => {
    $("update-dialog").hidden = true;
  };
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
  const updating = Boolean(navigator.serviceWorker.controller);
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
lockZoomInInstalledApp();
bindEvents();
init();
registerServiceWorker();
