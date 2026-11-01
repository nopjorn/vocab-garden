import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPlaylist, speechTimeout, stepsFor, thaiLine } from "../../app/js/commute.js";

const word = (headword, extra = {}) => ({
  headword,
  senses: [{ pos: "n", label: "น.", text: `ความหมาย ${headword}` }],
  exampleEn: `This is ${headword}.`,
  ...extra,
});

test("buildPlaylist puts due words first, then planted ones, then new words by rank", () => {
  const words = ["a", "b", "c", "d"].map((headword, index) => word(headword, { rank: 10 - index }));
  const cards = { c: { reps: 1, ivl: 1, ease: 2.5, due: 5, lapses: 0 }, d: { reps: 1, ivl: 9, ease: 2.5, due: 30, lapses: 0 } };
  const list = buildPlaylist(words, cards, 10, () => 0.3);
  assert.deepEqual(list.map((item) => item.headword), ["c", "d", "b", "a"]);
});

test("thaiLine joins at most two senses", () => {
  const many = word("run", { senses: [{ text: "วิ่ง" }, { text: "การวิ่ง " }, { text: "ดำเนินการ" }] });
  assert.equal(thaiLine(many), "วิ่ง , การวิ่ง");
});

test("stepsFor reads English, then Thai, then the example when asked", () => {
  const steps = stepsFor(word("house"), { thai: true, example: true, pause: 3 });
  assert.deepEqual(steps.map((step) => [step.part, step.lang]), [["word", "en-US"], ["meaning", "th-TH"], ["example", "en-US"]]);
  assert.equal(steps[0].after, 3);
  assert.equal(steps[2].after, 2);
});

test("stepsFor skips the Thai voice when the device has none", () => {
  const steps = stepsFor(word("house"), { thai: false, example: false, pause: 2 });
  assert.deepEqual(steps.map((step) => step.part), ["word"]);
  assert.equal(steps[0].after, 3);
});

test("speechTimeout grows with text length and slows down for slow speech", () => {
  assert.ok(speechTimeout("a long sentence here") > speechTimeout("a"));
  assert.ok(speechTimeout("word", 0.7) > speechTimeout("word", 1.1));
});
