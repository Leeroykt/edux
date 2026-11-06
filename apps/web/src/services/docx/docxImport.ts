/**
 * Reads a Word (.docx) file straight from its XML so the editor can draw it the way Word does.
 *
 * Everything that decides how a page looks is carried over: page size and margins, headers and footers,
 * styles and their inheritance, fonts (including theme fonts), sizes, colours, highlighting, spacing,
 * indents, line spacing, tab stops and leaders, list numbering, tables (widths, borders, shading, merged
 * cells), pictures at their real size, page and section breaks, footnotes and equations.
 *
 * Each block remembers where it came from in the file (`docx.path`) and a fingerprint of its content
 * (`docx.sig`), so an export can hand back the original XML for every block that was not changed.
 */
import JSZip from "jszip";
import type {
  BlockStyle,
  DocumentParagraphNode,
  DocumentSentence,
  DocxLayout,
  DocxSection,
  DocxTabStop,
  DocxTableCell,
  DocxTableModel,
} from "@edux/schema";
import { EquationMap, equationToken } from "../../lib/equations";
import { ommlToLatex } from "./equations";
import { Fmt, Run, fontStack, runsToHtml, splitRunsBySentence } from "../../lib/formatting";
import { splitSentenceTexts } from "../../lib/sentences";
import { ThemeColors, chartSvg, parseThemeColors, shapeBoxCss, smartArtSvg } from "./docxObjects";

/* ------------------------------------------------------------------ */
/* XML helpers                                                         */
/* ------------------------------------------------------------------ */

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const W_STRICT = "http://purl.oclc.org/ooxml/wordprocessingml/main";
const M = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const R_STRICT = "http://purl.oclc.org/ooxml/officeDocument/relationships";
const WNS = new Set([W, W_STRICT]);

const kids = (el: Element): Element[] => Array.from(el.children);
const isW = (el: Element, name: string) => el.localName === name && WNS.has(el.namespaceURI || "");
const wkid = (el: Element | null | undefined, name: string): Element | undefined => (el ? kids(el).find((c) => isW(c, name)) : undefined);
const wkids = (el: Element | null | undefined, name: string): Element[] => (el ? kids(el).filter((c) => isW(c, name)) : []);
const byLocal = (el: Element, name: string): Element[] => Array.from(el.getElementsByTagName("*")).filter((c) => c.localName === name);

function wattr(el: Element | null | undefined, name: string): string | null {
  if (!el) return null;
  for (const ns of WNS) {
    const v = el.getAttributeNS(ns, name);
    if (v !== null && v !== "") return v;
  }
  const v = el.getAttribute(`w:${name}`) ?? el.getAttribute(name);
  return v === "" ? null : v;
}

function rattr(el: Element | null | undefined, name: string): string | null {
  if (!el) return null;
  return el.getAttributeNS(R, name) || el.getAttributeNS(R_STRICT, name) || el.getAttribute(`r:${name}`) || null;
}

/** On/off properties such as <w:b/>, <w:b w:val="0"/>. */
function onOff(el: Element | undefined): boolean | undefined {
  if (!el) return undefined;
  const v = wattr(el, "val");
  return !(v === "0" || v === "false" || v === "off" || v === "none");
}

/** A Word measurement in points. Plain numbers are twentieths of a point. */
function twip(v: string | null | undefined): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const m = /^(-?[\d.]+)\s*(pt|in|cm|mm|pc|pi)?$/.exec(v.trim());
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "pt":
      return n;
    case "in":
      return n * 72;
    case "cm":
      return n * 28.3465;
    case "mm":
      return n * 2.83465;
    case "pc":
    case "pi":
      return n * 12;
    default:
      return n / 20;
  }
}

const emu = (v: string | null | undefined) => (v ? parseInt(v, 10) / 12700 : undefined);
const pt = (n: number) => `${Math.round(n * 100) / 100}pt`;
const parseXml = (xml: string) => new DOMParser().parseFromString(xml, "application/xml");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** React style object to an inline CSS string. */
export function cssText(style: BlockStyle): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`)
    .join(";");
}

/* ------------------------------------------------------------------ */
/* Run and paragraph properties                                        */
/* ------------------------------------------------------------------ */

interface RP {
  font?: string;
  size?: number;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  caps?: boolean;
  sc?: boolean;
  /** "#rrggbb", or "auto" for Word's automatic (black) colour. */
  color?: string;
  /** "#rrggbb", or "none". */
  bg?: string;
  va?: "sup" | "sub" | "base";
  vanish?: boolean;
  spacing?: number;
  rStyle?: string;
}

interface Border {
  val: string;
  sz: number;
  color: string;
  space: number;
}

interface TabDef {
  pos: number;
  val: string;
  leader?: string;
}

interface PP {
  pStyle?: string;
  jc?: string;
  before?: number;
  after?: number;
  beforeAuto?: boolean;
  afterAuto?: boolean;
  line?: number;
  lineRule?: string;
  left?: number;
  right?: number;
  firstLine?: number;
  hanging?: number;
  pageBreakBefore?: boolean;
  keepNext?: boolean;
  contextual?: boolean;
  numId?: string;
  ilvl?: number;
  tabs?: TabDef[];
  outline?: number;
  shd?: string;
  borders?: Partial<Record<"top" | "bottom" | "left" | "right", Border>>;
}

const HIGHLIGHT: Record<string, string> = {
  yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000",
  darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000",
  darkYellow: "#808000", darkGray: "#808080", lightGray: "#c0c0c0", black: "#000000", white: "#ffffff",
};

const hex = (v: string | null): string | undefined => (v && /^[0-9a-f]{6}$/i.test(v) ? `#${v.toLowerCase()}` : undefined);

function defined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

function mergeRP(...parts: (RP | undefined)[]): RP {
  return parts.reduce<RP>((acc, p) => (p ? { ...acc, ...defined(p) } : acc), {});
}

function mergePP(...parts: (PP | undefined)[]): PP {
  let acc: PP = {};
  for (const p of parts) {
    if (!p) continue;
    const { tabs, borders, ...rest } = p;
    const next: PP = { ...acc, ...defined(rest) };
    // A first-line indent and a hanging indent replace each other.
    if (p.firstLine !== undefined) delete next.hanging;
    if (p.hanging !== undefined) delete next.firstLine;
    if (tabs) {
      let list = [...(acc.tabs ?? [])];
      for (const t of tabs) {
        list = list.filter((x) => Math.abs(x.pos - t.pos) > 0.5);
        if (t.val !== "clear") list.push(t);
      }
      next.tabs = list.sort((a, b) => a.pos - b.pos);
    }
    if (borders) next.borders = { ...(acc.borders ?? {}), ...borders };
    acc = next;
  }
  return acc;
}

interface Theme {
  major?: string;
  minor?: string;
}

function parseBorder(el: Element | undefined): Border | undefined {
  if (!el) return undefined;
  const val = wattr(el, "val") || "single";
  return {
    val,
    sz: parseFloat(wattr(el, "sz") || "4") / 8,
    color: hex(wattr(el, "color")) || "#000000",
    space: parseFloat(wattr(el, "space") || "0"),
  };
}

function parseRPr(rPr: Element | undefined, theme: Theme): RP {
  const out: RP = {};
  if (!rPr) return out;
  for (const c of kids(rPr)) {
    if (!WNS.has(c.namespaceURI || "")) continue;
    switch (c.localName) {
      case "rStyle":
        out.rStyle = wattr(c, "val") || undefined;
        break;
      case "rFonts": {
        const th = wattr(c, "asciiTheme") || wattr(c, "hAnsiTheme");
        const themed = th ? (th.startsWith("major") ? theme.major : theme.minor) : undefined;
        const f = themed || wattr(c, "ascii") || wattr(c, "hAnsi") || wattr(c, "cs") || wattr(c, "eastAsia");
        if (f) out.font = f;
        break;
      }
      case "sz": {
        const v = parseFloat(wattr(c, "val") || "");
        if (!isNaN(v)) out.size = v / 2;
        break;
      }
      case "b":
        out.b = onOff(c);
        break;
      case "i":
        out.i = onOff(c);
        break;
      case "caps":
        out.caps = onOff(c);
        break;
      case "smallCaps":
        out.sc = onOff(c);
        break;
      case "strike":
      case "dstrike":
        out.s = onOff(c);
        break;
      case "vanish":
        out.vanish = onOff(c);
        break;
      case "u": {
        const v = wattr(c, "val");
        out.u = v !== "none" && v !== "0";
        break;
      }
      case "color": {
        const v = wattr(c, "val");
        out.color = v === "auto" ? "auto" : hex(v);
        break;
      }
      case "highlight": {
        const v = wattr(c, "val") || "";
        out.bg = v === "none" ? "none" : HIGHLIGHT[v];
        break;
      }
      case "shd": {
        const fill = wattr(c, "fill");
        if (fill && fill !== "auto") out.bg = hex(fill);
        break;
      }
      case "vertAlign": {
        const v = wattr(c, "val");
        out.va = v === "superscript" ? "sup" : v === "subscript" ? "sub" : "base";
        break;
      }
      case "spacing": {
        const v = twip(wattr(c, "val"));
        if (v !== undefined) out.spacing = v;
        break;
      }
    }
  }
  return out;
}

