// หน้าสวนและหน้าของแต่ละแปลง: โหลดเมื่อเปิดหน้าสวนครั้งแรก (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง)
// ฟังก์ชันที่ใช้ร่วมกับหน้าอื่นรับผ่าน bind(ctx) แทนการ import กลับไปที่ main.js
// (หน้าต่างรายละเอียดคำ ข้ามคำที่รู้แล้ว และคำอธิบายระยะของต้นไม้ อยู่ใน main.js เพราะหน้าหลักใช้ด้วย)
import { buildCalendar, cellLabel } from "../calendar.js";
import { MILESTONES, coverageOfRanks, coverageOfTop, knownRanks, parseFrequency, percentText } from "../coverage.js";
import { levelTitle } from "../data.js";
import { EXAM_COUNT, bestTier, examReady } from "../exam.js";
import { bugSet } from "../bugs.js";
import { treeHeadwords } from "../herbarium.js";
import { PLOT_FILTERS, leechWords, matchesQuery, plantInfo, plantMatchesFilter, plotFilterCounts, plotSummary } from "../garden.js";
import { recallStats } from "../recall.js";
import { STAGES, dayNumber, stageOf } from "../srs.js";
import { recentDays, stageCounts, streakOf, totalReviews } from "../stats.js";
import { treeEl } from "../tree-art.js";

let $, canSkip, el, foldItem, FRESH_VISIBLE, isFreshOpen, openWordDialog, refreshHabit, renderMedals, show, skipWordsAsKnown, state, storage, takeGardenScroll, toast, translatedWords;

// มือถือและ iPad แนวตั้ง: หน้าสวนยาวมาก จึงแบ่งเป็นแท็บย่อย แปลง / ภาพรวม / สถิติ
// จอกว้างแสดงทุกส่วนพร้อมกันเป็นสองคอลัมน์อยู่แล้ว (เงื่อนไขต้องตรงกับ media query ของจอกว้างใน style.css)
const WIDE_LAYOUT = matchMedia("(min-width: 960px) and (hover: hover) and (pointer: fine), (min-width: 960px) and (orientation: landscape) and (pointer: coarse)");
let gardenTab = "plots";

