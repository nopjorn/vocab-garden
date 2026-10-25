import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseLevel } from "../../app/js/data.js";
import { LISTEN_COUNT, buildListenRound, canListenTo, listenSummary } from "../../app/js/listen.js";

function seeded(seed = 1) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const words = ["01", "02", "03", "04"]
  .flatMap((level) => parseLevel(readFileSync(new URL(`../../app/data/levels/${level}.tsv`, import.meta.url), "utf8"), level))
  .filter((entry) => entry.senses.length > 0);

test("a round has the requested number of distinct words, each with 4 options and one answer", () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const round = buildListenRound(words, seeded(seed));
    assert.equal(round.length, LISTEN_COUNT);
    assert.equal(new Set(round.map((item) => item.word.headword)).size, LISTEN_COUNT);
    for (const { question } of round) {
      assert.equal(question.options.length, 4);
      assert.equal(question.options.filter((option) => option.correct).length, 1);
      assert.equal(question.options[question.answerIndex].text, question.answerText);
      assert.equal(new Set(question.options.map((option) => option.text)).size, 4);
    }
  }
});

test("words that sound like other words are never asked", () => {
  assert.equal(canListenTo({ headword: "write" }), false);
  assert.equal(canListenTo({ headword: "Two" }), false);
  assert.equal(canListenTo({ headword: "house" }), true);
  for (let seed = 1; seed <= 20; seed += 1) {
    for (const { word } of buildListenRound(words, seeded(seed))) assert.equal(canListenTo(word), true);
  }
});

test("only picks questions from the chosen subset but still builds distractors from the whole pool", () => {
  const subset = words.slice(0, 20);
  const round = buildListenRound(words, seeded(), 5, subset);
  assert.equal(round.length, 5);
  for (const { word } of round) assert.ok(subset.includes(word));
});

test("returns null when there are not enough words", () => {
  assert.equal(buildListenRound(words, seeded(), LISTEN_COUNT, words.slice(0, 3)), null);
});

test("summary text tells a perfect round apart", () => {
  assert.match(listenSummary(8, 8), /เก่งมาก/);
  assert.match(listenSummary(5, 8), /5\/8/);
});

import { DICTATION_COUNT, buildDictationRound, dictationMax, dictationScore, gradeDictation } from "../../app/js/listen.js";

test("a dictation round has distinct 3-10 letter words that are safe to ask by ear", () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const round = buildDictationRound(words, seeded(seed));
    assert.equal(round.length, DICTATION_COUNT);
    assert.equal(new Set(round.map((item) => item.answer)).size, DICTATION_COUNT);
    for (const item of round) {
      assert.match(item.answer, /^[a-z]{3,10}$/);
      assert.equal(canListenTo(item.word), true);
      assert.ok(item.meaning.length > 0);
    }
  }
  assert.equal(buildDictationRound(words, seeded(), DICTATION_COUNT, words.slice(0, 2)), null);
});

test("dictation grading: exact, hinted, one typo in a long word, and wrong", () => {
  const item = { answer: "garden" };
  assert.equal(gradeDictation(item, " Garden "), "clean");
  assert.equal(gradeDictation(item, "garden", true), "hint");
  assert.equal(gradeDictation(item, "gardan"), "close");
  assert.equal(gradeDictation(item, "gardn"), "close");
  assert.equal(gradeDictation(item, "gardens"), "close");
  assert.equal(gradeDictation(item, "gardin x"), "wrong");
  assert.equal(gradeDictation(item, ""), "wrong");
  assert.equal(gradeDictation({ answer: "tree" }, "tre"), "wrong"); // คำสั้น ผิดตัวเดียวก็ยังไม่ผ่าน
});

test("dictation score adds points per result", () => {
  assert.equal(dictationScore(["clean", "hint", "close", "wrong"]), 4);
  assert.equal(dictationMax(), 12);
});
