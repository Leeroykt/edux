/**
 * English variants.
 *
 * eduX lets each writer choose British (en-GB) or American (en-US) English.
 * This module finds and converts spelling that belongs to the other variant.
 *
 * Only unambiguous pairs are included. Words whose spelling depends on the
 * meaning (practise/practice, licence/license, meter/metre as an instrument,
 * programme/program in computing) are never changed automatically.
 */

export type Dialect = "en-GB" | "en-US";

export const DIALECTS: { id: Dialect; label: string; short: string; example: string }[] = [
  { id: "en-GB", label: "British English", short: "UK", example: "colour, organise, centre" },
  { id: "en-US", label: "American English", short: "US", example: "color, organize, center" },
];

export function dialectLabel(d: Dialect): string {
  return d === "en-GB" ? "British English" : "American English";
}

/** Regions that normally write British English. Everything else defaults to American. */
const BRITISH_REGIONS = /^(en-(GB|IE|AU|NZ|ZA|ZW|IN|KE|NG|GH|UG|TZ|ZM|BW|MW|NA|SG|HK|MY|PK|JM|TT))/i;

export function guessDialect(locale?: string): Dialect {
  const l = locale || (typeof navigator !== "undefined" ? navigator.language : "en-GB");
  if (/^en-US/i.test(l)) return "en-US";
  if (BRITISH_REGIONS.test(l)) return "en-GB";
  return "en-GB";
}

/* ------------------------------------------------------------------ */
/* Word tables                                                         */
/* ------------------------------------------------------------------ */

type Pair = { gb: string; us: string; toUsOnly?: boolean };

const pairs: Pair[] = [];
const add = (gb: string, us: string, toUsOnly = false) => pairs.push({ gb, us, toUsOnly });

// -our / -or
const OUR = [
  "colour", "behaviour", "favour", "honour", "labour", "neighbour", "harbour", "humour",
  "rumour", "flavour", "vapour", "odour", "endeavour", "armour", "candour", "clamour",
  "fervour", "rigour", "saviour", "splendour", "tumour", "valour", "vigour", "parlour",
  "savour", "demeanour", "ardour", "arbour", "tumour", "behaviour",
];
const OUR_SUFFIXES = ["", "s", "ed", "ing", "ful", "less", "able", "ably", "ite", "ites", "al", "ally", "ist", "ists", "er", "ers", "hood", "hoods"];
for (const stem of new Set(OUR)) {
  const us = stem.replace(/our$/, "or");
  for (const suf of OUR_SUFFIXES) add(stem + suf, us + suf);
}

// -ise / -ize
const ISE = [
  "organ", "real", "recogn", "summar", "emphas", "minim", "maxim", "util", "optim", "categor",
  "general", "standard", "normal", "character", "priorit", "special", "visual", "final", "formal",
  "synthes", "hypothes", "critic", "apolog", "author", "central", "custom", "digit", "harmon",
  "initial", "memor", "mobil", "modern", "neutral", "penal", "random", "revolution", "stabil",
  "sensit", "civil", "capital", "commercial", "familiar", "global", "industrial", "legal", "local",
  "material", "moral", "national", "personal", "polar", "popular", "private", "rational", "social",
  "symbol", "synchron", "systemat", "theor", "trivial", "equal", "fertil", "liber", "scrutin",
  "sympath", "union", "urban", "verbal", "vocal", "conceptual", "contextual", "pasteur", "patron",
  "itemi", "jeopard", "colon", "crystall", "fantas", "hospital", "idol", "legitim", "mesmer",
  "monopol", "pioneer", "sanit", "satir", "subsidi", "tranquil", "vandal",
  "homogen", "operational", "institutional", "international", "monet", "democrat", "marginal",
  "stigmat", "traumat", "desensit", "destabil", "reorgan", "decentral", "epitom", "galvan",
  "human", "immun", "individual", "magnet", "mineral", "natural", "plagiar", "pressur", "public",
  "revital", "scandal", "secular", "spiritual", "vapor", "victim", "virtual", "vital", "metabol",
  "contextual", "operationali", "conceptuali", "ration", "emphasi", "factor", "gener", "fertil",
  "sterili", "harmoni", "bureaucrat", "ideolog", "tokeni", "cyclic", "hierarch", "rhythm",
];
const ISE_SUFFIX: [string, string][] = [
  ["ise", "ize"], ["ised", "ized"], ["ises", "izes"], ["ising", "izing"],
  ["isation", "ization"], ["isations", "izations"], ["iser", "izer"], ["isers", "izers"],
];
for (const stem of new Set(ISE)) {
  // Entries that already end in a vowel-i or "is" are not stems of this shape.
  if (/is$|i$/.test(stem)) continue;
  for (const [gb, us] of ISE_SUFFIX) add(stem + gb, stem + us);
}
for (const stem of ["analy", "paraly", "cataly", "hydroly", "dialy"]) {
  add(`${stem}se`, `${stem}ze`);
  add(`${stem}sed`, `${stem}zed`);
  add(`${stem}sing`, `${stem}zing`);
  add(`${stem}ser`, `${stem}zer`);
  // "analyses" is also the plural of "analysis" in both variants, so it is left alone.
}

