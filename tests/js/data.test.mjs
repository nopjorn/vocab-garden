import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LEVELS, parseLevel } from "../../app/js/data.js";

const read = (level) => parseLevel(readFileSync(new URL(`../../app/data/levels/${level}.tsv`, import.meta.url), "utf8"), level);

test("parseLevel reads the emoji column and defaults to empty when a row has none", () => {
  const text = "rank\theadword\tforms\tmeanings\texample_en\texample_th\tnote\temoji\n" +
    "1\thouse\thouses\tn: บ้าน\tThe house is big.\tบ้านหลังนี้ใหญ่\t\t🏠\n" +
    "2\tthe\t\t\t\t\t\t\n";
  const [house, the] = parseLevel(text, "01");
  assert.equal(house.emoji, "🏠");
  assert.equal(the.emoji, "");
  assert.equal(parseLevel("rank\theadword\tforms\n1\ta\t\n", "01")[0].emoji, "");
});

test("only translated words carry an emoji, and an emoji is a short string without letters or digits", () => {
  let withEmoji = 0;
  for (const level of LEVELS) {
    for (const word of read(level)) {
      if (!word.emoji) continue;
      withEmoji += 1;
      assert.ok(word.senses.length > 0, `${word.headword} has an emoji but no translation`);
      assert.ok([...word.emoji].length <= 8, word.headword);
      assert.doesNotMatch(word.emoji, /[A-Za-z0-9\s]/, word.headword);
    }
  }
  assert.ok(withEmoji > 0);
});

import { EXTRA_LEVELS, loadWords, parseCollocations, parseExtra } from "../../app/js/data.js";

test("collocations are split into phrase and Thai meaning", () => {
  assert.deepEqual(parseCollocations("make a decision=ตัดสินใจ; make friends=ผูกมิตร"), [
    { phrase: "make a decision", meaning: "ตัดสินใจ" },
    { phrase: "make friends", meaning: "ผูกมิตร" },
  ]);
  assert.deepEqual(parseCollocations(""), []);
});

test("an extra file is read by headword", () => {
  const extra = parseExtra("headword\texample2_en\texample2_th\tcollocations\nhouse\tWe bought a house.\tเราซื้อบ้าน\tat my house=ที่บ้านฉัน\nthe\tThe sun is hot.\tแดดร้อน\t\n");
  assert.equal(extra.house.example2En, "We bought a house.");
  assert.equal(extra.house.collocations[0].phrase, "at my house");
  assert.deepEqual(extra.the.collocations, []);
});

test("loadWords merges extra data into words, and still works when the extra files cannot be loaded", async () => {
  const level = "rank\theadword\tforms\tmeanings\texample_en\texample_th\tnote\temoji\n1\thouse\thouses\tn: บ้าน\tThe house is big.\tบ้านหลังนี้ใหญ่\t\t\n";
  const withExtra = async (url) => {
    if (url.startsWith("data/extra/")) return "headword\texample2_en\texample2_th\tcollocations\nhouse\tWe bought a house.\tเราซื้อบ้าน\tat my house=ที่บ้านฉัน\n";
    return level;
  };
  const [house] = await loadWords(withExtra);
  assert.equal(house.example2En, "We bought a house.");
  assert.equal(house.collocations.length, 1);
  assert.equal(house.exampleEn, "The house is big.");

  const withoutExtra = async (url) => {
    if (url.startsWith("data/extra/")) throw new Error("404");
    return level;
  };
  const [plain] = await loadWords(withoutExtra);
  assert.equal(plain.example2En, "");
  assert.deepEqual(plain.collocations, []);
});

test("the real extra files cover every translated word of their levels", () => {
  for (const level of EXTRA_LEVELS) {
    const words = read(level);
    const extra = parseExtra(readFileSync(new URL(`../../app/data/extra/${level}.tsv`, import.meta.url), "utf8"));
    assert.equal(Object.keys(extra).length, words.length, level);
    for (const word of words) {
      assert.ok(extra[word.headword]?.example2En, word.headword);
      assert.notEqual(extra[word.headword].example2En, word.exampleEn);
    }
  }
});
