// อ่านออกเสียงภาษาอังกฤษด้วย Web Speech API ซึ่งใช้เสียงที่มีอยู่ในเครื่องผู้ใช้

export function canSpeak() {
  return "speechSynthesis" in globalThis && "SpeechSynthesisUtterance" in globalThis;
}

function englishVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang === "en-US") || voices.find((voice) => voice.lang.startsWith("en"));
}

export function speak(text, rate = 0.9) {
  if (!canSpeak() || !text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  const voice = englishVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

// เครื่องมีเสียงอ่านภาษานี้ไหม เช่น hasVoice("th") (รายการเสียงบางเบราว์เซอร์โหลดช้า ให้เรียกใหม่หลัง voiceschanged)
export function hasVoice(prefix) {
  return canSpeak() && speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(prefix));
}

// อ่านหนึ่งบรรทัดด้วยภาษาที่กำหนด แล้วเรียก onEnd เมื่ออ่านจบหรืออ่านไม่สำเร็จ (ใช้กับฟังทวนที่อ่านต่อกันเป็นชุด)
export function speakLine(text, { lang = "en-US", rate = 0.9, onEnd = null } = {}) {
  if (!canSpeak() || !text) return null;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const base = lang.slice(0, 2);
  const voices = speechSynthesis.getVoices();
  const voice = lang === "en-US" ? englishVoice() : voices.find((item) => item.lang.toLowerCase().replace("_", "-").startsWith(base));
  if (voice) utterance.voice = voice;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  speechSynthesis.speak(utterance);
  return utterance;
}
