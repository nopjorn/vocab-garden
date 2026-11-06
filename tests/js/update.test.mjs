import { test } from "node:test";
import assert from "node:assert/strict";

import { isNewer, isPatch, parseSwVersion } from "../../app/js/update.js";

test("parseSwVersion reads the sw-version line", () => {
  assert.equal(parseSwVersion("// x\n// sw-version: 0.3.4\n\nimportScripts()"), "0.3.4");
  assert.equal(parseSwVersion("// sw-version: 10.20.30\r\n"), "10.20.30");
});

test("parseSwVersion returns null when the line is missing or malformed", () => {
  assert.equal(parseSwVersion("const x = 1;"), null);
  assert.equal(parseSwVersion("// sw-version: latest"), null);
  assert.equal(parseSwVersion("<html>404</html>"), null);
});

test("isNewer compares numerically, not as text", () => {
  assert.equal(isNewer("0.3.4", "0.3.3"), true);
  assert.equal(isNewer("0.10.0", "0.9.9"), true);
  assert.equal(isNewer("1.0.0", "0.99.99"), true);
  assert.equal(isNewer("0.3.3", "0.3.3"), false);
  assert.equal(isNewer("0.3.2", "0.3.3"), false);
});

test("isPatch is true only for a newer version with the same major.minor", () => {
  assert.equal(isPatch("0.65.1", "0.65.0"), true);
  assert.equal(isPatch("0.65.10", "0.65.9"), true);
  assert.equal(isPatch("0.66.0", "0.65.3"), false);
  assert.equal(isPatch("1.0.0", "0.65.0"), false);
  assert.equal(isPatch("0.65.0", "0.65.0"), false);
  assert.equal(isPatch("0.6.1", "0.65.0"), false);
});
