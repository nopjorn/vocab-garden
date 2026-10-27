// แฟลชการ์ด: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
import { levelTitle } from "../data.js";
import { launchConfetti } from "../confetti.js";
import { canSpeak } from "../speech.js";
import { DECK_SIZE_CHOICES, SIDE_CHOICES, buildDeck, requeue, summaryText } from "../flash.js";
import { dayNumber } from "../srs.js";

let $, el, show, fx, state, storage, speakWord, checkMedals, playPool, playFilterText, fillSelect;

const flash = {
  prefs: { size: 20, side: "en" },
  deck: [],
  queue: [],
  unsure: 0,
  flipped: false,
};
const FLASH_SIDE_LABELS = { en: "คำอังกฤษ (ดูคำแปลหลังพลิก)", th: "คำแปลไทย (ทายคำอังกฤษ)" };
const FLASH_SIZE_LABELS = Object.fromEntries(DECK_SIZE_CHOICES.map((count) => [count, count ? `${count} ใบ` : "ทั้งหมดที่เลือก"]));

// หน้าตั้งค่าแฟลชการ์ด: จำนวนใบและด้านหน้าการ์ด (คำมาจากที่เลือกไว้ในหน้าเกม)
function renderFlashSetup() {
  const { prefs } = flash;
  fillSelect($("flash-size"), DECK_SIZE_CHOICES, prefs.size, FLASH_SIZE_LABELS);
  fillSelect($("flash-side"), SIDE_CHOICES, prefs.side, FLASH_SIDE_LABELS);
  const total = playPool().length;
  const deckSize = prefs.size > 0 ? Math.min(prefs.size, total) : total;
  $("flash-pool").textContent = `🎯 ${playFilterText()}`;
  $("flash-ready").textContent = total > 0 ? `พร้อมเล่น ${deckSize} ใบ (จากคำที่ตรงเงื่อนไข ${total} คำ)` : "ยังไม่มีคำที่ตรงเงื่อนไข กลับไปเลือกแปลงหรือสถานะที่หน้าเกมนะ";
  $("flash-start").disabled = total === 0;
}

function showFlashSetup() {
  $("flash-setup").hidden = false;
  $("flash-play").hidden = true;
  $("flash-result").hidden = true;
  $("flash-count").textContent = "";
  renderFlashSetup();
  show("flash");
}

function startFlashDeck(deck) {
  flash.deck = deck;
  flash.queue = [...deck];
  flash.unsure = 0;
  $("flash-setup").hidden = true;
  $("flash-result").hidden = true;
  $("flash-play").hidden = false;
  showFlashCard();
}

function showFlashCard() {
  const word = flash.queue[0];
  flash.flipped = false;
  const sense = word.senses[0];
  const meaning = el("span", "fc-meaning");
  meaning.append(el("span", `pos pos-${sense.pos}`, sense.label), ` ${sense.text}`);
  $("flash-front").replaceChildren(flash.prefs.side === "en" ? el("strong", "fc-word", word.headword) : meaning);
  $("flash-front").lang = flash.prefs.side === "en" ? "en" : "th";
  const back = $("flash-back");
  back.replaceChildren(
    ...(flash.prefs.side === "en" ? [] : [el("strong", "fc-word", word.headword)]),
    ...(word.emoji ? [el("span", "card-emoji", word.emoji)] : []),
    el("ul", "senses", ""),
  );
  back.querySelector("ul").replaceChildren(
    ...word.senses.map((entry) => {
      const item = el("li");
      item.append(el("span", `pos pos-${entry.pos}`, entry.label), document.createTextNode(entry.text));
      return item;
    }),
  );
  back.append(el("span", "fc-example", word.exampleEn), el("span", "muted small", word.exampleTh));
  back.querySelector(".fc-word")?.setAttribute("lang", "en");
  back.querySelector(".fc-example").lang = "en";
  back.hidden = true;
  $("flash-card").setAttribute("aria-label", "การ์ด แตะเพื่อพลิก");
  $("flash-card").classList.remove("flipped");
  $("flash-tip").hidden = false;
  $("flash-meta").textContent = `${levelTitle(word.level).replace(/:.*/, "")} · อันดับ ${word.rank}`;
  $("flash-speak").hidden = !canSpeak();
  $("flash-count").textContent = `เหลือ ${flash.queue.length} ใบ`;
  const percent = Math.round(((flash.deck.length - new Set(flash.queue.map((entry) => entry.headword)).size) / flash.deck.length) * 100);
  $("flash-bar").style.width = `${percent}%`;
  $("flash-progressbar").setAttribute("aria-valuenow", percent);
  $("flash-stats").textContent = flash.unsure > 0 ? `🔁 ไม่แน่ใจ ${flash.unsure} ครั้ง` : "";
  if (state.settings.autoSpeak && flash.prefs.side === "en") speakWord(word.headword);
}

