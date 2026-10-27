// อธิบายรูปคำ (คอลัมน์ forms ของ NGSL) ที่ด้านหลังการ์ด เช่น required = อดีต, requiring = รูป -ing (ตรรกะล้วน ไม่แตะหน้าเว็บ)
// ไม่แก้ค่าในคอลัมน์ forms เลย แค่เพิ่มคำอธิบายตอนแสดง รูปที่ไม่แน่ใจจะแสดงโดยไม่ใส่คำอธิบาย ดีกว่าอธิบายผิด
// ตารางกริยาไม่ปกติด้านล่างเขียนเองจากความรู้ภาษาอังกฤษทั่วไป

const PAST = "อดีต (V2)";
const PARTICIPLE = "past participle (V3)";
const BOTH = "อดีต / past participle (V2, V3)";
const THIRD = "-s (he/she/it)";
const ING = "รูป -ing";

// กริยาไม่ปกติ: [รูปอดีต, รูป past participle] ใส่หลายรูปคั่นด้วย / ถ้าอดีตกับ past participle เป็นรูปเดียวกันให้เขียนสองช่องซ้ำกัน
const IRREGULAR = {
  do: ["did", "done"], say: ["said", "said"], go: ["went", "gone"], know: ["knew", "known"], get: ["got", "got/gotten"],
  think: ["thought", "thought"], make: ["made", "made"], see: ["saw", "seen"], take: ["took", "taken"], come: ["came", "come"],
  give: ["gave", "given"], find: ["found", "found"], mean: ["meant", "meant"], tell: ["told", "told"], feel: ["felt", "felt"],
  write: ["wrote", "written"], meet: ["met", "met"], become: ["became", "become"], keep: ["kept", "kept"], hear: ["heard", "heard"],
  begin: ["began", "begun"], run: ["ran", "run"], bring: ["brought", "brought"], pay: ["paid", "paid"], build: ["built", "built"],
  hold: ["held", "held"], buy: ["bought", "bought"], understand: ["understood", "understood"], spend: ["spent", "spent"],
  speak: ["spoke", "spoken"], lose: ["lost", "lost"], stand: ["stood", "stood"], fall: ["fell", "fallen"], deal: ["dealt", "dealt"],
  send: ["sent", "sent"], grow: ["grew", "grown"], sit: ["sat", "sat"], break: ["broke", "broken"], win: ["won", "won"],
  drive: ["drove", "driven"], sell: ["sold", "sold"], choose: ["chose", "chosen"], bear: ["bore", "borne/born"], rise: ["rose", "risen"],
  eat: ["ate", "eaten"], draw: ["drew", "drawn"], wear: ["wore", "worn"], teach: ["taught", "taught"], fight: ["fought", "fought"],
  forget: ["forgot", "forgotten"], drink: ["drank", "drunk"], catch: ["caught", "caught"], strike: ["struck", "struck"],
  seek: ["sought", "sought"], sleep: ["slept", "slept"], throw: ["threw", "thrown"], sing: ["sang", "sung"], fly: ["flew", "flown"],
  stick: ["stuck", "stuck"], beat: ["beat", "beaten"], ride: ["rode", "ridden"], lay: ["laid", "laid"], mistake: ["mistook", "mistaken"],
  hide: ["hid", "hidden"], spring: ["sprang", "sprung"], blow: ["blew", "blown"], swim: ["swam", "swum"], tear: ["tore", "torn"],
  shake: ["shook", "shaken"], arise: ["arose", "arisen"], steal: ["stole", "stolen"], freeze: ["froze", "frozen"], slide: ["slid", "slid"],
  swing: ["swung", "swung"], undertake: ["undertook", "undertaken"], string: ["strung", "strung"], sink: ["sank", "sunk"],
  underlie: ["underlay", "underlain"], sweep: ["swept", "swept"], withdraw: ["withdrew", "withdrawn"], bid: ["bade/bid", "bid/bidden"],
  overcome: ["overcame", "overcome"], lend: ["lent", "lent"], spin: ["spun", "spun"], dig: ["dug", "dug"], undergo: ["underwent", "undergone"],
  bite: ["bit", "bitten"], swear: ["swore", "sworn"], lead: ["led", "led"], leave: ["left", "left"], shoot: ["shot", "shot"],
  light: ["lit", "lit"], hang: ["hung", "hung"], lie: ["lay", "lain"], shine: ["shone", "shone"], rid: ["rid", "rid"],
  ring: ["rang", "rung"], wind: ["wound", "wound"], wake: ["woke", "woken"], bend: ["bent", "bent"],
};

