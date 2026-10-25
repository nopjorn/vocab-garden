import { test } from "node:test";
import assert from "node:assert/strict";

import { CARD_HEIGHT, CARD_WIDTH, NGSL_NOTE, buildCardData, drawCard, fitText } from "../../app/js/sharecard.js";

const summary = { planted: 200, trees: 12, streak: 7, reviews: 1234, flowers: ["🌸", "🌼"], medals: ["🌱", "🔥"], decorations: [] };

// ctx จำลอง: นับความกว้างตามจำนวนตัวอักษรแล้วจดสิ่งที่วาด
function fakeCtx() {
  const calls = [];
  return {
    calls,
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: (text) => ({ width: [...text].length * 20 }),
    fillRect: (...args) => calls.push(["rect", ...args]),
    fillText: (text, x, y) => calls.push(["text", text, x, y]),
  };
}

test("card data holds the numbers, the dates in the Buddhist era and only rows that have something", () => {
  const data = buildCardData(summary, new Date(2026, 9, 25));
  assert.deepEqual(data.stats.map((stat) => stat.value), [200, 12, 7, 1234]);
  assert.deepEqual(data.rows.map((row) => row.title), ["ดอกไม้ประจำแปลง", "เหรียญ"]);
  assert.equal(data.dateText, "25/10/2569");
  assert.equal(data.note, NGSL_NOTE);
});

test("the note credits NGSL with its version and licence and does not claim to be official", () => {
  assert.match(NGSL_NOTE, /NGSL 1\.2/);
  assert.match(NGSL_NOTE, /CC BY-SA 4\.0/);
  assert.match(NGSL_NOTE, /ไม่ใช่แอปทางการ/);
});

test("bad numbers become zero", () => {
  const data = buildCardData({ ...summary, planted: undefined, trees: "x" });
  assert.deepEqual(data.stats.slice(0, 2).map((stat) => stat.value), [0, 0]);
});

test("long text is cut to fit", () => {
  const ctx = fakeCtx();
  assert.equal(fitText(ctx, "สั้น", 200), "สั้น");
  const cut = fitText(ctx, "x".repeat(50), 200);
  assert.ok(cut.endsWith("…"));
  assert.ok(ctx.measureText(cut).width <= 200);
});

test("drawing paints the background, every stat, the rows and the credit line inside the card", () => {
  const ctx = fakeCtx();
  drawCard(ctx, buildCardData(summary, new Date(2026, 9, 25)));
  const texts = ctx.calls.filter((call) => call[0] === "text");
  const written = texts.map((call) => call[1]).join("|");
  for (const part of ["Vocab Garden", "200", "12", "1,234", "คำในสวน", "ดอกไม้ประจำแปลง", "🌸 🌼", "25/10/2569", "NGSL 1.2"]) {
    assert.ok(written.includes(part), part);
  }
  assert.deepEqual(ctx.calls[0], ["rect", 0, 0, CARD_WIDTH, CARD_HEIGHT]);
  for (const [, , x, y] of texts) {
    assert.ok(x > 0 && x < CARD_WIDTH && y > 0 && y < CARD_HEIGHT);
  }
});
