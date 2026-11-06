/**
 * Drawing objects inside a Word file that are not plain pictures: text boxes, SmartArt and charts.
 *
 * Each is turned into self-contained HTML (charts and SmartArt as SVG) at the size Word gives it, using
 * what Word saved in the file: the text box's own paragraphs, SmartArt's pre-laid-out drawing, and the
 * chart's cached values. Nothing here changes the file; an export keeps the original objects untouched.
 */

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const byLocal = (el: Element, name: string): Element[] => Array.from(el.getElementsByTagName("*")).filter((c) => c.localName === name);
const kid = (el: Element | undefined, name: string): Element | undefined => (el ? Array.from(el.children).find((c) => c.localName === name) : undefined);
const kidsNamed = (el: Element | undefined, name: string): Element[] => (el ? Array.from(el.children).filter((c) => c.localName === name) : []);
const val = (el: Element | undefined, attr = "val") => el?.getAttribute(attr) ?? null;
const emuPt = (v: string | null | undefined) => (v ? parseInt(v, 10) / 12700 : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Theme colours                                                       */
/* ------------------------------------------------------------------ */

export type ThemeColors = Record<string, string>;

export function parseThemeColors(themeXml: string | null): ThemeColors {
  const out: ThemeColors = {
    dk1: "#000000", lt1: "#ffffff", dk2: "#44546a", lt2: "#e7e6e6",
    accent1: "#5b9bd5", accent2: "#ed7d31", accent3: "#a5a5a5", accent4: "#ffc000", accent5: "#4472c4", accent6: "#70ad47",
    hlink: "#0563c1", folHlink: "#954f72",
  };
  if (!themeXml) return out;
  const doc = new DOMParser().parseFromString(themeXml, "application/xml");
  const scheme = byLocal(doc.documentElement, "clrScheme")[0];
  if (!scheme) return out;
  for (const c of Array.from(scheme.children)) {
    const srgb = kid(c, "srgbClr");
    const sys = kid(c, "sysClr");
    const hex = val(srgb) ?? val(sys, "lastClr");
    if (hex && /^[0-9a-f]{6}$/i.test(hex)) out[c.localName] = `#${hex.toLowerCase()}`;
  }
  return out;
}

const ALIAS: Record<string, string> = { tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" };
const PRESET: Record<string, string> = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", gray: "#808080" };

function toRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function toHex([r, g, b]: number[]): string {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}

/** A DrawingML colour element (srgbClr, schemeClr, ...) with its tint, shade and luminance changes. */
function colorOf(el: Element | undefined, theme: ThemeColors, phClr?: string): string | null {
  if (!el) return null;
  const c = Array.from(el.children).find((x) => /Clr$/.test(x.localName));
  if (!c) return null;
  let hex: string | null = null;
  if (c.localName === "srgbClr") hex = `#${val(c)}`;
  else if (c.localName === "schemeClr") {
    const name = val(c) || "";
    hex = name === "phClr" ? phClr ?? null : theme[ALIAS[name] ?? name] ?? null;
  } else if (c.localName === "sysClr") hex = `#${val(c, "lastClr") ?? "000000"}`;
  else if (c.localName === "prstClr") hex = PRESET[val(c) || ""] ?? "#000000";
  else if (c.localName === "scrgbClr") hex = toHex(["r", "g", "b"].map((k) => (parseInt(c.getAttribute(k) || "0", 10) / 100000) * 255));
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  let [r, g, b] = toRgb(hex.toLowerCase());
  for (const m of Array.from(c.children)) {
    const v = parseInt(val(m) || "0", 10) / 100000;
    if (m.localName === "lumMod") [r, g, b] = [r * v, g * v, b * v];
    else if (m.localName === "lumOff") [r, g, b] = [r + 255 * v, g + 255 * v, b + 255 * v];
    else if (m.localName === "tint") [r, g, b] = [r + (255 - r) * (1 - v), g + (255 - g) * (1 - v), b + (255 - b) * (1 - v)];
    else if (m.localName === "shade") [r, g, b] = [r * v, g * v, b * v];
  }
  return toHex([r, g, b]);
}

/* ------------------------------------------------------------------ */
/* Text boxes                                                          */
/* ------------------------------------------------------------------ */

/** Box styling for a Word shape (wps:wsp): fill, outline and inner padding. */
export function shapeBoxCss(wsp: Element, theme: ThemeColors): string {
  const spPr = kid(wsp, "spPr");
  const style = kid(wsp, "style");
  const css: string[] = ["box-sizing:border-box", "overflow:hidden", "text-align:left", "text-indent:0", "display:inline-block", "vertical-align:top"];
  const fill = kid(spPr, "solidFill");
  if (fill) {
    const c = colorOf(fill, theme);
    if (c) css.push(`background:${c}`);
  } else if (!kid(spPr, "noFill")) {
    const ref = kid(style, "fillRef");
    if (ref && val(ref, "idx") !== "0") {
      const c = colorOf(ref, theme);
      if (c) css.push(`background:${c}`);
    }
  }
  const ln = kid(spPr, "ln");
  if (ln && !kid(ln, "noFill")) {
    const width = ln.getAttribute("w") ? parseInt(ln.getAttribute("w")!, 10) / 12700 : 0.75;
    const c = colorOf(kid(ln, "solidFill"), theme) ?? colorOf(kid(style, "lnRef"), theme) ?? "#000000";
    css.push(`border:${r2(Math.max(0.5, width))}pt solid ${c}`);
  } else if (!ln) {
    const ref = kid(style, "lnRef");
    if (ref && val(ref, "idx") !== "0") css.push(`border:0.75pt solid ${colorOf(ref, theme) ?? "#000"}`);
  }
  const body = kid(wsp, "bodyPr");
  const inset = (k: string, d: number) => (body?.getAttribute(k) ? parseInt(body.getAttribute(k)!, 10) / 12700 : d);
  css.push(`padding:${r2(inset("tIns", 3.6))}pt ${r2(inset("rIns", 7.2))}pt ${r2(inset("bIns", 3.6))}pt ${r2(inset("lIns", 7.2))}pt`);
  const anchor = body?.getAttribute("anchor");
  if (anchor === "ctr" || anchor === "b") css.push(`display:inline-flex;flex-direction:column;justify-content:${anchor === "ctr" ? "center" : "flex-end"}`);
  return css.join(";");
}

/* ------------------------------------------------------------------ */
/* SmartArt                                                            */
/* ------------------------------------------------------------------ */

function shapePath(prst: string, w: number, h: number): string {
  const r = Math.min(w, h);
  switch (prst) {
    case "ellipse":
    case "circle":
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"`;
    case "roundRect":
      return `<rect width="${w}" height="${h}" rx="${r * 0.1}" ry="${r * 0.1}"`;
    case "rightArrow": {
      const head = Math.min(w * 0.4, h * 0.5);
      return `<path d="M0 ${h * 0.25} H${w - head} V0 L${w} ${h / 2} L${w - head} ${h} V${h * 0.75} H0 Z"`;
    }
    case "leftArrow": {
      const head = Math.min(w * 0.4, h * 0.5);
      return `<path d="M${w} ${h * 0.25} H${head} V0 L0 ${h / 2} L${head} ${h} V${h * 0.75} H${w} Z"`;
    }
    case "chevron": {
      const t = Math.min(w * 0.5, h * 0.5);
      return `<path d="M0 0 H${w - t} L${w} ${h / 2} L${w - t} ${h} H0 L${t} ${h / 2} Z"`;
    }
    case "homePlate": {
      const t = Math.min(w * 0.5, h * 0.5);
      return `<path d="M0 0 H${w - t} L${w} ${h / 2} L${w - t} ${h} H0 Z"`;
    }
    case "triangle":
      return `<path d="M${w / 2} 0 L${w} ${h} H0 Z"`;
    case "diamond":
      return `<path d="M${w / 2} 0 L${w} ${h / 2} L${w / 2} ${h} L0 ${h / 2} Z"`;
    case "hexagon": {
      const t = w * 0.25;
      return `<path d="M${t} 0 H${w - t} L${w} ${h / 2} L${w - t} ${h} H${t} L0 ${h / 2} Z"`;
    }
    default:
      return `<rect width="${w}" height="${h}"`;
  }
}

/** Text of a DrawingML text body as HTML paragraphs. */
function drawingText(txBody: Element | undefined, theme: ThemeColors, fontColor: string | null, defaultSizePt: number): string {
  if (!txBody) return "";
  return kidsNamed(txBody, "p")
    .map((p) => {
      const algn = val(kid(p, "pPr"), "algn");
      const runs = Array.from(p.children)
        .filter((r) => r.localName === "r" || r.localName === "fld")
        .map((r) => {
          const rPr = kid(r, "rPr");
          const size = rPr?.getAttribute("sz") ? parseInt(rPr.getAttribute("sz")!, 10) / 100 : defaultSizePt;
          const color = colorOf(kid(rPr, "solidFill"), theme) ?? fontColor;
          const css = [`font-size:${size}pt`];
          if (color) css.push(`color:${color}`);
          if (rPr?.getAttribute("b") === "1") css.push("font-weight:700");
          if (rPr?.getAttribute("i") === "1") css.push("font-style:italic");
          return `<span style="${css.join(";")}">${esc(kid(r, "t")?.textContent ?? "")}</span>`;
        })
        .join("");
      const end = kid(p, "endParaRPr");
      const endSize = end?.getAttribute("sz") ? parseInt(end.getAttribute("sz")!, 10) / 100 : defaultSizePt;
      const align = algn === "ctr" ? "center" : algn === "r" ? "right" : algn === "just" ? "justify" : "left";
      return `<div style="text-align:${align};line-height:1.1;font-size:${endSize}pt">${runs || "&#8203;"}</div>`;
    })
    .join("");
}

/** SmartArt drawn from the layout Word saved with it (word/diagrams/drawingN.xml). */
export function smartArtSvg(drawingXml: string, widthPt: number, heightPt: number, theme: ThemeColors, fontFamily: string): string {
  const doc = new DOMParser().parseFromString(drawingXml, "application/xml");
  const shapes = byLocal(doc.documentElement, "sp");
  const parts: string[] = [];
  let maxX = 0;
  let maxY = 0;
  for (const sp of shapes) {
    const spPr = kid(sp, "spPr");
    const xfrm = kid(spPr, "xfrm");
    const off = kid(xfrm, "off");
    const ext = kid(xfrm, "ext");
    if (!off || !ext) continue;
    const x = emuPt(val(off, "x"));
    const y = emuPt(val(off, "y"));
    const w = emuPt(val(ext, "cx"));
    const h = emuPt(val(ext, "cy"));
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
    const rot = xfrm?.getAttribute("rot") ? parseInt(xfrm.getAttribute("rot")!, 10) / 60000 : 0;
    const prst = val(kid(spPr, "prstGeom"), "prst") || "rect";
    const style = kid(sp, "style");
    const fill = kid(spPr, "noFill") ? "none" : colorOf(kid(spPr, "solidFill"), theme) ?? colorOf(kid(style, "fillRef"), theme) ?? "none";
    const ln = kid(spPr, "ln");
    const stroke = ln && kid(ln, "noFill") ? "none" : colorOf(kid(ln, "solidFill"), theme) ?? (style && val(kid(style, "lnRef"), "idx") !== "0" ? colorOf(kid(style, "lnRef"), theme) : null) ?? "none";
    const strokeW = ln?.getAttribute("w") ? parseInt(ln.getAttribute("w")!, 10) / 12700 : 1;
    const transform = `translate(${r2(x)} ${r2(y)})${rot ? ` rotate(${rot} ${r2(w / 2)} ${r2(h / 2)})` : ""}`;
    parts.push(`<g transform="${transform}">${shapePath(prst, r2(w), r2(h))} fill="${fill}" stroke="${stroke}" stroke-width="${r2(strokeW)}"/></g>`);

    // Text sits in its own text rectangle when the shape gives one.
    const txBody = kid(sp, "txBody");
    if (txBody && txBody.textContent?.trim()) {
      const tx = kid(sp, "txXfrm");
      const to = kid(tx, "off") ?? off;
      const te = kid(tx, "ext") ?? ext;
      const fontColor = colorOf(kid(style, "fontRef"), theme);
      const body = kid(txBody, "bodyPr");
      const ins = (k: string, d: number) => (body?.getAttribute(k) ? parseInt(body.getAttribute(k)!, 10) / 12700 : d);
      const anchor = body?.getAttribute("anchor");
      const justify = anchor === "t" ? "flex-start" : anchor === "b" ? "flex-end" : "center";
      parts.push(
        `<foreignObject x="${r2(emuPt(val(to, "x")))}" y="${r2(emuPt(val(to, "y")))}" width="${r2(emuPt(val(te, "cx")))}" height="${r2(emuPt(val(te, "cy")))}">` +
          `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;justify-content:${justify};overflow:hidden;font-family:${esc(fontFamily)};padding:${r2(ins("tIns", 3.6))}pt ${r2(ins("rIns", 7.2))}pt ${r2(ins("bIns", 3.6))}pt ${r2(ins("lIns", 7.2))}pt">` +
          drawingText(txBody, theme, fontColor, 18) +
          `</div></foreignObject>`
      );
    }
  }
  const vbW = Math.max(widthPt, maxX);
  const vbH = Math.max(heightPt, maxY);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(vbW)} ${r2(vbH)}" width="${r2(widthPt)}pt" height="${r2(heightPt)}pt" style="display:inline-block;vertical-align:bottom;overflow:visible">${parts.join("")}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

interface Series {
  name: string;
  cats: string[];
  values: (number | null)[];
  color: string;
  pointColors: (string | null)[];
}

function cache(el: Element | undefined): string[] {
  if (!el) return [];
  const c = byLocal(el, "strCache")[0] ?? byLocal(el, "numCache")[0] ?? byLocal(el, "strLit")[0] ?? byLocal(el, "numLit")[0];
  if (!c) return [];
  const count = parseInt(val(kid(c, "ptCount")) || "0", 10);
  const out: string[] = new Array(count).fill("");
  for (const pt of kidsNamed(c, "pt")) out[parseInt(pt.getAttribute("idx") || "0", 10)] = kid(pt, "v")?.textContent ?? "";
  return out;
}

function niceStep(range: number): number {
  const raw = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString() : String(Math.round(n * 100) / 100));

function richText(el: Element | undefined): string {
  if (!el) return "";
  return byLocal(el, "t").map((t) => t.textContent ?? "").join("") || cache(el).join(" ");
}

/** A chart drawn from the values Word cached in the file. Bar, column, line, area and pie charts are drawn; others get a labelled frame. */
export function chartSvg(chartXml: string, widthPt: number, heightPt: number, theme: ThemeColors, fontFamily: string): string {
  const doc = new DOMParser().parseFromString(chartXml, "application/xml");
  const root = doc.documentElement;
  const chart = byLocal(root, "chart")[0];
  const plot = kid(chart, "plotArea");
  const W = widthPt;
  const H = heightPt;
  const accents = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"].map((a) => theme[a]);
  const font = `font-family:${esc(fontFamily)}`;
  const svg = (body: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}pt" height="${r2(H)}pt" style="display:inline-block;vertical-align:bottom;background:#fff;box-shadow:inset 0 0 0 0.75pt #d9d9d9;${font}">${body}</svg>`;

  const kinds = ["barChart", "bar3DChart", "lineChart", "line3DChart", "areaChart", "pieChart", "pie3DChart", "doughnutChart", "scatterChart"];
  const group = plot ? Array.from(plot.children).find((c) => kinds.includes(c.localName)) : undefined;
  if (!group) return svg(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#bbb"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="10" fill="#666">Chart (kept in your Word file)</text>`);

  const series: Series[] = kidsNamed(group, "ser").map((ser, i) => {
    const spPr = kid(ser, "spPr");
    const color = colorOf(kid(spPr, "solidFill"), theme) ?? colorOf(kid(kid(spPr, "ln"), "solidFill"), theme) ?? accents[i % 6];
    const values = cache(kid(ser, "val") ?? kid(ser, "yVal")).map((v) => (v === "" ? null : parseFloat(v)));
    const cats = cache(kid(ser, "cat") ?? kid(ser, "xVal"));
    const pointColors: (string | null)[] = [];
    for (const dPt of kidsNamed(ser, "dPt")) pointColors[parseInt(val(kid(dPt, "idx")) || "0", 10)] = colorOf(kid(kid(dPt, "spPr"), "solidFill"), theme);
    return { name: richText(kid(ser, "tx")) || `Series ${i + 1}`, cats, values, color, pointColors };
  });
  const cats = series.find((s) => s.cats.length)?.cats ?? (series[0]?.values.map((_, i) => String(i + 1)) ?? []);

  const titleEl = kid(chart, "title");
  const autoDeleted = val(kid(chart, "autoTitleDeleted")) === "1";
  const title = titleEl ? richText(kid(titleEl, "tx")) || (series.length === 1 ? series[0].name : "Chart Title") : !autoDeleted && series.length === 1 ? series[0].name : "";
  const legendEl = kid(chart, "legend");
  const legendPos = legendEl ? val(kid(legendEl, "legendPos")) || "r" : null;

  const parts: string[] = [];
  let top = 6;
  if (title) {
    parts.push(`<text x="${W / 2}" y="${top + 13}" text-anchor="middle" font-size="14" fill="#595959">${esc(title)}</text>`);
    top += 22;
  }
  const isPie = /pie|doughnut/.test(group.localName);
  const legendItems = isPie ? cats.map((c, i) => ({ label: c, color: series[0]?.pointColors[i] ?? accents[i % 6] })) : series.map((s) => ({ label: s.name, color: s.color }));
  let bottom = H - 6;
  let right = W - 6;
  if (legendPos && legendItems.length) {
    if (legendPos === "b" || legendPos === "t") {
      const totalW = legendItems.reduce((n, it) => n + 18 + it.label.length * 5, 0);
      let x = Math.max(4, (W - totalW) / 2);
      const y = legendPos === "b" ? H - 10 : top + 8;
      for (const it of legendItems) {
        parts.push(`<rect x="${r2(x)}" y="${y - 6}" width="7" height="7" fill="${it.color}"/><text x="${r2(x + 10)}" y="${y}" font-size="9" fill="#595959">${esc(it.label)}</text>`);
        x += 18 + it.label.length * 5;
      }
      if (legendPos === "b") bottom -= 18;
      else top += 18;
    } else {
      const lw = Math.min(W * 0.3, 14 + Math.max(...legendItems.map((it) => it.label.length)) * 5);
      let y = (top + bottom) / 2 - (legendItems.length * 14) / 2 + 8;
      for (const it of legendItems) {
        parts.push(`<rect x="${r2(W - lw)}" y="${r2(y - 6)}" width="7" height="7" fill="${it.color}"/><text x="${r2(W - lw + 10)}" y="${r2(y)}" font-size="9" fill="#595959">${esc(it.label)}</text>`);
        y += 14;
      }
      right -= lw + 6;
    }
  }

  if (isPie) {
    const vals = (series[0]?.values ?? []).map((v) => Math.max(0, v ?? 0));
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = (6 + right) / 2;
    const cy = (top + bottom) / 2;
    const rad = Math.max(10, Math.min(right - 6, bottom - top) / 2 - 4);
    const hole = group.localName === "doughnutChart" ? rad * 0.5 : 0;
    let a0 = -Math.PI / 2;
    vals.forEach((v, i) => {
      const a1 = a0 + (v / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, r: number) => `${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`;
      const color = series[0]?.pointColors[i] ?? accents[i % 6];
      const d = hole
        ? `M${p(a0, rad)} A${rad} ${rad} 0 ${large} 1 ${p(a1, rad)} L${p(a1, hole)} A${hole} ${hole} 0 ${large} 0 ${p(a0, hole)} Z`
        : `M${cx} ${cy} L${p(a0, rad)} A${rad} ${rad} 0 ${large} 1 ${p(a1, rad)} Z`;
      parts.push(`<path d="${d}" fill="${color}" stroke="#fff" stroke-width="1"/>`);
      a0 = a1;
    });
    return svg(parts.join(""));
  }

  const horizontal = group.localName.startsWith("bar") && val(kid(group, "barDir")) === "bar";
  const grouping = val(kid(group, "grouping")) || "clustered";
  const stacked = grouping === "stacked" || grouping === "percentStacked";
  const percent = grouping === "percentStacked";
  const n = cats.length || Math.max(0, ...series.map((s) => s.values.length));
  const totals = Array.from({ length: n }, (_, i) => series.reduce((a, s) => a + Math.abs(s.values[i] ?? 0), 0) || 1);
  const scaled = (s: Series, i: number) => (percent ? ((s.values[i] ?? 0) / totals[i]) * 100 : s.values[i] ?? 0);
  let maxV = 0;
  let minV = 0;
  for (let i = 0; i < n; i++) {
    if (stacked) {
      let pos = 0;
      let neg = 0;
      for (const s of series) {
        const v = scaled(s, i);
        if (v >= 0) pos += v;
        else neg += v;
      }
      maxV = Math.max(maxV, pos);
      minV = Math.min(minV, neg);
    } else for (const s of series) {
      maxV = Math.max(maxV, s.values[i] ?? 0);
      minV = Math.min(minV, s.values[i] ?? 0);
    }
  }
  const step = niceStep(maxV - minV || 1);
  // Like Excel, leave a little room above the tallest value.
  maxV = Math.ceil((maxV + (maxV - minV) * 0.05) / step) * step || step;
  minV = Math.floor(minV / step) * step;

  const axisW = 8 + Math.max(fmt(maxV).length, fmt(minV).length) * 5;
  const left = 6 + (horizontal ? Math.min(W * 0.3, 8 + Math.max(...cats.map((c) => c.length)) * 4.6) : axisW);
  const plotBottom = bottom - (horizontal ? 14 : 16);
  const plotTop = top + 4;
  const pw = Math.max(10, right - left);
  const ph = Math.max(10, plotBottom - plotTop);
  const valueToPx = (v: number) => (horizontal ? left + ((v - minV) / (maxV - minV)) * pw : plotBottom - ((v - minV) / (maxV - minV)) * ph);

  // Gridlines and value labels.
  for (let v = minV; v <= maxV + step / 2; v += step) {
    const p = r2(valueToPx(v));
    if (horizontal) parts.push(`<line x1="${p}" y1="${plotTop}" x2="${p}" y2="${plotBottom}" stroke="#d9d9d9" stroke-width="0.75"/><text x="${p}" y="${plotBottom + 11}" text-anchor="middle" font-size="9" fill="#595959">${fmt(v)}</text>`);
    else parts.push(`<line x1="${left}" y1="${p}" x2="${right}" y2="${p}" stroke="#d9d9d9" stroke-width="0.75"/><text x="${left - 4}" y="${p + 3}" text-anchor="end" font-size="9" fill="#595959">${fmt(v)}</text>`);
  }

  const band = (horizontal ? ph : pw) / Math.max(1, n);
  const catPos = (i: number) => (horizontal ? plotTop + band * i : left + band * i);
  cats.forEach((c, i) => {
    if (horizontal) parts.push(`<text x="${left - 4}" y="${r2(catPos(i) + band / 2 + 3)}" text-anchor="end" font-size="9" fill="#595959">${esc(c)}</text>`);
    else parts.push(`<text x="${r2(catPos(i) + band / 2)}" y="${plotBottom + 12}" text-anchor="middle" font-size="9" fill="#595959">${esc(c)}</text>`);
  });

  if (group.localName.startsWith("bar")) {
    const gap = (parseInt(val(kid(group, "gapWidth")) || "150", 10) || 150) / 100;
    const slots = stacked ? 1 : Math.max(1, series.length);
    const barW = band / (slots + gap);
    for (let i = 0; i < n; i++) {
      let pos = 0;
      let neg = 0;
      series.forEach((s, k) => {
        const v = scaled(s, i);
        const from = stacked ? (v >= 0 ? pos : neg) : 0;
        const to = from + v;
        if (stacked) {
          if (v >= 0) pos = to;
          else neg = to;
        }
        const offset = catPos(i) + (band - barW * slots) / 2 + (stacked ? 0 : barW * k);
        const a = valueToPx(Math.min(from, to));
        const b = valueToPx(Math.max(from, to));
        const color = s.pointColors[i] ?? s.color;
        if (horizontal) parts.push(`<rect x="${r2(a)}" y="${r2(offset)}" width="${r2(Math.max(0, b - a))}" height="${r2(barW)}" fill="${color}"/>`);
        else parts.push(`<rect x="${r2(offset)}" y="${r2(b)}" width="${r2(barW)}" height="${r2(Math.max(0, a - b))}" fill="${color}"/>`);
      });
    }
  } else {
    // Line, area and scatter: one point per category, centred in its band.
    const area = group.localName === "areaChart";
    const base: number[] = new Array(n).fill(0);
    for (const s of series) {
      const pts: string[] = [];
      for (let i = 0; i < n; i++) {
        const v = stacked ? base[i] + scaled(s, i) : s.values[i];
        if (v === null) continue;
        if (stacked) base[i] = v;
        pts.push(`${r2(catPos(i) + band / 2)},${r2(valueToPx(v))}`);
      }
      if (area && pts.length) parts.push(`<polygon points="${pts[0].split(",")[0]},${r2(valueToPx(0))} ${pts.join(" ")} ${pts[pts.length - 1].split(",")[0]},${r2(valueToPx(0))}" fill="${s.color}" opacity="0.85"/>`);
      else parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.25" stroke-linejoin="round"/>`);
    }
  }
  // Category axis line.
  if (horizontal) parts.push(`<line x1="${r2(valueToPx(0))}" y1="${plotTop}" x2="${r2(valueToPx(0))}" y2="${plotBottom}" stroke="#bfbfbf"/>`);
  else parts.push(`<line x1="${left}" y1="${r2(valueToPx(0))}" x2="${right}" y2="${r2(valueToPx(0))}" stroke="#bfbfbf"/>`);
  return svg(parts.join(""));
}

export const DRAWING_NS = A;
