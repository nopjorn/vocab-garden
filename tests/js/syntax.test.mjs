// ตรวจ syntax ของ JS ทุกไฟล์ใน app/ (main.js และ screens/*.js ไม่มี unit test ของตัวเอง
// ถ้ามี syntax error หลุดขึ้นเว็บ แอปจะเปิดไม่ได้ทั้งแอป)
// ไฟล์ใน js/ เป็น ES module ต้องตรวจด้วย --input-type=module เพราะ `node --check ไฟล์.js` อ่านเป็น CommonJS
// ส่วน sw.js และ version.js เป็นสคริปต์ธรรมดาที่โหลดด้วย importScripts
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("../../app/", import.meta.url));
const CLASSIC = new Set(["sw.js", "version.js"]);

function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.name.endsWith(".js") ? [path] : [];
  });
}

function checkSyntax(source, module) {
  const args = module ? ["--input-type=module", "--check"] : ["--check"];
  return spawnSync(process.execPath, args, { input: source, encoding: "utf8" });
}

test("checkSyntax catches a broken ES module", () => {
  assert.notEqual(checkSyntax("export const x = ;", true).status, 0);
  assert.equal(checkSyntax("export const x = 1;", true).status, 0);
});

const files = jsFiles(APP);

test("app has JavaScript files to check", () => {
  assert.ok(files.length > 40, `found only ${files.length} files`);
});

for (const path of files) {
  const name = relative(APP, path).replaceAll("\\", "/");
  test(`syntax: app/${name}`, () => {
    const result = checkSyntax(readFileSync(path, "utf8"), !CLASSIC.has(name));
    assert.equal(result.status, 0, result.stderr);
  });
}
