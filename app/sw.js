// Service worker: เก็บแอปและชุดข้อมูลไว้ในเครื่องเพื่อใช้ offline
// ชื่อ cache ผูกกับเลข version ทุกครั้งที่ขยับ version เบราว์เซอร์จะเห็นว่า version.js เปลี่ยน
// แล้วติดตั้ง service worker ใหม่พร้อม cache ชุดใหม่
// PRECACHE ต้องมีทุกไฟล์ใน app/ (tests/test_pwa.py ตรวจให้)
// Safari เทียบแค่ไฟล์ sw.js ไม่ดู version.js ที่ import มา จึงต้องเขียนเลข version ไว้ในไฟล์นี้ด้วย
// ขยับ version ทุกครั้งต้องแก้บรรทัดด้านล่างให้ตรงกับ app/version.js (tests/test_pwa.py ตรวจให้)
// sw-version: 0.61.0

importScripts("version.js", "asset-hashes.js");

const CACHE = `vg-${self.VG_VERSION}`;
const LEVELS = [...Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(2, "0")), "sup"];
// ด่านที่มีไฟล์ข้อมูลเพิ่ม data/extra/NN.tsv ต้องตรงกับ EXTRA_LEVELS ใน js/data.js (tests/test_pwa.py ตรวจให้)
const EXTRA_LEVELS = ["01", "02", "03", "04"];
const PRECACHE = [
  "./",
  "index.html",
  "version.js",
  "manifest.webmanifest",
  "css/style.css",
  "fonts/anuphan-thai-latin.woff2",
  "fonts/OFL.txt",
  "fonts/README.md",
  "js/main.js",
  "js/data.js",
  "js/srs.js",
  "js/fsrs.js",
  "js/forms.js",
  "js/coverage.js",
  "js/confuse.js",
  "js/sentence.js",
  "js/blitz.js",
  "js/duel.js",
  "js/bugs.js",
  "js/rng.js",
  "js/visitors.js",
  "js/visitor-card.js",
  "js/herbarium.js",
  "js/missions.js",
  "js/recall.js",
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
  "js/badge.js",
  "js/tree-art.js",
  "js/sky.js",
  "js/backup.js",
  "js/listen.js",
  "js/placement.js",
  "js/sharecard.js",
  "js/achievements.js",
  "js/calendar.js",
  "js/daily.js",
  "js/decor.js",
  "js/exam.js",
  "js/flash.js",
  "js/commute.js",
  "js/gifts.js",
  "js/monthly.js",
  "js/screens/exam.js",
  "js/screens/flash.js",
  "js/screens/match.js",
  "js/screens/scramble.js",
  "js/screens/sentence.js",
  "js/screens/blitz.js",
  "js/screens/bugs.js",
  "js/screens/herbarium.js",
  "js/screens/confuse.js",
  "js/screens/placement.js",
  "js/screens/dictation.js",
  "js/screens/listen.js",
  "js/screens/commute.js",
  "js/screens/settings.js",
  "js/screens/garden.js",
  "js/screens/wordle.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/og-image.jpg",
  "data/LICENSE",
  "data/frequency.tsv",
  "data/confusables.json",
  ...LEVELS.map((level) => `data/levels/${level}.tsv`),
  ...EXTRA_LEVELS.map((level) => `data/extra/${level}.tsv`),
];

// hash ของแต่ละไฟล์ (asset-hashes.js สร้างด้วย scripts/asset_hashes.py) เก็บไว้ใน cache ด้วยคีย์นี้ ใช้เทียบตอนอัปเดตครั้งถัดไป
const HASHES = self.VG_ASSETS || {};
const HASH_KEY = "asset-hashes.json";
const hashOf = (url) => HASHES[url === "./" ? "index.html" : url];

// cache ของเวอร์ชันก่อนที่มีรายการ hash (ไม่มี = ติดตั้งครั้งแรก หรือเวอร์ชันก่อนยังไม่เก็บ hash)
async function previousCache() {
  for (const key of await caches.keys()) {
    if (!key.startsWith("vg-") || key === CACHE) continue;
    const cache = await caches.open(key);
    const saved = await cache.match(HASH_KEY);
    if (saved) return { cache, hashes: await saved.json() };
  }
  return null;
}

// ติดตั้งเวอร์ชันใหม่: ไฟล์ที่ hash ไม่เปลี่ยนคัดลอกจาก cache เดิม ที่เหลือโหลดใหม่
// - อัปเดตเวอร์ชัน: โหลดด้วย cache: "reload" ข้าม HTTP cache เพื่อให้ได้ไฟล์ของเวอร์ชันใหม่จริง
// - ติดตั้งครั้งแรก (ยังไม่มี cache ของแอปนี้เลย): หน้าเว็บเพิ่งโหลดไฟล์ชุดเดียวกันมา ใช้ HTTP cache ได้ ไม่ต้องโหลดซ้ำ
async function install() {
  const first = !(await caches.keys()).some((key) => key.startsWith("vg-") && key !== CACHE);
  const previous = await previousCache();
  const cache = await caches.open(CACHE);
  try {
    await Promise.all(
      PRECACHE.map(async (url) => {
        const hash = hashOf(url);
        if (previous && hash && previous.hashes[url] === hash) {
          const kept = await previous.cache.match(url);
          if (kept) return cache.put(url, kept);
        }
        const response = await fetch(new Request(url, { cache: first ? "default" : "reload" }));
        if (!response.ok) throw new Error(`โหลด ${url} ไม่สำเร็จ (${response.status})`);
        return cache.put(url, response);
      }),
    );
    const saved = Object.fromEntries(PRECACHE.map((url) => [url, hashOf(url)]).filter(([, hash]) => hash));
    await cache.put(HASH_KEY, new Response(JSON.stringify(saved), { headers: { "Content-Type": "application/json" } }));
  } catch (error) {
    await caches.delete(CACHE); // ติดตั้งไม่ครบ ไม่เก็บ cache ครึ่ง ๆ กลาง ๆ ไว้ (เบราว์เซอร์จะลองติดตั้งใหม่ภายหลัง)
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(install());
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
