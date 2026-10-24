import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseLevel } from "../../app/js/data.js";
import { answerPool, dailyAnswer, guessSet, keyStates, nextStats, scoreGuess, shareText } from "../../app/js/wordle.js";
import { createStorage } from "../../app/js/storage.js";

const allWords = Array.from({ length: 28 }, (_, i) => String(i + 1).padStart(2, "0"))
  .flatMap((level) => parseLevel(readFileSync(new URL(`../../app/data/levels/${level}.tsv`, import.meta.url), "utf8"), level))
  .map((word) => ({ ...word, translated: word.senses.length > 0 }));

test("scoreGuess handles correct, present and absent letters", () => {
  assert.deepEqual(scoreGuess("house", "house"), Array(5).fill("correct"));
  assert.deepEqual(scoreGuess("world", "house"), ["absent", "correct", "absent", "absent", "absent"]);
  assert.deepEqual(scoreGuess("mouse", "house"), ["absent", "correct", "correct", "correct", "correct"]);
  assert.deepEqual(scoreGuess("seuoh", "house"), ["present", "present", "correct", "present", "present"]);
});

test("scoreGuess does not over-count repeated letters", () => {
  // คำตอบมี e ตัวเดียวและถูกที่แล้ว (ตัวท้าย) e ตัวแรกของคำเดาจึงต้องเป็น absent ไม่ใช่ present
  assert.deepEqual(scoreGuess("elite", "house"), ["absent", "absent", "absent", "absent", "correct"]);
  // ตัวที่ถูกที่จะได้สิทธิ์ก่อนตัวที่ผิดที่
  assert.deepEqual(scoreGuess("sissy", "sassy"), ["correct", "absent", "correct", "correct", "correct"]);
  assert.deepEqual(scoreGuess("allee", "ahead"), ["correct", "absent", "absent", "present", "absent"]);
});

test("keyStates keeps the best status of each letter", () => {
  const states = keyStates(["world", "house"], "house");
  assert.equal(states.o, "correct");
  assert.equal(states.w, "absent");
  assert.equal(states.h, "correct");
  assert.deepEqual(keyStates(["seuoh"], "house").s, "present");
});

test("the daily answer is stable for a day, comes from the pool and varies across days", () => {
  const pool = answerPool(allWords);
  assert.ok(pool.length >= 30, `มี ${pool.length} คำ`);
  assert.ok(pool.every((word) => word.translated && /^[a-z]{5}$/.test(word.headword.toLowerCase())));
  assert.equal(dailyAnswer(pool, 20750), dailyAnswer(pool, 20750));
  assert.ok(new Set(Array.from({ length: 30 }, (_, i) => dailyAnswer(pool, 20750 + i).headword)).size >= 15);
  assert.equal(dailyAnswer([], 5), null);
});

test("guessable words include forms of every word and every possible answer", () => {
  const guesses = guessSet(allWords);
  assert.ok(guesses.size > 800);
  assert.ok(guesses.has("houses") === false && guesses.has("works"));
  for (const word of answerPool(allWords)) assert.ok(guesses.has(word.headword.toLowerCase()), word.headword);
});

test("shareText shows the grid without the answer", () => {
  const text = shareText(["world", "house"], "house", 20750, true);
  assert.match(text, /ทายคำปริศนา 24\/10 2\/6/);
  assert.ok(!text.includes("house"));
  assert.ok(text.endsWith("🟩🟩🟩🟩🟩"));
  assert.match(shareText(["world"], "house", 20750, false), /X\/6/);
});

test("stats count wins, win streaks across consecutive days and reset on a loss", () => {
  let stats = nextStats(undefined, 10, true);
  assert.deepEqual(stats, { played: 1, won: 1, streak: 1, best: 1, lastWon: 10 });
  stats = nextStats(stats, 11, true);
  assert.deepEqual([stats.streak, stats.best], [2, 2]);
  stats = nextStats(stats, 13, true);
  assert.deepEqual([stats.streak, stats.best], [1, 2]);
  stats = nextStats(stats, 14, false);
  assert.deepEqual([stats.played, stats.won, stats.streak, stats.best], [4, 3, 0, 2]);
});

test("wordle progress is saved per day, validated, and kept in backups", () => {
  const data = new Map();
  const fake = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  const storage = createStorage(fake);
  assert.equal(storage.loadWordle(5), null);
  storage.addGamePlay(5);
  storage.saveWordle({ day: 5, answer: "house", guesses: ["world"], status: "playing" });
  storage.saveWordleStats({ played: 2, won: 1, streak: 0, best: 1, lastWon: 4 });
  assert.deepEqual(storage.loadWordle(5).guesses, ["world"]);
  assert.equal(storage.loadWordle(6), null);
  assert.equal(storage.loadWordleStats().played, 2);
  assert.deepEqual(storage.loadGames().days, { 5: 1 });
  const backup = JSON.parse(JSON.stringify(storage.exportData("0.17.0")));
  assert.equal(backup.games.wordle.answer, "house");
  storage.reset();
  assert.equal(storage.loadWordle(5), null);
  storage.importData(backup);
  assert.equal(storage.loadWordle(5).answer, "house");

  for (const bad of [{ day: 5, answer: "toolong", guesses: [], status: "playing" }, { day: 5, answer: "house", guesses: ["ab"], status: "playing" }, { day: 5, answer: "house", guesses: [], status: "x" }]) {
    const junk = createStorage({ getItem: () => JSON.stringify({ days: {}, best: {}, wordle: bad }), setItem() {}, removeItem() {} });
    assert.equal(junk.loadWordle(5), null);
  }
});
