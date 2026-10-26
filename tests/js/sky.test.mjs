import { test } from "node:test";
import assert from "node:assert/strict";

import { SKIES, applySky, skyOf } from "../../app/js/sky.js";

test("every hour of the day maps to a known sky", () => {
  for (let hour = 0; hour < 24; hour += 1) assert.ok(SKIES.includes(skyOf(hour)), `hour ${hour}`);
});

test("sky changes at the expected hours", () => {
  const expected = { 4: "night", 5: "dawn", 6: "dawn", 7: "day", 12: "day", 16: "day", 17: "dusk", 18: "dusk", 19: "night", 23: "night", 0: "night" };
  for (const [hour, sky] of Object.entries(expected)) assert.equal(skyOf(Number(hour)), sky, `hour ${hour}`);
  assert.equal(new Set(Array.from({ length: 24 }, (_, hour) => skyOf(hour))).size, SKIES.length);
});

test("applySky writes the sky of the given local time onto the root element", () => {
  const root = { dataset: {} };
  assert.equal(applySky(root, new Date(2026, 9, 26, 6, 30)), "dawn");
  assert.equal(root.dataset.sky, "dawn");
  assert.equal(applySky(root, new Date(2026, 9, 26, 21, 0)), "night");
  assert.equal(root.dataset.sky, "night");
});
