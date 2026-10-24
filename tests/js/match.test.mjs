import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseLevel } from "../../app/js/data.js";
import { MATCH_PAIRS, buildMatchRound, formatSeconds, isMatch, isNewBest } from "../../app/js/match.js";
import { mergeDays } from "../../app/js/habit.js";
import { streakOf } from "../../app/js/stats.js";
import { DEFAULT_SETTINGS, createStorage } from "../../app/js/storage.js";

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

test("a match round has 6 pairs of English and Thai tiles with no overlapping meanings", () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const { tiles } = buildMatchRound(words, seeded(seed));
    assert.equal(tiles.length, MATCH_PAIRS * 2);
    assert.equal(new Set(tiles.map((tile) => tile.id)).size, tiles.length);
    const glosses = tiles.filter((tile) => tile.lang === "th").flatMap((tile) => tile.text.split(/,\s*/));
    assert.equal(new Set(glosses).size, glosses.length, `seed ${seed}`);
    for (let pairId = 0; pairId < MATCH_PAIRS; pairId += 1) {
      assert.deepEqual(tiles.filter((tile) => tile.pairId === pairId).map((tile) => tile.lang).sort(), ["en", "th"]);
    }
  }
});

test("isMatch accepts only the two tiles of one pair", () => {
  const [a, b, c] = [
    { id: "0-en", pairId: 0 },
    { id: "0-th", pairId: 0 },
    { id: "1-en", pairId: 1 },
  ];
  assert.ok(isMatch(a, b));
  assert.ok(!isMatch(a, c));
  assert.ok(!isMatch(a, a));
});

test("not enough usable words means no round", () => {
  assert.equal(buildMatchRound(words.slice(0, 3), seeded()), null);
});

test("best time and time format", () => {
  assert.ok(isNewBest(undefined, 9000));
  assert.ok(isNewBest(12000, 9000));
  assert.ok(!isNewBest(9000, 9000));
  assert.equal(formatSeconds(12345), "12.3 วิ");
});

test("game days keep a streak alive together with review days", () => {
  const TODAY = 20000;
  const merged = mergeDays({ [TODAY - 2]: 5 }, { [TODAY - 1]: 1, [TODAY - 2]: 1 });
  assert.deepEqual(merged, { [TODAY - 2]: 6, [TODAY - 1]: 1 });
  assert.equal(streakOf(merged, TODAY).current, 2);
  assert.equal(streakOf({ [TODAY - 2]: 5 }, TODAY).current, 0);
});

test("game data: plays and best times are saved, validated, exported, imported and reset", () => {
  const store = new Map();
  const fake = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const storage = createStorage(fake);
  assert.deepEqual(storage.loadGames(), { days: {}, best: {} });
  storage.addGamePlay(10);
  storage.addGamePlay(10);
  assert.equal(storage.saveBest("match", 9000), true);
  assert.equal(storage.saveBest("match", 12000), false);
  assert.equal(storage.saveBest("match", 8000), true);
  assert.deepEqual(storage.loadGames(), { days: { 10: 2 }, best: { match: 8000 } });

  const backup = JSON.parse(JSON.stringify(storage.exportData("0.16.0")));
  const other = createStorage({ ...fake, getItem: () => null, setItem() {}, removeItem() {} });
  assert.deepEqual(backup.games, { days: { 10: 2 }, best: { match: 8000 } });
  const target = createStorage((() => { const s = new Map(); return { getItem: (k) => (s.has(k) ? s.get(k) : null), setItem: (k, v) => s.set(k, String(v)), removeItem: (k) => s.delete(k) }; })());
  target.addGamePlay(3);
  target.importData({ app: "vocab-garden", schema: 1, cards: {} });
  assert.deepEqual(target.loadGames().days, { 3: 1 }); // ไฟล์เก่าไม่ลบข้อมูลเกม
  target.importData(backup);
  assert.deepEqual(target.loadGames(), backup.games);
  target.reset();
  assert.deepEqual(target.loadGames(), { days: {}, best: {} });
  assert.ok(other && DEFAULT_SETTINGS);

  const junk = createStorage({ getItem: () => JSON.stringify({ days: { x: 1, 5: -2, 6: 3 }, best: { match: -1, "BAD!": 5, ok: 7 } }), setItem() {}, removeItem() {} });
  assert.deepEqual(junk.loadGames(), { days: {}, best: { ok: 7 } });
});
