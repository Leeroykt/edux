/**
 * Helpers for typing directly into a paragraph.
 *
 * While a paragraph is being edited it is a plain contentEditable element whose
 * contents the browser owns. Everything here either reads that element back into
 * text, maps between text positions and DOM positions, or matches the sentences
 * found after an edit to the ones that were there before.
 *
 * Equations are atomic: an element with `data-eq="<id>"` counts as the token
 * ⟦EQ:<id>⟧ for length and position purposes, and is never edited from inside.
 */
import { DocumentSentence } from "@edux/schema";
import { TOKEN_REGEX, equationToken } from "./equations";

export const EQ_ATTR = "data-eq";

const isEquation = (n: Node): boolean => n.nodeType === 1 && (n as HTMLElement).hasAttribute(EQ_ATTR);
const isAtomic = (n: Node): boolean =>
  n.nodeType === 1 && (isEquation(n) || (n as HTMLElement).getAttribute("contenteditable") === "false");

const FORMAT_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUP", "SUB"]);

export function escapeHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** How many characters a node stands for in text-position terms. */
export function lengthOf(n: Node): number {
  if (n.nodeType === 3) return (n as Text).data.length;
  if (n.nodeType !== 1) return 0;
  const el = n as HTMLElement;
  if (isEquation(el)) return equationToken(el.getAttribute(EQ_ATTR)!).length;
  if (el.tagName === "BR") return 1;
  let total = 0;
  el.childNodes.forEach((c) => (total += lengthOf(c)));
  return total;
}

/** Text position of a DOM position inside `root`. */
export function offsetOf(root: Node, node: Node, off: number): number {
  let total = 0;
  const walk = (cur: Node): boolean => {
    if (cur === node) {
      if (cur.nodeType === 3) total += off;
      else for (let i = 0; i < off && i < cur.childNodes.length; i++) total += lengthOf(cur.childNodes[i]);
      return true;
    }
    if (cur.nodeType === 3) {
      total += (cur as Text).data.length;
      return false;
    }
    if (cur.nodeType !== 1) return false;
    const el = cur as HTMLElement;
    if (isEquation(el)) {
      // A click inside the drawn equation counts as a position just before it.
      if (el.contains(node)) return true;
      total += lengthOf(el);
      return false;
    }
    if (el.tagName === "BR") {
      total += 1;
      return false;
    }
    for (const c of Array.from(el.childNodes)) if (walk(c)) return true;
    return false;
  };
  walk(root);
  return total;
}

/** Current caret position as a text position, or null if the caret is elsewhere. */
export function caretOffset(root: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.focusNode)) return null;
  return offsetOf(root, sel.focusNode!, sel.focusOffset);
}

/** The DOM position for a text position inside `root`. Positions past the end give null. */
export function positionAt(root: HTMLElement, offset: number): { node: Node; off: number } | null {
  let remaining = offset;
  let target: { node: Node; off: number } | null = null;

  const walk = (cur: Node): boolean => {
    if (cur.nodeType === 3) {
      const len = (cur as Text).data.length;
      if (remaining <= len) {
        target = { node: cur, off: remaining };
        return true;
      }
      remaining -= len;
      return false;
    }
    if (cur.nodeType !== 1) return false;
    const el = cur as HTMLElement;
    if (isAtomic(el) || el.tagName === "BR") {
      const len = lengthOf(el);
      const parent = el.parentNode!;
      const idx = Array.prototype.indexOf.call(parent.childNodes, el) as number;
      if (remaining <= 0) {
        target = { node: parent, off: idx };
        return true;
      }
      if (remaining < len) {
        target = { node: parent, off: idx + 1 };
        return true;
      }
      remaining -= len;
      return false;
    }
    for (const c of Array.from(el.childNodes)) if (walk(c)) return true;
    return false;
  };
  walk(root);
  return target;
}