function applyGardenTab() {
  const tabbed = !WIDE_LAYOUT.matches;
  $("garden-tabs").hidden = !tabbed;
  if (tabbed) $("view-garden").dataset.tab = gardenTab;
  else delete $("view-garden").dataset.tab;
  document.querySelectorAll("[data-garden-tab]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.gardenTab === gardenTab)));
}

function renderGarden() {
  applyGardenTab();
  const today = dayNumber();
  const { history: days, active, rest } = refreshHabit(today);
  const { current, best } = streakOf(active, today, rest.frozen);
  $("g-rest").textContent = `🧊 วันพักที่เก็บไว้: ${rest.bank} จาก 2 วัน`;
  $("g-streak").textContent = current;
  $("g-best").textContent = best;
  $("g-total").textContent = totalReviews(days).toLocaleString();

  const stages = stageCounts(translatedWords(), state.cards);
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  $("g-stages").replaceChildren(
    ...stages.map((stage) => {
      const row = el("li", "stage-row");
      const bar = el("div", "stage-bar");
      const fill = el("span", `seg seg-${stage.id}`);
      fill.style.width = `${total ? (stage.count / total) * 100 : 0}%`;
      bar.append(fill);
      const name = el("span", "stage-name");
      name.append(treeEl(stage.id), ` ${stage.label}`);
      row.append(name, bar, el("strong", "stage-count", stage.count));
      return row;
    }),
  );

  const week = recentDays(days, today, 7);
  const peak = Math.max(1, ...week.map((entry) => entry.count));
  $("g-week").replaceChildren(
    ...week.map((entry) => {
      const column = el("div", `week-col${entry.day === today ? " today" : ""}`);
      const bar = el("div", "week-bar");
      bar.style.height = `${Math.max(entry.count ? 8 : 3, (entry.count / peak) * 100)}%`;
      column.append(el("span", "week-count", entry.count || ""), bar, el("span", "week-label", entry.label));
      return column;
    }),
  );
  $("g-week").setAttribute("aria-label", `ทวน 7 วันล่าสุด: ${week.map((entry) => entry.count).join(", ")} ครั้ง`);
  $("g-empty").hidden = totalReviews(days) > 0;
  renderRecall(today);
  renderCoverage();
  renderCalendar(active, today, rest.frozen);
  renderPlots(today);
  renderLeeches();
  renderHerbariumLink();
  renderMedals();
}

// อัตราจำได้ย้อนหลัง RECALL_DAYS วัน (นับเฉพาะคำที่เคยเรียนแล้ว) แยกตามระยะของต้นไม้ก่อนตอบ
function renderRecall(today) {
  const stats = recallStats(storage.loadAnswers(), today);
  $("g-recall-empty").hidden = stats.total > 0;
  $("g-recall-body").hidden = stats.total === 0;
  if (stats.total === 0) return;
  $("g-recall-rate").textContent = `${stats.rate}%`;
  $("g-recall-sub").textContent = `จำได้ ${stats.remembered} จาก ${stats.total} ครั้งที่ทวนคำที่เคยเรียนแล้ว`;
  const names = { sprout: "ต้นอ่อน", growing: "กำลังโต", tree: "ต้นไม้ใหญ่" };
  $("g-recall-stages").replaceChildren(
    ...Object.entries(stats.byStage)
      .filter(([, bucket]) => bucket.total > 0)
      .map(([id, bucket]) => {
        const row = el("li", "stage-row");
        const bar = el("div", "stage-bar");
        const fill = el("span", `seg seg-${id}`);
        fill.style.width = `${bucket.rate}%`;
        bar.append(fill);
        const name = el("span", "stage-name");
        name.append(treeEl(id), ` ${names[id]}`);
        row.append(name, bar, el("strong", "stage-count", `${bucket.rate}%`));
        row.title = `จำได้ ${bucket.remembered} จาก ${bucket.total} ครั้ง`;
        return row;
      }),
  );
}

// รู้กี่คำ ≈ อ่านเข้าใจข้อความกี่เปอร์เซ็นต์ (ดู coverage.js) ไฟล์ความถี่โหลดเมื่อเปิดหน้าสวนครั้งแรกเท่านั้น
let frequencyPromise = null;

function loadFrequency() {
  frequencyPromise ||= fetch("data/frequency.tsv")
    .then((response) => {
      if (!response.ok) throw new Error(`โหลดไฟล์ความถี่ไม่สำเร็จ (${response.status})`);
      return response.text();
    })
    .then(parseFrequency)
    .catch(() => {
      frequencyPromise = null; // ลองใหม่ได้ครั้งหน้า
      return null;
    });
  return frequencyPromise;
}

async function renderCoverage() {
  const frequency = await loadFrequency();
  $("g-cover").hidden = !frequency;
  if (!frequency) return;
  const ranks = knownRanks(translatedWords(), state.cards);
  $("g-cover-rate").textContent = percentText(coverageOfRanks(ranks, frequency));
  $("g-cover-sub").textContent = ranks.length > 0 ? `ปลูกแล้ว ${ranks.length.toLocaleString()} คำ ครอบคลุมราวนี้ของข้อความทั่วไป` : "ยังไม่ได้ปลูกคำ เริ่มท่องแล้วตัวเลขจะขึ้นที่นี่";
  $("g-cover-steps").replaceChildren(
    ...MILESTONES.map((count) => {
      const percent = coverageOfTop(count, frequency);
      const reached = ranks.length >= count;
      const row = el("li", `stage-row${reached ? " reached" : ""}`);
      const bar = el("div", "stage-bar");
      const fill = el("span", `seg seg-${reached ? "tree" : "growing"}`);
      fill.style.width = `${percent}%`;
      bar.append(fill);
      row.append(el("span", "stage-name", `${count.toLocaleString()} คำแรก${reached ? " ✅" : ""}`), bar, el("strong", "stage-count", percentText(percent)));
      return row;
    }),
  );
}

// ปฏิทินสวน: ช่องละหนึ่งวัน สีเข้มตามจำนวนที่ทวน (รวมวันที่เล่นเกม) คอลัมน์ละหนึ่งสัปดาห์
function renderCalendar(active, today, frozen) {
  const calendar = buildCalendar(active, today, frozen);
  $("cal-grid").style.setProperty("--weeks", calendar.weeks);
  $("cal-months").style.setProperty("--weeks", calendar.weeks);
  $("cal-months").replaceChildren(...calendar.months.map((name) => el("span", "", name)));
  $("cal-grid").replaceChildren(
    ...calendar.cells.map((cell) => {
      const node = el("span", `cal-cell${cell.future ? " future" : ` l${cell.level}`}${cell.rest ? " rest" : ""}${cell.day === today ? " today" : ""}`);
      node.title = cellLabel(cell);
      return node;
    }),
  );
  $("cal-summary").textContent = `ท่อง ${calendar.activeDays} วัน ใน ${calendar.weeks} สัปดาห์ล่าสุด (ทวนรวม ${calendar.total.toLocaleString()} ครั้ง)`;
  $("cal-grid").setAttribute("aria-label", `ปฏิทินสวน ท่อง ${calendar.activeDays} วัน ใน ${calendar.weeks} สัปดาห์ล่าสุด`);
}

// แมลงที่ยังเกาะต้นไม้อยู่ (คำที่ลืมบ่อยที่ยังไม่ได้ไล่)
const currentBugs = () => bugSet(translatedWords(), state.cards, storage.loadGarden().bugs);

function bugMark() {
  const mark = el("span", "bug-mark", "🐛");
  mark.setAttribute("aria-hidden", "true");
  return mark;
}

function renderHerbariumLink() {
  storage.pressPages(treeHeadwords(translatedWords(), state.cards), dayNumber());
  const pages = Object.keys(storage.loadGarden().pressed).length;
  $("herbarium-count").textContent = pages > 0 ? `เก็บไว้แล้ว ${pages} หน้า` : "คำที่โตเป็นต้นไม้ใหญ่ 🌳 จะถูกเก็บไว้ที่นี่";
}

function renderLeeches() {
  const leeches = leechWords(translatedWords(), state.cards, 12);
  $("leech-section").hidden = leeches.length === 0;
  const bugs = currentBugs().size;
  $("bug-box").hidden = bugs === 0;
  $("bug-count").textContent = `🐛 มีแมลงเกาะต้นไม้อยู่ ${bugs} ตัว`;
  $("leech-list").replaceChildren(
    ...leeches.map((word) => {
      const item = el("li");
      const button = el("button", "leech-item");
      button.type = "button";
      button.dataset.headword = word.headword;
      button.append(
        el("strong", "", word.headword),
        el("span", "muted", word.senses[0]?.text || ""),
        el("span", "leech-count", `ลืม ${state.cards[word.headword].lapses} ครั้ง${state.notes[word.headword] ? " 📝" : ""}`),
      );
      item.append(button);
      return item;
    }),
  );
}

// แปลงสวน: ด่านละแปลง คำละต้น ต้นที่ถึงเวลาทวนเหี่ยวจนกว่าจะรดน้ำ
function plantButton(word, today, bugs) {
  const info = plantInfo(state.cards[word.headword], today);
  const bug = bugs.has(word.headword);
  const button = el("button", `plant${info.planted ? "" : " seed"}${info.wilted ? " wilted" : ""}`);
  button.append(treeEl(info.stage.id, { wilted: info.wilted }));
  if (bug) button.append(bugMark());
  button.type = "button";
  button.dataset.headword = word.headword;
  button.title = word.headword;
  button.setAttribute("aria-label", `${word.headword} ${info.stage.label}${info.wilted ? " ต้องรดน้ำ" : ""}${bug ? " มีแมลงเกาะ" : ""}`);
  return button;
}

// ปุ่มสอบปลายแปลงใต้ต้นไม้ของแต่ละแปลง (ปลูกครบทั้งแปลงแล้วจึงเปิดสอบ)
function examBox(level, summary, tier) {
  const box = el("div", "exam-box");
  if (summary.planted > 0) {
    const practice = el("a", "button", "🧠 ฝึกทบทวนแปลงนี้");
    practice.href = `#/study/practice-${level}`;
    box.append(practice, el("span", "muted small", "ฝึกกี่ครั้งก็ไม่เปลี่ยนวันทวน"));
  }
  if (examReady(state.words, state.cards, level)) {
    const link = el("a", "button primary", `📝 สอบปลายแปลง ${EXAM_COUNT} ข้อ`);
    link.href = `#/exam/${level}`;
    box.append(link, el("span", "muted small", tier ? `ดีที่สุดที่เคยได้: ${tier.emoji} ${tier.name}` : "ได้เหรียญเมื่อตอบถูก 12 ข้อขึ้นไป"));
  } else {
    box.append(el("span", "muted small", `📝 ปลูกให้ครบทั้งแปลงก่อนจึงเปิดสอบได้ (ปลูกแล้ว ${summary.planted}/${summary.total})`));
  }
  return box;
}

// แถบสีสัดส่วนระยะของต้นไม้ในแปลง (counts = จำนวนต้นของแต่ละระยะ)
function stageBarOf(counts, total) {
  const bar = el("div", "stagebar");
  STAGES.slice(1).forEach((stage) => {
    if (counts[stage.id] === 0) return;
    const segment = el("span", `seg seg-${stage.id}`);
    segment.style.width = `${(counts[stage.id] / total) * 100}%`;
    bar.append(segment);
  });
  return bar;
}

function stageCountsOf(words) {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage.id, 0]));
  words.forEach((word) => {
    counts[stageOf(state.cards[word.headword]).id] += 1;
  });
  return counts;
}

