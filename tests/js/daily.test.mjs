import { test } from "node:test";
import assert from "node:assert/strict";

import { dailyStride, wordOfDay } from "../../app/js/daily.js";

const words = (count) => Array.from({ length: count }, (_, index) => ({ headword: `w${index}` }));

test("no words means no word of the day", () => {
  assert.equal(wordOfDay([], 100), null);
});

test("the same day always gives the same word", () => {
  const list = words(37);
  assert.equal(wordOfDay(list, 20751), wordOfDay(list, 20751));
});

test("every word appears exactly once before any repeats", () => {
  for (const count of [1, 2, 3, 37, 100, 200, 360]) {
    const list = words(count);
    const seen = new Set();
    for (let day = 20000; day < 20000 + count; day += 1) seen.add(wordOfDay(list, day).headword);
    assert.equal(seen.size, count, `count ${count}`);
  }
});

test("consecutive days are not neighbours in the list", () => {
  const list = words(200);
  const index = (day) => list.indexOf(wordOfDay(list, day));
  assert.ok(Math.abs(index(20751) - index(20752)) > 1);
});

test("the stride is coprime with the size", () => {
  for (const count of [3, 10, 37, 200, 2861]) {
    const stride = dailyStride(count);
    let a = stride, b = count;
    while (b) [a, b] = [b, a % b];
    assert.equal(a, 1, `count ${count}`);
  }
});
