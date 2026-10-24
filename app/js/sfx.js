// เสียงประกอบสั้น ๆ สร้างสดด้วย Web Audio (ไม่มีไฟล์เสียง) และแรงสั่นเบา ๆ บนเครื่องที่รองรับ
// เล่นเฉพาะเมื่อผู้ใช้เปิด "เสียงประกอบ" ในตั้งค่า (ปิดไว้เป็นค่าเริ่มต้น)

// [ความถี่ Hz, เวลาเริ่ม (วินาที), ความยาว (วินาที)]
export const TONES = {
  correct: [[660, 0, 0.09]],
  combo: [
    [660, 0, 0.08],
    [880, 0.09, 0.14],
  ],
  grow: [
    [523, 0, 0.1],
    [659, 0.1, 0.1],
    [784, 0.2, 0.18],
  ],
  finish: [
    [523, 0, 0.12],
    [659, 0.12, 0.12],
    [784, 0.24, 0.12],
    [1047, 0.36, 0.28],
  ],
};

// iPhone ไม่รองรับ Vibration API ส่วน Android ใช้ได้
export const VIBRATION = {
  combo: [20],
  grow: [20, 40, 20],
  finish: [30, 50, 30, 50, 60],
};

let context = null;

function audioContext() {
  try {
    if (!context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
    }
    if (context.state === "suspended") context.resume();
    return context;
  } catch {
    return null;
  }
}

// คืน true ถ้าเล่นเสียงได้จริง
export function playSfx(name, enabled) {
  if (!enabled || !TONES[name]) return false;
  try {
    if (VIBRATION[name]) globalThis.navigator?.vibrate?.(VIBRATION[name]);
  } catch {
    // ไม่รองรับแรงสั่น ข้ามไป
  }
  const audio = audioContext();
  if (!audio) return false;
  const start = audio.currentTime + 0.01;
  for (const [frequency, offset, length] of TONES[name]) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.12, start + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + length + 0.02);
  }
  return true;
}
