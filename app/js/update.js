// ตัวช่วยเช็คเวอร์ชันใหม่จากเลข `// sw-version: x.y.z` ที่เขียนไว้ใน sw.js

export function parseSwVersion(text) {
  const match = /^\/\/ sw-version: (\d+\.\d+\.\d+)\s*$/m.exec(text);
  return match ? match[1] : null;
}

// true เมื่อ latest ใหม่กว่า current (ทั้งคู่เป็นเลขแบบ x.y.z)
export function isNewer(latest, current) {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return false;
}
