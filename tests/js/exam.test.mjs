import { test } from "node:test";
import assert from "node:assert/strict";

import { EXAM_COUNT, TIERS, bestTier, buildExam, examMedalIds, examReady, rescheduleMissed, tierOf } from "../../app/js/exam.js";

const rng = () => 0.3;

test("tiers follow the score thresholds", () => {
  assert.equal(tierOf(20).id, "gold");
  assert.equal(tierOf(19).id, "gold");
  assert.equal(tierOf(18).id, "silver");
  assert.equal(tierOf(16).id, "silver");
  assert.equal(tierOf(15).id, "bronze");
  assert.equal(tierOf(12).id, "bronze");
  assert.equal(tierOf(11), null);
  assert.equal(tierOf(0), null);
  assert.deepEqual(TIERS.map((tier) => tier.id), ["gold", "silver", "bronze"]);
});

test("a score earns its tier and every lower tier", () => {
  assert.deepEqual(examMedalIds("01", 20), ["exam-01-gold", "exam-01-silver", "exam-01-bronze"]);
  assert.deepEqual(examMedalIds("02", 17), ["exam-02-silver", "exam-02-bronze"]);
  assert.deepEqual(examMedalIds("sup", 12), ["exam-sup-bronze"]);
  assert.deepEqual(examMedalIds("01", 5), []);
  for (const id of examMedalIds("sup", 20)) assert.match(id, /^[a-z0-9-]{1,30}$/);
});

test("the best tier is the highest one owned for that level only", () => {
  const medals = { "exam-01-bronze": 3, "exam-01-silver": 4, "exam-02-bronze": 5, "plant-1": 1 };
  assert.equal(bestTier("01", medals).id, "silver");
  assert.equal(bestTier("02", medals).id, "bronze");
  assert.equal(bestTier("03", medals), null);
});

const word = (headword, level, translated = true, extra = {}) => ({ headword, level, translated, ...extra });

test("the exam opens only when the whole level is translated and planted", () => {
  const words = [word("a", "01"), word("b", "01"), word("c", "02"), word("d", "02", false)];
  const card = { due: 5, ivl: 1, ease: 2.5, reps: 1, lapses: 0 };
  assert.equal(examReady(words, { a: card, b: card }, "01"), true);
  assert.equal(examReady(words, { a: card }, "01"), false);
  assert.equal(examReady(words, { c: card, d: card }, "02"), false);
  assert.equal(examReady(words, {}, "09"), false);
});

function level(count) {
  return Array.from({ length: count }, (_, index) => {
    const headword = `word${String.fromCharCode(97 + (index % 26))}${String.fromCharCode(97 + Math.floor(index / 26))}`;
    return word(headword, "01", true, {
      forms: [],
      senses: [{ pos: "n", label: "คำนาม", text: `ความหมาย${index}` }],
      exampleEn: `I like ${headword} today.`,
      exampleTh: "ฉันชอบ",
    });
  });
}

test("buildExam makes the requested number of distinct questions", () => {
  const items = buildExam(level(40), rng);
  assert.equal(items.length, EXAM_COUNT);
  assert.equal(new Set(items.map((item) => item.word.headword)).size, EXAM_COUNT);
  for (const { question } of items) {
    assert.equal(question.options.length, 4);
    assert.ok(question.options[question.answerIndex].correct);
  }
});

test("buildExam gives up when the level has too few usable words", () => {
  assert.equal(buildExam(level(10), rng), null);
});

test("missed words are due by tomorrow without touching the interval", () => {
  const card = { due: 130, ivl: 20, ease: 2.5, reps: 4, lapses: 0 };
  assert.deepEqual(rescheduleMissed(card, 100), { ...card, due: 101 });
  const soon = { ...card, due: 100 };
  assert.equal(rescheduleMissed(soon, 100), soon);
  assert.equal(rescheduleMissed(undefined, 100), undefined);
});
