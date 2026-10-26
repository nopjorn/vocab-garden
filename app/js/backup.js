// เตือนให้สำรองไฟล์ และจัดการสำเนาอัตโนมัติในเครื่อง (IndexedDB)
// ส่วนตัดสินใจ (backupDue, planPrune ฯลฯ) เป็นฟังก์ชันล้วน ทดสอบได้ ส่วนที่แตะ IndexedDB อยู่ท้ายไฟล์

import { MONTH_ABBR } from "./calendar.js";

export const BACKUP_EVERY_DAYS = 7; // ไม่ได้สำรองเกินกี่วันถึงเตือน
export const SNOOZE_DAYS = 3; // กด "ไว้ทีหลัง" แล้วเงียบกี่วัน
export const MIN_CARDS = 10; // มีความคืบหน้าอย่างน้อยกี่คำถึงเริ่มเตือน
export const KEEP_DAILY = 7; // เก็บสำเนารายวันย้อนหลังกี่วัน
export const KEEP_BEFORE = 3; // เก็บสำเนาก่อนนำเข้า / ล้าง / กู้คืนกี่ชุด
export const KEEP_MANUAL = 5; // เก็บสำเนาที่กดเก็บเองกี่ชุด

// วันที่เริ่มนับเวลา: ครั้งแรกที่มีความคืบหน้าพอ ใช้เมื่อยังไม่เคยสำรองเลย คืน meta ใหม่ (ไม่แก้ตัวเดิม)
export function markSince(meta, cardCount, today) {
  return meta.since === null && meta.last === null && cardCount >= MIN_CARDS ? { ...meta, since: today } : meta;
}

// จำนวนวันนับจากการสำรองล่าสุด (ไม่เคยสำรอง = นับจากวันเริ่มนับ ถ้ายังไม่เริ่มนับ = null)
export function daysSinceBackup(meta, today) {
  const base = meta.last ?? meta.since;
  return base === null ? null : today - base;
}

// ควรเตือนไหม: มีความคืบหน้าพอ ไม่ได้สำรองเกิน BACKUP_EVERY_DAYS วัน และไม่ได้เพิ่งกด "ไว้ทีหลัง"
export function backupDue(meta, cardCount, today) {
  if (cardCount < MIN_CARDS) return false;
  const days = daysSinceBackup(meta, today);
  if (days === null || days < BACKUP_EVERY_DAYS) return false;
  return meta.asked === null || today - meta.asked >= SNOOZE_DAYS;
}

export function backupText(meta, today) {
  const days = daysSinceBackup(meta, today);
  if (meta.last === null) return days === null ? "ยังไม่เคยสำรอง" : `ยังไม่เคยสำรองไฟล์ (ใช้มา ${days} วัน)`;
  if (days === 0) return "สำรองล่าสุด: วันนี้";
  return `สำรองล่าสุด: ${days} วันที่แล้ว`;
}

// บอกว่าสำเนาไหนต้องลบ: รายวันเก็บ KEEP_DAILY ชุดล่าสุด ก่อนนำเข้า/ล้าง/กู้คืนเก็บ KEEP_BEFORE ชุดล่าสุด ที่กดเก็บเองเก็บ KEEP_MANUAL ชุดล่าสุด (เรียงตามเวลา at)
export function planPrune(entries) {
  const drop = [];
  for (const [kind, keep] of [["daily", KEEP_DAILY], ["before", KEEP_BEFORE], ["manual", KEEP_MANUAL]]) {
    const sorted = entries.filter((entry) => entry.kind === kind).sort((a, b) => b.at.localeCompare(a.at));
    drop.push(...sorted.slice(keep).map((entry) => entry.id));
  }
  return drop;
}

// วันและเวลาที่เก็บสำเนา ตามเวลาเครื่อง เช่น "26 ต.ค. 07:05 น."
export function formatSnapshotTime(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getDate()} ${MONTH_ABBR[date.getMonth()]} ${pad(date.getHours())}:${pad(date.getMinutes())} น.`;
}

export const SNAPSHOT_REASONS = { import: "ก่อนนำเข้าไฟล์", reset: "ก่อนล้างความคืบหน้า", restore: "ก่อนกู้คืนสำเนา" };

// ---------- IndexedDB ----------
// เก็บในเบราว์เซอร์ของเครื่องนี้ ใช้กันกดผิด (นำเข้าทับ ล้างข้อมูล) ไม่ใช่ที่สำรองจริง เพราะหายพร้อมข้อมูลเว็บไซต์

const DB_NAME = "vg-snapshots";
const STORE = "snapshots";

export function canSnapshot() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

// สำเนาทั้งหมด (ไม่รวมข้อมูล) ใหม่สุดก่อน
export async function listSnapshots() {
  const all = (await run("readonly", (store) => store.getAll())) || [];
  return all
    .map(({ data, ...info }) => info)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export async function loadSnapshot(id) {
  return (await run("readonly", (store) => store.get(id))) || null;
}

export async function hasSnapshot(id) {
  return (await run("readonly", (store) => store.getKey(id))) !== undefined;
}

// เก็บสำเนา แล้วลบของเก่าเกินจำนวนที่เก็บ info = { id, kind, day, at, count, reason? }
export async function saveSnapshot(info, data) {
  await run("readwrite", (store) => store.put({ ...info, data }));
  const drop = planPrune(await listSnapshots());
  if (drop.length > 0) await run("readwrite", (store) => drop.forEach((id) => store.delete(id)));
}

export async function clearSnapshots() {
  await run("readwrite", (store) => store.clear());
}
