import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { formIndex, readinessText, sortStories, splitStory, storyQuestions, storyReadiness, storyResult } from "../../app/js/stories.js";
import { createStorage } from "../../app/js/storage.js";

const data = JSON.parse(readFileSync(new URL("../../app/data/stories.json", import.meta.url), "utf8"));
const a = { id: "a", words: ["house", "go", "eat"], questions: [{ q: "?", options: ["ถูก", "ผิด1", "ผิด2", "ผิด3"], answer: 0 }] };
const b = { id: "b", words: ["water", "tree"], questions: [] };
const c = { id: "c", words: ["sun", "rain"], questions: [] };

test("readiness counts planted key words", () => {
  assert.deepEqual(storyReadiness(a, { house: {}, go: {} }), { planted: 2, total: 3, ready: false });
  assert.equal(storyReadiness(b, { water: {}, tree: {} }).ready, true);
  assert.match(readinessText({ planted: 3, total: 3, ready: true }), /พร้อมอ่าน/);
  assert.match(readinessText({ planted: 0, total: 3, ready: false }), /อ่านได้เลย/);
  assert.match(readinessText({ planted: 1, total: 3, ready: false }), /1\/3/);
});

test("unread stories with more planted words come first", () => {
  const cards = { water: {}, tree: {}, house: {} };
  assert.deepEqual(sortStories([a, b, c], cards).map((story) => story.id), ["b", "a", "c"]);
  assert.deepEqual(sortStories([a, b, c], cards, { b: 1 }).map((story) => story.id), ["a", "c", "b"]);
});

test("key words and their forms are found in the text", () => {
  const index = formIndex(a, new Map([["go", { forms: ["went", "goes"] }], ["house", { forms: ["houses"] }]]));
  const parts = splitStory("He went to two Houses, then ate.", index);
  assert.deepEqual(parts.filter((part) => part.headword).map((part) => [part.text, part.headword]), [["went", "go"], ["Houses", "house"]]);
  assert.equal(parts.map((part) => part.text).join(""), "He went to two Houses, then ate.");
});

test("question options are shuffled but the answer is tracked", () => {
  const [question] = storyQuestions(a, () => 0);
  assert.equal(question.options[question.answerIndex], "ถูก");
  assert.equal(question.options.length, 4);
  assert.match(storyResult(2, 2), /ครบ/);
  assert.match(storyResult(0, 2), /ไม่เป็นไร/);
  assert.match(storyResult(1, 2), /1 จาก 2/);
});

test("the shipped stories all have questions whose answers point at an option", () => {
  assert.ok(data.stories.length >= 6);
  for (const story of data.stories) {
    for (const question of storyQuestions(story)) assert.ok(question.answerIndex >= 0, story.id);
  }
});

test("reading a story is remembered once", () => {
  const map = new Map();
  const storage = createStorage({ getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) });
  assert.equal(storage.markStoryRead("rainy-day", 5), true);
  assert.equal(storage.markStoryRead("rainy-day", 6), false);
  assert.deepEqual(storage.loadGarden().storiesRead, { "rainy-day": 5 });
});