// จำนวนต้นของแต่ละระยะ เป็นต้นไม้ SVG ตามด้วยตัวเลข (ชื่อระยะซ่อนไว้ให้โปรแกรมอ่านหน้าจออ่าน)
function stageChipsOf(counts) {
  const wrap = el("span", "stage-chips");
  STAGES.slice(1).forEach((stage) => {
    const chip = el("span", "stage-chip");
    chip.append(treeEl(stage.id), el("span", "sr-only", stage.label), String(counts[stage.id]));
    wrap.append(chip);
  });
  return wrap;
}

function renderPlots(today) {
  const translated = translatedWords();
  const { wilted } = plotSummary(translated, state.cards, today);
  $("water-note").textContent = wilted > 0 ? `💧 ${wilted} ต้นรอรดน้ำ (ถึงเวลาทวนแล้ว)` : "🌤️ ต้นไม้ทุกต้นชุ่มชื้นดี วันนี้ไม่ต้องรดน้ำ";
  $("water-go").hidden = wilted === 0;

  // แต่ละแปลงเป็นแผ่นเล็ก ๆ (บอกสรุปและแถบสี) แตะแล้วไปหน้าของแปลงนั้น แปลงอื่นจึงไม่ถูกดัน
  const levels = [...new Set(translated.map((word) => word.level))];
  const folded = [];
  const items = [];
  let fresh = 0;
  levels.forEach((level) => {
    const words = translated.filter((word) => word.level === level);
    const summary = plotSummary(words, state.cards, today);
    const counts = stageCountsOf(words);
    const plot = el("a", "plot");
    plot.href = `#/garden/${level}`;
    plot.dataset.level = level;
    const head = el("div", "plot-head");
    const info = el("div", "level-info");
    const isFresh = summary.planted === 0;
    // แปลงที่ยังไม่เริ่มเหลือแค่เลขแปลง เหมือนหน้าหลัก
    info.append(el("p", "level-title", levelTitle(level)), el("p", "level-sub", isFresh ? "ยังไม่เริ่ม" : `${summary.planted}/${summary.total} คำ${summary.wilted ? ` · 💧 ${summary.wilted}` : ""}`));
    head.append(el("span", "level-badge", level === "sup" ? "★" : String(Number(level))), info);
    if (isFresh) plot.classList.add("plot-fresh");
    else {
      const tier = bestTier(level, storage.loadMedals());
      const stagesLine = el("p", "level-stages");
      stagesLine.append(stageChipsOf(counts), tier ? `  ${tier.emoji}` : "");
      head.append(stageBarOf(counts, words.length), stagesLine);
    }
    plot.append(head);
    if (isFresh && (fresh += 1) > FRESH_VISIBLE) folded.push(plot);
    else items.push(plot);
  });
  if (folded.length > 0) items.push(foldItem(folded.length, "div", $("plots"), () => renderPlots(today)), ...(isFreshOpen() ? folded : []));
  $("plots").replaceChildren(...items);
  applyGardenSearch();
}

