// การ์ดนักเดินทางมาเยี่ยมสวนในหน้าหลัก และชั้นของฝากในหน้าสวน
// main.js โหลดไฟล์นี้ด้วย import() หลังวาดหน้าหลัก JS ที่หน้าแรกต้องโหลดจึงไม่เพิ่ม ของที่ใช้ร่วมกับ main.js รับผ่าน ctx
import { giftShelf, nextVisitText, visitDone, visitGreeting, visitQuestion, visitReply, visitSlot, visitorFor } from "./visitors.js";

let visit = null; // { day, slot, visitor, word, question, answered }

export function render(ctx, today, redraw) {
  const { $, el, state, storage, translatedWords } = ctx;
  const slot = visitSlot(new Date().getHours());
  // เพิ่งตอบไปในรอบนี้และยังอยู่หน้าหลัก ให้คำตอบค้างไว้ (วาดหน้าหลักซ้ำระหว่างนั้นไม่ต้องซ่อน)
  if (visit?.answered && visit.day === today && visit.slot === slot && redraw && !$("visitor").hidden) return;
  const asked = !visitDone(storage.loadGarden().visits, today, slot) && visitQuestion(translatedWords(), state.cards, today, slot);
  $("visitor").hidden = !asked;
  if (!asked) {
    visit = null;
    return;
  }
  visit = { day: today, slot, visitor: visitorFor(today, slot), ...asked, answered: false };
  $("visitor-emoji").textContent = visit.visitor.emoji;
  $("visitor-text").textContent = visitGreeting(visit.visitor, visit.word).replace(`${visit.visitor.emoji} `, "");
  $("visitor-reply").hidden = true;
  $("visitor-options").replaceChildren(
    ...visit.question.options.map((option, index) => {
      const item = el("li");
      const button = el("button", "quiz-option", option.text);
      button.type = "button";
      button.dataset.index = index;
      item.append(button);
      return item;
    }),
  );
}

export function answer(ctx, index) {
  const { $, fx, storage } = ctx;
  if (!visit || visit.answered) return;
  const { question, visitor, word, day, slot } = visit;
  const right = index === question.answerIndex;
  if (!storage.recordVisit(day, slot, right ? visitor.gift.id : null)) {
    $("visitor").hidden = true; // ตอบไปแล้วจากอีกแท็บหนึ่ง
    return;
  }
  visit.answered = true;
  $("visitor-options").querySelectorAll("button").forEach((button, position) => {
    button.disabled = true;
    if (position === question.answerIndex) button.classList.add("correct");
    else if (position === index) button.classList.add("wrong");
  });
  $("visitor-reply").textContent = `${visitReply(visitor, word, right, question.answerText)} · ${nextVisitText(slot)}`;
  $("visitor-reply").hidden = false;
  if (right) fx("correct");
}

// ของฝากที่สะสมไว้ ใช้ chip() ของหน้าดอกไม้และของแต่งสวน (ส่งมาจาก main.js)
export function renderSouvenirs(ctx, chip) {
  const { $, storage } = ctx;
  const souvenirs = giftShelf(storage.loadGarden().souvenirs);
  $("souvenir-empty").hidden = souvenirs.length > 0;
  $("souvenir-list").replaceChildren(...souvenirs.map((gift) => chip(gift.emoji, `${gift.name} ×${gift.count}`, "ของฝากจากนักเดินทาง", true)));
}