// -re / -er  (metre/meter and programme/program are one-way only)
for (const [gb, us] of [
  ["centre", "center"], ["centres", "centers"], ["centred", "centered"], ["centring", "centering"],
  ["theatre", "theater"], ["theatres", "theaters"], ["fibre", "fiber"], ["fibres", "fibers"],
  ["litre", "liter"], ["litres", "liters"], ["calibre", "caliber"], ["manoeuvre", "maneuver"],
  ["manoeuvres", "maneuvers"], ["manoeuvred", "maneuvered"], ["manoeuvring", "maneuvering"],
  ["sombre", "somber"],
] as const) add(gb, us);
for (const [gb, us] of [["metre", "meter"], ["metres", "meters"], ["kilometre", "kilometer"], ["kilometres", "kilometers"], ["millimetre", "millimeter"], ["millimetres", "millimeters"], ["centimetre", "centimeter"], ["centimetres", "centimeters"]] as const) add(gb, us, true);
add("programme", "program", true);
add("programmes", "programs", true);

// -ence / -ense, -ogue / -og, and other fixed pairs
const FIXED: [string, string][] = [
  ["defence", "defense"], ["offence", "offense"], ["pretence", "pretense"],
  ["catalogue", "catalog"], ["catalogues", "catalogs"], ["catalogued", "cataloged"], ["analogue", "analog"],
  ["plough", "plow"], ["ploughs", "plows"], ["aluminium", "aluminum"],
  ["sceptic", "skeptic"], ["sceptics", "skeptics"], ["sceptical", "skeptical"], ["scepticism", "skepticism"],
  ["ageing", "aging"], ["grey", "gray"], ["greys", "grays"], ["greyer", "grayer"],
  ["learnt", "learned"], ["spelt", "spelled"], ["burnt", "burned"], ["dreamt", "dreamed"],
  ["whilst", "while"], ["amongst", "among"], ["towards", "toward"], ["artefact", "artifact"], ["artefacts", "artifacts"],
  ["travelling", "traveling"], ["travelled", "traveled"], ["traveller", "traveler"], ["travellers", "travelers"],
  ["modelling", "modeling"], ["modelled", "modeled"], ["labelling", "labeling"], ["labelled", "labeled"],
  ["cancelled", "canceled"], ["cancelling", "canceling"], ["fuelled", "fueled"], ["fuelling", "fueling"],
  ["signalling", "signaling"], ["signalled", "signaled"], ["channelled", "channeled"], ["channelling", "channeling"],
  ["counsellor", "counselor"], ["counsellors", "counselors"], ["counselling", "counseling"],
  ["levelled", "leveled"], ["levelling", "leveling"], ["totalled", "totaled"], ["totalling", "totaling"],
  ["fulfil", "fulfill"], ["fulfils", "fulfills"], ["fulfilment", "fulfillment"],
  ["enrol", "enroll"], ["enrols", "enrolls"], ["enrolment", "enrollment"], ["enrolments", "enrollments"],
  ["skilful", "skillful"], ["skilfully", "skillfully"], ["wilful", "willful"], ["instalment", "installment"], ["instalments", "installments"],
  ["distil", "distill"], ["appal", "appall"], ["mould", "mold"], ["moulds", "molds"], ["smoulder", "smolder"],
  ["oestrogen", "estrogen"], ["anaesthetic", "anesthetic"], ["anaesthesia", "anesthesia"], ["anaemia", "anemia"], ["anaemic", "anemic"],
  ["paediatric", "pediatric"], ["orthopaedic", "orthopedic"], ["haemoglobin", "hemoglobin"], ["leukaemia", "leukemia"],
  ["foetus", "fetus"], ["foetal", "fetal"], ["diarrhoea", "diarrhea"], ["oesophagus", "esophagus"], ["encyclopaedia", "encyclopedia"],
  ["sulphur", "sulfur"], ["sulphate", "sulfate"], ["gaol", "jail"], ["pyjamas", "pajamas"], ["maths", "math"],
  ["cosy", "cozy"], ["yoghurt", "yogurt"], ["jewellery", "jewelry"], ["storey", "story"],
];
// The American form of these is ordinary British English too, so it is never flagged when writing in British.
const SHARED_US_FORM = new Set(["storey", "maths", "whilst", "amongst", "towards", "learnt", "spelt", "burnt", "dreamt"]);
for (const [gb, us] of FIXED) add(gb, us, SHARED_US_FORM.has(gb));

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