// ---------- รู้แล้ว ข้ามเป็นต้นไม้ใหญ่ ----------

// ---------- หน้าของแต่ละแปลง (#/garden/<แปลง>) ----------

// แถวในมุมมองรายการ: ช่องติ๊ก "รู้แล้ว" + ตัวคำและความหมาย แตะที่คำเพื่อดูรายละเอียด
function wordRow(word, today, bugs) {
  const info = plantInfo(state.cards[word.headword], today);
  const bug = bugs.has(word.headword);
  const row = el("li", `word-row${info.wilted ? " wilted" : ""}`);
  if (canSkip(word)) {
    const label = el("label", "word-check");
    const box = el("input");
    box.type = "checkbox";
    box.checked = plotPage.selected.has(word.headword);
    box.setAttribute("aria-label", `รู้คำว่า ${word.headword} แล้ว (เลือกเพื่อข้าม)`);
    box.addEventListener("change", () => {
      if (box.checked) plotPage.selected.add(word.headword);
      else plotPage.selected.delete(word.headword);
      updateSelectBar();
    });
    label.append(box);
    row.append(label);
  } else {
    row.append(el("span", "word-check done", "✓"));
  }
  const main = el("button", "word-row-main");
  main.type = "button";
  main.dataset.headword = word.headword;
  const emoji = el("span", "word-row-emoji");
  emoji.append(treeEl(info.stage.id, { wilted: info.wilted }));
  if (bug) emoji.append(bugMark());
  emoji.setAttribute("aria-hidden", "true");
  const name = el("strong", "", word.headword);
  name.lang = "en";
  main.append(emoji, name, el("span", "word-row-meaning", word.senses[0]?.text || ""));
  main.setAttribute("aria-label", `${word.headword} ${info.stage.label}${info.wilted ? " ต้องรดน้ำ" : ""}${bug ? " มีแมลงเกาะ" : ""}`);
  row.append(main);
  return row;
}

