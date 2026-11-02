import { test } from "node:test";
import assert from "node:assert/strict";

import { GIFT_OF, VISITORS, giftShelf, nextVisitText, visitDone, visitGreeting, visitKey, visitQuestion, visitReply, visitSlot, visitorFor, withVisit } from "../../app/js/visitors.js";

const words = Array.from({ length: 40 }, (_, i) => ({
  headword: `w${i}`,
  order: i,
  translated: true,
  forms: [],
  senses: [{ pos: "n", label: "คำนาม", text: `ความหมาย${i}` }],
}));

test("morning runs from 4am to 3pm, the rest is the afternoon visit", () => {
  assert.equal(visitSlot(4), 0);
  assert.equal(visitSlot(14), 0);
  assert.equal(visitSlot(15), 1);
  assert.equal(visitSlot(23), 1);
  assert.equal(visitSlot(2), 1, "after midnight still belongs to the afternoon visit of the app day");
});

test("visitors and gifts are unique and every visitor brings a gift", () => {
  assert.equal(new Set(VISITORS.map((visitor) => visitor.id)).size, VISITORS.length);
  assert.equal(Object.keys(GIFT_OF).length, VISITORS.length);
});

test("the same slot always brings the same visitor and question, and back-to-back slots differ", () => {
  for (let day = 20000; day < 20060; day += 1) {
    assert.equal(visitorFor(day, 0), visitorFor(day, 0));
    assert.notEqual(visitorFor(day, 0).id, visitorFor(day - 1, 1).id);
    assert.notEqual(visitorFor(day, 1).id, visitorFor(day, 0).id);
  }
  const a = visitQuestion(words, {}, 20000, 1);
  const b = visitQuestion(words, {}, 20000, 1);
  assert.equal(a.word.headword, b.word.headword);
  assert.deepEqual(a.question.options, b.question.options);
});

test("questions ask about planted words, or the first words when nothing is planted yet", () => {
  const fresh = visitQuestion(words, {}, 20001, 0);
  assert.ok(Number(fresh.word.headword.slice(1)) < 30);
  for (let day = 0; day < 20; day += 1) {
    const asked = visitQuestion(words, { w35: {}, w36: {} }, day, 0);
    assert.ok(["w35", "w36"].includes(asked.word.headword));
  }
  assert.equal(visitQuestion([], {}, 1, 0), null);
});

test("answered slots are remembered and capped", () => {
  let visits = [];
  visits = withVisit(visits, 5, 0);
  assert.equal(withVisit(visits, 5, 0), visits);
  assert.equal(visitDone(visits, 5, 0), true);
  assert.equal(visitDone(visits, 5, 1), false);
  assert.equal(visitKey(5, 1), "5-1");
  for (let day = 0; day < 100; day += 1) visits = withVisit(visits, day, 1);
  assert.equal(visits.length, 60);
});

test("texts are friendly both when right and when wrong", () => {
  const [squirrel] = VISITORS;
  assert.match(visitGreeting(squirrel, words[0]), /กระรอก.*w0/);
  assert.match(visitReply(squirrel, words[0], true, "x"), /ลูกโอ๊ก/);
  assert.match(visitReply(squirrel, words[0], false, "ความหมาย0"), /ไม่เป็นไร.*ความหมาย0/);
  assert.match(nextVisitText(0), /บ่าย/);
  assert.match(nextVisitText(1), /พรุ่งนี้/);
  assert.deepEqual(giftShelf({ shell: 2, acorn: 1, bad: 3 }).map((gift) => [gift.id, gift.count]), [["acorn", 1], ["shell", 2]]);
});
