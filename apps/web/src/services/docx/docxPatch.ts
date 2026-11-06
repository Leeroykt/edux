/**
 * Exports a document that came from a Word file by changing that file, not by rebuilding it.
 *
 * Every block the writer did not touch keeps its original XML, so layout, styles, fonts, headers,
 * footers, footnotes, fields, comments and everything else in the package are exactly as they were.
 * With no changes at all, the original bytes are returned untouched.
 */
import JSZip from "jszip";
import type { DocumentParagraphNode, DocumentSentence } from "@edux/schema";
import { EquationMap } from "../../lib/equations";
import { Fmt, Run, parseRuns } from "../../lib/formatting";
import { contentSignature } from "./docxImport";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const W_STRICT = "http://purl.oclc.org/ooxml/wordprocessingml/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const isW = (el: Element, name: string) => el.localName === name && (el.namespaceURI === W || el.namespaceURI === W_STRICT);
const kids = (el: Element) => Array.from(el.children);
const keyOf = (path: number[]) => path.join(".");

const HIGHLIGHT: Record<string, string> = {
  "#ffff00": "yellow", "#00ff00": "green", "#00ffff": "cyan", "#ff00ff": "magenta", "#0000ff": "blue", "#ff0000": "red",
  "#000080": "darkBlue", "#008080": "darkCyan", "#008000": "darkGreen", "#800080": "darkMagenta", "#800000": "darkRed",
  "#808000": "darkYellow", "#808080": "darkGray", "#c0c0c0": "lightGray", "#000000": "black", "#ffffff": "white",
};

export interface PatchOptions {
  exportMode: "clean" | "tracked";
  author: string;
  equations: EquationMap;
}

/** The blocks of the original body in reading order, the same walk the importer makes. */
function originalBlocks(body: Element): { key: string; el: Element }[] {
  const out: { key: string; el: Element }[] = [];
  const walk = (container: Element, path: number[]) => {
    kids(container).forEach((el, i) => {
      const here = [...path, i];
      if (isW(el, "p") || isW(el, "tbl")) out.push({ key: keyOf(here), el });
      else if (isW(el, "sdt")) {
        const content = kids(el).find((c) => isW(c, "sdtContent"));
        if (content) walk(content, [...here, kids(el).indexOf(content)]);
      } else if (isW(el, "customXml")) walk(el, here);
    });
  };
  walk(body, []);
  return out;
}

const textTypes = ["paragraph", "heading", "list_item", "blockquote"];

/** True when the document is exactly as it was imported: same blocks, same order, nothing edited. */
function untouched(nodes: DocumentParagraphNode[], originalKeys: string[]): boolean {
  const seen: string[] = [];
  for (const n of nodes) {
    if (!n.docx || n.docx.clone) return false;
    if (contentSignature(n) !== n.docx.sig) return false;
    if (textTypes.includes(n.type) && n.docx.align && (n.alignment ?? "left") !== n.docx.align) return false;
    const k = keyOf(n.docx.path);
    if (seen[seen.length - 1] !== k) seen.push(k);
  }
  return seen.length === originalKeys.length && seen.every((k, i) => k === originalKeys[i]);
}

