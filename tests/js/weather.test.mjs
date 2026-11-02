import { test } from "node:test";
import assert from "node:assert/strict";

import { RAINBOW_STREAK, WEATHERS, weatherNote, weatherOf } from "../../app/js/weather.js";

test("rain comes when today's goal is reached, a rainbow when the streak is long too", () => {
  assert.equal(weatherOf({ goalReached: false, streak: 30, sky: "day" }), "clear");
  assert.equal(weatherOf({ goalReached: true, streak: 2, sky: "day" }), "rain");
  assert.equal(weatherOf({ goalReached: true, streak: RAINBOW_STREAK, sky: "day" }), "rainbow");
  assert.equal(weatherOf({ goalReached: true, streak: RAINBOW_STREAK, sky: "dawn" }), "rainbow");
  assert.equal(weatherOf({ goalReached: true, streak: 9, sky: "night" }), "meteor", "no rainbow at night, shooting stars instead");
});

test("every weather has a note that explains it", () => {
  for (const weather of WEATHERS) assert.ok(weatherNote(weather, { streak: 8, left: 3 }).length > 10, weather);
  assert.match(weatherNote("clear", { streak: 0, left: 3 }), /อีก 3 ครั้ง/);
  assert.match(weatherNote("rainbow", { streak: 8, left: 0 }), /8 วัน/);
});
