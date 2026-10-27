import { test } from "node:test";
import assert from "node:assert/strict";

import { MAX_TOKENS, MIN_TOKENS, SENTENCE_COUNT, applyHint, buildSentenceRound, isSolved, maxScore, roundScore, scrambleTokens, tokensOf } from "../../app/js/sentence.js";

const word = (headword, exampleEn, exampleTh = "ประโยคตัวอย่าง", translated = true) => ({ headword, exampleEn, exampleTh, translated });
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

test("sentences split on spaces and keep punctuation with the word", () => {
  assert.deepEqual(tokensOf("  He jumped into the pool. "), ["He", "jumped", "into", "the", "pool."]);
});

test("scrambling never returns the original order unless every token is the same", () => {
  const tokens = ["a", "b", "c", "d"];
  for (let i = 1; i < 30; i += 1) assert.notDeepEqual(scrambleTokens(tokens, seeded(i)), tokens);
  assert.deepEqual(scrambleTokens(["go", "go"]), ["go", "go"]);
});

test("a round uses translated sentences of the right length, once each", () => {
  const words = [
    word("short", "Go now."),
    word("long", "This is a very long sentence that has far too many words in it."),
    word("untranslated", "I like green apples a lot.", "x", false),
    word("a", "I like green apples a lot."),
    word("b", "She walks to school every day."),
    word("c", "We often eat rice for lunch."),
    word("d", "They played football after class."),
    word("e", "My brother reads a book daily."),
    word("dup", "My brother reads a book daily."),
  ];
  const round = buildSentenceRound(words, seeded(3));
  assert.equal(round.length, SENTENCE_COUNT);
  assert.equal(new Set(round.map((item) => item.answer)).size, SENTENCE_COUNT);
  for (const item of round) {
    assert.ok(item.tokens.length >= MIN_TOKENS && item.tokens.length <= MAX_TOKENS);
    assert.deepEqual([...item.chips].sort(), [...item.tokens].sort());
    assert.ok(item.meaning);
  }
  assert.equal(buildSentenceRound(words.slice(0, 5)), null);
});

test("solving compares the words, so repeated words are interchangeable", () => {
  const tokens = ["the", "cat", "saw", "the", "dog"];
  const chips = ["dog", "the", "saw", "cat", "the"];
  assert.equal(isSolved(chips, [1, 3, 2, 4, 0], tokens), true);
  assert.equal(isSolved(chips, [4, 3, 2, 1, 0], tokens), true); // the ตัวไหนก็ได้
  assert.equal(isSolved(chips, [3, 1, 2, 4, 0], tokens), false);
  assert.equal(isSolved(chips, [1, 3, 2], tokens), false);
});

test("a hint keeps the correct start, drops the wrong part and adds the next word", () => {
  const tokens = ["I", "like", "red", "apples"];
  const chips = ["apples", "red", "I", "like"];
  assert.deepEqual(applyHint(chips, [], tokens), [2]);
  assert.deepEqual(applyHint(chips, [2, 3], tokens), [2, 3, 1]);
  assert.deepEqual(applyHint(chips, [2, 0], tokens), [2, 3]); // ที่ผิดถูกตัด แล้ววางคำถัดไป
  assert.deepEqual(applyHint(chips, [2, 3, 1, 0], tokens), [2, 3, 1, 0]);
});

test("scores: 2 for clean, 1 for hint, 0 for skip", () => {
  assert.equal(roundScore(["clean", "hint", "skip", "clean", "clean"]), 7);
  assert.equal(maxScore(), 10);
});
