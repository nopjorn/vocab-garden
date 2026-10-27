import { test } from "node:test";
import assert from "node:assert/strict";

import { describeForms, labelForm } from "../../app/js/forms.js";

const word = (headword, forms, ...pos) => ({ headword, forms, senses: pos.map((id) => ({ pos: id })) });

test("regular verbs: -s, -ing and -ed forms are explained", () => {
  const required = word("require", ["requires", "required", "requiring"], "v");
  assert.deepEqual(describeForms(required), [
    { form: "requires", label: "-s (he/she/it)" },
    { form: "required", label: "อดีต / past participle (V2, V3)" },
    { form: "requiring", label: "รูป -ing" },
  ]);
});

test("nouns and words that are both noun and verb get the right plural/-s label", () => {
  assert.equal(labelForm(word("house", ["houses"], "n"), "houses"), "พหูพจน์");
  assert.equal(labelForm(word("work", ["works", "worked", "working"], "v", "n"), "works"), "พหูพจน์ / -s (he/she/it)");
  assert.equal(labelForm(word("city", ["cities"], "n"), "cities"), "พหูพจน์");
  assert.equal(labelForm(word("study", ["studies"], "v"), "studies"), "-s (he/she/it)");
});

test("a word with no noun or verb sense does not get a plural label it cannot have", () => {
  assert.equal(labelForm(word("over", ["overs"], "prep", "adv"), "overs"), null);
});

test("irregular verbs: past and past participle are told apart", () => {
  const go = word("go", ["goes", "went", "going", "gone"], "v");
  assert.equal(labelForm(go, "went"), "อดีต (V2)");
  assert.equal(labelForm(go, "gone"), "past participle (V3)");
  assert.equal(labelForm(go, "going"), "รูป -ing");
  assert.equal(labelForm(word("find", ["finds", "found", "finding"], "v"), "found"), "อดีต / past participle (V2, V3)");
  assert.equal(labelForm(word("get", ["got", "gotten"], "v"), "gotten"), "past participle (V3)");
});

test("be, have and do have their own labels", () => {
  const be = word("be", ["am", "is", "are", "been", "was", "were", "being", "m", "s", "re", "isn"], "v", "aux");
  const labels = Object.fromEntries(describeForms(be).map(({ form, label }) => [form, label]));
  assert.equal(labels.am, "รูปปัจจุบัน (กับ I)");
  assert.equal(labels.was, "อดีต (กับ I/he/she/it)");
  assert.equal(labels.been, "past participle (V3)");
  assert.equal(labels.m, "ส่วนของรูปย่อ (เช่น I'm, it's, we're)");
  assert.equal(labels.isn, "ส่วนของรูปย่อ (เช่น isn't, don't)");
  assert.equal(labelForm(word("have", ["has", "had"], "v", "aux"), "has"), "-s (he/she/it)");
});

test("comparatives, pronoun forms, irregular plurals and British spellings", () => {
  assert.equal(labelForm(word("late", ["later", "latest"], "adj", "adv"), "later"), "เปรียบเทียบ (-er)");
  assert.equal(labelForm(word("late", ["later", "latest"], "adj", "adv"), "latest"), "ขั้นสูงสุด (-est)");
  assert.equal(labelForm(word("bad", ["worse"], "adj"), "worse"), "เปรียบเทียบ (ไม่ปกติ)");
  assert.equal(labelForm(word("I", ["me", "my", "mine"], "pron"), "mine"), "แสดงความเป็นเจ้าของ (ใช้แทนนามได้เลย)");
  assert.equal(labelForm(word("child", ["children"], "n"), "children"), "พหูพจน์ (ไม่ปกติ)");
  assert.equal(labelForm(word("color", ["colour"], "n", "v"), "colour"), "สะกดแบบอังกฤษ (British)");
  assert.equal(labelForm(word("realize", ["realise"], "v"), "realise"), "สะกดแบบอังกฤษ (British)");
});

test("forms we are not sure about stay unlabelled and the form list is never changed", () => {
  const w = word("time", ["times", "timed", "timing"], "n");
  const before = [...w.forms];
  const described = describeForms(w);
  assert.deepEqual(described.map((entry) => entry.form), before);
  assert.equal(described[1].label, null);
  assert.equal(described[2].label, null);
  assert.deepEqual(describeForms(word("among", [], "prep")), []);
});