function parsePPr(pPr: Element | undefined): PP {
  const out: PP = {};
  if (!pPr) return out;
  for (const c of kids(pPr)) {
    if (!WNS.has(c.namespaceURI || "")) continue;
    switch (c.localName) {
      case "pStyle":
        out.pStyle = wattr(c, "val") || undefined;
        break;
      case "jc":
        out.jc = wattr(c, "val") || undefined;
        break;
      case "framePr": {
        // A framed paragraph (Word's page numbers) is placed by its frame's alignment.
        const x = wattr(c, "xAlign");
        if (x && !out.jc) out.jc = x === "center" ? "center" : x === "right" || x === "outside" ? "right" : "left";
        break;
      }
      case "spacing":
        out.before = twip(wattr(c, "before"));
        out.after = twip(wattr(c, "after"));
        if (wattr(c, "beforeAutospacing")) out.beforeAuto = onOff(c) && wattr(c, "beforeAutospacing") !== "0";
        if (wattr(c, "afterAutospacing")) out.afterAuto = wattr(c, "afterAutospacing") !== "0";
        if (wattr(c, "line")) out.line = parseFloat(wattr(c, "line")!);
        if (wattr(c, "lineRule")) out.lineRule = wattr(c, "lineRule")!;
        break;
      case "ind": {
        out.left = twip(wattr(c, "left") ?? wattr(c, "start"));
        out.right = twip(wattr(c, "right") ?? wattr(c, "end"));
        const hanging = twip(wattr(c, "hanging"));
        const first = twip(wattr(c, "firstLine"));
        if (hanging !== undefined) out.hanging = hanging;
        else if (first !== undefined) out.firstLine = first;
        break;
      }
      case "pageBreakBefore":
        out.pageBreakBefore = onOff(c);
        break;
      case "keepNext":
        out.keepNext = onOff(c);
        break;
      case "contextualSpacing":
        out.contextual = onOff(c);
        break;
      case "numPr": {
        const id = wattr(wkid(c, "numId"), "val");
        const lvl = wattr(wkid(c, "ilvl"), "val");
        if (id !== null) out.numId = id;
        if (lvl !== null) out.ilvl = parseInt(lvl, 10) || 0;
        break;
      }
      case "tabs":
        out.tabs = wkids(c, "tab").map((t) => ({
          pos: twip(wattr(t, "pos")) ?? 0,
          val: wattr(t, "val") || "left",
          leader: wattr(t, "leader") || undefined,
        }));
        break;
      case "outlineLvl": {
        const v = parseInt(wattr(c, "val") || "", 10);
        if (!isNaN(v)) out.outline = v;
        break;
      }
      case "shd": {
        const fill = wattr(c, "fill");
        if (fill && fill !== "auto") out.shd = hex(fill);
        break;
      }
      case "pBdr": {
        const b: PP["borders"] = {};
        for (const side of ["top", "bottom", "left", "right"] as const) {
          const el = wkid(c, side) ?? (side === "left" ? wkid(c, "start") : side === "right" ? wkid(c, "end") : undefined);
          const parsed = parseBorder(el);
          if (parsed) b[side] = parsed;
        }
        out.borders = b;
        break;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Styles, numbering, relationships                                    */
/* ------------------------------------------------------------------ */

interface TableCond {
  pPr: PP;
  rPr: RP;
  tcPr?: Element;
}

interface StyleDef {
  id: string;
  type: string;
  name: string;
  basedOn?: string;
  isDefault: boolean;
  pPr: PP;
  rPr: RP;
  tblPr?: Element;
  tcPr?: Element;
  conds: Record<string, TableCond>;
}

interface Styles {
  defs: Map<string, StyleDef>;
  docPP: PP;
  docRP: RP;
  defaultPara?: string;
  defaultTable?: string;
}

function parseStyles(xml: string | null, theme: Theme): Styles {
  const defs = new Map<string, StyleDef>();
  const out: Styles = { defs, docPP: {}, docRP: {} };
  if (!xml) return out;
  const doc = parseXml(xml);
  const root = doc.documentElement;
  const dd = wkid(root, "docDefaults");
  out.docRP = parseRPr(wkid(wkid(dd, "rPrDefault"), "rPr"), theme);
  out.docPP = parsePPr(wkid(wkid(dd, "pPrDefault"), "pPr"));
  for (const s of wkids(root, "style")) {
    const id = wattr(s, "styleId");
    if (!id) continue;
    const type = wattr(s, "type") || "paragraph";
    const conds: Record<string, TableCond> = {};
    for (const c of wkids(s, "tblStylePr")) {
      const t = wattr(c, "type");
      if (t) conds[t] = { pPr: parsePPr(wkid(c, "pPr")), rPr: parseRPr(wkid(c, "rPr"), theme), tcPr: wkid(c, "tcPr") };
    }
    const def: StyleDef = {
      id,
      type,
      name: wattr(wkid(s, "name"), "val") || id,
      basedOn: wattr(wkid(s, "basedOn"), "val") || undefined,
      isDefault: wattr(s, "default") === "1" || wattr(s, "default") === "true",
      pPr: parsePPr(wkid(s, "pPr")),
      rPr: parseRPr(wkid(s, "rPr"), theme),
      tblPr: wkid(s, "tblPr"),
      tcPr: wkid(s, "tcPr"),
      conds,
    };
    defs.set(id, def);
    if (def.isDefault && type === "paragraph") out.defaultPara = id;
    if (def.isDefault && type === "table") out.defaultTable = id;
  }
  return out;
}

/** A style and everything it is based on, most basic first. */
function chain(styles: Styles, id: string | undefined): StyleDef[] {
  const out: StyleDef[] = [];
  const seen = new Set<string>();
  let cur = id ? styles.defs.get(id) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.basedOn ? styles.defs.get(cur.basedOn) : undefined;
  }
  return out;
}

interface Level {
  start: number;
  fmt: string;
  text: string;
  pPr: PP;
  rPr: RP;
  suff: string;
  isLgl: boolean;
  font?: string;
}

interface Numbering {
  abstracts: Map<string, Level[]>;
  nums: Map<string, { abs: string; overrides: Map<number, { start?: number; level?: Level }> }>;
}

function parseLevel(l: Element, theme: Theme): Level {
  const rPrEl = wkid(l, "rPr");
  const fontsEl = wkid(rPrEl, "rFonts");
  return {
    start: parseInt(wattr(wkid(l, "start"), "val") || "1", 10),
    fmt: wattr(wkid(l, "numFmt"), "val") || "decimal",
    text: wattr(wkid(l, "lvlText"), "val") ?? "",
    pPr: parsePPr(wkid(l, "pPr")),
    rPr: parseRPr(rPrEl, theme),
    suff: wattr(wkid(l, "suff"), "val") || "tab",
    isLgl: !!wkid(l, "isLgl"),
    font: wattr(fontsEl, "ascii") || wattr(fontsEl, "hAnsi") || undefined,
  };
}

function parseNumbering(xml: string | null, theme: Theme): Numbering {
  const out: Numbering = { abstracts: new Map(), nums: new Map() };
  if (!xml) return out;
  const root = parseXml(xml).documentElement;
  for (const a of wkids(root, "abstractNum")) {
    const id = wattr(a, "abstractNumId");
    if (id === null) continue;
    const levels: Level[] = [];
    for (const l of wkids(a, "lvl")) levels[parseInt(wattr(l, "ilvl") || "0", 10)] = parseLevel(l, theme);
    out.abstracts.set(id, levels);
  }
  for (const n of wkids(root, "num")) {
    const id = wattr(n, "numId");
    const abs = wattr(wkid(n, "abstractNumId"), "val");
    if (id === null || abs === null) continue;
    const overrides = new Map<number, { start?: number; level?: Level }>();
    for (const o of wkids(n, "lvlOverride")) {
      const ilvl = parseInt(wattr(o, "ilvl") || "0", 10);
      const so = wattr(wkid(o, "startOverride"), "val");
      const lvl = wkid(o, "lvl");
      overrides.set(ilvl, { start: so !== null ? parseInt(so, 10) : undefined, level: lvl ? parseLevel(lvl, theme) : undefined });
    }
    out.nums.set(id, { abs, overrides });
  }
  return out;
}

const ROMAN: [number, string][] = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
function roman(n: number): string {
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) {
    out += s;
    n -= v;
  }
  return out;
}
function letters(n: number): string {
  // Word repeats the letter past z: aa, bb, ...
  const ch = String.fromCharCode(97 + ((n - 1) % 26));
  return ch.repeat(Math.floor((n - 1) / 26) + 1);
}
function formatNumber(n: number, fmt: string): string {
  switch (fmt) {
    case "lowerLetter":
      return letters(n);
    case "upperLetter":
      return letters(n).toUpperCase();
    case "lowerRoman":
      return roman(n);
    case "upperRoman":
      return roman(n).toUpperCase();
    case "decimalZero":
      return n < 10 ? `0${n}` : String(n);
    case "ordinal":
      return `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? "th"}`;
    case "none":
      return "";
    default:
      return String(n);
  }
}

/** Symbol and Wingdings bullets live in the private-use area; draw them with ordinary characters. */
function symbolChar(text: string, font?: string): { text: string; mapped: boolean } {
  let mapped = false;
  const out = Array.from(text)
    .map((ch) => {
      let code = ch.codePointAt(0) ?? 0;
      const pua = code >= 0xf000 && code <= 0xf0ff;
      if (pua) code -= 0xf000;
      const f = (font || "").toLowerCase();
      if (f.includes("wingdings")) {
        const wd: Record<number, string> = { 0xa7: "▪", 0xd8: "➢", 0xfc: "✓", 0x76: "❖", 0x6e: "■", 0x71: "❑", 0xa8: "◻", 0x9f: "•", 0x77: "◆", 0xa1: "○", 0x6c: "●", 0xe0: "→", 0xe8: "➔", 0x9e: "·", 0xa2: "◎" };
        if (wd[code]) {
          mapped = true;
          return wd[code];
        }
      }
      if (f.includes("symbol")) {
        const sy: Record<number, string> = { 0xb7: "•", 0x2d: "−", 0xae: "→", 0xd8: "¬", 0xa8: "♣", 0xb0: "°", 0xd7: "·" };
        if (sy[code]) {
          mapped = true;
          return sy[code];
        }
      }
      if (pua) {
        mapped = true;
        return code === 0xb7 ? "•" : code === 0xa7 ? "▪" : String.fromCodePoint(code);
      }
      return ch;
    })
    .join("");
  return { text: out, mapped };
}

type Rels = Map<string, { target: string; type: string; external: boolean }>;

function parseRels(xml: string | null, partDir: string): Rels {
  const out: Rels = new Map();
  if (!xml) return out;
  const root = parseXml(xml).documentElement;
  for (const r of Array.from(root.getElementsByTagName("*")).filter((e) => e.localName === "Relationship")) {
    const id = r.getAttribute("Id");
    const target = r.getAttribute("Target") || "";
    if (!id) continue;
    const external = r.getAttribute("TargetMode") === "External";
    let full = target;
    if (!external) {
      if (target.startsWith("/")) full = target.slice(1);
      else {
        const parts = `${partDir}/${target}`.split("/");
        const stack: string[] = [];
        for (const p of parts) {
          if (p === "..") stack.pop();
          else if (p && p !== ".") stack.push(p);
        }
        full = stack.join("/");
      }
    }
    out.set(id, { target: full, type: r.getAttribute("Type") || "", external });
  }
  return out;
}

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp",
  svg: "image/svg+xml", webp: "image/webp", ico: "image/x-icon",
};

/* ------------------------------------------------------------------ */
/* Reading context                                                     */
/* ------------------------------------------------------------------ */

interface Ctx {
  zip: JSZip;
  theme: Theme;
  styles: Styles;
  numbering: Numbering;
  media: Map<string, string>;
  /** Chart and SmartArt parts, read ahead so drawing can stay synchronous. */
  parts: Map<string, string>;
  themeColors: ThemeColors;
  objectFont: string;
  counters: Map<string, number[]>;
  startedNums: Set<string>;
  equations: EquationMap;
  eqCounter: { n: number };
  footnotes: Map<string, Element>;
  footnoteCounter: { n: number };
  compatMode: number;
  serializer: XMLSerializer;
}

interface Part {
  rels: Rels;
  /** Complex field state, which runs across runs and paragraphs. */
  fields: { instr: string; phase: "instr" | "result"; kind: "PAGE" | "NUMPAGES" | null; emitted: boolean }[];
  /** Number shown by <w:footnoteRef/> while reading a footnote's own text. */
  footnoteNumber?: number;
}

interface ImageInfo {
  url?: string;
  /** Drawn HTML for objects that are not pictures: text boxes, charts, SmartArt. */
  html?: string;
  widthPt: number;
  heightPt: number;
  unsupported?: string;
}

type Item =
  | { k: "text"; text: string; rp: RP }
  | { k: "tab"; rp: RP }
  | { k: "br"; rp: RP }
  | { k: "page" }
  | { k: "img"; img: ImageInfo }
  | { k: "eq"; id: string; rp: RP }
  | { k: "field"; name: "PAGE" | "NUMPAGES"; rp: RP }
  | { k: "fn"; num: number; id: string; html: string; rp: RP };

/* ------------------------------------------------------------------ */
/* Pictures                                                            */
/* ------------------------------------------------------------------ */

function readDrawing(el: Element, ctx: Ctx, part: Part): ImageInfo | null {
  const info = readDrawingContent(el, ctx, part);
  const anchor = byLocal(el, "anchor")[0];
  if (!info || !anchor) return info;
  // A floating object keeps its offset from the text column and from its paragraph.
  const offset = (axis: "positionH" | "positionV") => {
    const pos = byLocal(anchor, axis)[0];
    const from = pos?.getAttribute("relativeFrom") || "";
    const off = pos ? byLocal(pos, "posOffset")[0]?.textContent : null;
    return off && /column|margin|paragraph|line/.test(from) ? emu(off) ?? 0 : 0;
  };
  const x = offset("positionH");
  // Vertical offsets are left out: a floating object takes no room in the text, so adding them would push pages apart.
  const y = 0;
  if (!x && !y) return info;
  const inner = imageHtml(info);
  return { ...info, url: undefined, unsupported: undefined, html: `<span style="display:inline-block;margin-left:${pt(Math.max(0, x))};margin-top:${pt(Math.max(0, y))}">${inner}</span>` };
}

function readDrawingContent(el: Element, ctx: Ctx, part: Part): ImageInfo | null {
  const holder = byLocal(el, "inline")[0] ?? byLocal(el, "anchor")[0];
  const extent = holder ? byLocal(holder, "extent")[0] : undefined;
  const widthPt = emu(extent?.getAttribute("cx")) ?? 144;
  const heightPt = emu(extent?.getAttribute("cy")) ?? 108;
  const size = `width:${pt(widthPt)};height:${pt(heightPt)}`;
  const data = byLocal(el, "graphicData")[0]?.getAttribute("uri") || "";

  // A text box: its own paragraphs, inside its own border and fill.
  const txbx = byLocal(el, "txbxContent")[0];
  const wsp = byLocal(el, "wsp")[0];
  if (txbx && wsp) {
    const inner = blocksToHtml(txbx, ctx, { ...part, fields: [] });
    return { html: `<span class="dx-shape" style="${escapeAttr(`${shapeBoxCss(wsp, ctx.themeColors)};${size}`)}">${inner}</span>`, widthPt, heightPt };
  }
  // A chart, drawn from the values cached in the file.
  if (data.includes("chart")) {
    const ref = byLocal(el, "chart")[0];
    const rel = part.rels.get(rattr(ref, "id") || "");
    const xml = rel ? ctx.parts.get(rel.target) : undefined;
    if (xml) return { html: chartSvg(xml, widthPt, heightPt, ctx.themeColors, ctx.objectFont), widthPt, heightPt };
    return { widthPt, heightPt, unsupported: "Chart" };
  }
  // SmartArt, drawn from the layout Word saved with it.
  if (data.includes("diagram")) {
    const ids = byLocal(el, "relIds")[0];
    const dataRel = part.rels.get(rattr(ids, "dm") || "");
    const dataXml = dataRel ? ctx.parts.get(dataRel.target) : undefined;
    const drawingId = dataXml ? /relId="([^"]+)"/.exec(dataXml)?.[1] : undefined;
    const drawingRel = drawingId ? part.rels.get(drawingId) : undefined;
    const drawingXml = drawingRel ? ctx.parts.get(drawingRel.target) : undefined;
    if (drawingXml) return { html: smartArtSvg(drawingXml, widthPt, heightPt, ctx.themeColors, ctx.objectFont), widthPt, heightPt };
    return { widthPt, heightPt, unsupported: "SmartArt" };
  }
  const blip = byLocal(el, "blip")[0];
  if (blip) {
    const rid = rattr(blip, "embed") || rattr(blip, "link");
    const rel = rid ? part.rels.get(rid) : undefined;
    const url = rel && !rel.external ? ctx.media.get(rel.target) : undefined;
    if (url) return { url, widthPt, heightPt };
    const ext = rel?.target.split(".").pop()?.toUpperCase();
    return { widthPt, heightPt, unsupported: ext ? `${ext} picture` : "Picture" };
  }
  // Any other shape: its outline and fill, at its size.
  if (wsp) return { html: `<span class="dx-shape" style="${escapeAttr(`${shapeBoxCss(wsp, ctx.themeColors)};${size}`)}"></span>`, widthPt, heightPt };
  return { widthPt, heightPt, unsupported: "Shape" };
}

