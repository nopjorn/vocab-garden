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