function flipFlash() {
  if (flash.flipped || $("flash-play").hidden) return;
  flash.flipped = true;
  $("flash-back").hidden = false;
  $("flash-card").classList.add("flipped");
  $("flash-tip").hidden = true;
}

function answerFlash(known) {
  if ($("flash-play").hidden) return;
  if (known) {
    flash.queue.shift();
    fx("correct");
  } else {
    flash.unsure += 1;
    flash.queue = requeue(flash.queue);
  }
  if (flash.queue.length === 0) finishFlash();
  else showFlashCard();
}

function finishFlash() {
  storage.addGamePlay(dayNumber()); // นับเป็นวันท่องต่อเนื่องเหมือนเกมอื่น แต่ไม่เปลี่ยนวันทวนและไม่นับเป็นเป้าหมายรายวัน
  checkMedals();
  $("flash-play").hidden = true;
  $("flash-result").hidden = false;
  $("flash-count").textContent = "";
  $("flash-summary").textContent = summaryText(flash.deck.length, flash.unsure);
  launchConfetti();
  fx("finish");
}

export function bind(ctx) {
  ({ $, el, show, fx, state, storage, speakWord, checkMedals, playPool, playFilterText, fillSelect } = ctx);
  $("flash-size").addEventListener("change", (event) => {
    flash.prefs.size = Number(event.target.value);
    renderFlashSetup();
  });
  $("flash-side").addEventListener("change", (event) => {
    flash.prefs.side = event.target.value;
  });
  $("flash-start").addEventListener("click", () => startFlashDeck(buildDeck(playPool(), flash.prefs.size)));
  $("flash-card").addEventListener("click", (event) => {
    if (!event.target.closest(".fc-speak") && !flash.swiped) flipFlash();
  });
  $("flash-card").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      flipFlash();
    }
  });
  // ปัดการ์ด (จะพลิกแล้วหรือยังก็ได้): ขวา = จำได้ ซ้าย = ยังไม่แน่ใจ
  {
    let startX = null;
    const card = $("flash-card");
    const reset = () => {
      card.style.transform = "";
      card.style.transition = "";
    };
    card.addEventListener("pointerdown", (event) => {
      startX = event.clientX;
      flash.swiped = false;
    });
    card.addEventListener("pointermove", (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 8) {
        flash.swiped = true;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
      }
    });
    const end = (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      reset();
      if (Math.abs(dx) > 90) answerFlash(dx > 0);
      setTimeout(() => {
        flash.swiped = false;
      }, 0);
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", () => {
      startX = null;
      reset();
    });
  }
  $("flash-known").addEventListener("click", () => answerFlash(true));
  $("flash-unsure").addEventListener("click", () => answerFlash(false));
  $("flash-speak").addEventListener("click", () => flash.queue[0] && speakWord(flash.queue[0].headword));
  $("flash-again").addEventListener("click", () => startFlashDeck(buildDeck(flash.deck, 0)));
  $("flash-change").addEventListener("click", showFlashSetup);
  document.addEventListener("keydown", (event) => {
    if ($("view-flash").hidden || $("flash-play").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (event.key === " ") {
      if (flash.flipped) return;
      event.preventDefault();
      flipFlash();
    } else if (event.key === "1" || event.key === "ArrowRight") answerFlash(true);
    else if (event.key === "2" || event.key === "ArrowLeft") answerFlash(false);
  });
}

export { showFlashSetup as start };