function readVml(el: Element, ctx: Ctx, part: Part): ImageInfo | null {
  const shape = byLocal(el, "shape")[0];
  const img = byLocal(el, "imagedata")[0];
  const style = shape?.getAttribute("style") || "";
  const num = (key: string) => {
    const m = new RegExp(`${key}:\\s*([\\d.]+)(pt|in|px)?`).exec(style);
    if (!m) return undefined;
    const v = parseFloat(m[1]);
    return m[2] === "in" ? v * 72 : m[2] === "px" ? v * 0.75 : v;
  };
  const widthPt = num("width") ?? 144;
  const heightPt = num("height") ?? 108;
  if (!img) return byLocal(el, "textbox").length ? { widthPt, heightPt, unsupported: "Text box" } : null;
  const rid = rattr(img, "id") || img.getAttribute("o:relid");
  const rel = rid ? part.rels.get(rid) : undefined;
  const url = rel ? ctx.media.get(rel.target) : undefined;
  return url ? { url, widthPt, heightPt } : { widthPt, heightPt, unsupported: "Picture" };
}

/* ------------------------------------------------------------------ */
/* Inline content of a paragraph                                       */
/* ------------------------------------------------------------------ */

function charRP(ctx: Ctx, id: string | undefined): RP {
  return chain(ctx.styles, id).reduce<RP>((acc, s) => mergeRP(acc, s.rPr), {});
}

function collectInline(parent: Element, ctx: Ctx, part: Part, baseRP: RP, out: Item[]) {
  for (const el of kids(parent)) {
    const ns = el.namespaceURI || "";
    if (ns === M) {
      if (el.localName === "oMathPara") {
        for (const m of kids(el).filter((c) => c.localName === "oMath")) addEquation(m, true, ctx, baseRP, out);
      } else if (el.localName === "oMath") addEquation(el, false, ctx, baseRP, out);
      continue;
    }
    if (el.localName === "AlternateContent") {
      const choice = kids(el).find((c) => c.localName === "Choice");
      const fallback = kids(el).find((c) => c.localName === "Fallback");
      const pick = choice && (byLocal(choice, "blip").length || byLocal(choice, "drawing").length || byLocal(choice, "graphicData").length) ? choice : fallback ?? choice;
      if (pick) collectInline(pick, ctx, part, baseRP, out);
      continue;
    }
    if (!WNS.has(ns)) continue;
    switch (el.localName) {
      case "r":
        readRun(el, ctx, part, baseRP, out);
        break;
      case "hyperlink":
      case "smartTag":
      case "customXml":
      case "ins":
      case "moveTo":
      case "dir":
      case "bdo":
        collectInline(el, ctx, part, baseRP, out);
        break;
      case "sdt": {
        const content = wkid(el, "sdtContent");
        if (content) collectInline(content, ctx, part, baseRP, out);
        break;
      }
      case "fldSimple": {
        const instr = (wattr(el, "instr") || "").trim().split(/\s+/)[0]?.toUpperCase();
        if (instr === "PAGE" || instr === "NUMPAGES") {
          const r = wkid(el, "r");
          out.push({ k: "field", name: instr, rp: mergeRP(baseRP, parseRPr(wkid(r, "rPr"), ctx.theme)) });
        } else collectInline(el, ctx, part, baseRP, out);
        break;
      }
      // Deleted text, proofing marks, bookmarks and comments are not part of what the page shows.
      default:
        break;
    }
  }
}

