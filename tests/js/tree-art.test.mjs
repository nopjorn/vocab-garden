import { test } from "node:test";
import assert from "node:assert/strict";

import { STAGES } from "../../app/js/srs.js";
import { treeMarkup } from "../../app/js/tree-art.js";

test("every garden stage has its own drawing", () => {
  const drawings = STAGES.map((stage) => treeMarkup(stage.id));
  assert.equal(new Set(drawings).size, STAGES.length);
  STAGES.forEach((stage, index) => assert.match(drawings[index], new RegExp(`tree-art-${stage.id}`)));
});

test("drawings are decorative, self-contained SVG with no external references", () => {
  for (const stage of STAGES) {
    const svg = treeMarkup(stage.id);
    assert.match(svg, /^<svg [^>]*aria-hidden="true"/);
    assert.match(svg, /viewBox="0 0 48 48"/);
    assert.doesNotMatch(svg, /<script|href=|url\(|on\w+=/i);
  }
});

test("only wilted plants are tilted and get a water drop", () => {
  for (const stage of STAGES) {
    assert.doesNotMatch(treeMarkup(stage.id), /wilted|art-drop/);
    const wilted = treeMarkup(stage.id, { wilted: true });
    assert.match(wilted, /tree-art [^"]*wilted/);
    assert.match(wilted, /art-drop/);
  }
});

test("an unknown stage falls back to a seed", () => {
  assert.equal(treeMarkup("nope").replace("tree-art-seed", ""), treeMarkup("seed").replace("tree-art-seed", ""));
});
