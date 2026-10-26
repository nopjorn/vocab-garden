// ต้นไม้ในสวนที่วาดเองเป็น SVG แทนอีโมจิ 🌰🌱🌿🌳 ให้หน้าตาเหมือนกันทุกเครื่อง
// สีมาจากตัวแปร --art-* ใน style.css จึงเปลี่ยนตามธีมสว่าง/มืดเอง (ตรรกะวาดรูปล้วน ไม่แตะข้อมูลความคืบหน้า)

// รหัสระยะตาม STAGES ใน srs.js: ระยะที่ไม่รู้จักวาดเป็นเมล็ด
const SOIL = '<ellipse class="art-soil" cx="24" cy="42" rx="15" ry="4"/>';

const BODIES = {
  seed: '<ellipse class="art-seed" cx="24" cy="38" rx="5.5" ry="3.6" transform="rotate(-18 24 38)"/>',
  sprout:
    '<path class="art-stem" d="M24 41V31"/>' +
    '<path class="art-leaf" d="M24 32C17 32 13.5 27.5 13.5 22C20 22 24 26 24 32Z"/>' +
    '<path class="art-leaf2" d="M24 30C24 24 28 20.5 34.5 20.5C34.5 26.5 31 30 24 30Z"/>',
  growing:
    '<path class="art-stem" d="M24 41V18"/>' +
    '<path class="art-leaf" d="M24 36C16 36 12.5 31 12.5 25.5C19.5 25.5 24 30 24 36Z"/>' +
    '<path class="art-leaf2" d="M24 32C24 25.5 28.5 22 36 22C36 28.5 32 32 24 32Z"/>' +
    '<path class="art-leaf" d="M24 24C17.5 24 15 19.5 15 15C20.5 15 24 18.5 24 24Z"/>' +
    '<path class="art-leaf2" d="M24 20C24 14 27 10.5 32.5 10.5C32.5 16 29.5 20 24 20Z"/>',
  tree:
    '<path class="art-trunk" d="M21.5 42L22.5 26H25.5L26.5 42Z"/>' +
    '<circle class="art-leaf" cx="15.5" cy="25" r="7.5"/>' +
    '<circle class="art-leaf" cx="32.5" cy="25" r="7.5"/>' +
    '<circle class="art-leaf" cx="24" cy="17.5" r="11"/>' +
    '<circle class="art-leaf2" cx="20" cy="14.5" r="4.5"/>' +
    '<circle class="art-leaf2" cx="31" cy="21" r="2.8"/>',
};

const DROP = '<path class="art-drop" d="M40 5C40 5 35.5 10.5 35.5 14A4.5 4.5 0 0 0 44.5 14C44.5 10.5 40 5 40 5Z"/>';

// ข้อความ SVG ของต้นไม้ระยะนั้น (wilted = ถึงเวลารดน้ำ ต้นเอียงและมีหยดน้ำ)
export function treeMarkup(stageId, { wilted = false } = {}) {
  const body = BODIES[stageId] || BODIES.seed;
  const kind = stageId in BODIES ? stageId : "seed";
  return (
    `<svg class="tree-art tree-art-${kind}${wilted ? " wilted" : ""}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">` +
    `${SOIL}<g class="art-body">${body}</g>${wilted ? DROP : ""}</svg>`
  );
}

export function treeEl(stageId, options) {
  const holder = document.createElement("span");
  holder.innerHTML = treeMarkup(stageId, options);
  return holder.firstElementChild;
}