function addEquation(m: Element, display: boolean, ctx: Ctx, rp: RP, out: Item[]) {
  const id = String(++ctx.eqCounter.n);
  ctx.equations[id] = { latex: ommlToLatex(m), display, omml: ctx.serializer.serializeToString(m) };
  out.push({ k: "eq", id, rp });
}

function readRun(r: Element, ctx: Ctx, part: Part, baseRP: RP, out: Item[]) {
  const own = parseRPr(wkid(r, "rPr"), ctx.theme);
  const rp = mergeRP(baseRP, charRP(ctx, own.rStyle), own);
  const field = part.fields[part.fields.length - 1];
  for (const c of kids(r)) {
    const ns = c.namespaceURI || "";
    if (c.localName === "AlternateContent") {
      const choice = kids(c).find((x) => x.localName === "Choice");
      const fallback = kids(c).find((x) => x.localName === "Fallback");
      const pick = choice && (byLocal(choice, "blip").length || byLocal(choice, "drawing").length || byLocal(choice, "graphicData").length) ? choice : fallback ?? choice;
      if (pick) {
        const d = byLocal(pick, "drawing")[0] ?? byLocal(pick, "pict")[0];
        const img = d ? (d.localName === "drawing" ? readDrawing(d, ctx, part) : readVml(d, ctx, part)) : null;
        if (img) out.push({ k: "img", img });
      }
      continue;
    }
    if (!WNS.has(ns)) continue;
    // Field codes and their state.
    if (c.localName === "fldChar") {
      const type = wattr(c, "fldCharType");
      if (type === "begin") part.fields.push({ instr: "", phase: "instr", kind: null, emitted: false });
      else if (type === "separate") {
        const f = part.fields[part.fields.length - 1];
        if (f) {
          f.phase = "result";
          const word = f.instr.trim().split(/\s+/)[0]?.toUpperCase();
          if (word === "PAGE" || word === "NUMPAGES") {
            f.kind = word;
            f.emitted = true;
            out.push({ k: "field", name: word, rp });
          }
        }
      } else if (type === "end") {
        const f = part.fields.pop();
        if (f && f.phase === "instr") {
          const word = f.instr.trim().split(/\s+/)[0]?.toUpperCase();
          if (word === "PAGE" || word === "NUMPAGES") out.push({ k: "field", name: word, rp });
        }
      }
      continue;
    }
    if (c.localName === "instrText") {
      const f = part.fields[part.fields.length - 1];
      if (f) f.instr += c.textContent || "";
      continue;
    }
    const cur = part.fields[part.fields.length - 1] ?? field;
    const hidden = (cur && (cur.phase === "instr" || cur.kind !== null)) || rp.vanish;
    if (hidden) continue;
    switch (c.localName) {
      case "t": {
        // A tab character typed into the text is a tab, the same as <w:tab/>.
        const parts = (c.textContent || "").split("\t");
        parts.forEach((t, i) => {
          if (i > 0) out.push({ k: "tab", rp });
          if (t) out.push({ k: "text", text: t, rp });
        });
        break;
      }
      case "tab":
      case "ptab":
        out.push({ k: "tab", rp });
        break;
      case "br":
      case "cr": {
        const type = wattr(c, "type");
        if (type === "page") out.push({ k: "page" });
        else out.push({ k: "br", rp });
        break;
      }
      case "noBreakHyphen":
        out.push({ k: "text", text: "‑", rp });
        break;
      case "sym": {
        const code = parseInt(wattr(c, "char") || "", 16);
        if (!isNaN(code)) {
          const { text, mapped } = symbolChar(String.fromCodePoint(code), wattr(c, "font") || undefined);
          out.push({ k: "text", text, rp: mapped ? rp : { ...rp, font: wattr(c, "font") || rp.font } });
        }
        break;
      }
      case "drawing": {
        const img = readDrawing(c, ctx, part);
        if (img) out.push({ k: "img", img });
        break;
      }
      case "pict":
      case "object": {
        const img = readVml(c, ctx, part);
        if (img) out.push({ k: "img", img });
        break;
      }
      case "footnoteReference": {
        const id = wattr(c, "id") || "";
        const note = ctx.footnotes.get(id);
        const num = ++ctx.footnoteCounter.n;
        const html = note ? blocksToHtml(note, ctx, { rels: footnoteRels(ctx), fields: [], footnoteNumber: num }) : "";
        out.push({ k: "fn", num, id, html, rp: rp.va ? rp : { ...rp, va: "sup" } });
        break;
      }
      case "footnoteRef":
        if (part.footnoteNumber !== undefined) out.push({ k: "text", text: String(part.footnoteNumber), rp: rp.va ? rp : { ...rp, va: "sup" } });
        break;
      default:
        break;
    }
  }
}

let footnoteRelsCache: { zip: JSZip; rels: Rels } | null = null;
function footnoteRels(ctx: Ctx): Rels {
  return footnoteRelsCache && footnoteRelsCache.zip === ctx.zip ? footnoteRelsCache.rels : new Map();
}

/* ------------------------------------------------------------------ */
/* Paragraph model                                                     */
/* ------------------------------------------------------------------ */

interface TableLayer {
  pPr: PP;
  rPr: RP;
}

interface ParaModel {
  pp: PP;
  /** Run properties every run starts from: defaults, table style, paragraph style. */
  baseRP: RP;
  /** Properties of the paragraph mark, which decide an empty line's height. */
  markRP: RP;
  styleId?: string;
  styleName?: string;
  items: Item[];
  sectPr?: Element;
}

function paraModel(p: Element, ctx: Ctx, part: Part, table?: TableLayer): ParaModel {
  const pPrEl = wkid(p, "pPr");
  const direct = parsePPr(pPrEl);
  const styleId = direct.pStyle || ctx.styles.defaultPara;
  const styleChain = chain(ctx.styles, styleId);
  const stylePP = styleChain.reduce<PP>((acc, s) => mergePP(acc, s.pPr), {});
  const styleRP = styleChain.reduce<RP>((acc, s) => mergeRP(acc, s.rPr), {});

  // Numbering can come from the paragraph or from its style.
  let pp = mergePP(ctx.styles.docPP, table?.pPr, stylePP);
  const numId = direct.numId ?? stylePP.numId;
  const ilvl = direct.ilvl ?? stylePP.ilvl ?? 0;
  const level = numId && numId !== "0" ? levelFor(ctx, numId, ilvl) : undefined;
  pp = mergePP(pp, level?.pPr, direct);
  pp.numId = numId;
  pp.ilvl = ilvl;

  const baseRP = mergeRP({ font: "Times New Roman", size: 10 }, ctx.styles.docRP, table?.rPr, styleRP);
  const markRP = mergeRP(baseRP, parseRPr(wkid(pPrEl, "rPr"), ctx.theme));
  const items: Item[] = [];
  collectInline(p, ctx, part, baseRP, items);
  return {
    pp,
    baseRP,
    markRP,
    styleId,
    styleName: styleId ? ctx.styles.defs.get(styleId)?.name : undefined,
    items,
    sectPr: wkid(pPrEl, "sectPr"),
  };
}

function levelFor(ctx: Ctx, numId: string, ilvl: number): Level | undefined {
  const num = ctx.numbering.nums.get(numId);
  if (!num) return undefined;
  return num.overrides.get(ilvl)?.level ?? ctx.numbering.abstracts.get(num.abs)?.[ilvl];
}

/** The marker text for a list paragraph, advancing Word's counters. */
function nextMarker(ctx: Ctx, numId: string, ilvl: number): { text: string; level: Level } | null {
  const num = ctx.numbering.nums.get(numId);
  if (!num) return null;
  const levels = ctx.numbering.abstracts.get(num.abs) ?? [];
  const lv = (k: number) => num.overrides.get(k)?.level ?? levels[k];
  const level = lv(ilvl);
  if (!level) return null;
  const counts = ctx.counters.get(num.abs) ?? [];
  const startKey = `${numId}:${ilvl}`;
  const override = num.overrides.get(ilvl)?.start;
  if (override !== undefined && !ctx.startedNums.has(startKey)) {
    ctx.startedNums.add(startKey);
    counts[ilvl] = override - 1;
  }
  counts[ilvl] = (counts[ilvl] ?? level.start - 1) + 1;
  for (let d = ilvl + 1; d < counts.length; d++) counts[d] = undefined as unknown as number;
  counts.length = Math.max(counts.length, ilvl + 1);
  ctx.counters.set(num.abs, counts);

  if (level.fmt === "bullet") return { text: level.text, level };
  const text = level.text.replace(/%(\d)/g, (_m, d: string) => {
    const k = parseInt(d, 10) - 1;
    const lvK = lv(k);
    const value = counts[k] ?? lvK?.start ?? 1;
    return formatNumber(value, level.isLgl ? "decimal" : lvK?.fmt ?? "decimal");
  });
  return { text, level };
}

/** How much taller than its font size a single line is, by font, as Word lays it out. */
function lineFactor(font?: string): number {
  const f = (font || "").toLowerCase();
  if (f.includes("calibri")) return 1.22;
  if (f.includes("cambria")) return 1.172;
  if (f.includes("georgia")) return 1.136;
  if (f.includes("arial")) return 1.149;
  if (f.includes("times")) return 1.15;
  if (f.includes("verdana")) return 1.215;
  if (f.includes("tahoma")) return 1.207;
  if (f.includes("segoe")) return 1.33;
  if (f.includes("garamond")) return 1.12;
  if (f.includes("century gothic")) return 1.225;
  if (f.includes("aptos")) return 1.2;
  if (f.includes("courier")) return 1.133;
  return 1.17;
}

function borderCss(b: Border | undefined): string | undefined {
  if (!b) return undefined;
  if (b.val === "nil" || b.val === "none") return "none";
  const style = /double/.test(b.val) ? "double" : /dot/.test(b.val) ? "dotted" : /dash/.test(b.val) ? "dashed" : "solid";
  const width = Math.max(style === "double" ? 2.25 : 0.5, b.val === "thick" ? b.sz * 2 : b.sz);
  return `${pt(width)} ${style} ${b.color}`;
}

