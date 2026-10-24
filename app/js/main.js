import { LEVELS, levelTitle, loadWords } from "./data.js";
import { canSpeak, speak } from "./speech.js";
import { AGAIN, GOOD, HARD, STAGES, buildQueue, dayNumber, grade, stageOf } from "./srs.js";
import { NEW_PER_DAY_CHOICES, createStorage } from "./storage.js";

const VIEWS = ["loading", "error", "home", "study", "done", "settings", "about"];
const REQUEUE_GAP = 3; // คำที่ตอบ "ยังจำไม่ได้" จะกลับมาอีกครั้งหลังการ์ดใบอื่นอีก 3 ใบ

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

function renderHome() {
  const queue = todayQueue(dayNumber());
  const dueCount = queue.filter((word) => state.cards[word.headword]).length;
  $("due-count").textContent = dueCount;
  $("new-count").textContent = queue.length - dueCount;
  $("start").hidden = queue.length === 0;
  $("today-empty").hidden = queue.length > 0;

  const items = LEVELS.map((level) => {
    const words = state.words.filter((word) => word.level === level);
    const item = el("li");
    item.append(el("span", "level-title", levelTitle(level)));
    if (!words.some((word) => word.translated)) {
      item.classList.add("locked");
      item.append(el("span", "muted", "🌱 กำลังปลูก"));
      return item;
    }
    const counts = Object.fromEntries(STAGES.map((stage) => [stage.id, 0]));
    words.forEach((word) => {
      counts[stageOf(state.cards[word.headword]).id] += 1;
    });
    item.append(el("span", "level-stages", STAGES.map((stage) => `${stage.emoji} ${counts[stage.id]}`).join("  ")));
    return item;
  });
  $("levels").replaceChildren(...items);
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
  state.session = { day, queue, answered: 0, learned: new Set() };
  show("study");
  showCard();
}

function currentWord() {
  return state.session.queue[0];
}

function showCard() {
  const word = currentWord();
  $("study-progress").textContent = `เหลือ ${state.session.queue.length} ใบ`;
  $("card-level").textContent = `${levelTitle(word.level)} · อันดับ ${word.rank}`;
  $("card-word").textContent = word.headword;
  $("card-hint").hidden = false;
  $("card-back").hidden = true;
  $("grades").hidden = true;
  $("flip").hidden = false;

  $("card-senses").replaceChildren(
    ...word.senses.map((sense) => {
      const item = el("li");
      item.append(el("span", "pos", sense.label), document.createTextNode(sense.text));
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

  $("card").addEventListener("click", flip);
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
    if (!isFlipped() && (event.key === " " || event.key === "Enter")) {
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

function showUpdate(worker) {
  $("update-banner").hidden = false;
  $("update-now").onclick = () => worker.postMessage("skip-waiting");
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // ถ้ามี service worker คุมหน้าอยู่แล้ว การเปลี่ยนตัวคุมคือการอัปเดต ให้โหลดหน้าใหม่ด้วยไฟล์เวอร์ชันใหม่
  const updating = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updating) location.reload();
  });
  try {
    const registration = await navigator.serviceWorker.register("sw.js");
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting);
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

$("app-version").textContent = self.VG_VERSION;
$("speak-word").hidden = !canSpeak();
$("speak-example").hidden = !canSpeak();
navigator.storage?.persist?.();
bindEvents();
init();
registerServiceWorker();