export async function patchDocx(source: ArrayBuffer, nodes: DocumentParagraphNode[], opts: PatchOptions): Promise<Blob> {
  const zip = await JSZip.loadAsync(source);
  const rootRels = await zip.file("_rels/.rels")?.async("string");
  const mainPath = (rootRels && /Target="\/?([^"]*document[^"]*\.xml)"/.exec(rootRels)?.[1]) || "word/document.xml";
  const xml = await zip.file(mainPath)?.async("string");
  if (!xml) throw new Error("The original Word file could not be read.");

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const body = kids(doc.documentElement).find((c) => isW(c, "body"));
  if (!body) throw new Error("The original Word file has no body.");
  const blocks = originalBlocks(body);
  const byKey = new Map(blocks.map((b) => [b.key, b.el]));
  const order = new Map(blocks.map((b, i) => [b.el, i]));

  if (untouched(nodes, blocks.map((b) => b.key))) return new Blob([source], { type: DOCX_MIME });

  const wNs = doc.documentElement.namespaceURI === W_STRICT ? W_STRICT : W;
  const mk = (name: string) => doc.createElementNS(wNs, `w:${name}`);
  const setW = (el: Element, name: string, value: string) => el.setAttributeNS(wNs, `w:${name}`, value);
  let revision = 90000;
  const when = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  /* ---- Runs from the editor's formatting ---- */

  const rPrFor = (f: Fmt): Element | null => {
    const rPr = mk("rPr");
    if (f.font) {
      const fonts = mk("rFonts");
      for (const a of ["ascii", "hAnsi", "cs", "eastAsia"]) setW(fonts, a, f.font);
      rPr.appendChild(fonts);
    }
    if (f.b) rPr.appendChild(mk("b"));
    if (f.i) rPr.appendChild(mk("i"));
    if (f.caps) rPr.appendChild(mk("caps"));
    if (f.sc) rPr.appendChild(mk("smallCaps"));
    if (f.s) rPr.appendChild(mk("strike"));
    if (f.color) {
      const c = mk("color");
      setW(c, "val", f.color.replace("#", "").toUpperCase());
      rPr.appendChild(c);
    }
    if (f.size) {
      for (const name of ["sz", "szCs"]) {
        const s = mk(name);
        setW(s, "val", String(Math.round(f.size * 2)));
        rPr.appendChild(s);
      }
    }
    if (f.bg && HIGHLIGHT[f.bg.toLowerCase()]) {
      const h = mk("highlight");
      setW(h, "val", HIGHLIGHT[f.bg.toLowerCase()]);
      rPr.appendChild(h);
    }
    if (f.u) {
      const u = mk("u");
      setW(u, "val", "single");
      rPr.appendChild(u);
    }
    if (f.bg && !HIGHLIGHT[f.bg.toLowerCase()]) {
      const shd = mk("shd");
      setW(shd, "val", "clear");
      setW(shd, "color", "auto");
      setW(shd, "fill", f.bg.replace("#", "").toUpperCase());
      rPr.appendChild(shd);
    }
    if (f.sup || f.sub) {
      const v = mk("vertAlign");
      setW(v, "val", f.sup ? "superscript" : "subscript");
      rPr.appendChild(v);
    }
    return rPr.childNodes.length ? rPr : null;
  };

  const ommlNode = (id: string): Element | null => {
    const eq = opts.equations[id];
    if (!eq?.omml) return null;
    const parsed = new DOMParser().parseFromString(eq.omml, "application/xml");
    if (parsed.getElementsByTagName("parsererror").length) return null;
    const m = doc.importNode(parsed.documentElement, true) as Element;
    if (!eq.display) return m;
    const para = doc.createElementNS("http://schemas.openxmlformats.org/officeDocument/2006/math", "m:oMathPara");
    para.appendChild(m);
    return para;
  };

  /** XML runs for formatted text. Tabs, breaks, footnote references and equations become their Word forms. */
  const runsXml = (runs: Run[], deleted = false): Element[] => {
    const out: Element[] = [];
    for (const r of runs) {
      if (r.f.fn) {
        const run = mk("r");
        const rPr = mk("rPr");
        const style = mk("rStyle");
        setW(style, "val", "FootnoteReference");
        rPr.appendChild(style);
        run.appendChild(rPr);
        const ref = mk("footnoteReference");
        setW(ref, "id", r.f.fn);
        run.appendChild(ref);
        out.push(run);
        continue;
      }
      const pieces = r.text.split(/(⟦EQ:[A-Za-z0-9_-]+⟧)/).filter((x) => x.length > 0);
      for (const piece of pieces) {
        const eq = /^⟦EQ:([A-Za-z0-9_-]+)⟧$/.exec(piece);
        let text = piece;
        if (eq && !deleted) {
          const node = ommlNode(eq[1]);
          if (node) {
            out.push(node);
            continue;
          }
          // A formula typed in the editor has no Word equation form yet; it is written as its LaTeX.
          text = opts.equations[eq[1]]?.latex ?? "";
          if (!text) continue;
        }
        const run = mk("r");
        const rPr = rPrFor(r.f);
        if (rPr) run.appendChild(rPr);
        if (r.f.tab) for (let k = 0; k < piece.length; k++) run.appendChild(mk("tab"));
        else if (r.f.br) for (let k = 0; k < piece.length; k++) run.appendChild(mk("br"));
        else {
          const t = mk(deleted ? "delText" : "t");
          t.setAttributeNS(XML_NS, "xml:space", "preserve");
          t.textContent = text;
          run.appendChild(t);
        }
        out.push(run);
      }
    }
    return out;
  };

  const sentenceRuns = (s: DocumentSentence, isLast: boolean): Run[] => {
    const runs = parseRuns(s.text, s.formattedHtml).map((r) => ({ text: r.text, f: { ...r.f } }));
    const tail = runs.map((r) => r.text).join("");
    if (!isLast && tail && !/\s$/.test(tail)) {
      const last = runs[runs.length - 1];
      runs.push({ text: " ", f: { ...(last?.f ?? {}), tab: undefined, br: undefined, fn: undefined } });
    }
    return runs;
  };

  const pageBreakRun = () => {
    const r = mk("r");
    const br = mk("br");
    setW(br, "type", "page");
    r.appendChild(br);
    return r;
  };

  /** The paragraph content for the given pieces of one Word paragraph. */
  const contentFor = (pieces: DocumentParagraphNode[]): Node[] => {
    const out: Node[] = [];
    pieces.forEach((n, k) => {
      if (k === 0 && n.docx?.leadBreak) out.push(pageBreakRun());
      if (k > 0) out.push(pageBreakRun());
      n.sentences.forEach((s, i) => {
        const runs = sentenceRuns(s, i === n.sentences.length - 1);
        const changed = s.edited && s.originalText !== undefined && s.originalText !== s.text;
        if (opts.exportMode === "tracked" && changed) {
          if (s.originalText) {
            const del = mk("del");
            setW(del, "id", String(revision++));
            setW(del, "author", opts.author);
            setW(del, "date", when);
            runsXml([{ text: s.originalText + (i === n.sentences.length - 1 ? "" : " "), f: {} }], true).forEach((x) => del.appendChild(x));
            out.push(del);
          }
          const ins = mk("ins");
          setW(ins, "id", String(revision++));
          setW(ins, "author", opts.author);
          setW(ins, "date", when);
          runsXml(runs).forEach((x) => ins.appendChild(x));
          out.push(ins);
        } else runsXml(runs).forEach((x) => out.push(x));
      });
      if (k === pieces.length - 1 && n.docx?.trailBreak) out.push(pageBreakRun());
    });
    return out;
  };

  const setAlignment = (p: Element, align: string | undefined) => {
    let pPr = kids(p).find((c) => isW(c, "pPr"));
    if (!pPr) {
      pPr = mk("pPr");
      p.insertBefore(pPr, p.firstChild);
    }
    kids(pPr).filter((c) => isW(c, "jc")).forEach((c) => pPr!.removeChild(c));
    const jc = mk("jc");
    setW(jc, "val", align === "justify" ? "both" : align === "center" ? "center" : align === "right" ? "right" : "left");
    // Word expects jc before these elements inside pPr.
    const after = ["textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle", "rPr", "sectPr", "pPrChange"];
    const before = kids(pPr).find((c) => after.includes(c.localName));
    pPr.insertBefore(jc, before ?? null);
  };

  /** Replaces a paragraph's text, keeping its paragraph settings, bookmarks and pictures. */
  const rewriteParagraph = (p: Element, pieces: DocumentParagraphNode[]) => {
    const keep = (c: Element) =>
      isW(c, "pPr") || isW(c, "bookmarkStart") || isW(c, "bookmarkEnd") || isW(c, "commentRangeStart") || isW(c, "commentRangeEnd");
    const pictures = kids(p).filter((c) => isW(c, "r") && c.getElementsByTagNameNS("*", "drawing").length + c.getElementsByTagNameNS("*", "pict").length > 0);
    kids(p)
      .filter((c) => !keep(c))
      .forEach((c) => p.removeChild(c));
    pictures.forEach((c) => p.appendChild(c));
    contentFor(pieces).forEach((x) => p.appendChild(x));
  };

  /** A new paragraph, styled like `like` when given. */
  const newParagraph = (n: DocumentParagraphNode, like?: Element): Element => {
    const p = mk("p");
    const pPr = like ? kids(like).find((c) => isW(c, "pPr")) : undefined;
    if (pPr) {
      const copy = pPr.cloneNode(true) as Element;
      kids(copy)
        .filter((c) => isW(c, "sectPr") || isW(c, "pPrChange"))
        .forEach((c) => copy.removeChild(c));
      p.appendChild(copy);
    }
    contentFor([n]).forEach((x) => p.appendChild(x));
    if (n.alignment) setAlignment(p, n.alignment);
    return p;
  };

  const newTable = (n: DocumentParagraphNode): Element => {
    const rows = n.tableData ?? [[""]];
    const cols = Math.max(1, ...rows.map((r) => r.length));
    const tbl = mk("tbl");
    const tblPr = mk("tblPr");
    const tblW = mk("tblW");
    setW(tblW, "w", "5000");
    setW(tblW, "type", "pct");
    tblPr.appendChild(tblW);
    const borders = mk("tblBorders");
    for (const side of ["top", "left", "bottom", "right", "insideH", "insideV"]) {
      const b = mk(side);
      setW(b, "val", "single");
      setW(b, "sz", "4");
      setW(b, "space", "0");
      setW(b, "color", "auto");
      borders.appendChild(b);
    }
    tblPr.appendChild(borders);
    tbl.appendChild(tblPr);
    const grid = mk("tblGrid");
    for (let c = 0; c < cols; c++) {
      const g = mk("gridCol");
      setW(g, "w", String(Math.round(9000 / cols)));
      grid.appendChild(g);
    }
    tbl.appendChild(grid);
    for (const row of rows) {
      const tr = mk("tr");
      for (let c = 0; c < cols; c++) {
        const tc = mk("tc");
        const p = mk("p");
        runsXml([{ text: row[c] ?? "", f: {} }]).forEach((x) => p.appendChild(x));
        tc.appendChild(p);
        tr.appendChild(tc);
      }
      tbl.appendChild(tr);
    }
    return tbl;
  };

  /** Writes edited cell text into an original table, leaving untouched cells alone. */
  const patchTable = (tbl: Element, n: DocumentParagraphNode) => {
    if (!n.table || !n.tableData) return;
    kids(tbl)
      .filter((c) => isW(c, "tr"))
      .forEach((tr, r) => {
        const cells: Element[] = [];
        for (const c of kids(tr)) {
          if (isW(c, "tc")) cells.push(c);
          else if (isW(c, "sdt")) kids(kids(c).find((x) => isW(x, "sdtContent")) ?? c).filter((x) => isW(x, "tc")).forEach((x) => cells.push(x));
        }
        const visible = cells.filter((tc) => {
          const vm = tc.getElementsByTagNameNS(wNs, "vMerge")[0];
          return !vm || vm.getAttributeNS(wNs, "val") === "restart";
        });
        visible.forEach((tc, c) => {
          const before = n.table!.rows[r]?.cells[c]?.text;
          const now = n.tableData![r]?.[c];
          if (before === undefined || now === undefined || before === now) return;
          const paras = kids(tc).filter((x) => isW(x, "p"));
          const first = paras[0] ?? tc.appendChild(mk("p"));
          paras.slice(1).forEach((x) => tc.removeChild(x));
          const firstRun = Array.from(first.getElementsByTagNameNS(wNs, "r")).find((x) => x.getElementsByTagNameNS(wNs, "t").length > 0);
          const rPr = firstRun ? kids(firstRun).find((x) => isW(x, "rPr")) : undefined;
          kids(first)
            .filter((x) => !isW(x, "pPr"))
            .forEach((x) => first.removeChild(x));
          for (const run of runsXml([{ text: now, f: {} }])) {
            if (rPr && run.localName === "r") run.insertBefore(rPr.cloneNode(true), run.firstChild);
            first.appendChild(run);
          }
        });
      });
  };

  /* ---- Pictures added in the editor ---- */

  let relsXml = (await zip.file(`${mainPath.replace(/[^/]+$/, "")}_rels/${mainPath.split("/").pop()}.rels`)?.async("string")) ?? "";
  let contentTypes = (await zip.file("[Content_Types].xml")?.async("string")) ?? "";
  let picCounter = 0;
  const contentWidthPt = 451;

  const newPicture = async (n: DocumentParagraphNode, like?: Element): Promise<Element | null> => {
    const m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/i.exec(n.imageUrl ?? "");
    if (!m) return null;
    const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
    const id = ++picCounter;
    const name = `media/edux_${Date.now()}_${id}.${ext}`;
    zip.file(`${mainPath.replace(/[^/]+$/, "")}${name}`, m[2], { base64: true });
    const rid = `rIdEdux${id}`;
    relsXml = relsXml.replace(
      "</Relationships>",
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${name}"/></Relationships>`
    );
    if (!new RegExp(`Extension="${ext}"`, "i").test(contentTypes)) {
      const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      contentTypes = contentTypes.replace("<Types", "<Types").replace(/(<Types[^>]*>)/, `$1<Default Extension="${ext}" ContentType="${mime}"/>`);
    }
    const natural = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 });
      img.onerror = () => resolve({ w: 400, h: 300 });
      img.src = n.imageUrl!;
    });
    const widthPt = n.imageWidthPt ?? (contentWidthPt * (n.widthPercent ?? 75)) / 100;
    const heightPt = n.imageHeightPt ?? (widthPt * natural.h) / natural.w;
    const cx = Math.round(widthPt * 12700);
    const cy = Math.round(heightPt * 12700);
    const drawing = `<w:r xmlns:w="${W}"><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${9000 + id}" name="Picture ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${9000 + id}" name="Picture ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="${R}" r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    const run = doc.importNode(new DOMParser().parseFromString(drawing, "application/xml").documentElement, true);
    const p = newParagraph({ ...n, sentences: [] }, like);
    p.appendChild(run);
    setAlignment(p, n.alignment === "justify" ? "center" : n.alignment ?? "center");
    return p;
  };

  /* ---- Put every block in place ---- */

  const used = new Set<Element>();
  const units: { el: Element; original: boolean }[] = [];
  let lastOriginal: Element | undefined;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const src = n.docx && !n.docx.clone ? byKey.get(keyOf(n.docx.path)) : undefined;
    if (src && !used.has(src)) {
      // All pieces of the same Word paragraph travel together.
      const group = [n];
      while (i + 1 < nodes.length && nodes[i + 1].docx && !nodes[i + 1].docx!.clone && keyOf(nodes[i + 1].docx!.path) === keyOf(n.docx!.path)) group.push(nodes[++i]);
      const contentChanged = group.some((g) => contentSignature(g) !== g.docx!.sig) || group.length !== (n.docx!.parts ?? 1);
      if (n.type === "table") {
        if (contentChanged) patchTable(src, n);
      } else if (n.type !== "image") {
        if (contentChanged) rewriteParagraph(src, group);
        if ((n.alignment ?? "left") !== n.docx!.align) setAlignment(src, n.alignment);
      }
      used.add(src);
      units.push({ el: src, original: true });
      lastOriginal = src;
      continue;
    }
    // New blocks, and copies of blocks already placed.
    const like = n.docx ? byKey.get(keyOf(n.docx.path)) : lastOriginal && isW(lastOriginal, "p") ? lastOriginal : undefined;
    let el: Element | null = null;
    if (n.type === "table") el = newTable(n);
    else if (n.type === "image") el = await newPicture(n, like && isW(like, "p") ? like : undefined);
    else el = newParagraph(n, like && isW(like, "p") ? like : undefined);
    if (el) units.push({ el, original: false });
  }

  // Leave blocks where they are while they are in their original order; move or insert the rest after the block before them.
  let cursor: Element | null = null;
  let highest = -1;
  for (const u of units) {
    const idx = u.original ? order.get(u.el) ?? -1 : -1;
    if (u.original && idx > highest) {
      highest = idx;
      cursor = u.el;
      continue;
    }
    if (cursor) cursor.parentNode!.insertBefore(u.el, cursor.nextSibling);
    else {
      const first = blocks[0]?.el;
      if (first) first.parentNode!.insertBefore(u.el, first);
      else body.insertBefore(u.el, kids(body).find((c) => isW(c, "sectPr")) ?? null);
    }
    cursor = u.el;
  }

  // Blocks the writer removed. A paragraph that ends a section keeps its section settings.
  for (const b of blocks) {
    if (used.has(b.el)) continue;
    const pPr = kids(b.el).find((c) => isW(c, "pPr"));
    if (pPr && kids(pPr).some((c) => isW(c, "sectPr"))) {
      kids(b.el)
        .filter((c) => c !== pPr)
        .forEach((c) => b.el.removeChild(c));
    } else b.el.parentNode?.removeChild(b.el);
  }

  const declaration = /^<\?xml[^>]*\?>/.exec(xml)?.[0] ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  zip.file(mainPath, `${declaration}\r\n${new XMLSerializer().serializeToString(doc.documentElement)}`);
  if (picCounter > 0) {
    zip.file(`${mainPath.replace(/[^/]+$/, "")}_rels/${mainPath.split("/").pop()}.rels`, relsXml);
    zip.file("[Content_Types].xml", contentTypes);
  }
  return zip.generateAsync({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
}
