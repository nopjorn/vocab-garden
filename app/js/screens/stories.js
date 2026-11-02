// อ่านเรื่องสั้น 📖: โหลดเมื่อเปิดหน้านี้เท่านั้น (main.js เรียกผ่าน import() ตอนเข้าเส้นทาง #/stories และ #/stories/<รหัส>)
import { formIndex, readinessText, sortStories, splitStory, storyQuestions, storyReadiness, storyResult } from "../stories.js";
import { dayNumber } from "../srs.js";
import { launchConfetti } from "../confetti.js";

let $, el, show, toast, fx, state, storage, speakWord, openWordDialog, checkMedals;
let stories = null;
let reading = null; // { story, questions, answers: [] }

async function loadStories() {
  if (stories) return stories;
  const response = await fetch("data/stories.json");
  if (!response.ok) throw new Error(`โหลดเรื่องสั้นไม่สำเร็จ (${response.status})`);
  stories = (await response.json()).stories;
  return stories;
}

const wordMap = () => new Map(state.words.map((word) => [word.headword, word]));

function renderList() {
  const read = storage.loadGarden().storiesRead;
  const sorted = sortStories(stories, state.cards, read);
  $("stories-count").textContent = `อ่านแล้ว ${stories.filter((story) => story.id in read).length}/${stories.length} เรื่อง`;
  $("stories-list").replaceChildren(
    ...sorted.map((story) => {
      const item = el("li");
      const link = el("a", "story-card");
      link.href = `#/stories/${story.id}`;
      const info = el("span", "story-info");
      const title = el("strong", "", story.title_en);
      title.lang = "en";
      info.append(title, el("span", "", `${story.title_th} · ${story.level}`), el("span", "muted small", `${story.id in read ? "✅ อ่านแล้ว · " : ""}${readinessText(storyReadiness(story, state.cards))}`));
      const emoji = el("span", "story-emoji", story.emoji || "📖");
      emoji.setAttribute("aria-hidden", "true");
      link.append(emoji, info, el("span", "", "›"));
      item.append(link);
      return item;
    }),
  );
  show("stories");
}

function paragraphEl(paragraph, index, words) {
  const box = el("div", "story-para");
  const english = el("p");
  english.lang = "en";
  for (const part of splitStory(paragraph.en, index)) {
    if (!part.headword) {
      english.append(part.text);
      continue;
    }
    const button = el("button", `story-word${state.cards[part.headword] ? " planted" : ""}`, part.text);
    button.type = "button";
    button.dataset.headword = part.headword;
    button.setAttribute("aria-label", `${part.text} ดูความหมาย${state.cards[part.headword] ? " (ปลูกแล้ว)" : ""}`);
    english.append(button);
  }
  const thai = el("p", "story-th", paragraph.th);
  thai.hidden = true;
  const tools = el("div", "story-tools");
  const speakButton = el("button", "", "🔊 ฟัง");
  speakButton.type = "button";
  speakButton.addEventListener("click", () => speakWord(paragraph.en));
  const thaiButton = el("button", "", "แสดงคำแปล");
  thaiButton.type = "button";
  thaiButton.setAttribute("aria-expanded", "false");
  thaiButton.addEventListener("click", () => {
    thai.hidden = !thai.hidden;
    thaiButton.textContent = thai.hidden ? "แสดงคำแปล" : "ซ่อนคำแปล";
    thaiButton.setAttribute("aria-expanded", String(!thai.hidden));
  });
  tools.append(speakButton, thaiButton);
  box.append(english, thai, tools);
  return box;
}

function renderStory(story) {
  const words = wordMap();
  const index = formIndex(story, words);
  reading = { story, questions: storyQuestions(story), answers: [] };
  $("story-heading").textContent = `${story.emoji || "📖"} เรื่องสั้น`;
  $("story-level").textContent = story.level;
  $("story-title").textContent = story.title_en;
  $("story-title-th").textContent = `${story.title_th} · ${readinessText(storyReadiness(story, state.cards))}`;
  $("story-body").replaceChildren(...story.paragraphs.map((paragraph) => paragraphEl(paragraph, index, words)));
  $("story-result").hidden = true;
  $("story-questions").replaceChildren(
    ...reading.questions.map((question, number) => {
      const item = el("li");
      const list = el("ul", "quiz-options");
      list.append(
        ...question.options.map((option, position) => {
          const li = el("li");
          const button = el("button", "quiz-option", option);
          button.type = "button";
          button.dataset.question = number;
          button.dataset.index = position;
          li.append(button);
          return li;
        }),
      );
      item.append(el("strong", "", question.q), list);
      return item;
    }),
  );
  show("story");
}

function answer(number, index) {
  if (!reading || reading.answers[number] !== undefined) return;
  const question = reading.questions[number];
  const right = index === question.answerIndex;
  reading.answers[number] = right;
  $("story-questions").querySelectorAll(`[data-question="${number}"]`).forEach((button, position) => {
    button.disabled = true;
    if (position === question.answerIndex) button.classList.add("correct");
    else if (position === index) button.classList.add("wrong");
  });
  if (right) fx("correct");
  const done = reading.answers.filter((value) => value !== undefined).length;
  if (done < reading.questions.length) return;
  const score = reading.answers.filter(Boolean).length;
  const first = storage.markStoryRead(reading.story.id, dayNumber());
  storage.addGamePlay(dayNumber());
  checkMedals();
  $("story-result").textContent = `${storyResult(score, reading.questions.length)}${first ? " · บันทึกว่าอ่านเรื่องนี้จบแล้ว ✅" : ""}`;
  $("story-result").hidden = false;
  if (score === reading.questions.length) launchConfetti(24);
  fx("finish");
}

async function openStories(argument) {
  try {
    await loadStories();
  } catch {
    toast("โหลดเรื่องสั้นไม่สำเร็จ ลองใหม่อีกครั้งนะ");
    location.hash = "#/play";
    return;
  }
  if (!argument) return renderList();
  const story = stories.find((item) => item.id === argument);
  if (!story) {
    location.hash = "#/stories";
    return;
  }
  renderStory(story);
}

export function bind(ctx) {
  ({ $, el, show, toast, fx, state, storage, speakWord, openWordDialog, checkMedals } = ctx);
  $("story-body").addEventListener("click", (event) => {
    const button = event.target.closest(".story-word");
    const word = button && state.words.find((item) => item.headword === button.dataset.headword);
    if (word) openWordDialog(word);
  });
  $("story-questions").addEventListener("click", (event) => {
    const button = event.target.closest(".quiz-option");
    if (button) answer(Number(button.dataset.question), Number(button.dataset.index));
  });
}

export { openStories as start };