/** Puts the caret at a text position inside `root`. Positions past the end go to the end. */
export function placeCaret(root: HTMLElement, offset: number) {
  const target = positionAt(root, offset);
  const range = document.createRange();
  if (target) range.setStart(target.node, target.off);
  else range.selectNodeContents(root);
  range.collapse(target ? true : false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Selects from a text position in one element to a text position in another. */
export function selectOffsets(startRoot: HTMLElement, from: number, endRoot: HTMLElement, to: number) {
  const a = positionAt(startRoot, from);
  const b = positionAt(endRoot, to) ?? { node: endRoot, off: endRoot.childNodes.length };
  if (!a) return;
  const range = document.createRange();
  range.setStart(a.node, a.off);
  range.setEnd(b.node, b.off);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** The DOM position under a screen point, across browsers. */
export function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
  }
  return null;
}

/** The text and the allowed inline formatting inside an editable element. Equations come back as tokens. */
export function readEditable(root: HTMLElement): { text: string; html: string } {
  let text = "";
  let html = "";
  const walk = (n: Node) => {
    if (n.nodeType === 3) {
      const t = (n as Text).data.replace(/ /g, " ");
      text += t;
      html += escapeHtml(t);
      return;
    }
    if (n.nodeType !== 1) return;
    const el = n as HTMLElement;
    if (isEquation(el)) {
      const tok = equationToken(el.getAttribute(EQ_ATTR)!);
      text += tok;
      html += tok;
      return;
    }
    if (el.tagName === "BR") {
      text += " ";
      html += " ";
      return;
    }
    const keep = FORMAT_TAGS.has(el.tagName);
    // Colour, highlight, font and size live in a style attribute. formatting.ts cleans it before it is saved.
    const style = el.tagName === "SPAN" ? el.getAttribute("style") : null;
    if (keep) html += `<${el.tagName.toLowerCase()}>`;
    if (style) html += `<span style="${style.replace(/"/g, "&quot;")}">`;
    el.childNodes.forEach(walk);
    if (style) html += "</span>";
    if (keep) html += `</${el.tagName.toLowerCase()}>`;
  };
  root.childNodes.forEach(walk);
  return { text, html };
}

export const hasFormatting = (html: string) => /<(b|strong|i|em|u|s|strike|sup|sub)>|<span style=/i.test(html);

/** The HTML a paragraph is edited as: its sentences in order, equations drawn and protected. */
export function buildEditableHtml(sentences: DocumentSentence[], equationHtml: (id: string) => string): string {
  return sentences
    .map((s) => {
      const body = (s.formattedHtml ?? escapeHtml(s.text)).replace(TOKEN_REGEX(), (_m, id: string) => equationHtml(id));
      const attrs = s.locked ? ' contenteditable="false" class="sent-locked" title="Locked. Unlock it to edit."' : "";
      return `<span data-sid="${s.id}"${attrs}>${body}</span>`;
    })
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* Matching sentences after an edit                                    */
/* ------------------------------------------------------------------ */

const norm = (t: string) => t.replace(/\s+/g, " ").trim();

export interface Reconciled {
  sentences: DocumentSentence[];
  /** Sentences whose wording changed or that are new, so they need a fresh score. */
  changedIds: string[];
  /** Sentences that no longer exist. */
  removedIds: string[];
  /** False when nothing changed at all. */
  dirty: boolean;
}

/**
 * Matches the sentences found after typing to the ones that were there before.
 * Unchanged sentences keep their id, score and formatting. A reworded sentence keeps
 * its id and remembers its original wording for tracked changes. New ones get new ids.
 */
export function reconcile(
  old: DocumentSentence[],
  texts: string[],
  nodeId: string,
  paragraphIndex: number,
  newId: () => string,
  singleHtml?: string
): Reconciled {
  const a = old.map((s) => norm(s.text));
  const b = texts.map(norm);

  // Longest common subsequence of unchanged sentences.
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const pairs: [number, number][] = [];
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const out: DocumentSentence[] = [];
  const changedIds: string[] = [];
  const removedIds: string[] = [];
  let dirty = old.length !== texts.length;

  let oi = 0;
  let nj = 0;
  const flushGap = (oldEnd: number, newEnd: number) => {
    const oldGap = old.slice(oi, oldEnd);
    const newGap = texts.slice(nj, newEnd);
    newGap.forEach((t, k) => {
      const prev = oldGap[k];
      const text = norm(t);
      if (prev) {
        // Reworded: same sentence, new words.
        out.push({
          ...prev,
          nodeId,
          paragraphIndex,
          text,
          formattedHtml: newGap.length === 1 && singleHtml ? singleHtml : undefined,
          score: undefined,
          edited: true,
          originalText: prev.originalText ?? prev.text,
        });
        changedIds.push(prev.id);
      } else {
        const id = newId();
        out.push({
          id,
          nodeId,
          paragraphIndex,
          text,
          formattedHtml: newGap.length === 1 && singleHtml ? singleHtml : undefined,
          charStart: 0,
          charEnd: text.length,
          locked: false,
          ignored: false,
          edited: true,
          originalText: "",
        });
        changedIds.push(id);
      }
    });
    oldGap.slice(newGap.length).forEach((s) => removedIds.push(s.id));
    if (newGap.length > 0 || oldGap.length > 0) dirty = true;
  };

  for (const [i, j] of pairs) {
    flushGap(i, j);
    out.push({ ...old[i], nodeId, paragraphIndex });
    oi = i + 1;
    nj = j + 1;
  }
  flushGap(old.length, texts.length);

  return { sentences: out, changedIds, removedIds, dirty: dirty || changedIds.length > 0 || removedIds.length > 0 };
}
