import { test } from "node:test";
import assert from "node:assert/strict";

import { byMonth, dayLabel, herbariumPages, monthLabel, pageNote, treeHeadwords } from "../../app/js/herbarium.js";
import { dayNumber } from "../../app/js/srs.js";
import { createStorage, mergeGarden } from "../../app/js/storage.js";

const words = ["house", "go", "eat", "river"].map((headword, order) => ({ headword, order, senses: [{ text: headword }] }));
const tree = { due: 100, ivl: 30, ease: 2.5, reps: 8, lapses: 1 };
const sprout = { due: 100, ivl: 2, ease: 2.5, reps: 2, lapses: 0 };

function fakeStore() {
  const data = new Map();
  return { getItem: (key) => (data.has(key) ? data.get(key) : null), setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}

test("only big trees go into the herbarium", () => {
  assert.deepEqual(treeHeadwords(words, { house: tree, go: sprout, eat: tree }), ["house", "eat"]);
});

test("pages stay even when the word is forgotten later, newest first", () => {
  const pages = herbariumPages(words, { house: tree, go: sprout }, { go: 20000, house: 20010, eat: 20010, missing: 1 });
  assert.deepEqual(pages.map((page) => page.word.headword), ["house", "eat", "go"]);
  assert.equal(pages[0].stillTree, true);
  assert.equal(pages[2].stillTree, false);
  assert.equal(pages[1].reps, 0, "a page without a card still shows");
  assert.match(pageNote(pages[0]), /ทวน 8 ครั้ง · เคยลืม 1 ครั้ง$/);
  assert.match(pageNote(pages[2]), /ทวนอีกนิด/);
});

test("dates are shown in Thai with the Buddhist year", () => {
  const day = dayNumber(new Date(2026, 10, 2, 12));
  assert.equal(dayLabel(day), "2 พ.ย. 2569");
  assert.equal(monthLabel(day), "พฤศจิกายน 2569");
  const groups = byMonth([{ day }, { day: day - 1 }, { day: day - 40 }]);
  assert.deepEqual(groups.map((group) => [group.label, group.pages.length]), [["พฤศจิกายน 2569", 2], ["กันยายน 2569", 1]]);
});

test("pressing keeps the first day and only writes new pages", () => {
  const storage = createStorage(fakeStore());
  assert.deepEqual(storage.pressPages(["house", "eat"], 10), ["house", "eat"]);
  assert.deepEqual(storage.pressPages(["house", "go"], 12), ["go"]);
  assert.deepEqual(storage.pressPages(["house"], 13), []);
  assert.deepEqual(storage.loadGarden().pressed, { house: 10, eat: 10, go: 12 });
  const merged = mergeGarden({ ...storage.loadGarden() }, { bugs: {}, caught: 0, visits: [], souvenirs: {}, pressed: { house: 5, river: 20 } });
  assert.deepEqual(merged.pressed, { house: 5, eat: 10, go: 12, river: 20 });
});
