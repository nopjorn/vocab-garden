import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MILESTONES, NGSL_COVERAGE, coverageOfRanks, coverageOfTop, knownRanks, parseFrequency, percentText } from "../../app/js/coverage.js";

const sample = parseFrequency("rank\tper_million\n1\t600\n2\t300\n3\t100\n");

test("the frequency file is parsed by rank", () => {
  assert.deepEqual(sample.freq, [600, 300, 100]);
  assert.equal(sample.total, 1000);
});

test("knowing every word gives the NGSL coverage figure, knowing none gives zero", () => {
  assert.equal(coverageOfRanks([1, 2, 3], sample), NGSL_COVERAGE);
  assert.equal(coverageOfRanks([], sample), 0);
  assert.ok(Math.abs(coverageOfRanks([1], sample) - 0.6 * NGSL_COVERAGE) < 1e-9);
});

test("duplicates and ranks outside the list are ignored", () => {
  assert.equal(coverageOfRanks([1, 1, 99], sample), coverageOfRanks([1], sample));
});

test("the top-N milestones grow and end at the full figure", () => {
  assert.ok(Math.abs(coverageOfTop(1, sample) - 0.6 * NGSL_COVERAGE) < 1e-9);
  assert.equal(coverageOfTop(99, sample), NGSL_COVERAGE);
  assert.equal(coverageOfTop(5, { freq: [], total: 0 }), 0);
});

test("only planted words with a numeric rank count as known", () => {
  const words = [
    { headword: "the", rank: "1" },
    { headword: "be", rank: "2" },
    { headword: "monday", rank: "S1" },
  ];
  assert.deepEqual(knownRanks(words, { the: {}, monday: {} }), [1]);
});

test("percent text is rounded and never claims 0% for a tiny share", () => {
  assert.equal(percentText(59.7), "60%");
  assert.equal(percentText(0.3), "<1%");
  assert.equal(percentText(0), "0%");
});

test("with the real NGSL frequencies the curve is steep and tops out at 92%", () => {
  const real = parseFrequency(readFileSync(new URL("../../app/data/frequency.tsv", import.meta.url), "utf8"));
  assert.equal(real.freq.length, 2809);
  const values = MILESTONES.map((n) => coverageOfTop(n, real));
  for (let i = 1; i < values.length; i += 1) assert.ok(values[i] > values[i - 1]);
  assert.ok(Math.abs(values.at(-1) - NGSL_COVERAGE) < 1e-6);
  assert.ok(values[0] > 50, "the first 100 words already cover over half");
  assert.ok(values[2] > 70 && values[2] < 90);
});