// กริยาที่รูปอดีตและ past participle เหมือนรูปหลัก (put, cut, hit ฯลฯ) ไม่มีรูปแยกให้อธิบาย จึงไม่ต้องอยู่ในตาราง

const BE = {
  am: "รูปปัจจุบัน (กับ I)", is: "รูปปัจจุบัน (กับ he/she/it)", are: "รูปปัจจุบัน (กับ you/we/they)",
  was: "อดีต (กับ I/he/she/it)", were: "อดีต (กับ you/we/they)", been: PARTICIPLE, being: ING, beings: "พหูพจน์ (คำนาม being = สิ่งมีชีวิต)",
};
const SHORT_LABEL = "ส่วนของรูปย่อ (เช่น I'm, it's, we're)";
const NEGATIVE_LABEL = "ส่วนของรูปย่อ (เช่น isn't, don't)";
const OBJECT = "รูปกรรม";
const OWNER = "แสดงความเป็นเจ้าของ (ใช้นำหน้านาม)";
const OWNER_ALONE = "แสดงความเป็นเจ้าของ (ใช้แทนนามได้เลย)";
const BRITISH = "สะกดแบบอังกฤษ (British)";
const IRREGULAR_PLURAL = "พหูพจน์ (ไม่ปกติ)";
const BRITISH_BOTH = "อดีต / past participle (แบบอังกฤษ)";
// รูปพิเศษที่กฎทั่วไปอธิบายไม่ได้ ผูกกับคำหลักแต่ละคำ
const SPECIAL = {
  be: BE,
  not: { t: NEGATIVE_LABEL },
  have: { has: THIRD, had: BOTH, having: ING },
  do: { does: THIRD, doing: ING },
  i: { me: OBJECT, my: OWNER, mine: OWNER_ALONE },
  you: { your: OWNER, yours: OWNER_ALONE },
  he: { him: OBJECT, his: "แสดงความเป็นเจ้าของ" },
  she: { her: `${OBJECT} / แสดงความเป็นเจ้าของ`, hers: OWNER_ALONE },
  it: { its: OWNER },
  we: { us: OBJECT, our: OWNER, ours: OWNER_ALONE },
  they: { them: OBJECT, their: OWNER, theirs: OWNER_ALONE },
  who: { whom: OBJECT, whose: "แสดงความเป็นเจ้าของ" },
  this: { these: "พหูพจน์ (these)" },
  that: { those: "พหูพจน์ (those)" },
  child: { children: IRREGULAR_PLURAL },
  man: { men: IRREGULAR_PLURAL },
  woman: { women: IRREGULAR_PLURAL },
  foot: { feet: IRREGULAR_PLURAL },
  wife: { wives: IRREGULAR_PLURAL },
  half: { halves: IRREGULAR_PLURAL },
  analysis: { analyses: IRREGULAR_PLURAL },
  bad: { worse: "เปรียบเทียบ (ไม่ปกติ)", worst: "ขั้นสูงสุด (ไม่ปกติ)" },
  show: { shown: PARTICIPLE },
  prove: { proven: PARTICIPLE },
  learn: { learnt: "อดีต / past participle (แบบอังกฤษ)" },
  program: { programme: BRITISH, programmes: BRITISH },
  center: { centre: BRITISH, centres: BRITISH },
  color: { colour: BRITISH, colours: BRITISH },
  behavior: { behaviour: BRITISH, behaviours: BRITISH },
  organization: { organisation: BRITISH, organisations: BRITISH },
  practice: { practise: BRITISH, practises: BRITISH },
  realize: { realise: BRITISH, realises: BRITISH },
  recognize: { recognise: BRITISH, recognises: BRITISH },
  analyze: { analyse: BRITISH, analyses: `${THIRD} (แบบอังกฤษ)` },
  fulfill: { fulfil: BRITISH, fulfils: BRITISH },
  license: { licence: BRITISH, licences: BRITISH },
  index: { indices: IRREGULAR_PLURAL },
  okay: { ok: "ตัวย่อ (OK)", okays: "พหูพจน์ / -s" },
  burn: { burnt: BRITISH_BOTH },
  dream: { dreamt: BRITISH_BOTH },
  spell: { spelt: BRITISH_BOTH },
  lean: { leant: BRITISH_BOTH },
  leap: { leapt: BRITISH_BOTH },
};

