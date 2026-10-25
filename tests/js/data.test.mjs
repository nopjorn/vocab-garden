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