function buildDirection(to: Dialect) {
  const map = new Map<string, string>();
  for (const p of pairs) {
    if (to === "en-US") map.set(p.gb, p.us);
    else if (!p.toUsOnly) map.set(p.us, p.gb);
  }
  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
  return { map, pattern };
}

const cache: Partial<Record<Dialect, ReturnType<typeof buildDirection>>> = {};
const direction = (to: Dialect) => (cache[to] ??= buildDirection(to));

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase() && source.length > 1) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

export interface SpellingChange {
  from: string;
  to: string;
  index: number;
}

/** Words in `text` that are spelt for the other variant, with the spelling for `target`. */
export function findSpellingIssues(text: string, target: Dialect): SpellingChange[] {
  const { map, pattern } = direction(target);
  const out: SpellingChange[] = [];
  pattern.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text))) {
    const to = map.get(m[1].toLowerCase());
    if (to) out.push({ from: m[1], to: matchCase(m[1], to), index: m.index });
  }
  return out;
}

/** Rewrites `text` into the target variant. */
export function convertSpelling(text: string, target: Dialect): { text: string; changes: SpellingChange[] } {
  const changes = findSpellingIssues(text, target);
  if (changes.length === 0) return { text, changes };
  const { map, pattern } = direction(target);
  pattern.lastIndex = 0;
  const converted = text.replace(pattern, (word) => {
    const to = map.get(word.toLowerCase());
    return to ? matchCase(word, to) : word;
  });
  return { text: converted, changes };
}

export interface DialectReading {
  /** The variant most of the spellings belong to, or null when it is too close or too thin to call. */
  dialect: Dialect | null;
  /** Count of words spelt the British way and the American way. Words spelt the same in both are not counted. */
  gb: number;
  us: number;
}

/** Reads which English a piece of writing is in from the spellings that differ between the two. */
export function detectDialect(text: string): DialectReading {
  const count = (target: Dialect) => {
    const { pattern } = direction(target);
    pattern.lastIndex = 0;
    return (text.match(pattern) ?? []).length;
  };
  // Words that must change to reach American are British, and the other way round.
  const gb = count("en-US");
  const us = count("en-GB");
  const total = gb + us;
  if (total < 3) return { dialect: null, gb, us };
  if (gb / total >= 0.7) return { dialect: "en-GB", gb, us };
  if (us / total >= 0.7) return { dialect: "en-US", gb, us };
  return { dialect: null, gb, us };
}
