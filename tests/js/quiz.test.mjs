import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseLevel } from "../../app/js/data.js";
import { buildQuestion, choiceQuestion, clozeQuestion, findBlank, meaningOf, shapeOf, shuffle } from "../../app/js/quiz.js";

// ตัวสุ่มแบบกำหนดผลได้ จะได้เทสต์ซ้ำได้
function seeded(seed = 1) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const sense = (pos, text) => ({ pos, label: pos, text });
const word = (headword, forms, senses, exampleEn = "", exampleTh = "") => ({ headword, forms, senses, exampleEn, exampleTh });
const POOL = [
  word("work", ["works", "worked", "working"], [sense("v", "ทำงาน")], "I work at a small hotel.", "ฉันทำงานที่โรงแรมเล็ก ๆ"),
  word("play", ["plays", "played", "playing"], [sense("v", "เล่น")], "They play football.", "พวกเขาเล่นฟุตบอล"),
  word("walk", ["walks"], [sense("v", "เดิน")], "We walk to school.", "เราเดินไปโรงเรียน"),
  word("house", ["houses"], [sense("n", "บ้าน")], "This house is old.", "บ้านหลังนี้เก่า"),
  word("water", [], [sense("n", "น้ำ")], "Water is cold.", "น้ำเย็น"),
  word("big", ["bigger"], [sense("adj", "ใหญ่")], "A big dog ran.", "หมาตัวใหญ่วิ่ง"),
];
const CARD = (ivl) => ({ due: 0, ivl, ease: 2.5, reps: 2, lapses: 0 });

test("meaningOf takes the first meaning and skips words without a direct translation", () => {
  assert.equal(meaningOf(POOL[0]), "ทำงาน");
  assert.equal(meaningOf(word("the", [], [sense("det", "คำนำหน้านาม (ไม่มีคำแปลตรงตัว)")])), null);
  assert.equal(meaningOf(word("x", [], [])), null);
  assert.equal(meaningOf(word("x", [], [sense("n", "ก".repeat(41))])), null);
});