function updateSelectBar() {
  const count = plotPage.selected.size;
  $("plot-select-count").textContent = count > 0 ? `เลือกแล้ว ${count} คำ` : "ติ๊กคำที่รู้อยู่แล้ว";
  $("plot-skip").disabled = count === 0;
  $("plot-select-none").hidden = count === 0;
}

function skipSelected() {
  const words = (plotPage.shown || []).filter((word) => plotPage.selected.has(word.headword) && canSkip(word));
  if (words.length === 0) return;
  if (!confirm(`ข้าม ${words.length} คำที่เลือกให้เป็นต้นไม้ใหญ่เลยใช่ไหม? (คำเหล่านี้จะมาทวนอีกทีในอีก 30 วัน และย้อนกลับไม่ได้)`)) return;
  plotPage.selected.clear();
  skipWordsAsKnown(words);
  toast(`ข้าม ${words.length} คำเป็นต้นไม้ใหญ่แล้ว 🌳`);
}

const plotPage = { level: null, filter: "all", view: "grid", selected: new Set() };

function renderPlotPage(level) {
  if (plotPage.level !== level) Object.assign(plotPage, { level, filter: "all", selected: new Set() });
  const today = dayNumber();
  const translated = translatedWords();
  const levels = [...new Set(translated.map((word) => word.level))];
  const words = translated.filter((word) => word.level === level);
  const summary = plotSummary(words, state.cards, today);
  const counts = stageCountsOf(words);
  const tier = bestTier(level, storage.loadMedals());

  $("plot-title").textContent = levelTitle(level);
  $("plot-sub").replaceChildren(
    `ปลูกแล้ว ${summary.planted}/${summary.total} คำ${summary.wilted ? ` · 💧 ${summary.wilted} ต้นรอรดน้ำ` : ""}  `,
    stageChipsOf(counts),
    tier ? `  ${tier.emoji}` : "",
  );
  $("plot-stagebar").replaceChildren(...stageBarOf(counts, words.length).childNodes);

  // ลูกศรสลับไปแปลงก่อนหน้า/ถัดไป โดยไม่ต้องกลับไปหน้าสวน
  const index = levels.indexOf(level);
  for (const [id, target] of [["plot-prev", levels[index - 1]], ["plot-next", levels[index + 1]]]) {
    $(id).hidden = target === undefined;
    if (target !== undefined) $(id).href = `#/garden/${target}`;
  }

  const filterCounts = plotFilterCounts(words, state.cards, today);
  if (filterCounts[plotPage.filter] === 0) plotPage.filter = "all";
  $("plot-filters").replaceChildren(
    ...PLOT_FILTERS.filter((filter) => filter.id === "all" || filter.id === plotPage.filter || filterCounts[filter.id] > 0).map((filter) => {
      const isStage = STAGES.some((stage) => stage.id === filter.id);
      // ตัวกรองตามระยะใช้ต้นไม้ SVG แทนอีโมจิหน้าป้าย (label ใน garden.js ขึ้นต้นด้วยอีโมจิ 1 ตัวแล้วเว้นวรรค)
      const chip = el("button", "plot-filter", `${isStage ? filter.label.replace(/^\S+\s/, "") : filter.label} ${filterCounts[filter.id]}`);
      if (isStage) chip.prepend(treeEl(filter.id));
      chip.type = "button";
      chip.setAttribute("aria-pressed", String(filter.id === plotPage.filter));
      chip.addEventListener("click", () => {
        plotPage.filter = filter.id;
        plotPage.selected.clear();
        renderPlotPage(level);
      });
      return chip;
    }),
  );
  const shown = words.filter((word) => plantMatchesFilter(state.cards[word.headword], today, plotPage.filter));
  const list = plotPage.view === "list";
  for (const [id, view] of [["plot-view-grid", "grid"], ["plot-view-list", "list"]]) $(id).setAttribute("aria-pressed", String(plotPage.view === view));
  $("plot-grid").hidden = list;
  $("plot-list").hidden = !list;
  const bugs = currentBugs();
  $("plot-grid").replaceChildren(...(list ? [] : shown.map((word) => plantButton(word, today, bugs))));
  $("plot-list").replaceChildren(...(list ? shown.map((word) => wordRow(word, today, bugs)) : []));
  $("plot-select-bar").hidden = !list || !shown.some(canSkip);
  plotPage.shown = shown;
  updateSelectBar();
  $("plot-empty").hidden = shown.length > 0;
  $("plot-exam").replaceChildren(examBox(level, summary, tier));
}

