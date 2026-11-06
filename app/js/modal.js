// หน้าต่าง (.modal) กัน focus ไม่ให้หลุดไปด้านหลัง (โหลดทีหลังผ่าน import() ใน main.js)
// - ระหว่างเปิดหน้าต่าง ทุกอย่างใน <body> ที่ไม่ใช่หน้าต่างและ toast เป็น inert: กด Tab ไม่หลุด และ screen reader ไม่อ่านพื้นหลัง
// - ปิดหน้าต่างแล้ว focus กลับไปที่ปุ่มที่กดเปิด (จำปุ่มล่าสุดที่กดหรือ focus นอกหน้าต่าง)
// โค้ดเดิมเปิด/ปิดหน้าต่างด้วย attribute hidden อยู่แล้ว จึงเฝ้าดู attribute นี้แทนการแก้ทุกจุดที่เปิดหน้าต่าง

const isModal = (node) => node.classList?.contains("modal");

export function trapModals(doc = document) {
  const modals = [...doc.querySelectorAll(".modal")];
  let lastOutside = null;
  const remember = (event) => {
    const target = event.target.closest?.("button, a, input, select, textarea, [tabindex]");
    if (target && !target.closest(".modal")) lastOutside = target;
  };
  doc.addEventListener("focusin", remember);
  doc.addEventListener("pointerdown", remember, true);

  const openers = new Map();
  const sync = (modal) => {
    const anyOpen = modals.some((item) => !item.hidden);
    for (const node of doc.body.children) {
      if (!isModal(node) && node.id !== "toast") node.inert = anyOpen;
    }
    if (!modal.hidden) {
      if (!openers.has(modal)) openers.set(modal, lastOutside);
      if (!modal.contains(doc.activeElement)) modal.querySelector("button, a[href], input, textarea, select")?.focus();
      return;
    }
    const opener = openers.get(modal);
    openers.delete(modal);
    if (!anyOpen && opener?.isConnected && !doc.activeElement?.closest?.("main, header")) opener.focus({ preventScroll: true });
  };
  const observer = new MutationObserver((records) => records.forEach((record) => sync(record.target)));
  modals.forEach((modal) => {
    observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
    if (!modal.hidden) sync(modal);
  });
}
