import { test } from "node:test";
import assert from "node:assert/strict";

import { DECK_SIZE_CHOICES, STATUSES, buildDeck, matchingWords, requeue, statusOf, summaryText } from "../../app/js/flash.js";

const word = (headword, level, translated = true) => ({ headword, level, translated });
const card = (ivl) => ({ due: 100, ivl, ease: 2.5, reps: 2, lapses: 0 });

test("status follows the card and its tree stage", () => {
  assert.equal(statusOf(undefined), "new");
  assert.equal(statusOf(card(0)), "learning");
  assert.equal(statusOf(card(3)), "learning");
  assert.equal(statusOf(card(20)), "learning");
  assert.equal(statusOf(card(21)), "done");
  assert.deepEqual(STATUSES.map((status) => status.id), ["new", "learning", "done"]);
});

const words = [word("a", "01"), word("b", "01"), word("c", "02"), word("d", "02"), word("e", "03", false)];
const cards = { b: card(5), c: card(30) };

test("matching combines the chosen levels and statuses and keeps NGSL order", () => {
  const pick = (levels, statuses) => matchingWords(words, cards, { levels: new Set(levels), statuses: new Set(statuses) }).map((w) => w.headword);
  assert.deepEqual(pick(["01", "02"], ["new", "learning", "done"]), ["a", "b", "c", "d"]);
  assert.deepEqual(pick(["01"], ["new"]), ["a"]);
  assert.deepEqual(pick(["01", "02"], ["learning"]), ["b"]);
  assert.deepEqual(pick(["02"], ["done"]), ["c"]);
  assert.deepEqual(pick(["02"], ["new", "done"]), ["c", "d"]);
  assert.deepEqual(pick([], ["new"]), []);
  assert.deepEqual(pick(["01"], []), []);
  assert.deepEqual(pick(["03"], ["new"]), []); // ยังไม่แปล
});

test("a deck has the requested size, no repeats, and does not change the input", () => {
  const list = Array.from({ length: 30 }, (_, index) => word(`w${index}`, "01"));
  const deck = buildDeck(list, 10, () => 0.4);
  assert.equal(deck.length, 10);
  assert.equal(new Set(deck.map((w) => w.headword)).size, 10);
  assert.equal(buildDeck(list, 0).length, 30);
  assert.equal(buildDeck(list, 50).length, 30);
  assert.equal(list[0].headword, "w0");
  assert.deepEqual(DECK_SIZE_CHOICES, [10, 20, 50, 0]);
});

test("an unsure card comes back a few cards later, or at the end of a short queue", () => {
  assert.deepEqual(requeue(["a", "b", "c", "d", "e"], 3), ["b", "c", "d", "a", "e"]);
  assert.deepEqual(requeue(["a", "b"], 3), ["b", "a"]);
  assert.deepEqual(requeue(["a"], 3), ["a"]);
});

test("the summary mentions how many times the player was unsure", () => {
  assert.match(summaryText(10, 0), /ครบทั้ง 10 ใบ/);
  assert.match(summaryText(10, 4), /4 ครั้ง/);
});