// ช่องค้นหา: พิมพ์แล้วแสดงรายการคำที่ตรงแทนแปลง (ไม่ต้องไล่หาในตาราง)
function applyGardenSearch() {
  const query = $("garden-search").value.trim();
  const today = dayNumber();
  const matches = query ? translatedWords().filter((word) => matchesQuery(word, query)) : [];
  $("plots").hidden = Boolean(query);
  $("garden-matches").hidden = !query;
  $("garden-matches").replaceChildren(
    ...matches.slice(0, 40).map((word) => {
      const info = plantInfo(state.cards[word.headword], today);
      const item = el("li");
      const button = el("button", `match-item${info.wilted ? " wilted" : ""}`);
      button.type = "button";
      button.dataset.headword = word.headword;
      const matchIcon = el("span", "match-emoji");
      matchIcon.append(treeEl(info.stage.id, { wilted: info.wilted }));
      matchIcon.setAttribute("aria-hidden", "true");
      button.append(matchIcon, el("strong", "", word.headword), el("span", "muted", word.senses[0]?.text || ""));
      item.append(button);
      return item;
    }),
  );
  $("garden-found").textContent = query ? (matches.length > 40 ? `พบ ${matches.length} คำ (แสดง 40 คำแรก)` : `พบ ${matches.length} คำ`) : "";
}