/** The CSS that makes a block look the way Word draws the paragraph. */
function blockCss(pp: PP, base: RP, mark: RP, empty: boolean): BlockStyle {
  const css: BlockStyle = {};
  const before = pp.beforeAuto ? 14 : pp.before ?? 0;
  const after = pp.afterAuto ? 14 : pp.after ?? 0;
  css.marginTop = pt(before);
  css.marginBottom = pt(after);
  if (pp.left) css.marginLeft = pt(pp.left);
  if (pp.right) css.marginRight = pt(pp.right);
  if (pp.firstLine) css.textIndent = pt(pp.firstLine);
  else if (pp.hanging) css.textIndent = pt(-pp.hanging);

  const run = empty ? mark : base;
  const size = run.size ?? 10;
  const factor = lineFactor(run.font);
  if (pp.lineRule === "exact" && pp.line) css.lineHeight = pt(pp.line / 20);
  else if (pp.lineRule === "atLeast" && pp.line) css.lineHeight = pt(Math.max(pp.line / 20, size * factor));
  else css.lineHeight = String(Math.round(((pp.line ?? 240) / 240) * factor * 1000) / 1000);

  css.fontFamily = fontStack(run.font || "Times New Roman");
  css.fontSize = pt(size);
  if (run.color && run.color !== "auto") css.color = run.color;
  if (run.spacing) css.letterSpacing = pt(run.spacing);
  if (pp.shd) css.backgroundColor = pp.shd;
  const sides = pp.borders ?? {};
  for (const side of ["top", "bottom", "left", "right"] as const) {
    const b = sides[side];
    const v = borderCss(b);
    if (!v || v === "none") continue;
    const cap = side[0].toUpperCase() + side.slice(1);
    css[`border${cap}`] = v;
    css[`padding${cap}`] = pt(b!.space);
  }
  return css;
}

function alignmentOf(jc?: string): "left" | "center" | "right" | "justify" {
  switch (jc) {
    case "center":
      return "center";
    case "right":
    case "end":
      return "right";
    case "both":
    case "distribute":
    case "thaiDistribute":
    case "lowKashida":
    case "mediumKashida":
    case "highKashida":
      return "justify";
    default:
      return "left";
  }
}

function tabStopsOf(pp: PP): DocxTabStop[] | undefined {
  const tabs = (pp.tabs ?? []).filter((t) => t.val !== "clear" && t.val !== "bar" && t.val !== "num");
  if (tabs.length === 0) return undefined;
  return tabs.map((t) => ({
    pos: Math.round(t.pos * 100) / 100,
    align: t.val === "center" ? "center" : t.val === "right" || t.val === "end" ? "right" : t.val === "decimal" ? "decimal" : "left",
    leader:
      t.leader === "dot" ? "dot" : t.leader === "hyphen" ? "hyphen" : t.leader === "underscore" || t.leader === "heavy" ? "underscore" : t.leader === "middleDot" ? "middleDot" : undefined,
  }));
}

/** What a run looks like, as the difference from its paragraph's own font, size and colour. */
function fmtOf(rp: RP, base: RP): Fmt {
  const f: Fmt = {};
  if (rp.font && rp.font !== base.font) f.font = rp.font;
  if (rp.size && rp.size !== base.size) f.size = rp.size;
  if (rp.b) f.b = true;
  if (rp.i) f.i = true;
  if (rp.u) f.u = true;
  if (rp.s) f.s = true;
  if (rp.caps) f.caps = true;
  if (rp.sc) f.sc = true;
  if (rp.va === "sup") f.sup = true;
  if (rp.va === "sub") f.sub = true;
  if (rp.color && rp.color !== base.color) f.color = rp.color === "auto" ? "#000000" : rp.color;
  if (rp.bg && rp.bg !== "none" && rp.bg !== base.bg) f.bg = rp.bg;
  return f;
}

/** Inline items as formatted runs, with spaces collapsed the way the page shows them. */
function itemsToRuns(items: Item[], base: RP): { runs: Run[]; footnotes: { id: string; html: string }[]; images: ImageInfo[] } {
  const runs: Run[] = [];
  const footnotes: { id: string; html: string }[] = [];
  const images: ImageInfo[] = [];
  let lastWs = true;
  for (const it of items) {
    if (it.k === "text") {
      let text = "";
      for (const ch of it.text) {
        const ws = ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
        if (ws) {
          if (!lastWs) text += " ";
          lastWs = true;
        } else {
          text += ch;
          lastWs = false;
        }
      }
      if (text) runs.push({ text, f: fmtOf(it.rp, base) });
    } else if (it.k === "tab") {
      // A tab replaces a space just before it.
      const prev = runs[runs.length - 1];
      if (prev && !prev.f.tab && !prev.f.br && prev.text.endsWith(" ")) prev.text = prev.text.slice(0, -1);
      runs.push({ text: "\t", f: { ...fmtOf(it.rp, base), tab: true } });
      lastWs = true;
    } else if (it.k === "br") {
      const prev = runs[runs.length - 1];
      if (prev && !prev.f.tab && !prev.f.br && prev.text.endsWith(" ")) prev.text = prev.text.slice(0, -1);
      runs.push({ text: "\n", f: { br: true } });
      lastWs = true;
    } else if (it.k === "eq") {
      runs.push({ text: equationToken(it.id), f: fmtOf(it.rp, base) });
      lastWs = false;
    } else if (it.k === "fn") {
      runs.push({ text: String(it.num), f: { ...fmtOf(it.rp, base), fn: it.id } });
      footnotes.push({ id: String(it.num), html: it.html });
      lastWs = false;
    } else if (it.k === "field") {
      runs.push({ text: it.name === "PAGE" ? "{{PAGE}}" : "{{NUMPAGES}}", f: fmtOf(it.rp, base) });
      lastWs = false;
    } else if (it.k === "img") {
      images.push(it.img);
    }
  }
  // Trailing spaces at the end of a paragraph are not drawn.
  const last = runs[runs.length - 1];
  if (last && !last.f.tab && !last.f.br) last.text = last.text.replace(/ +$/, "");
  return { runs: runs.filter((r) => r.text.length > 0), footnotes, images };
}

function imageHtml(img: ImageInfo): string {
  const size = `width:${pt(img.widthPt)};height:${pt(img.heightPt)}`;
  if (img.html) return img.html;
  if (img.url) return `<img src="${escapeAttr(img.url)}" alt="" style="${size};vertical-align:bottom;display:inline-block" />`;
  return `<span class="dx-unsupported" style="${size};display:inline-flex;vertical-align:bottom">${escapeAttr(img.unsupported || "Picture")}</span>`;
}

/** A marker such as "1." or a bullet, followed by the tab Word puts after it. */
function markerHtml(ctx: Ctx, model: ParaModel): { html: string; isBullet: boolean } | null {
  const { numId, ilvl = 0 } = model.pp;
  if (!numId || numId === "0") return null;
  const marker = nextMarker(ctx, numId, ilvl);
  if (!marker) return null;
  const { level } = marker;
  const sym = symbolChar(marker.text, level.font ?? level.rPr.font);
  const rp = mergeRP(model.markRP, level.rPr);
  if (sym.mapped) rp.font = model.baseRP.font;
  // The marker never takes the paragraph's underline or highlight.
  const f = fmtOf({ ...rp, u: level.rPr.u, bg: undefined }, model.baseRP);
  const text = runsToHtml([{ text: sym.text || " ", f: { ...f, b: rp.b || undefined } }]) ?? escapeAttr(sym.text);
  const after = level.suff === "space" ? " " : level.suff === "nothing" ? "" : '<span class="dx-tab">\t</span>';
  return { html: `<span data-marker contenteditable="false">${text}${after}</span>`, isBullet: level.fmt === "bullet" };
}