// ส่วนของรูปย่อที่ NGSL แตกเป็นคำ เช่น I'm → m, isn't → isn, t
const SHORT_FORMS = new Set(["m", "s", "re", "ve", "d", "ll", "t"]);
const NEGATIVE_STEMS = new Set(["isn", "aren", "ain", "wasn", "weren", "haven", "hasn", "hadn", "don", "doesn", "didn", "couldn", "wouldn", "shouldn", "won", "can", "mustn"]);
const INFORMAL = { wanna: "ภาษาพูด (want to)", gonna: "ภาษาพูด (going to)", gotta: "ภาษาพูด (got to)", hafta: "ภาษาพูด (have to)", lemme: "ภาษาพูด (let me)", doin: "ภาษาพูด (doing)", gettin: "ภาษาพูด (getting)", goin: "ภาษาพูด (going)", bein: "ภาษาพูด (being)", cometh: "ภาษาโบราณ (comes)" };

const hasPos = (word, ...ids) => word.senses.some((sense) => ids.includes(sense.pos));
const pluralOf = (head) => [`${head}s`, `${head}es`, ...(head.endsWith("y") ? [`${head.slice(0, -1)}ies`] : [])];

// คำอธิบายของรูปหนึ่งรูป (ไม่แน่ใจ = null)
export function labelForm(word, form) {
  const head = word.headword.toLowerCase();
  const text = form.toLowerCase();
  const special = SPECIAL[head];
  if (special?.[text]) return special[text];
  if (SHORT_FORMS.has(text) && hasPos(word, "aux", "v", "pron", "modal")) return SHORT_LABEL;
  if (NEGATIVE_STEMS.has(text) && hasPos(word, "aux", "v", "modal")) return NEGATIVE_LABEL;
  if (INFORMAL[text]) return INFORMAL[text];

  const irregular = IRREGULAR[head];
  if (irregular && hasPos(word, "v")) {
    const [past, participle] = irregular.map((value) => value.split("/"));
    const isPast = past.includes(text);
    const isParticiple = participle.includes(text);
    if (isPast && isParticiple) return BOTH;
    if (isPast) return PAST;
    if (isParticiple) return PARTICIPLE;
  }

  if (pluralOf(head).includes(text)) {
    if (hasPos(word, "v") && hasPos(word, "n")) return `พหูพจน์ / ${THIRD}`;
    if (hasPos(word, "v")) return THIRD;
    if (hasPos(word, "n")) return "พหูพจน์";
    return null;
  }
  if (text.endsWith("ings") && hasPos(word, "n")) return "พหูพจน์ (คำนาม -ing)";
  if (text.endsWith("ing") && hasPos(word, "v")) return ING;
  if (text.endsWith("ed") && hasPos(word, "v") && !irregular) return BOTH;
  // สะกดแบบอังกฤษตามกฎทั่วไป: -ize → -ise, -or → -our
  if (head.endsWith("ize") && (text === `${head.slice(0, -3)}ise` || text === `${head.slice(0, -3)}ises`)) return BRITISH;
  if (head.endsWith("or") && (text === `${head.slice(0, -2)}our` || text === `${head.slice(0, -2)}ours`)) return BRITISH;
  if (text.endsWith("est") && hasPos(word, "adj", "adv")) return "ขั้นสูงสุด (-est)";
  if (text.endsWith("er") && hasPos(word, "adj", "adv")) return "เปรียบเทียบ (-er)";
  return null;
}

// รูปคำทั้งหมดของคำนั้นพร้อมคำอธิบาย [{ form, label }] (label = null ถ้าไม่แน่ใจ)
export const describeForms = (word) => word.forms.map((form) => ({ form, label: labelForm(word, form) }));
