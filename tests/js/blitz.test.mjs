import { test } from "node:test";
import assert from "node:assert/strict";

import { BLITZ_SECONDS, MIN_POOL, blitzQueue, blitzSummary, isOver, nextBlitz, secondsLeft } from "../../app/js/blitz.js";

const words = Array.from({ length: 20 }, (_, i) => ({ headword: `w${i}`, senses: [{ pos: "n", label: "n", text: `คำแปล${i}` }] }));

test("a pool that is too small gives no queue", () => {
  assert.equal(blitzQueue(words.slice(0, MIN_POOL - 1)), null);
  assert.equal(blitzQueue(words).length, 20);
});

test("the next question comes from the queue and the rest rotates", () => {
  const queue = blitzQueue(words, () => 0.5);
  const next = nextBlitz(queue, words, () => 0.5);
  assert.equal(next.word, queue[0]);
  assert.equal(next.question.options.length, 4);
  assert.equal(next.rest.length, queue.length - 1);
  assert.equal(nextBlitz([], words), null);
});

test("words without a usable meaning are skipped", () => {
  const bad = { headword: "bad", senses: [{ pos: "n", label: "n", text: "ไม่มีคำแปลตรงตัว" }] };
  const next = nextBlitz([bad, ...words], words, () => 0.5);
  assert.equal(next.word, words[0]);
  assert.equal(next.rest.at(-1), bad);
});

test("the clock counts down from 60 and never goes negative", () => {
  assert.equal(secondsLeft(0, 0), BLITZ_SECONDS);
  assert.equal(secondsLeft(0, 1), 60);
  assert.equal(secondsLeft(0, 1001), 59);
  assert.equal(secondsLeft(0, 59_500), 1);
  assert.equal(secondsLeft(0, 70_000), 0);
  assert.equal(isOver(0, 59_999), false);
  assert.equal(isOver(0, 60_000), true);
});

test("the summary handles a round with no answers", () => {
  assert.match(blitzSummary(0, 0), /ยังไม่ได้ตอบ/);
  assert.match(blitzSummary(9, 12), /9 จาก 12.*75%/);
});
