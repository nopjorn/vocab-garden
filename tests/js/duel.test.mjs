import { test } from "node:test";
import assert from "node:assert/strict";

import { blitzQueue, nextBlitz } from "../../app/js/blitz.js";
import { LEVELS } from "../../app/js/data.js";
import { decodeDuel, duelPool, duelShareText, duelVerdict, encodeDuel, levelsText, newSeed, seededRandom } from "../../app/js/duel.js";

const words = Array.from({ length: 40 }, (_, i) => ({
  headword: `w${i}`,
  level: i < 20 ? "01" : "02",
  order: i,
  translated: i !== 5,
  senses: [{ pos: i % 2 ? "n" : "v", label: "", text: `คำแปล${i}` }],
}));

test("the seeded random gives the same numbers for the same seed", () => {
  const a = seededRandom(1234);
  const b = seededRandom(1234);
  const c = seededRandom(1235);
  const first = Array.from({ length: 5 }, a);
  assert.deepEqual(first, Array.from({ length: 5 }, b));
  assert.notDeepEqual(first, Array.from({ length: 5 }, c));
  first.forEach((value) => assert.ok(value >= 0 && value < 1));
});

test("a link code round-trips seed, levels and score", () => {
  const code = encodeDuel({ seed: 4294967295, levels: ["01", "03", "sup"], score: 18 }, LEVELS);
  assert.match(code, /^1\.[0-9a-z]+\.[0-9a-z]+\.[0-9a-z]+$/);
  assert.deepEqual(decodeDuel(code, LEVELS), { seed: 4294967295, levels: ["01", "03", "sup"], score: 18 });
  assert.deepEqual(decodeDuel(code.toUpperCase(), LEVELS).levels, ["01", "03", "sup"]);
  assert.equal(encodeDuel({ seed: 1, levels: [], score: 3 }, LEVELS), null);
  assert.equal(decodeDuel(encodeDuel({ seed: 1, levels: ["01"], score: 5000 }, LEVELS), LEVELS).score, 999);
});

test("broken or unknown codes are rejected", () => {
  for (const code of ["", "abc", "2.1.1.1", "1.1.0.1", "1.1.1", "1.zzzzzzzzz.1.1", "1.1.1.-1", `1.1.${(2 ** LEVELS.length).toString(36)}.1`, "1.1.1.rs"]) {
    assert.equal(decodeDuel(code, LEVELS), null, code);
  }
});

test("the duel pool only depends on the data, not on progress", () => {
  const pool = duelPool([...words].reverse(), ["02"]);
  assert.equal(pool.length, 20);
  assert.equal(pool[0].headword, "w20");
  assert.equal(duelPool(words, ["01"]).some((word) => word.headword === "w5"), false);
});

test("two players with the same seed get the same questions in the same order", () => {
  const play = (seed) => {
    const pool = duelPool(words, ["01", "02"]);
    const rng = seededRandom(seed);
    let queue = blitzQueue(pool, rng);
    const asked = [];
    for (let i = 0; i < 30; i += 1) {
      const next = nextBlitz(queue, pool, rng);
      asked.push([next.word.headword, next.question.options.map((option) => option.text).join("|")]);
      queue = next.rest;
    }
    return asked;
  };
  assert.deepEqual(play(42), play(42));
  assert.notDeepEqual(play(42), play(43));
});

test("levels text collapses runs into ranges", () => {
  assert.equal(levelsText(["01", "02", "03", "05"]), "แปลง 1–3, 5");
  assert.equal(levelsText(["07"]), "แปลง 7");
  assert.equal(levelsText(["01", "sup"]), "แปลง 1 และแปลงพิเศษ");
  assert.equal(levelsText(["sup"]), "แปลงพิเศษ");
});

test("the verdict compares against the friend's score", () => {
  assert.equal(duelVerdict(10, 8).result, "win");
  assert.equal(duelVerdict(8, 8).result, "tie");
  assert.equal(duelVerdict(3, 8).result, "lose");
  assert.match(duelShareText(12, ["01", "02"]), /12 ข้อ.*แปลง 1–2/);
  assert.ok(Number.isInteger(newSeed(() => 0.999999)));
});
