// อ่าน CHANGELOG.md (รูปแบบตามกฎข้อ 2 ใน CLAUDE.md) เพื่อแสดงหน้า "มีอะไรใหม่"

import { isNewer } from "./update.js";

const ENTRY_RE = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\s*$/;

// คืนรายการเวอร์ชันเรียงตามที่อยู่ในไฟล์ (ใหม่สุดก่อน) แต่ละรายการ { version, date, intro, sections: [{ title, items }] }
export function parseChangelog(text) {
  const entries = [];
  let entry = null;
  let section = null;
  let item = null;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const heading = ENTRY_RE.exec(line);
    if (heading) {
      entry = { version: heading[1], date: heading[2], intro: "", sections: [] };
      entries.push(entry);
      section = null;
      item = null;
    } else if (!entry) {
      continue;
    } else if (line.startsWith("### ")) {
      section = { title: line.slice(4).trim(), items: [] };
      entry.sections.push(section);
      item = null;
    } else if (line.startsWith("- ") && section) {
      item = line.slice(2).trim();
      section.items.push(item);
    } else if (line.trim() && section && item !== null) {
      section.items[section.items.length - 1] += ` ${line.trim()}`; // บรรทัดต่อของข้อเดิม
    } else if (line.trim() && !section) {
      entry.intro = entry.intro ? `${entry.intro} ${line.trim()}` : line.trim();
    }
  }
  return entries;
}

// เวอร์ชันที่ใหม่กว่า seen และไม่เกิน current
export function entriesSince(entries, seen, current) {
  return entries.filter((entry) => isNewer(entry.version, seen) && !isNewer(entry.version, current));
}

// แบ่งข้อความเป็นช่วงปกติกับช่วงที่อยู่ใน `backtick` เพื่อแสดงเป็นโค้ดโดยไม่ต้องใช้ innerHTML
export function inlineParts(text) {
  return text
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((part) => (part.startsWith("`") && part.endsWith("`") && part.length > 2 ? { text: part.slice(1, -1), code: true } : { text: part, code: false }));
}
