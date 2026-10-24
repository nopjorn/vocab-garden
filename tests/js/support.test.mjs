import { test } from "node:test";
import assert from "node:assert/strict";

import { SUPPORT_LINKS } from "../../app/js/support.js";

test("every support link is a labelled https link to an external service", () => {
  for (const link of SUPPORT_LINKS) {
    assert.ok(link.label && link.label.trim(), "ต้องมี label");
    const url = new URL(link.url);
    assert.equal(url.protocol, "https:", link.url);
    assert.ok(!url.hostname.includes("newgeneralservicelist"), "ลิงก์สนับสนุนต้องไม่ชี้ไปเว็บ NGSL (ห้ามทำให้ดูเหมือน NGSL รับรอง)");
    assert.ok(!url.hostname.endsWith("github.io"), "ลิงก์สนับสนุนต้องออกไปบริการภายนอก ไม่ใช่หน้าของแอป");
  }
});
