// ภารกิจประจำวัน 3 ข้อ: ต่อยอดจากเป้าหมายรายวัน ทุกข้อคำนวณจากข้อมูลที่แอปเก็บอยู่แล้ว (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ข้อที่ 3 สลับตามวันคู่/วันคี่ (ตอบถูกติดกัน / ปลูกคำใหม่) เพื่อให้แต่ละวันไม่เหมือนกันเกินไป
// ภารกิจเป็นของสนุก ๆ เท่านั้น ไม่ได้ล็อกคำศัพท์หรือฟีเจอร์ไว้

export const STREAK_TARGET = 5;
export const PLANT_TARGET = 5;
export const MISSION_KEEP_DAYS = 90; // เก็บวันที่ทำภารกิจครบย้อนหลังกี่วัน

export function missionsFor(day, dailyGoal) {
  return [
    { id: "review", emoji: "🔁", title: `ทวน ${dailyGoal} ใบ`, target: dailyGoal },
    { id: "game", emoji: "🎮", title: "เล่นเกม 1 รอบ", target: 1 },
    day % 2 === 0
      ? { id: "streak", emoji: "🔥", title: `ตอบจำได้ติดกัน ${STREAK_TARGET} ข้อ`, target: STREAK_TARGET }
      : { id: "plant", emoji: "🌱", title: `ปลูกคำใหม่ ${PLANT_TARGET} คำ`, target: PLANT_TARGET },
  ];
}

// จำนวนข้อที่ตอบจำได้ (ไม่ใช่ "ยังจำไม่ได้") ติดกันยาวที่สุดในวันนั้น answers = ผลการตอบ [วัน, คำ, คะแนน, ระยะทวน] เรียงตามเวลา
export function longestRun(answers, day) {
  let best = 0;
  let run = 0;
  for (const [answerDay, , rating] of answers) {
    if (answerDay !== day) continue;
    run = rating === 1 ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}

// ความคืบหน้าของแต่ละภารกิจในวัน day · data = { reviews, games, planted, answers }
export function missionProgress(day, dailyGoal, data) {
  const values = { review: data.reviews, game: data.games, plant: data.planted, streak: longestRun(data.answers, day) };
  return missionsFor(day, dailyGoal).map((mission) => {
    const value = Math.min(values[mission.id], mission.target);
    return { ...mission, value, done: value >= mission.target };
  });
}

export const allDone = (progress) => progress.every((mission) => mission.done);

// วันที่ทำครบ (เรียงจากเก่าไปใหม่) ตัดวันที่เก่ากว่า MISSION_KEEP_DAYS ทิ้ง
export function withDone(days, day) {
  const merged = [...new Set([...days, day])].sort((a, b) => a - b);
  return merged.filter((value) => value > day - MISSION_KEEP_DAYS);
}
