/**
 * Character formatting for a sentence: bold, italic, underline, strike, super and subscript,
 * text colour, highlight, font and size.
 *
 * A sentence keeps its wording in `text` and its look in `formattedHtml`. This file reads that HTML
 * into runs of text that share one look, changes the look of part of the text, and writes it back as
 * HTML that only ever contains the few tags and styles allowed here.
 */
import { escapeHtml } from "./editing";

export interface Fmt {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  sup?: boolean;
  sub?: boolean;
  color?: string;
  bg?: string;
  font?: string;
  /** Size in points. */
  size?: number;
  /** ALL CAPS and SMALL CAPS, as Word draws them. */
  caps?: boolean;
  sc?: boolean;
  /** A tab character (laid out to the paragraph's tab stops) and a line break. */
  tab?: boolean;
  br?: boolean;
  /** A footnote reference: the id of the footnote in the Word file. */
  fn?: string;
}

const SANS = /\b(arial|calibri|helvetica|verdana|tahoma|segoe|trebuchet|century gothic|franklin|gill sans|lato|roboto|open sans|aptos|candara|corbel|lucida sans)\b/i;
const MONO = /\b(courier|consolas|mono|lucida console)\b/i;

/** A font name as a CSS stack with a sensible fallback, so a missing font still looks like its kind. */
export function fontStack(font: string): string {
  const clean = font.replace(/['"\\;{}<>]/g, "").trim();
  const generic = MONO.test(clean) ? "monospace" : SANS.test(clean) ? "sans-serif" : "serif";
  const alias = /^calibri$/i.test(clean) ? ", Carlito" : /^cambria$/i.test(clean) ? ", Caladea" : "";
  return `'${clean}'${alias}, ${generic}`;
}

const SAFE_FONT = /^[A-Za-z0-9 ._-]{1,64}$/;

export interface Run {
  text: string;
  f: Fmt;
}

export type FormatOp =
  | { type: "toggle"; key: "b" | "i" | "u" | "s" | "sup" | "sub"; on?: boolean }
  | { type: "set"; key: "color" | "bg" | "font" | "size"; value: string | number | null }
  | { type: "clear" };

export const FONT_CHOICES = ["Times New Roman", "Georgia", "Garamond", "Cambria", "Calibri", "Arial", "Verdana", "Courier New"];
export const SIZE_CHOICES = [9, 10, 11, 12, 14, 16, 18, 24, 32];

export const TEXT_COLOURS: { name: string; value: string }[] = [
  { name: "Black", value: "#111827" },
  { name: "Grey", value: "#6b7280" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0f766e" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
  { name: "White", value: "#ffffff" },
];

export const HIGHLIGHTS: { name: string; value: string }[] = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Purple", value: "#ddd6fe" },
  { name: "Grey", value: "#e5e7eb" },
  { name: "Red", value: "#fecaca" },
];

const HEX = /^#[0-9a-f]{6}$/i;

/** #rgb, #rrggbb and rgb(...) become #rrggbb. Anything else is refused. */
export function toHex(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (HEX.test(v)) return v;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/.exec(v);
  if (rgb) {
    if (rgb[4] !== undefined && parseFloat(rgb[4]) === 0) return null;
    return "#" + [rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0")).join("");
  }
  return null;
}

function fontFromCss(value: string): string | undefined {
  const first = value.split(",")[0].replace(/["']/g, "").trim();
  const known = FONT_CHOICES.find((f) => f.toLowerCase() === first.toLowerCase());
  if (known) return known;
  // Fonts from a Word file are kept whatever they are called, as long as the name is plain text.
  return SAFE_FONT.test(first) && !/^(serif|sans-serif|monospace|inherit|initial)$/i.test(first) ? first : undefined;
}

function sizeFromCss(value: string): number | undefined {
  const m = /^([\d.]+)(px|pt)$/.exec(value.trim().toLowerCase());
  if (!m) return undefined;
  const pt = m[2] === "px" ? parseFloat(m[1]) * 0.75 : parseFloat(m[1]);
  return pt >= 6 && pt <= 96 ? Math.round(pt * 2) / 2 : undefined;
}

/** Reads the allowed parts out of a style attribute. */
function readStyle(style: string, into: Fmt) {
  for (const decl of style.split(";")) {
    const at = decl.indexOf(":");
    if (at < 0) continue;
    const prop = decl.slice(0, at).trim().toLowerCase();
    const val = decl.slice(at + 1).trim();
    if (prop === "color") {
      const c = toHex(val);
      if (c) into.color = c;
    } else if (prop === "background-color" || prop === "background") {
      const c = toHex(val);
      if (c) into.bg = c;
    } else if (prop === "font-family") {
      const f = fontFromCss(val);
      if (f) into.font = f;
    } else if (prop === "font-size") {
      const s = sizeFromCss(val);
      if (s) into.size = s;
    } else if (prop === "font-weight" && /^(bold|[6-9]00)$/.test(val)) into.b = true;
    else if (prop === "font-style" && val === "italic") into.i = true;
    else if (prop === "text-decoration" || prop === "text-decoration-line") {
      if (/underline/.test(val)) into.u = true;
      if (/line-through/.test(val)) into.s = true;
    } else if (prop === "text-transform" && val === "uppercase") into.caps = true;
    else if (prop === "font-variant" && /small-caps/.test(val)) into.sc = true;
  }
}

const sameFmt = (a: Fmt, b: Fmt) =>
  !!a.b === !!b.b && !!a.i === !!b.i && !!a.u === !!b.u && !!a.s === !!b.s && !!a.sup === !!b.sup && !!a.sub === !!b.sub &&
  a.color === b.color && a.bg === b.bg && a.font === b.font && a.size === b.size &&
  !!a.caps === !!b.caps && !!a.sc === !!b.sc && !!a.tab === !!b.tab && !!a.br === !!b.br && a.fn === b.fn;

const isPlain = (f: Fmt) => sameFmt(f, {});

function merge(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = out[out.length - 1];
    if (last && sameFmt(last.f, r.f)) last.text += r.text;
    else out.push({ text: r.text, f: { ...r.f } });
  }
  return out;
}

/** A sentence's saved look as runs. If the saved HTML no longer matches the wording, the wording wins. */
export function parseRuns(text: string, html?: string): Run[] {
  if (!html || typeof DOMParser === "undefined") return text ? [{ text, f: {} }] : [];
  const dom = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const runs: Run[] = [];
  const walk = (node: Node, f: Fmt) => {
    if (node.nodeType === 3) {
      const t = (node as Text).data;
      if (t) runs.push({ text: t, f });
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const next: Fmt = { ...f };
    switch (el.tagName) {
      case "B":
      case "STRONG":
        next.b = true;
        break;
      case "I":
      case "EM":
        next.i = true;
        break;
      case "U":
        next.u = true;
        break;
      case "S":
      case "STRIKE":
      case "DEL":
        next.s = true;
        break;
      case "SUP":
        next.sup = true;
        break;
      case "SUB":
        next.sub = true;
        break;
      case "BR":
        runs.push({ text: "\n", f: { ...f, br: true } });
        return;
    }
    if (el.classList.contains("dx-tab")) {
      runs.push({ text: "\t", f: { ...f, tab: true } });
      return;
    }
    const style = el.getAttribute("style");
    if (style) readStyle(style, next);
    const fn = el.getAttribute("data-fn");
    if (fn && /^[\w-]{1,16}$/.test(fn)) next.fn = fn;
    el.childNodes.forEach((c) => walk(c, next));
  };
  dom.body.firstElementChild?.childNodes.forEach((c) => walk(c, {}));
  const merged = merge(runs);
  const joined = merged.map((r) => r.text).join("");
  return joined.replace(/\s+/g, " ").trim() === text.replace(/\s+/g, " ").trim() ? merged : text ? [{ text, f: {} }] : [];
}

/** Runs as HTML containing only the allowed tags and styles. Returns undefined when nothing is formatted. */
export function runsToHtml(runs: Run[]): string | undefined {
  const merged = merge(runs);
  if (merged.every((r) => isPlain(r.f))) return undefined;
  return merged
    .map((r) => {
      if (r.f.br) return "<br>".repeat(Math.max(1, r.text.length));
      let html = r.f.tab ? '<span class="dx-tab">\t</span>'.repeat(Math.max(1, r.text.length)) : escapeHtml(r.text);
      const css: string[] = [];
      if (r.f.color) css.push(`color:${r.f.color}`);
      if (r.f.bg) css.push(`background-color:${r.f.bg}`);
      if (r.f.font) css.push(`font-family:${fontStack(r.f.font).replace(/'/g, "&#39;")}`);
      if (r.f.size) css.push(`font-size:${r.f.size}pt`);
      if (r.f.caps) css.push("text-transform:uppercase");
      if (r.f.sc) css.push("font-variant:small-caps");
      if (css.length) html = `<span style="${css.join(";")}">${html}</span>`;
      for (const [on, tag] of [
        [r.f.b, "b"],
        [r.f.i, "i"],
        [r.f.u, "u"],
        [r.f.s, "s"],
        [r.f.sup, "sup"],
        [r.f.sub, "sub"],
      ] as const)
        if (on) html = `<${tag}>${html}</${tag}>`;
      if (r.f.fn) html = `<span data-fn="${r.f.fn}" contenteditable="false">${html}</span>`;
      return html;
    })
    .join("");
}

/** Applies a formatting change to characters `from` to `to` of a sentence. Returns its new HTML, or undefined if it is now plain. */
export function formatRange(text: string, html: string | undefined, from: number, to: number, op: FormatOp): string | undefined {
  const runs = parseRuns(text, html);
  if (to <= from) return runsToHtml(runs);

  // Cut the runs at the selection edges.
  const pieces: { run: Run; inside: boolean }[] = [];
  let pos = 0;
  for (const r of runs) {
    const start = pos;
    const end = pos + r.text.length;
    pos = end;
    const a = Math.max(from, start);
    const b = Math.min(to, end);
    if (a >= b) {
      pieces.push({ run: r, inside: false });
      continue;
    }
    if (a > start) pieces.push({ run: { text: r.text.slice(0, a - start), f: r.f }, inside: false });
    pieces.push({ run: { text: r.text.slice(a - start, b - start), f: { ...r.f } }, inside: true });
    if (b < end) pieces.push({ run: { text: r.text.slice(b - start), f: r.f }, inside: false });
  }

  const inside = pieces.filter((p) => p.inside);
  if (op.type === "toggle") {
    // Off if all of it already has it, otherwise on for all of it. Super and subscript exclude each other.
    const allOn = op.on === undefined ? inside.every((p) => p.run.f[op.key]) : !op.on;
    for (const p of inside) {
      if (allOn) delete p.run.f[op.key];
      else {
        p.run.f[op.key] = true;
        if (op.key === "sup") delete p.run.f.sub;
        if (op.key === "sub") delete p.run.f.sup;
      }
    }
  } else if (op.type === "set") {
    for (const p of inside) {
      if (op.value === null) delete p.run.f[op.key];
      else (p.run.f as Record<string, unknown>)[op.key] = op.value;
    }
  } else {
    // Clearing formatting never removes a tab or a line break.
    for (const p of inside) p.run.f = { ...(p.run.f.tab ? { tab: true } : {}), ...(p.run.f.br ? { br: true } : {}) };
  }
  return runsToHtml(pieces.map((p) => p.run));
}

/** The look at the start of a selection, used to show which buttons are on. */
export function formatAt(text: string, html: string | undefined, offset: number): Fmt {
  let pos = 0;
  for (const r of parseRuns(text, html)) {
    pos += r.text.length;
    if (offset < pos) return r.f;
  }
  return {};
}

/** HTML read back from the page, cleaned down to what is allowed. Undefined when nothing is formatted. */
export function sanitizeHtml(text: string, html: string): string | undefined {
  return runsToHtml(parseRuns(text, html));
}

/**
 * Finds where each sentence sits in `full`, treating any run of whitespace in a sentence as matching
 * any run of whitespace (spaces, tabs, line breaks) in the text. Returns [start, end) pairs.
 */
export function locateSentences(full: string, sentences: string[]): [number, number][] {
  const out: [number, number][] = [];
  const ws = (c: string | undefined) => c !== undefined && /\s/.test(c);
  let cur = 0;
  for (const s of sentences) {
    while (cur < full.length && ws(full[cur])) cur++;
    const start = cur;
    let i = 0;
    let j = cur;
    while (i < s.length && j <= full.length) {
      if (ws(s[i])) {
        while (i < s.length && ws(s[i])) i++;
        while (j < full.length && ws(full[j])) j++;
      } else if (s[i] === full[j]) {
        i++;
        j++;
      } else break;
    }
    out.push([start, Math.max(start, j)]);
    cur = Math.max(start, j);
  }
  return out;
}

/** Cuts runs into the pieces from..to. */
function sliceRuns(runs: Run[], from: number, to: number): Run[] {
  const out: Run[] = [];
  let pos = 0;
  for (const r of runs) {
    const start = pos;
    const end = pos + r.text.length;
    pos = end;
    const a = Math.max(from, start);
    const b = Math.min(to, end);
    if (a < b) out.push({ text: r.text.slice(a - start, b - start), f: r.f });
  }
  return out;
}

/**
 * Splits a paragraph's formatted runs into one HTML string per sentence. Whitespace between two sentences
 * (including tabs and line breaks) stays with the sentence before it, so nothing is lost.
 */
export function splitRunsBySentence(runs: Run[], sentences: string[]): (string | undefined)[] {
  const full = runs.map((r) => r.text).join("");
  const spans = locateSentences(full, sentences);
  return spans.map(([start, end], k) => {
    const from = k === 0 ? 0 : start;
    const to = k === spans.length - 1 ? full.length : spans[k + 1][0];
    return runsToHtml(sliceRuns(runs, from, to));
  });
}

/** Cuts a typed paragraph at a text position, keeping each half's formatting, then splits each half into sentences. */
export function splitHtmlAt(
  text: string,
  html: string,
  offset: number,
  firstTexts: string[],
  secondTexts: string[]
): { first: (string | undefined)[]; second: (string | undefined)[] } {
  const runs = parseRuns(text, html);
  const total = runs.reduce((n, r) => n + r.text.length, 0);
  const before = sliceRuns(runs, 0, offset);
  const after = sliceRuns(runs, offset, total);
  return { first: splitRunsBySentence(before, firstTexts), second: splitRunsBySentence(after, secondTexts) };
}

/** A paragraph's typed HTML split into per-sentence HTML, for the sentences the editor found in it. */
export function splitHtmlBySentence(text: string, html: string, sentences: string[]): (string | undefined)[] {
  const runs = parseRuns(text, html);
  return splitRunsBySentence(runs, sentences);
}

/** True when every character from `from` to `to` has the flag. */
export function rangeHas(text: string, html: string | undefined, from: number, to: number, key: "b" | "i" | "u" | "s" | "sup" | "sub"): boolean {
  let pos = 0;
  let any = false;
  for (const r of parseRuns(text, html)) {
    const start = pos;
    pos += r.text.length;
    if (Math.min(to, pos) <= Math.max(from, start)) continue;
    any = true;
    if (!r.f[key]) return false;
  }
  return any;
}
