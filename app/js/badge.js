// ตัวเลขคำที่ต้องทวนบนไอคอนแอป (Badging API) ใช้ได้เมื่อติดตั้งแอปลงหน้าจอหลัก
// ตัวเลขเปลี่ยนได้เฉพาะตอนเปิดแอปอยู่ (ยังไม่มีเซิร์ฟเวอร์ส่งแจ้งเตือน) บน iPhone / iPad ต้องอนุญาตการแจ้งเตือนก่อน

export function canBadge() {
  return typeof navigator !== "undefined" && typeof navigator.setAppBadge === "function";
}

// ขออนุญาตแจ้งเตือน (เรียกจากการแตะของผู้ใช้เท่านั้น) คืน true ถ้าตั้งตัวเลขได้ ไม่มีระบบขอสิทธิ์ = ใช้ได้เลย
export async function askBadgePermission() {
  if (!canBadge()) return false;
  if (typeof Notification === "undefined") return true;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch (error) {
    return false;
  }
}

// count > 0 = ใส่ตัวเลข · 0 หรือปิดอยู่ = ล้างตัวเลข
export function showBadge(count, enabled = true) {
  if (!canBadge()) return;
  const action = enabled && count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge?.();
  action?.catch?.(() => {});
}
