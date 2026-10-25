// Service worker: เก็บแอปและชุดข้อมูลไว้ในเครื่องเพื่อใช้ offline
// ชื่อ cache ผูกกับเลข version ทุกครั้งที่ขยับ version เบราว์เซอร์จะเห็นว่า version.js เปลี่ยน
// แล้วติดตั้ง service worker ใหม่พร้อม cache ชุดใหม่
// PRECACHE ต้องมีทุกไฟล์ใน app/ (tests/test_pwa.py ตรวจให้)
// Safari เทียบแค่ไฟล์ sw.js ไม่ดู version.js ที่ import มา จึงต้องเขียนเลข version ไว้ในไฟล์นี้ด้วย
// ขยับ version ทุกครั้งต้องแก้บรรทัดด้านล่างให้ตรงกับ app/version.js (tests/test_pwa.py ตรวจให้)
// sw-version: 0.28.0

importScripts("version.js");

const CACHE = `vg-${self.VG_VERSION}`;
const LEVELS = [...Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(2, "0")), "sup"];
const PRECACHE = [
  "./",
  "index.html",
  "version.js",
  "manifest.webmanifest",
  "css/style.css",
  "js/main.js",
  "js/data.js",
  "js/srs.js",
  "js/storage.js",
  "js/speech.js",
  "js/update.js",
  "js/stats.js",
  "js/weekly.js",
  "js/report.js",
  "js/changelog.js",
  "js/support.js",
  "js/celebrate.js",
  "js/sfx.js",
  "js/confetti.js",
  "js/habit.js",
  "js/quiz.js",
  "js/reminder.js",
  "js/garden.js",
  "js/match.js",
  "js/wordle.js",
  "js/scramble.js",
  "js/sharecard.js",
  "js/achievements.js",
  "js/calendar.js",
  "js/daily.js",
  "js/decor.js",
  "js/exam.js",
  "js/flash.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "data/LICENSE",
  ...LEVELS.map((level) => `data/levels/${level}.tsv`),
];

self.addEventListener("install", (event) => {
  // cache: "reload" ข้าม HTTP cache เพื่อให้ได้ไฟล์ของเวอร์ชันใหม่จริง
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  // ลบเฉพาะ cache เก่าของแอปนี้ (repo อื่นใต้ nopjorn.github.io ใช้ cache ร่วม origin เดียวกัน)
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("vg-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
  if (event.data === "version") event.ports[0]?.postMessage(self.VG_VERSION);
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  // changelog.md ถูกคัดลอกมาไว้ตอน deploy (ไม่อยู่ใน PRECACHE) ขอจากเซิร์ฟเวอร์ก่อน แล้วเก็บไว้เปิดตอน offline
  if (new URL(request.url).pathname.endsWith("/changelog.md")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put("changelog.md", response.clone());
          return response;
        } catch (error) {
          const cached = await cache.match("changelog.md");
          if (cached) return cached;
          throw error;
        }
      }),
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === "navigate") {
        const page = await cache.match("index.html");
        if (page) return page;
      }
      return fetch(request);
    }),
  );
});