// เปิดหน้าสวน (#/garden) หรือหน้าของแปลง (#/garden/<แปลง>)
function startGarden(level) {
  if (level && translatedWords().some((word) => word.level === level)) {
    renderPlotPage(level);
    show("plot");
    return;
  }
  renderGarden();
  show("garden");
  const scroll = takeGardenScroll(); // กลับจากหน้าแปลง ให้เลื่อนกลับไปตำแหน่งเดิม
  if (scroll !== null) window.scrollTo(0, scroll);
}

// ข้อมูลเปลี่ยนจากที่อื่น (ข้ามคำที่รู้แล้วในหน้าต่างรายละเอียดคำ): วาดหน้าที่เปิดอยู่ใหม่
export function redraw() {
  if (!$("view-plot").hidden) renderPlotPage(plotPage.level);
  if (!$("view-garden").hidden) renderGarden();
}

export { renderLeeches };

export function bind(ctx) {
  ({ $, canSkip, el, foldItem, FRESH_VISIBLE, isFreshOpen, openWordDialog, refreshHabit, renderMedals, show, skipWordsAsKnown, state, storage, takeGardenScroll, toast, translatedWords } = ctx);
  $("garden-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-garden-tab]");
    if (!button) return;
    gardenTab = button.dataset.gardenTab;
    applyGardenTab();
    const page = $("view-garden");
    page.classList.remove("view-enter");
    void page.offsetWidth;
    page.classList.add("view-enter");
    window.scrollTo(0, 0);
  });
  WIDE_LAYOUT.addEventListener("change", applyGardenTab);
  // สลับไปแปลงก่อนหน้า/ถัดไปโดยแทนที่หน้าเดิมในประวัติ ปุ่มย้อนกลับจะกลับไปหน้าสวนทีเดียว ไม่ต้องไล่กลับทีละแปลง
  for (const id of ["plot-prev", "plot-next"]) {
    $(id).addEventListener("click", (event) => {
      event.preventDefault();
      location.replace($(id).href);
    });
  }
  for (const [id, view] of [["plot-view-grid", "grid"], ["plot-view-list", "list"]]) {
    $(id).addEventListener("click", () => {
      plotPage.view = view;
      plotPage.selected.clear();
      renderPlotPage(plotPage.level);
    });
  }
  $("plot-select-all").addEventListener("click", () => {
    (plotPage.shown || []).filter(canSkip).forEach((word) => plotPage.selected.add(word.headword));
    $("plot-list").querySelectorAll(".word-check input").forEach((box) => {
      box.checked = true;
    });
    updateSelectBar();
  });
  $("plot-select-none").addEventListener("click", () => {
    plotPage.selected.clear();
    $("plot-list").querySelectorAll(".word-check input").forEach((box) => {
      box.checked = false;
    });
    updateSelectBar();
  });
  $("plot-skip").addEventListener("click", skipSelected);
  $("plot-list").addEventListener("click", (event) => {
    const button = event.target.closest(".word-row-main");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
  $("plot-grid").addEventListener("click", (event) => {
    const button = event.target.closest(".plant");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
  $("garden-search").addEventListener("input", applyGardenSearch);
  $("garden-matches").addEventListener("click", (event) => {
    const button = event.target.closest(".match-item");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
  $("leech-list").addEventListener("click", (event) => {
    const button = event.target.closest(".leech-item");
    if (button) openWordDialog(state.words.find((entry) => entry.headword === button.dataset.headword));
  });
}

export { startGarden as start };