test("shuffle keeps every item and does not change the input", () => {
  const input = [1, 2, 3, 4, 5];
  assert.deepEqual([...shuffle(input, seeded(3))].sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});

test("choice question has 4 distinct options, exactly one correct, preferring the same part of speech", () => {
  const question = choiceQuestion(POOL[0], POOL, seeded(7));
  assert.equal(question.type, "choice");
  assert.equal(question.options.length, 4);
  assert.equal(new Set(question.options.map((option) => option.text)).size, 4);
  assert.equal(question.options.filter((option) => option.correct).length, 1);
  assert.equal(question.options[question.answerIndex].text, "ทำงาน");
  assert.equal(question.answerText, "ทำงาน");
  // คำกริยามีอีก 2 คำในกลุ่ม ตัวหลอกจึงต้องเอามาก่อนคำนาม/คำคุณศัพท์
  const wrong = question.options.filter((option) => !option.correct).map((option) => option.text);
  assert.ok(wrong.includes("เล่น") && wrong.includes("เดิน"));
});

test("choice question needs enough other words and a usable meaning", () => {
  assert.equal(choiceQuestion(POOL[0], POOL.slice(0, 3), seeded()), null);
  assert.equal(choiceQuestion(word("the", [], [sense("det", "ไม่มีคำแปลตรงตัว")]), POOL, seeded()), null);
});

test("distractors never share a gloss with the answer", () => {
  const pool = [...POOL, word("job", [], [sense("n", "งาน, ทำงาน")])];
  for (let seed = 1; seed < 30; seed += 1) {
    const question = choiceQuestion(POOL[0], pool, seeded(seed));
    assert.ok(!question.options.some((option) => !option.correct && option.text.includes("ทำงาน")));
  }
});

test("shapeOf tells base, -ing, -ed, -s and irregular forms apart", () => {
  assert.deepEqual(
    [shapeOf("Work", "work"), shapeOf("working", "work"), shapeOf("worked", "work"), shapeOf("works", "work"), shapeOf("went", "go")],
    ["base", "ing", "ed", "s", "other"],
  );
});

test("findBlank blanks the headword or one of its forms and skips contractions and short words", () => {
  assert.deepEqual(findBlank(POOL[0]), { before: "I ", answer: "work", after: " at a small hotel.", shape: "base" });
  assert.equal(findBlank(word("be", ["are", "is"], [sense("v", "เป็น")], "We are friends.")), null); // รูปไม่ปกติ
  assert.equal(findBlank(word("not", ["n't"], [sense("adv", "ไม่")], "I don't know.")), null);
  assert.equal(findBlank(word("do", [], [sense("v", "ทำ")], "I do it.")), null); // สั้นกว่า 3 ตัวอักษร
  assert.equal(findBlank(word("tea", [], [sense("n", "ชา")], "I like coffee.")), null);
  const works = findBlank(word("work", ["works"], [sense("v", "ทำงาน")], "She works hard."));
  assert.deepEqual([works.answer, works.shape], ["works", "s"]);
});

test("cloze question matches the shape of the answer and the capitalization", () => {
  const question = clozeQuestion(POOL[0], POOL, seeded(5));
  assert.equal(question.type, "cloze");
  assert.equal(question.before + "＿" + question.after, "I ＿ at a small hotel.");
  assert.equal(question.options[question.answerIndex].text, "work");
  assert.ok(question.options.every((option) => /^[a-z]+$/.test(option.text)));

  const start = clozeQuestion(word("water", [], [sense("n", "น้ำ")], "Water is cold."), POOL, seeded(2));
  assert.ok(start.options.every((option) => /^[A-Z]/.test(option.text)));

  const plural = clozeQuestion(word("house", ["houses"], [sense("n", "บ้าน")], "Those houses are old."), POOL, seeded(4));
  assert.equal(plural.options[plural.answerIndex].text, "houses");
  assert.ok(plural.options.every((option) => option.text.endsWith("s")), JSON.stringify(plural.options));
});

test("buildQuestion never quizzes a new card and gets harder as the tree grows", () => {
  assert.equal(buildQuestion(POOL[0], undefined, POOL, seeded()), null);
  assert.equal(buildQuestion(POOL[0], CARD(2), POOL, seeded()).type, "choice");
  assert.equal(buildQuestion(POOL[0], CARD(10), POOL, seeded()).type, "cloze");
  assert.equal(buildQuestion(POOL[0], CARD(40), POOL, seeded(), { typing: false }).type, "cloze");
  // ประโยคเติมไม่ได้ ก็ถามแบบเลือกคำแปลแทน
  const noBlank = word("tea", [], [sense("n", "ชา")], "I like coffee.");
  assert.equal(buildQuestion(noBlank, CARD(10), [...POOL, noBlank], seeded()).type, "choice");
});

test("every translated word in the real data gets a well-formed question", () => {
  const words = ["01", "02"]
    .flatMap((level) => parseLevel(readFileSync(new URL(`../../app/data/levels/${level}.tsv`, import.meta.url), "utf8"), level))
    .filter((entry) => entry.senses.length > 0);
  assert.equal(words.length, 200);
  let cloze = 0;
  let fallback = 0;
  for (const entry of words) {
    for (const ivl of [2, 30]) {
      const question = buildQuestion(entry, CARD(ivl), words, seeded(entry.order ?? 1), { typing: false });
      if (!question) {
        fallback += 1; // ไม่มีความหมายที่เหมาะเป็นตัวเลือก (เช่น the) ใช้การ์ดพลิกแบบเดิม
        continue;
      }
      assert.equal(question.options.length, 4, entry.headword);
      assert.equal(new Set(question.options.map((option) => option.text)).size, 4, entry.headword);
      assert.equal(question.options.filter((option) => option.correct).length, 1, entry.headword);
      if (question.type === "cloze") {
        cloze += 1;
        assert.equal((question.before + question.answerText + question.after).replace(/\s+/g, " "), entry.exampleEn.replace(/\s+/g, " "), entry.headword);
      }
    }
  }
  assert.ok(cloze >= 150, `เติมคำได้ ${cloze} จาก ${words.length}`);
  assert.ok(fallback <= 10, `ใช้การ์ดพลิก ${fallback} ใบ`);
});

import { editDistance, gradeTyped, typeQuestion } from "../../app/js/quiz.js";
import { AGAIN as AGAIN_RATING, GOOD as GOOD_RATING, HARD as HARD_RATING } from "../../app/js/srs.js";

test("editDistance counts single-letter slips", () => {
  assert.equal(editDistance("house", "house"), 0);
  assert.equal(editDistance("hose", "house"), 1);
  assert.equal(editDistance("housse", "house"), 1);
  assert.equal(editDistance("hause", "house"), 1);
  assert.equal(editDistance("hxuse", "mouse"), 2);
});

test("typeQuestion asks for the English word only when the Thai meaning points to one word", () => {
  const question = typeQuestion(POOL[0], POOL);
  assert.deepEqual(
    [question.type, question.prompt, question.answerText, question.posLabel],
    ["type", "ทำงาน", "work", "v"],
  );
  assert.deepEqual(question.accepted, ["work", "works", "worked", "working"]);
  // มีอีกคำที่แปลทับกัน (job = ทำงาน) ตอบได้หลายคำ จึงไม่ถามแบบพิมพ์
  assert.equal(typeQuestion(POOL[0], [...POOL, word("job", [], [sense("n", "งาน, ทำงาน")])]), null);
  assert.equal(typeQuestion(word("be", [], [sense("v", "เป็น")]), POOL), null); // สั้นกว่า 3 ตัวอักษร
  assert.equal(typeQuestion(word("the", [], [sense("det", "ไม่มีคำแปลตรงตัว")]), POOL), null);
});

test("gradeTyped: exact is good, hint or one slip is hard, anything else is again", () => {
  const question = typeQuestion(POOL[3], POOL); // house, houses
  assert.deepEqual(gradeTyped(question, "  House "), { result: "correct", rating: GOOD_RATING });
  assert.deepEqual(gradeTyped(question, "houses."), { result: "correct", rating: GOOD_RATING });
  assert.deepEqual(gradeTyped(question, "house", true), { result: "correct", rating: HARD_RATING });
  assert.deepEqual(gradeTyped(question, "hause"), { result: "close", rating: HARD_RATING });
  assert.deepEqual(gradeTyped(question, "home"), { result: "wrong", rating: AGAIN_RATING });
  const short = typeQuestion(word("tea", [], [sense("n", "ชา")]), POOL);
  assert.equal(gradeTyped(short, "tee").result, "wrong"); // คำสั้นไม่ให้ผิดได้
});

test("buildQuestion asks big trees to type, unless typing is turned off", () => {
  assert.equal(buildQuestion(POOL[0], CARD(40), POOL, seeded(), { typing: true }).type, "type");
  assert.equal(buildQuestion(POOL[0], CARD(40), POOL, seeded(), { typing: false }).type, "cloze");
  assert.equal(buildQuestion(POOL[0], CARD(10), POOL, seeded(), { typing: true }).type, "cloze"); // 🌿 ยังเติมคำ
  assert.equal(buildQuestion(POOL[0], CARD(2), POOL, seeded()).type, "choice");
  // คำที่ตอบได้หลายคำ (แปลทับกัน) ใช้เติมคำแทน
  const pool = [...POOL, word("job", [], [sense("n", "งาน, ทำงาน")])];
  assert.equal(buildQuestion(POOL[0], CARD(40), pool, seeded()).type, "cloze");
});

test("real data: how many big trees can be asked by typing", () => {
  const words = ["01", "02"]
    .flatMap((level) => parseLevel(readFileSync(new URL(`../../app/data/levels/${level}.tsv`, import.meta.url), "utf8"), level))
    .filter((entry) => entry.senses.length > 0);
  const typeable = words.map((entry) => typeQuestion(entry, words)).filter(Boolean);
  for (const question of typeable) {
    assert.ok(question.accepted.includes(question.answerText.toLowerCase()), question.answerText);
    assert.ok(question.prompt.length > 0);
  }
  assert.ok(typeable.length >= 60, `พิมพ์ได้ ${typeable.length} จาก ${words.length}`);
});

test("cloze can use the second example sentence and carries its Thai hint", async () => {
  const { clozeQuestion } = await import("../../app/js/quiz.js");
  const mk = (headword, exampleEn) => ({ headword, forms: [`${headword}s`], senses: [{ pos: "n", label: "n", text: `คำ${headword}` }], exampleEn, exampleTh: "ไทยหนึ่ง", example2En: "", example2Th: "" });
  const target = { ...mk("house", "The house is big."), example2En: "We bought a house last year.", example2Th: "ไทยสอง" };
  const pool = [target, mk("river", "The river is long."), mk("tree", "The tree is tall."), mk("road", "The road is wide.")];
  const first = clozeQuestion(target, pool, () => 0.9);
  assert.equal(first.hintTh, "ไทยหนึ่ง");
  assert.equal(first.before, "The ");
  const second = clozeQuestion(target, pool, () => 0.1);
  assert.equal(second.hintTh, "ไทยสอง");
  assert.equal(second.before, "We bought a ");
  // คำที่ไม่มีประโยคที่ 2 ใช้ประโยคแรกเสมอ
  assert.equal(clozeQuestion(pool[1], pool, () => 0.1).hintTh, "ไทยหนึ่ง");
});
