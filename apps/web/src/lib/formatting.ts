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
}

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
  const first = value.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
  return FONT_CHOICES.find((f) => f.toLowerCase() === first);
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
    }
  }
}

const sameFmt = (a: Fmt, b: Fmt) =>
  !!a.b === !!b.b && !!a.i === !!b.i && !!a.u === !!b.u && !!a.s === !!b.s && !!a.sup === !!b.sup && !!a.sub === !!b.sub &&
  a.color === b.color && a.bg === b.bg && a.font === b.font && a.size === b.size;

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
        runs.push({ text: " ", f });
        return;
    }
    const style = el.getAttribute("style");
    if (style) readStyle(style, next);
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
      let html = escapeHtml(r.text);
      const css: string[] = [];
      if (r.f.color) css.push(`color:${r.f.color}`);
      if (r.f.bg) css.push(`background-color:${r.f.bg}`);
      if (r.f.font) css.push(`font-family:'${r.f.font}'`);
      if (r.f.size) css.push(`font-size:${r.f.size}pt`);
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
    for (const p of inside) p.run.f = {};
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
