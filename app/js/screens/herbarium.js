// สมุดพันธุ์ไม้ 📔: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง #/herbarium)
import { byMonth, herbariumPages, pageNote, treeHeadwords } from "../herbarium.js";
import { dayNumber } from "../srs.js";
import { treeEl } from "../tree-art.js";

let $, el, show, state, storage, translatedWords, openWordDialog;
let shown = [];

function pageCard(page, today) {
  const { word } = page;
  const item = el("li");
  const button = el("button", `herbarium-page${page.stillTree ? "" : " faded"}`);
  button.type = "button";
  button.dataset.headword = word.headword;
  const emoji = el("span", "page-emoji");
  if (word.emoji) emoji.textContent = word.emoji;
  else emoji.append(treeEl("tree"));
  emoji.setAttribute("aria-hidden", "true");
  const name = el("strong", "page-word", word.headword);
  name.lang = "en";
  button.append(emoji, name, el("span", "", word.senses[0]?.text || ""), el("span", "page-note", `${page.day === today ? "✨ ใหม่วันนี้ · " : ""}${pageNote(page)}`));
  item.append(button);
  return item;
}

function openHerbarium() {
  const today = dayNumber();
  const words = translatedWords();
  storage.pressPages(treeHeadwords(words, state.cards), today);
  const garden = storage.loadGarden();
  shown = herbariumPages(words, state.cards, garden.pressed, garden.spotted);
  $("herbarium-total").textContent = `${shown.length} หน้า`;
  $("herbarium-empty").hidden = shown.length > 0;
  $("herbarium-pages").replaceChildren(
    ...byMonth(shown).flatMap((group) => {
      const list = el("ul", "herbarium-grid");
      list.append(...group.pages.map((page) => pageCard(page, today)));
      return [el("h2", "herbarium-month", `${group.label} · ${group.pages.length} หน้า`), list];
    }),
  );
  show("herbarium");
}

export function bind(ctx) {
  ({ $, el, show, state, storage, translatedWords, openWordDialog } = ctx);
  $("herbarium-pages").addEventListener("click", (event) => {
    const button = event.target.closest(".herbarium-page");
    const page = button && shown.find((item) => item.word.headword === button.dataset.headword);
    if (page) openWordDialog(page.word);
  });
}

export { openHerbarium as start };
