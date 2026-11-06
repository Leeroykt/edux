/**
 * Layout work for pages drawn from a Word file that CSS cannot do on its own:
 * tab stops (with leaders) and finding where lines end, so a page can break between two lines.
 */
import type { DocxTabStop } from "@edux/schema";

export const PX_PER_PT = 4 / 3;

/** A CSS length written by the importer ("12pt", "0pt") in CSS pixels. */
export function cssPx(v: string | number | undefined): number {
  if (v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const m = /^(-?[\d.]+)(pt|px)?$/.exec(v.trim());
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return m[2] === "px" ? n : n * PX_PER_PT;
}

/** How much an element is scaled on screen (CSS zoom), so screen distances can be turned back into layout pixels. */
function scaleOf(el: HTMLElement): number {
  // The page's own width is known exactly, so compare it with its width on screen.
  const page = el.closest<HTMLElement>("article");
  const declared = page ? parseFloat(page.style.width) : NaN;
  if (page && declared > 0) return page.getBoundingClientRect().width / declared;
  const r = el.getBoundingClientRect();
  return el.offsetWidth > 0 ? r.width / el.offsetWidth : 1;
}

/**
 * Sizes every tab inside `root` so the text after it lands on the next tab stop, the way Word does it.
 * Tab stops are measured from the left edge of the text column (the page content, a table cell, a header).
 */
export function layoutTabs(root: HTMLElement, defaultTabPt: number) {
  const tabs = Array.from(root.querySelectorAll<HTMLElement>(".dx-tab"));
  if (tabs.length === 0) return;
  for (const t of tabs) {
    t.style.width = "0px";
    t.classList.remove("dx-leader-dot", "dx-leader-hyphen", "dx-leader-underscore", "dx-leader-middleDot");
  }
  for (const tab of tabs) {
    const block = tab.closest<HTMLElement>("[data-tabs], .dx-block, .dx-p");
    const ref = tab.closest<HTMLElement>("td, .dx-hf-inner, [data-holder]");
    if (!block || !ref) continue;
    const scale = scaleOf(ref) || 1;
    const refStyle = getComputedStyle(ref);
    const refLeft = ref.getBoundingClientRect().left + parseFloat(refStyle.paddingLeft || "0") * scale + parseFloat(refStyle.borderLeftWidth || "0") * scale;
    const xPx = (tab.getBoundingClientRect().left - refLeft) / scale;
    const x = xPx / PX_PER_PT;

    let stops: DocxTabStop[] = [];
    try {
      stops = JSON.parse(block.dataset.tabs || "[]");
    } catch {
      stops = [];
    }
    const blockStyle = getComputedStyle(block);
    const indent = parseFloat(blockStyle.marginLeft || "0") / PX_PER_PT;
    const hanging = parseFloat(blockStyle.textIndent || "0") < 0;

    let stop: DocxTabStop | null = stops.find((s) => s.pos > x + 0.5) ?? null;
    // A hanging indent is a tab stop of its own.
    if (hanging && indent > x + 0.5 && (!stop || indent < stop.pos)) stop = { pos: indent, align: "left" };
    if (!stop) {
      const step = defaultTabPt > 0 ? defaultTabPt : 36;
      stop = { pos: (Math.floor(x / step) + 1) * step, align: "left" };
    }

    let width = (stop.pos - x) * PX_PER_PT;
    if (stop.align !== "left") {
      // Measure the text that follows, up to the next tab or the end of the paragraph.
      const range = document.createRange();
      range.setStartAfter(tab);
      const next = tabs.find((t) => t !== tab && block.contains(t) && (tab.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
      if (next) range.setEndBefore(next);
      else range.setEnd(block, block.childNodes.length);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      const tabTop = tab.getBoundingClientRect().top;
      const sameLine = rects.filter((r) => Math.abs(r.top - tabTop) < 20 * scale);
      const follow = sameLine.length ? (Math.max(...sameLine.map((r) => r.right)) - Math.min(...sameLine.map((r) => r.left))) / scale : 0;
      // Text that ends exactly on the margin must not wrap because of rounding.
      width -= (stop.align === "center" ? follow / 2 : follow) + 1;
    }
    if (width < 1) width = Math.max(1, ((Math.floor(x / defaultTabPt) + 1) * defaultTabPt - x) * PX_PER_PT);
    tab.style.width = `${width}px`;
    if (stop.leader) tab.classList.add(`dx-leader-${stop.leader}`);
  }
}

export interface BlockMeasure {
  /** Height of the block's border box. */
  h: number;
  /** Places, measured from the top of the block, where a page can end between two lines. */
  cuts: number[];
}

/** Measures a block: its height and the gaps between its lines. */
export function measureBlock(el: HTMLElement, splittable: boolean): BlockMeasure {
  const h = el.getBoundingClientRect().height / (scaleOf(el) || 1);
  if (!splittable || h < 30) return { h, cuts: [] };
  const scale = scaleOf(el) || 1;
  const top = el.getBoundingClientRect().top;
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects())
    .filter((r) => r.height > 0 && r.width > 0)
    .map((r) => ({ top: (r.top - top) / scale, bottom: (r.bottom - top) / scale }))
    .sort((a, b) => a.top - b.top);
  const lines: { top: number; bottom: number }[] = [];
  for (const r of rects) {
    const last = lines[lines.length - 1];
    if (last && r.top < last.bottom - 2) last.bottom = Math.max(last.bottom, r.bottom);
    else lines.push({ ...r });
  }
  const cuts: number[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const cut = (lines[i].bottom + lines[i + 1].top) / 2;
    if (cut > 0 && cut < h) cuts.push(Math.round(cut * 10) / 10);
  }
  return { h, cuts };
}
