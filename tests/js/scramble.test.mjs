import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseLevel } from "../../app/js/data.js";
import { POINTS, SCRAMBLE_COUNT, applyHint, buildScrambleRound, isSolved, maxScore, pickedText, roundScore, scrambleLetters } from "../../app/js/scramble.js";

function seeded(seed = 1) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const words = ["01", "02"]
  .flatMap((level) => parseLevel(readFileSync(new URL(`../../app/data/levels/${level}.tsv`, import.meta.url), "utf8"), level))
  .filter((entry) => entry.senses.length > 0);

test("scrambled letters are a permutation that never equals the answer", () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const letters = scrambleLetters("house", seeded(seed));
    assert.deepEqual([...letters].sort(), [..."house"].sort());
    assert.notEqual(letters.join(""), "house");
  }
  assert.deepEqual(scrambleLetters("aaa", seeded()), ["a", "a", "a"]); // ไม่วนไม่รู้จบ
});

test("a round has 5 distinct words of 3-8 letters with an unambiguous meaning", () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const round = buildScrambleRound(words, seeded(seed));
    assert.equal(round.length, SCRAMBLE_COUNT);
    assert.equal(new Set(round.map((item) => item.answer)).size, SCRAMBLE_COUNT);
    for (const item of round) {
      assert.match(item.answer, /^[a-z]{3,8}$/);
      assert.ok(item.meaning.length > 0 && item.posLabel);
      assert.equal(item.letters.length, item.answer.length);
    }
  }
  assert.equal(buildScrambleRound(words.slice(0, 5), seeded()), null);
});

test("isSolved checks the picked order, including repeated letters", () => {
  const letters = ["l", "l", "e", "b"]; // answer: bell
  assert.ok(isSolved(letters, [3, 2, 0, 1], "bell"));
  assert.ok(isSolved(letters, [3, 2, 1, 0], "bell"));
  assert.ok(!isSolved(letters, [2, 3, 0, 1], "bell"));
  assert.ok(!isSolved(letters, [3, 2, 0], "bell"));
  assert.equal(pickedText(letters, [3, 2]), "be");
});

test("hint places the next correct letter, clearing a wrong start first", () => {
  const letters = ["l", "l", "e", "b"];
  assert.deepEqual(applyHint(letters, [], "bell"), [3]);
  assert.deepEqual(applyHint(letters, [3], "bell"), [3, 2]);
  assert.deepEqual(applyHint(letters, [0, 1], "bell"), [3]); // เริ่มผิด ล้างแล้วใบ้ตัวแรก
  assert.deepEqual(applyHint(letters, [3, 2, 0, 1], "bell"), [3, 2, 0, 1]);
  const again = applyHint(letters, [3, 2, 0], "bell");
  assert.deepEqual(again, [3, 2, 0, 1]);
});

test("round score gives 2 points for a clean solve, 1 with a hint and 0 for a skip", () => {
  assert.deepEqual(POINTS, { clean: 2, hint: 1, skip: 0 });
  assert.equal(roundScore(["clean", "clean", "hint", "skip", "clean"]), 7);
  assert.equal(maxScore(), 10);
});

test("a round can be limited to some words while ambiguity is still judged against the whole pool", () => {
  const only = words.slice(0, 60);
  const round = buildScrambleRound(words, seeded(5), 5, only);
  assert.equal(round.length, 5);
  for (const item of round) assert.ok(only.some((word) => word.headword === item.word.headword));
  assert.equal(buildScrambleRound(words, seeded(5), 5, words.slice(0, 3)), null);
});
