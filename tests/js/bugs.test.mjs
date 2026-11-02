import { test } from "node:test";
import assert from "node:assert/strict";

import { activeBugs, bugSet, bugSteps, bugSummary } from "../../app/js/bugs.js";

const word = (headword, i, extra = {}) => ({
  headword,
  order: i,
  forms: [],
  senses: [{ pos: "n", label: "คำนาม", text: `ความหมาย${i}` }],
  exampleEn: `I like the ${headword} very much.`,
  exampleTh: "ฉันชอบมันมาก",
  ...extra,
});
const words = ["apple", "table", "window", "garden", "river", "pencil", "basket"].map(word);
const card = (lapses) => ({ reps: 3, lapses, ivl: 1, due: 0 });

test("only words forgotten often become bugs, and caught ones stay away until forgotten again", () => {
  const cards = { apple: card(3), table: card(5), window: card(1), garden: card(4) };
  assert.deepEqual(activeBugs(words, cards).map((w) => w.headword), ["table", "garden", "apple"]);
  assert.deepEqual(activeBugs(words, cards, { table: 5, apple: 2 }).map((w) => w.headword), ["garden", "apple"]);
  assert.deepEqual([...bugSet(words, cards, { table: 5, garden: 4, apple: 3 })], []);
});

test("a bug has up to three steps and skips the ones the word cannot make", () => {
  const steps = bugSteps(words[0], words, () => 0.3);
  assert.deepEqual(steps.map((step) => step.type), ["choice", "cloze", "type"]);
  const noSentence = { ...words[1], exampleEn: "" };
  assert.deepEqual(bugSteps(noSentence, words, () => 0.3).map((step) => step.type), ["choice", "type"]);
  const noMeaning = { ...words[2], senses: [] };
  assert.deepEqual(bugSteps(noMeaning, words, () => 0.3).map((step) => step.type), ["cloze"]);
  assert.deepEqual(bugSteps({ ...noMeaning, exampleEn: "" }, words), []);
});

test("the summary is kind whatever the result", () => {
  assert.match(bugSummary(0, 0, 3), /ยังไม่ได้/);
  assert.match(bugSummary(2, 2, 0), /ครบทั้ง 2 ตัว.*ไม่มีแมลงแล้ว/);
  assert.match(bugSummary(1, 3, 4), /1 จาก 3 ตัว.*อีก 4 ตัว/);
});

test("catching ten bugs earns a medal", async () => {
  const { newMedals } = await import("../../app/js/achievements.js");
  assert.equal(newMedals({ bugsCaught: 9 }, {}).some((medal) => medal.id === "bug-catcher"), false);
  assert.equal(newMedals({ bugsCaught: 10 }, {}).some((medal) => medal.id === "bug-catcher"), true);
});
