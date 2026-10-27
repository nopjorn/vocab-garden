import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { BLANK, CONFUSE_COUNT, allItems, buildConfuseRound, confuseSummary, filled, isCorrect } from "../../app/js/confuse.js";

const data = JSON.parse(readFileSync(new URL("../../app/data/confusables.json", import.meta.url), "utf8"));
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

test("the real data has twenty pairs with at least three practice items each", () => {
  assert.equal(data.pairs.length, 20);
  for (const pair of data.pairs) assert.ok(pair.items.length >= 3, pair.id);
  assert.equal(allItems(data.pairs).length, 60);
});

test("every item has one blank, its answer among the options, and filling it makes a sentence", () => {
  for (const item of allItems(data.pairs)) {
    assert.equal(item.en.split(BLANK).length, 2, item.en);
    assert.ok(item.options.includes(item.answer), item.en);
    assert.ok(!filled(item).includes(BLANK));
    assert.ok(isCorrect(item, item.answer));
    assert.ok(!isCorrect(item, item.options.find((option) => option !== item.answer)));
  }
});

test("a round has eight items from eight different pairs, with shuffled options kept intact", () => {
  for (let seed = 1; seed < 20; seed += 1) {
    const round = buildConfuseRound(data.pairs, seeded(seed));
    assert.equal(round.length, CONFUSE_COUNT);
    assert.equal(new Set(round.map((item) => item.pairId)).size, CONFUSE_COUNT);
    for (const item of round) assert.ok(item.options.includes(item.answer));
  }
});

test("when there are too few pairs the round is topped up from the remaining items", () => {
  const two = data.pairs.slice(0, 3);
  const round = buildConfuseRound(two, seeded(4), 8);
  assert.equal(round.length, 8 > allItems(two).length ? null : 8);
  assert.equal(buildConfuseRound(data.pairs.slice(0, 1), seeded(4), 8), null);
  const topped = buildConfuseRound(data.pairs.slice(0, 3), seeded(4), 6);
  assert.equal(topped.length, 6);
  assert.equal(new Set(topped.map((item) => item.en)).size, 6);
});

test("the summary changes with the score", () => {
  assert.match(confuseSummary(8, 8), /ถูกทุกข้อ/);
  assert.match(confuseSummary(7, 8), /เกือบเต็ม/);
  assert.match(confuseSummary(3, 8), /ลองอ่านคำอธิบาย/);
});
