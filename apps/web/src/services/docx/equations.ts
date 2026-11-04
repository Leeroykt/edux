import JSZip from "jszip";
import { EquationAtom, EquationMap, equationToken } from "../../lib/equations";

const M = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML = "http://www.w3.org/XML/1998/namespace";

/* ------------------------------------------------------------------ */
/* OMML (Word equations) to LaTeX                                      */
/* ------------------------------------------------------------------ */

const kids = (el: Element, name: string) =>
  Array.from(el.children).filter((c) => c.localName === name && c.namespaceURI === M);
const kid = (el: Element, name: string) => kids(el, name)[0] as Element | undefined;
const valOf = (el: Element | undefined): string | null =>
  el ? el.getAttributeNS(M, "val") ?? el.getAttribute("m:val") : null;

const escapeText = (t: string) => t.replace(/([\\{}%&#$_^~])/g, (c) => (c === "\\" ? "\\textbackslash{}" : `\\${c}`));

const DELIMS: Record<string, string> = {
  "": ".", "{": "\\{", "}": "\\}", "⟨": "\\langle", "⟩": "\\rangle", "‖": "\\|", "⌈": "\\lceil", "⌉": "\\rceil", "⌊": "\\lfloor", "⌋": "\\rfloor",
};
const NARY: Record<string, string> = {
  "∑": "\\sum", "∏": "\\prod", "∐": "\\coprod", "∫": "\\int", "∬": "\\iint", "∭": "\\iiint", "∮": "\\oint", "⋃": "\\bigcup", "⋂": "\\bigcap",
};
const ACCENT: Record<string, string> = {
  "̂": "\\hat", "^": "\\hat", "ˆ": "\\hat", "̃": "\\tilde", "~": "\\tilde", "˜": "\\tilde", "̅": "\\bar", "¯": "\\bar",
  "̇": "\\dot", "˙": "\\dot", "̈": "\\ddot", "¨": "\\ddot", "→": "\\vec", "⃗": "\\vec", "̌": "\\check",
};

const group = (s: string) => `{${s}}`;

function children(el: Element): string {
  return Array.from(el.children).map(convert).join("");
}

function convert(el: Element): string {
  if (el.namespaceURI !== M) return "";
  switch (el.localName) {
    case "r": {
      const text = kids(el, "t").map((t) => t.textContent || "").join("");
      if (!text) return "";
      const rPr = kid(el, "rPr");
      const normal = rPr && kid(rPr, "nor") && valOf(kid(rPr, "nor")) !== "0";
      if (normal) return `\\text{${escapeText(text)}}`;
      const sty = valOf(rPr && kid(rPr, "sty")!);
      const scr = valOf(rPr && kid(rPr, "scr")!);
      const body = text.replace(/([\\{}%&#$_^~])/g, "\\$1").replace(/\s+/g, "\\,");
      if (scr === "script") return `\\mathcal{${body}}`;
      if (scr === "double-struck") return `\\mathbb{${body}}`;
      if (sty === "p") return `\\mathrm{${body}}`;
      if (sty === "b") return `\\mathbf{${body}}`;
      if (sty === "bi") return `\\boldsymbol{${body}}`;
      return body;
    }
    case "f": {
      const type = valOf(kid(kid(el, "fPr") || el, "type"));
      const n = group(children(kid(el, "num") || el));
      const d = group(children(kid(el, "den") || el));
      return type === "noBar" ? `\\binom${n}${d}` : `\\frac${n}${d}`;
    }
    case "sSub":
      return `${group(children(kid(el, "e")!))}_${group(children(kid(el, "sub")!))}`;
    case "sSup":
      return `${group(children(kid(el, "e")!))}^${group(children(kid(el, "sup")!))}`;
    case "sSubSup":
      return `${group(children(kid(el, "e")!))}_${group(children(kid(el, "sub")!))}^${group(children(kid(el, "sup")!))}`;
    case "sPre":
      return `{}_${group(children(kid(el, "sub")!))}^${group(children(kid(el, "sup")!))}${group(children(kid(el, "e")!))}`;
    case "rad": {
      const hide = valOf(kid(kid(el, "radPr") || el, "degHide")) === "1";
      const deg = kid(el, "deg") ? children(kid(el, "deg")!) : "";
      const e = group(children(kid(el, "e")!));
      return hide || !deg ? `\\sqrt${e}` : `\\sqrt[${deg}]${e}`;
    }
    case "d": {
      const pr = kid(el, "dPr");
      const beg = pr && kid(pr, "begChr") ? valOf(kid(pr, "begChr")) ?? "" : "(";
      const end = pr && kid(pr, "endChr") ? valOf(kid(pr, "endChr")) ?? "" : ")";
      const sep = pr && kid(pr, "sepChr") ? valOf(kid(pr, "sepChr")) ?? "" : "|";
      const body = kids(el, "e").map((e) => children(e)).join(sep === "" ? " " : sep === "|" ? "\\mid " : sep);
      return `\\left${DELIMS[beg] ?? beg} ${body} \\right${DELIMS[end] ?? end}`;
    }
    case "nary": {
      const pr = kid(el, "naryPr");
      const chr = pr && kid(pr, "chr") ? valOf(kid(pr, "chr")) || "" : "∫";
      const op = NARY[chr] ?? (chr || "\\int");
      const subHide = valOf(pr && kid(pr, "subHide")!) === "1";
      const supHide = valOf(pr && kid(pr, "supHide")!) === "1";
      const sub = !subHide && kid(el, "sub") ? `_${group(children(kid(el, "sub")!))}` : "";
      const sup = !supHide && kid(el, "sup") ? `^${group(children(kid(el, "sup")!))}` : "";
      return `${op}${sub}${sup} ${group(children(kid(el, "e")!))}`;
    }
    case "func":
      return `\\operatorname{${children(kid(el, "fName")!).replace(/\\mathrm\{([^}]*)\}/g, "$1")}} ${group(children(kid(el, "e")!))}`;
    case "acc": {
      const chr = valOf(kid(kid(el, "accPr") || el, "chr"));
      return `${ACCENT[chr ?? "̂"] ?? "\\hat"}${group(children(kid(el, "e")!))}`;
    }
    case "bar": {
      const pos = valOf(kid(kid(el, "barPr") || el, "pos"));
      return `${pos === "bot" ? "\\underline" : "\\overline"}${group(children(kid(el, "e")!))}`;
    }
    case "limLow":
      return `\\underset${group(children(kid(el, "lim")!))}${group(children(kid(el, "e")!))}`;
    case "limUpp":
      return `\\overset${group(children(kid(el, "lim")!))}${group(children(kid(el, "e")!))}`;
    case "eqArr":
      return `\\begin{aligned} ${kids(el, "e").map((e) => children(e)).join(" \\\\ ")} \\end{aligned}`;
    case "m":
      return `\\begin{matrix} ${kids(el, "mr").map((r) => kids(r, "e").map((c) => children(c)).join(" & ")).join(" \\\\ ")} \\end{matrix}`;
    default:
      // Property blocks (rPr, fPr, ctrlPr and so on) carry no content.
      return /Pr$/.test(el.localName) || el.localName === "sty" ? "" : children(el);
  }
}

export function ommlToLatex(oMath: Element): string {
  try {
    return convert(oMath).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* Pulling equations out of a .docx, and putting them back             */
/* ------------------------------------------------------------------ */

/**
 * Replaces every Word equation with a ⟦EQ:n⟧ placeholder run so the text
 * converter keeps its position, and returns the equations separately.
 */
export async function extractEquations(buffer: ArrayBuffer): Promise<{ buffer: ArrayBuffer; equations: EquationMap }> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file("word/document.xml");
  if (!file) return { buffer, equations: {} };

  const xml = await file.async("string");
  if (!xml.includes("<m:oMath")) return { buffer, equations: {} };

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return { buffer, equations: {} };

  const serializer = new XMLSerializer();
  const equations: EquationMap = {};
  let n = 0;

  const placeholder = (id: string) => {
    const run = doc.createElementNS(W, "w:r");
    const t = doc.createElementNS(W, "w:t");
    t.setAttributeNS(XML, "xml:space", "preserve");
    t.textContent = equationToken(id);
    run.appendChild(t);
    return run;
  };

  // Equations on their own line live in <m:oMathPara>; the rest are inline.
  const paras = Array.from(doc.getElementsByTagNameNS(M, "oMathPara"));
  for (const para of paras) {
    const maths = Array.from(para.children).filter((c) => c.localName === "oMath");
    const parent = para.parentNode;
    if (!parent) continue;
    for (const m of maths) {
      const id = String(++n);
      equations[id] = { latex: ommlToLatex(m), display: true, omml: serializer.serializeToString(m) };
      parent.insertBefore(placeholder(id), para);
    }
    parent.removeChild(para);
  }

  const inline = Array.from(doc.getElementsByTagNameNS(M, "oMath"));
  for (const m of inline) {
    const parent = m.parentNode;
    if (!parent) continue;
    const id = String(++n);
    equations[id] = { latex: ommlToLatex(m), display: false, omml: serializer.serializeToString(m) };
    parent.replaceChild(placeholder(id), m);
  }

  zip.file("word/document.xml", serializer.serializeToString(doc));
  return { buffer: await zip.generateAsync({ type: "arraybuffer" }), equations };
}

const RUN_WITH_TOKEN = /<w:r>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>⟦EQ:([A-Za-z0-9_-]+)⟧<\/w:t><\/w:r>/g;

/** Swaps each placeholder run in an exported .docx back to the original Word equation. */
export async function restoreEquations(docx: Blob, equations: EquationMap): Promise<Blob> {
  if (Object.keys(equations).length === 0) return docx;
  const zip = await JSZip.loadAsync(await docx.arrayBuffer());
  const file = zip.file("word/document.xml");
  if (!file) return docx;
  const xml = await file.async("string");
  if (!xml.includes("⟦EQ:")) return docx;

  const restored = xml.replace(RUN_WITH_TOKEN, (whole, id: string) => {
    const eq: EquationAtom | undefined = equations[id];
    if (!eq) return whole;
    return eq.display ? `<m:oMathPara>${eq.omml}</m:oMathPara>` : eq.omml;
  });
  zip.file("word/document.xml", restored);
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