/** A paragraph drawn as static HTML: used for headers, footers, footnotes and table cells. */
function staticParagraph(p: Element, ctx: Ctx, part: Part, table?: TableLayer): string {
  const model = paraModel(p, ctx, part, table);
  const marker = markerHtml(ctx, model);
  const { runs, images } = itemsToRuns(model.items.filter((i) => i.k !== "page"), model.baseRP);
  const empty = runs.length === 0 && images.length === 0;
  const css = blockCss(model.pp, model.baseRP, model.markRP, empty);
  css.textAlign = alignmentOf(model.pp.jc);
  let body = runsToHtml(runs) ?? runs.map((r) => r.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("");
  body = body.replace(/\{\{PAGE\}\}/g, '<span data-field="PAGE"></span>').replace(/\{\{NUMPAGES\}\}/g, '<span data-field="NUMPAGES"></span>');
  const pics = images.map(imageHtml).join("");
  const tabs = tabStopsOf(model.pp);
  const tabAttr = tabs ? ` data-tabs="${escapeAttr(JSON.stringify(tabs))}"` : "";
  return `<div class="dx-p" style="${escapeAttr(cssText(css))}"${tabAttr}>${marker?.html ?? ""}${pics}${body || "<br>"}</div>`;
}

/** Paragraphs and tables inside a container (header, footer, footnote, cell) as static HTML. */
function blocksToHtml(container: Element, ctx: Ctx, part: Part, table?: TableLayer): string {
  let html = "";
  for (const el of kids(container)) {
    if (isW(el, "p")) html += staticParagraph(el, ctx, part, table);
    else if (isW(el, "tbl")) html += tableHtml(readTable(el, ctx, part).model);
    else if (isW(el, "sdt")) {
      const content = wkid(el, "sdtContent");
      if (content) html += blocksToHtml(content, ctx, part, table);
    } else if (isW(el, "customXml")) html += blocksToHtml(el, ctx, part, table);
  }
  return html;
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

interface TableRead {
  model: DocxTableModel;
  tableData: string[][];
}

type Sides = Partial<Record<"top" | "bottom" | "left" | "right" | "insideH" | "insideV", Border>>;

function readBorders(el: Element | undefined): Sides {
  const out: Sides = {};
  if (!el) return out;
  const map: Record<string, keyof Sides> = { top: "top", bottom: "bottom", left: "left", start: "left", right: "right", end: "right", insideH: "insideH", insideV: "insideV" };
  for (const c of kids(el)) {
    const key = map[c.localName];
    if (key) out[key] = parseBorder(c);
  }
  return out;
}

function readMargins(el: Element | undefined): Partial<Record<"top" | "bottom" | "left" | "right", number>> {
  const out: Partial<Record<"top" | "bottom" | "left" | "right", number>> = {};
  if (!el) return out;
  const map: Record<string, "top" | "bottom" | "left" | "right"> = { top: "top", bottom: "bottom", left: "left", start: "left", right: "right", end: "right" };
  for (const c of kids(el)) {
    const key = map[c.localName];
    const w = twip(wattr(c, "w"));
    if (key && w !== undefined && (wattr(c, "type") ?? "dxa") === "dxa") out[key] = w;
  }
  return out;
}

function readTable(tbl: Element, ctx: Ctx, part: Part): TableRead {
  const tblPr = wkid(tbl, "tblPr");
  const styleId = wattr(wkid(tblPr, "tblStyle"), "val") || ctx.styles.defaultTable;
  const styleChain = chain(ctx.styles, styleId);
  const stylePP = styleChain.reduce<PP>((acc, s) => mergePP(acc, s.pPr), {});
  const styleRP = styleChain.reduce<RP>((acc, s) => mergeRP(acc, s.rPr), {});
  const conds: Record<string, TableCond> = {};
  for (const s of styleChain) for (const [k, v] of Object.entries(s.conds)) conds[k] = { pPr: mergePP(conds[k]?.pPr, v.pPr), rPr: mergeRP(conds[k]?.rPr, v.rPr), tcPr: v.tcPr ?? conds[k]?.tcPr };

  let borders: Sides = {};
  let cellMar: Partial<Record<"top" | "bottom" | "left" | "right", number>> = { left: 5.4, right: 5.4 };
  for (const s of styleChain) {
    borders = { ...borders, ...readBorders(wkid(s.tblPr, "tblBorders")) };
    cellMar = { ...cellMar, ...readMargins(wkid(s.tblPr, "tblCellMar")) };
  }
  borders = { ...borders, ...readBorders(wkid(tblPr, "tblBorders")) };
  cellMar = { ...cellMar, ...readMargins(wkid(tblPr, "tblCellMar")) };

  // Which conditional parts of the table style are switched on.
  const look = wkid(tblPr, "tblLook");
  const lookVal = parseInt(wattr(look, "val") || "0", 16);
  const flag = (attr: string, bit: number, dflt: boolean) => {
    const a = wattr(look, attr);
    if (a !== null) return a === "1" || a === "true";
    return look ? (lookVal & bit) !== 0 : dflt;
  };
  const useFirstRow = flag("firstRow", 0x20, true);
  const useLastRow = flag("lastRow", 0x40, false);
  const useFirstCol = flag("firstColumn", 0x80, true);
  const useLastCol = flag("lastColumn", 0x100, false);
  const useHBand = !flag("noHBand", 0x200, false);
  const useVBand = !flag("noVBand", 0x400, true);

  const grid = wkids(wkid(tbl, "tblGrid"), "gridCol").map((g) => twip(wattr(g, "w")) ?? 0);
  const rowsEl = wkids(tbl, "tr");

  // Lay the cells on the grid first, so merged cells can be counted.
  interface Placed {
    tc: Element;
    row: number;
    col: number;
    span: number;
    vmerge?: "restart" | "continue";
  }
  const placed: Placed[][] = rowsEl.map((tr, row) => {
    const out: Placed[] = [];
    let col = parseInt(wattr(wkid(wkid(tr, "trPr"), "gridBefore"), "val") || "0", 10) || 0;
    const tcs: Element[] = [];
    for (const c of kids(tr)) {
      if (isW(c, "tc")) tcs.push(c);
      else if (isW(c, "sdt")) wkids(wkid(c, "sdtContent"), "tc").forEach((x) => tcs.push(x));
    }
    for (const tc of tcs) {
      const tcPr = wkid(tc, "tcPr");
      const span = parseInt(wattr(wkid(tcPr, "gridSpan"), "val") || "1", 10) || 1;
      const vm = wkid(tcPr, "vMerge");
      const vmerge = vm ? (wattr(vm, "val") === "restart" ? "restart" : "continue") : undefined;
      out.push({ tc, row, col, span, vmerge });
      col += span;
    }
    return out;
  });
  const colCount = Math.max(grid.length, ...placed.map((r) => r.reduce((n, c) => Math.max(n, c.col + c.span), 0)));
  const at = (row: number, col: number) => placed[row]?.find((c) => c.col === col);

  const lastRow = rowsEl.length - 1;
  const model: DocxTableModel = { style: {}, colWidthsPt: grid, rows: [] };
  const tableData: string[][] = [];

  placed.forEach((cells, r) => {
    const tr = rowsEl[r];
    const trPr = wkid(tr, "trPr");
    const h = wkid(trPr, "trHeight");
    const rowModel: DocxTableModel["rows"][number] = { cells: [] };
    if (h) {
      rowModel.heightPt = twip(wattr(h, "val"));
      rowModel.exactHeight = wattr(h, "hRule") === "exact";
    }
    const dataRow: string[] = [];
    for (const cell of cells) {
      if (cell.vmerge === "continue") continue;
      let rowSpan = 1;
      if (cell.vmerge === "restart") {
        while (r + rowSpan <= lastRow && at(r + rowSpan, cell.col)?.vmerge === "continue") rowSpan++;
      }
      const bodyRow = useFirstRow ? r - 1 : r;
      const condNames: string[] = ["wholeTable"];
      if (useVBand) condNames.push(cell.col % 2 === (useFirstCol ? 1 : 0) ? "band1Vert" : "band2Vert");
      if (useHBand && !(useFirstRow && r === 0) && !(useLastRow && r === lastRow)) condNames.push(bodyRow % 2 === 0 ? "band1Horz" : "band2Horz");
      if (useFirstCol && cell.col === 0) condNames.push("firstCol");
      if (useLastCol && cell.col + cell.span === colCount) condNames.push("lastCol");
      if (useFirstRow && r === 0) condNames.push("firstRow");
      if (useLastRow && r === lastRow) condNames.push("lastRow");
      if (useFirstRow && r === 0 && cell.col === 0) condNames.push("nwCell");
      const active = condNames.map((n) => conds[n]).filter(Boolean) as TableCond[];

      const tcPr = wkid(cell.tc, "tcPr");
      let cellBorders: Sides = {};
      let shade: string | undefined;
      let mar = { ...cellMar };
      let vAlign: string | undefined;
      for (const c of active) {
        cellBorders = { ...cellBorders, ...readBorders(wkid(c.tcPr, "tcBorders")) };
        const f = wattr(wkid(c.tcPr, "shd"), "fill");
        if (f && f !== "auto") shade = hex(f);
      }
      cellBorders = { ...cellBorders, ...readBorders(wkid(tcPr, "tcBorders")) };
      const fill = wattr(wkid(tcPr, "shd"), "fill");
      if (fill && fill !== "auto") shade = hex(fill);
      mar = { ...mar, ...readMargins(wkid(tcPr, "tcMar")) };
      vAlign = wattr(wkid(tcPr, "vAlign"), "val") || undefined;

      const top = cellBorders.top ?? (r === 0 ? borders.top : borders.insideH);
      const bottom = cellBorders.bottom ?? (r + rowSpan - 1 === lastRow ? borders.bottom : borders.insideH);
      const left = cellBorders.left ?? (cell.col === 0 ? borders.left : borders.insideV);
      const right = cellBorders.right ?? (cell.col + cell.span >= colCount ? borders.right : borders.insideV);

      const style: BlockStyle = {
        paddingTop: pt(mar.top ?? 0),
        paddingBottom: pt(mar.bottom ?? 0),
        paddingLeft: pt(mar.left ?? 5.4),
        paddingRight: pt(mar.right ?? 5.4),
        verticalAlign: vAlign === "center" ? "middle" : vAlign === "bottom" ? "bottom" : "top",
        borderTop: borderCss(top) ?? "none",
        borderBottom: borderCss(bottom) ?? "none",
        borderLeft: borderCss(left) ?? "none",
        borderRight: borderCss(right) ?? "none",
      };
      if (shade) style.backgroundColor = shade;

      const layer: TableLayer = {
        pPr: active.reduce<PP>((acc, c) => mergePP(acc, c.pPr), stylePP),
        rPr: active.reduce<RP>((acc, c) => mergeRP(acc, c.rPr), styleRP),
      };
      // The text is read first without moving any counters, so equation ids match the drawn cell.
      const text = wkids(cell.tc, "p")
        .map((p) => {
          const { runs } = itemsToRuns(paraModelQuiet(p, ctx, part, layer).items, {});
          return runs.map((x) => (x.f.tab || x.f.br ? " " : x.text)).join("");
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const firstP = wkid(cell.tc, "p");
      let firstBlockStyle: BlockStyle | undefined;
      if (firstP) {
        const m = paraModelQuiet(firstP, ctx, part, layer);
        firstBlockStyle = { ...blockCss(m.pp, m.baseRP, m.markRP, false), textAlign: alignmentOf(m.pp.jc) };
      }
      const html = blocksToHtml(cell.tc, ctx, part, layer);
      const out: DocxTableCell = { html, text, style, firstBlockStyle };
      if (cell.span > 1) out.colSpan = cell.span;
      if (rowSpan > 1) out.rowSpan = rowSpan;
      rowModel.cells.push(out);
      dataRow.push(text);
    }
    model.rows.push(rowModel);
    tableData.push(dataRow);
  });

  // Table width, indent and alignment.
  const tblW = wkid(tblPr, "tblW");
  const total = grid.reduce((a, b) => a + b, 0);
  const style: BlockStyle = { borderCollapse: "collapse", tableLayout: total > 0 ? "fixed" : "auto" };
  if (total > 0) style.width = pt(total);
  else if (wattr(tblW, "type") === "pct") style.width = `${parseFloat(wattr(tblW, "w") || "5000") / 50}%`;
  let indent = twip(wattr(wkid(tblPr, "tblInd"), "w")) ?? 0;
  // Before Word 2013, a table sat out in the margin by its cell padding so the text lined up.
  if (ctx.compatMode < 15) indent -= cellMar.left ?? 5.4;
  const jc = wattr(wkid(tblPr, "jc"), "val");
  if (jc === "center") {
    style.marginLeft = "auto";
    style.marginRight = "auto";
  } else if (jc === "right" || jc === "end") style.marginLeft = "auto";
  else if (indent) style.marginLeft = pt(indent);
  model.style = style;
  return { model, tableData };
}

/** Builds a paragraph model without moving list counters (for reading text a second time). */
function paraModelQuiet(p: Element, ctx: Ctx, part: Part, table?: TableLayer): ParaModel {
  const counters = new Map(Array.from(ctx.counters.entries()).map(([k, v]) => [k, [...v]]));
  const started = new Set(ctx.startedNums);
  const eq = ctx.eqCounter.n;
  const eqs = { ...ctx.equations };
  const fn = ctx.footnoteCounter.n;
  const model = paraModel(p, ctx, { ...part, fields: [] }, table);
  ctx.counters = counters;
  ctx.startedNums = started;
  ctx.eqCounter.n = eq;
  for (const k of Object.keys(ctx.equations)) if (!(k in eqs)) delete ctx.equations[k];
  ctx.footnoteCounter.n = fn;
  return model;
}

/** A table model as static HTML (used inside headers, footers and nested tables). */
export function tableHtml(model: DocxTableModel): string {
  const cols = model.colWidthsPt.length ? `<colgroup>${model.colWidthsPt.map((w) => `<col style="width:${pt(w)}">`).join("")}</colgroup>` : "";
  const rows = model.rows
    .map((r) => {
      const h = r.heightPt ? ` style="height:${pt(r.heightPt)}"` : "";
      const cells = r.cells
        .map((c) => `<td${c.colSpan ? ` colspan="${c.colSpan}"` : ""}${c.rowSpan ? ` rowspan="${c.rowSpan}"` : ""} style="${escapeAttr(cssText(c.style))}">${c.html}</td>`)
        .join("");
      return `<tr${h}>${cells}</tr>`;
    })
    .join("");
  return `<table class="dx-table" style="${escapeAttr(cssText(model.style))}">${cols}<tbody>${rows}</tbody></table>`;
}

/* ------------------------------------------------------------------ */
/* Sections, headers and footers                                       */
/* ------------------------------------------------------------------ */

async function readSection(sectPr: Element | undefined, ctx: Ctx, docRels: Rels, prev?: DocxSection): Promise<DocxSection> {
  const pgSz = wkid(sectPr, "pgSz");
  const pgMar = wkid(sectPr, "pgMar");
  const sec: DocxSection = {
    widthPt: twip(wattr(pgSz, "w")) ?? prev?.widthPt ?? 612,
    heightPt: twip(wattr(pgSz, "h")) ?? prev?.heightPt ?? 792,
    marginTopPt: Math.abs(twip(wattr(pgMar, "top")) ?? prev?.marginTopPt ?? 72),
    marginRightPt: twip(wattr(pgMar, "right")) ?? prev?.marginRightPt ?? 72,
    marginBottomPt: Math.abs(twip(wattr(pgMar, "bottom")) ?? prev?.marginBottomPt ?? 72),
    marginLeftPt: (twip(wattr(pgMar, "left")) ?? prev?.marginLeftPt ?? 72) + (twip(wattr(pgMar, "gutter")) ?? 0),
    headerPt: twip(wattr(pgMar, "header")) ?? prev?.headerPt ?? 36,
    footerPt: twip(wattr(pgMar, "footer")) ?? prev?.footerPt ?? 36,
    titlePg: !!wkid(sectPr, "titlePg") && onOff(wkid(sectPr, "titlePg")) !== false,
    header: prev?.header,
    footer: prev?.footer,
    firstHeader: prev?.firstHeader,
    firstFooter: prev?.firstFooter,
  };
  for (const ref of [...wkids(sectPr, "headerReference"), ...wkids(sectPr, "footerReference")]) {
    const type = wattr(ref, "type") || "default";
    const rel = docRels.get(rattr(ref, "id") || "");
    if (!rel || (type !== "default" && type !== "first")) continue;
    const xml = await ctx.zip.file(rel.target)?.async("string");
    if (!xml) continue;
    const dir = rel.target.split("/").slice(0, -1).join("/");
    const name = rel.target.split("/").pop();
    const rels = parseRels((await ctx.zip.file(`${dir}/_rels/${name}.rels`)?.async("string")) ?? null, dir);
    const html = blocksToHtml(parseXml(xml).documentElement, ctx, { rels, fields: [] });
    const isHeader = ref.localName === "headerReference";
    if (type === "first") {
      if (isHeader) sec.firstHeader = html;
      else sec.firstFooter = html;
    } else if (isHeader) sec.header = html;
    else sec.footer = html;
  }
  return sec;
}

/* ------------------------------------------------------------------ */
/* Fingerprints                                                        */
/* ------------------------------------------------------------------ */

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

/** A fingerprint of what the writer can change in a block. Equal fingerprints mean the block is untouched. */
export function contentSignature(n: DocumentParagraphNode): string {
  return hash(
    JSON.stringify([
      n.type,
      n.sentences.map((s) => [s.text, s.formattedHtml ?? null]),
      n.tableData ?? null,
      n.imageUrl ? hash(n.imageUrl) : null,
      n.imageWidthPt ?? null,
      n.widthPercent ?? null,
    ])
  );
}

/* ------------------------------------------------------------------ */
/* The document                                                        */
/* ------------------------------------------------------------------ */

export interface ImportedDocx {
  paragraphs: DocumentParagraphNode[];
  equations: EquationMap;
  layout: DocxLayout;
  wordCount: number;
}

const CAPTION = /^(figure|fig\.?|table|chart|plate|graph)\s*[\dA-Za-z]+([.\-]\d+)*\s*[:.\-–—]/i;

export async function importDocx(buffer: ArrayBuffer, docId: string): Promise<ImportedDocx> {
  const zip = await JSZip.loadAsync(buffer);
  const read = async (path: string) => (await zip.file(path)?.async("string")) ?? null;

  // The main document part is named in the package relationships.
  const rootRels = parseRels(await read("_rels/.rels"), "");
  const mainRel = Array.from(rootRels.values()).find((r) => /officeDocument$/.test(r.type));
  const mainPath = mainRel?.target || "word/document.xml";
  const mainDir = mainPath.split("/").slice(0, -1).join("/") || "word";
  const mainXml = await read(mainPath);
  if (!mainXml) throw new Error("This file has no Word document inside. Please choose a .docx file saved from Word.");
  const docRels = parseRels(await read(`${mainDir}/_rels/${mainPath.split("/").pop()}.rels`), mainDir);

  const relOfType = (suffix: string) => Array.from(docRels.values()).find((r) => r.type.endsWith(suffix))?.target;

  // Theme fonts.
  const theme: Theme = {};
  const themeXml = await read(relOfType("/theme") || `${mainDir}/theme/theme1.xml`);
  if (themeXml) {
    const t = parseXml(themeXml);
    const major = byLocal(t.documentElement, "majorFont")[0];
    const minor = byLocal(t.documentElement, "minorFont")[0];
    theme.major = major ? byLocal(major, "latin")[0]?.getAttribute("typeface") || undefined : undefined;
    theme.minor = minor ? byLocal(minor, "latin")[0]?.getAttribute("typeface") || undefined : undefined;
  }

  const styles = parseStyles(await read(relOfType("/styles") || `${mainDir}/styles.xml`), theme);
  const numbering = parseNumbering(await read(relOfType("/numbering") || `${mainDir}/numbering.xml`), theme);

  const settingsXml = await read(relOfType("/settings") || `${mainDir}/settings.xml`);
  let defaultTabPt = 36;
  let compatMode = 12;
  if (settingsXml) {
    const s = parseXml(settingsXml).documentElement;
    defaultTabPt = twip(wattr(wkid(s, "defaultTabStop"), "val")) ?? 36;
    const compat = byLocal(s, "compatSetting").find((c) => wattr(c, "name") === "compatibilityMode");
    if (compat) compatMode = parseInt(wattr(compat, "val") || "12", 10) || 12;
  }

  // Every picture, as a data URL the page can show.
  const media = new Map<string, string>();
  await Promise.all(
    Object.keys(zip.files)
      .filter((p) => /\.(png|jpe?g|gif|bmp|svg|webp|ico)$/i.test(p) && !zip.files[p].dir)
      .map(async (p) => {
        const ext = p.split(".").pop()!.toLowerCase();
        media.set(p, `data:${MIME[ext]};base64,${await zip.file(p)!.async("base64")}`);
      })
  );

  // Charts and SmartArt are drawn from their own parts of the package.
  const parts = new Map<string, string>();
  await Promise.all(
    Object.keys(zip.files)
      .filter((p) => /(^|\/)(charts|diagrams)\/[^/]+\.xml$/i.test(p))
      .map(async (p) => parts.set(p, await zip.file(p)!.async("string")))
  );
  const themeColors = parseThemeColors(themeXml);

  // Footnotes.
  const footnotes = new Map<string, Element>();
  const fnPath = relOfType("/footnotes");
  if (fnPath) {
    const fnXml = await read(fnPath);
    if (fnXml) {
      for (const f of wkids(parseXml(fnXml).documentElement, "footnote")) {
        const type = wattr(f, "type");
        if (!type || type === "normal") footnotes.set(wattr(f, "id") || "", f);
      }
      const dir = fnPath.split("/").slice(0, -1).join("/");
      footnoteRelsCache = { zip, rels: parseRels(await read(`${dir}/_rels/${fnPath.split("/").pop()}.rels`), dir) };
    }
  }

  const ctx: Ctx = {
    zip,
    theme,
    styles,
    numbering,
    media,
    parts,
    themeColors,
    objectFont: fontStack(theme.minor || "Calibri"),
    counters: new Map(),
    startedNums: new Set(),
    equations: {},
    eqCounter: { n: 0 },
    footnotes,
    footnoteCounter: { n: 0 },
    compatMode,
    serializer: new XMLSerializer(),
  };
  const part: Part = { rels: docRels, fields: [] };

  const doc = parseXml(mainXml);
  if (doc.getElementsByTagName("parsererror").length) throw new Error("This Word file could not be read. It may be damaged.");
  const body = wkid(doc.documentElement, "body");
  if (!body) throw new Error("This Word file has no body text.");

  const nodes: DocumentParagraphNode[] = [];
  const sectionEls: (Element | undefined)[] = [];
  let section = 0;
  let pendingBreak = false;
  let nodeCounter = 0;
  let sentenceCounter = 0;
  let prevPara: { node: DocumentParagraphNode; styleId?: string; contextual?: boolean } | null = null;
  const newNodeId = () => `${docId}_n${++nodeCounter}`;

  const makeSentences = (nodeId: string, runs: Run[], ignored: boolean): DocumentSentence[] => {
    const full = runs.map((r) => r.text).join("");
    const plain = full.replace(/[\t\n]/g, " ");
    const texts = splitSentenceTexts(plain);
    const htmls = splitRunsBySentence(runs, texts);
    let cursor = 0;
    return texts.map((text, k) => {
      const start = Math.max(0, plain.indexOf(text.slice(0, 12), cursor));
      cursor = start + text.length;
      return {
        id: `${docId}_s${++sentenceCounter}`,
        nodeId,
        paragraphIndex: nodes.length,
        text,
        formattedHtml: htmls[k],
        charStart: start,
        charEnd: start + text.length,
        locked: false,
        ignored,
      };
    });
  };

  const handleParagraph = (p: Element, path: number[]) => {
    const model = paraModel(p, ctx, part);
    const styleName = model.styleName || "Normal";
    const outline = model.pp.outline;
    const headingMatch = /^heading\s*(\d)/i.exec(styleName);
    const headingLevel = headingMatch ? parseInt(headingMatch[1], 10) : outline !== undefined && outline < 9 ? outline + 1 : undefined;
    const marker = markerHtml(ctx, model);
    const alignment = alignmentOf(model.pp.jc);
    const tabStops = tabStopsOf(model.pp);
    const isToc = /^toc\s*\d|^table of figures/i.test(styleName);

    // A page break inside the paragraph cuts it into pieces that sit on different pages.
    const segments: Item[][] = [[]];
    for (const it of model.items) {
      if (it.k === "page") segments.push([]);
      else segments[segments.length - 1].push(it);
    }
    const hasContent = (seg: Item[]) => seg.some((i) => i.k !== "text" || i.text.trim().length > 0);
    const withContent = segments.map((s, i) => (hasContent(s) ? i : -1)).filter((i) => i >= 0);
    // Word keeps a break and the paragraph mark after it on the same line, so a break with nothing
    // after it only means the next block starts a new page.
    const firstIdx = withContent.length ? withContent[0] : 0;
    const lastIdx = withContent.length ? withContent[withContent.length - 1] : 0;
    const leadBreak = withContent.length > 0 && firstIdx > 0;
    const trailBreak = segments.length > 1 && lastIdx < segments.length - 1;
    const pieces = segments.slice(firstIdx, lastIdx + 1);

    pieces.forEach((seg, partIdx) => {
      const { runs, footnotes: notes, images } = itemsToRuns(seg, model.baseRP);
      const id = newNodeId();
      const textual = runs.some((r) => !r.f.tab && !r.f.br && r.text.trim());
      const first = partIdx === 0;
      const last = partIdx === pieces.length - 1;
      const css = blockCss(model.pp, model.baseRP, model.markRP, !textual && images.length === 0);
      if (!first) {
        css.marginTop = "0pt";
        delete css.textIndent;
      }
      if (!last) css.marginBottom = "0pt";

      const pageBreakBefore = pendingBreak || (first && (!!model.pp.pageBreakBefore || leadBreak)) || !first;
      pendingBreak = false;

      const base: DocumentParagraphNode = {
        id,
        documentId: docId,
        type: "paragraph",
        styleName,
        alignment,
        blockStyle: css,
        section,
        sentences: [],
        orderNo: nodes.length + 1,
        docx: {
          path,
          sig: "",
          align: alignment,
          ...(pieces.length > 1 ? { part: partIdx, parts: pieces.length } : {}),
          ...(first && leadBreak ? { leadBreak: true } : {}),
          ...(last && trailBreak ? { trailBreak: true } : {}),
        },
      };
      if (pageBreakBefore) base.pageBreakBefore = true;
      if (tabStops) base.tabStops = tabStops;

      // A paragraph that is only one picture becomes a figure block.
      if (!textual && images.length === 1 && !marker) {
        const img = images[0];
        nodes.push({
          ...base,
          type: "image",
          styleName: "Figure",
          imageUrl: img.url ?? "",
          ...(img.html ? { imageHtml: img.html } : {}),
          imageWidthPt: img.widthPt,
          imageHeightPt: img.heightPt,
          imageUnsupported: img.unsupported,
          blockStyle: { ...css, lineHeight: "normal" },
        });
        prevPara = null;
        return;
      }

      const prefix = (first && marker ? marker.html : "") + images.map(imageHtml).join("");
      if (prefix) base.listMarkerHtml = prefix;
      if (marker && first) {
        base.type = "list_item";
        base.listType = marker.isBullet ? "bullet" : "number";
        base.level = model.pp.ilvl ?? 0;
      } else if (headingLevel && textual) {
        base.type = "heading";
        base.level = Math.min(6, headingLevel);
      } else if (/quote/i.test(styleName)) base.type = "blockquote";

      if (!textual && images.length === 0) {
        base.isEmptyLine = true;
        // An empty line still holds the tab or line breaks it was given.
        if (runs.length) base.sentences = [];
      } else {
        const plainText = runs.map((r) => r.text).join("").replace(/\s+/g, " ").trim();
        const ignored = isToc || /caption/i.test(styleName) || (CAPTION.test(plainText) && plainText.length < 300);
        if (/caption/i.test(styleName) || (CAPTION.test(plainText) && plainText.length < 300)) base.styleName = styleName === "Normal" ? "Caption" : styleName;
        base.sentences = makeSentences(id, runs, ignored);
      }
      if (notes.length) base.footnotes = notes;

      // Word drops the space between paragraphs of the same style when asked to.
      if (prevPara && model.pp.contextual && prevPara.styleId === model.styleId && first) {
        base.blockStyle = { ...base.blockStyle, marginTop: "0pt" };
        if (prevPara.contextual) prevPara.node.blockStyle = { ...prevPara.node.blockStyle, marginBottom: "0pt" };
      }
      nodes.push(base);
      prevPara = { node: base, styleId: model.styleId, contextual: model.pp.contextual };
    });
    if (trailBreak) pendingBreak = true;

    // A section break ends this section after the paragraph.
    if (model.sectPr) {
      sectionEls[section] = model.sectPr;
      section += 1;
      const type = wattr(wkid(model.sectPr, "type"), "val") || "nextPage";
      if (type !== "continuous") pendingBreak = true;
    }
  };

  const handleTable = (tbl: Element, path: number[]) => {
    const { model, tableData } = readTable(tbl, ctx, part);
    const id = newNodeId();
    const sentences: DocumentSentence[] = [];
    tableData.flat().forEach((cell) => {
      if (!cell) return;
      for (const text of splitSentenceTexts(cell)) {
        sentences.push({
          id: `${docId}_s${++sentenceCounter}`,
          nodeId: id,
          paragraphIndex: nodes.length,
          text,
          charStart: 0,
          charEnd: text.length,
          locked: false,
          ignored: false,
        });
      }
    });
    const node: DocumentParagraphNode = {
      id,
      documentId: docId,
      type: "table",
      styleName: "Table",
      section,
      tableData,
      table: model,
      sentences,
      orderNo: nodes.length + 1,
      blockStyle: {},
      docx: { path, sig: "" },
    };
    if (pendingBreak) node.pageBreakBefore = true;
    pendingBreak = false;
    nodes.push(node);
    prevPara = null;
  };

  const walk = (container: Element, path: number[]) => {
    kids(container).forEach((el, i) => {
      const here = [...path, i];
      if (isW(el, "p")) handleParagraph(el, here);
      else if (isW(el, "tbl")) handleTable(el, here);
      else if (isW(el, "sdt")) {
        const content = wkid(el, "sdtContent");
        if (content) walk(content, [...here, kids(el).indexOf(content)]);
      } else if (isW(el, "customXml")) walk(el, here);
      else if (isW(el, "sectPr")) sectionEls[section] = el;
    });
  };
  walk(body, []);

  // Page setup for each section; a section without its own headers keeps the previous ones.
  const sections: DocxSection[] = [];
  for (let s = 0; s <= section; s++) sections.push(await readSection(sectionEls[s] ?? wkid(body, "sectPr"), ctx, docRels, sections[s - 1]));

  nodes.forEach((n, i) => {
    n.orderNo = i + 1;
    n.sentences.forEach((s) => (s.paragraphIndex = i));
    if (n.docx) n.docx.sig = contentSignature(n);
  });

  const wordCount = nodes.reduce(
    (acc, n) => acc + n.sentences.reduce((m, s) => m + s.text.replace(/⟦EQ:[^⟧]*⟧/g, " ").split(/\s+/).filter(Boolean).length, 0),
    0
  );

  const defaults = mergeRP({ font: "Times New Roman", size: 10 }, styles.docRP, chain(styles, styles.defaultPara).reduce<RP>((acc, s) => mergeRP(acc, s.rPr), {}));
  return {
    paragraphs: nodes,
    equations: ctx.equations,
    layout: { sections, defaultTabPt, defaultFont: fontStack(defaults.font || "Times New Roman"), defaultSizePt: defaults.size ?? 10 },
    wordCount,
  };
}
