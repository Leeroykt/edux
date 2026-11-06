"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  DocumentParagraphNode,
  DocumentSentence,
  DocxLayout,
  SuggestionCandidate
} from "@edux/schema";
import { BlockMeasure, PX_PER_PT, cssPx, layoutTabs, measureBlock } from "../../lib/docxLayout";
import katex from "katex";
import "katex/dist/katex.min.css";
import { EquationMap, TOKEN_REGEX, hasEquation } from "../../lib/equations";
import { EditorBottomBar } from "./EditorBottomBar";
import { EditableParagraph } from "./EditableParagraph";
import { EQ_ATTR, caretFromPoint, lengthOf, offsetOf, selectOffsets } from "../../lib/editing";
import { FONT_CHOICES, FormatOp, HIGHLIGHTS, SIZE_CHOICES, TEXT_COLOURS, formatRange, rangeHas } from "../../lib/formatting";
import { splitSentenceTexts } from "../../lib/sentences";
import { AcademicFigure } from "./AcademicFigure";
import { HelpTooltip } from "../ui/HelpTooltip";
import {
  Sparkles,
  Lock,
  Sigma,
  CheckCheck,
  PanelRightOpen,
  PanelRightClose,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Plus,
  Copy,
  ChevronDown,
  Check,
  FileText,
  FolderOpen
} from "lucide-react";

interface DocumentEditorProps {
  paragraphs: DocumentParagraphNode[];
  selectedSentenceId: string | null;
  onSelectSentence: (sentence: DocumentSentence) => void;
  onApplyQuickRewrite: (sentenceId: string, candidate: SuggestionCandidate) => void;
  onApplyAllRewrites: () => void;
  onToggleLock: (sentenceId: string) => void;
  onOpenEquationModal: () => void;
  onOpenUploadModal: () => void;
  onOpenDocPicker?: () => void;
  onOpenInsertImage: () => void;
  onOpenInsertTable: () => void;
  onOpenReport: () => void;
  aiThreshold: number;
  onThresholdChange: (val: number) => void;
  // History
  historyUndoLength: number;
  historyRedoLength: number;
  onUndo: () => void;
  onRedo: () => void;
  // Humaniser Flow & Modes
  isHumanisedScanned: boolean;
  onTriggerHumanise: () => void;
  isHumanising: boolean;
  humaniseViewMode: "original_flags" | "humanised_preview" | "split" | "clean";
  onHumaniseViewModeChange: (mode: "original_flags" | "humanised_preview" | "split" | "clean") => void;
  // Suggestions map for Humanised Preview mode
  suggestionsMap: Record<string, SuggestionCandidate[]>;
  // Drawer
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  // Inserted rich media elements
  onNodeMove: (id: string, direction: "up" | "down") => void;
  onNodeUpdate: (id: string, patch: Partial<DocumentParagraphNode>) => void;
  onNodeDelete: (id: string) => void;
  onTableCellEdit: (id: string, row: number, col: number, text: string) => void;
  // Paper Theme & Typography
  paperTheme: "white" | "dark";
  onTogglePaperTheme: () => void;
  fontFamily: string;
  fontSize: string;
  onExecCommand: (command: string, value?: string) => void;
  /** Saves new formatting on the sentences a selection touched. */
  onFormatSentences: (updates: { id: string; html: string | undefined }[]) => void;
  similarityScore: number;
  isSaving: boolean;
  wordCount: number;
  pageCount: number;
  isSampleDocument?: boolean;
  /** The toolbar above already shows mode and counts. */
  hideStatusHeader?: boolean;
  /** True while the background scan is still producing scores. */
  isScanning?: boolean;
  /** True until the first document has loaded. */
  isLoading?: boolean;
  /** LaTeX of the sample document's displayed equation. */
  equationLatex?: string;
  /** Equations found in an uploaded file, keyed by the id in the text tokens. */
  equations?: EquationMap;
  /** Typing: the paragraph now says this. */
  onCommitParagraph?: (paragraphId: string, text: string, html: string, reason: "idle" | "blur") => void;
  onSplitParagraph?: (paragraphId: string, text: string, html: string, offset: number) => void;
  onMergeParagraph?: (paragraphId: string, text: string, html: string) => void;
  /** Ask the editor to start typing in a paragraph, for example after Enter splits one. */
  editRequest?: { id: string; offset: number | null; nonce: number } | null;
  /** Language tag used for the browser's own spell check while typing. */
  lang?: string;
  onUnsupportedEdit?: (what: string) => void;
  /** Sentences being re-scored after an applied rewrite. */
  rescoring?: Record<string, boolean>;
  /** Progress or error strip shown under the status header. */
  scanBanner?: React.ReactNode;
  /** Page setup from a Word file. When present the pages are drawn exactly as Word lays them out. */
  layout?: DocxLayout;
}

const ACADEMIC_SYNONYMS: Record<string, string[]> = {
  furthermore: ["specifically", "additionally", "notably", "moreover"],
  moreover: ["in addition", "likewise", "further", "crucially"],
  crucial: ["essential", "pivotal", "key", "paramount"],
  foundational: ["core", "primary", "fundamental", "baseline"],
  revolutionized: ["transformed", "reshaped", "advanced", "redefined"],
  contemporary: ["current", "modern", "active", "present-day"],
  landscape: ["domain", "field", "context", "discipline"],
  notwithstanding: ["despite", "even with", "regardless of"],
  delve: ["investigate", "explore", "examine", "analyze"],
  testament: ["evidence", "demonstration", "indication"],
  pivotal: ["critical", "central", "determining"],
  utilize: ["apply", "employ", "adopt", "use"],
  "in conclusion": ["ultimately", "in summary", "overall"],
};

/**
 * A sentence drawn from saved HTML. React rewrites innerHTML on every render when it is given a fresh object,
 * which wipes the writer's text selection, so it only redraws when the HTML itself changes.
 */
const HtmlBody = React.memo(
  ({ id, html }: { id: string; html: string }) => <span data-body={id} dangerouslySetInnerHTML={{ __html: html }} />,
  (a, b) => a.id === b.id && a.html === b.html
);
HtmlBody.displayName = "HtmlBody";

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  paragraphs,
  selectedSentenceId,
  onSelectSentence,
  onApplyQuickRewrite,
  onApplyAllRewrites,
  onToggleLock,
  onOpenEquationModal,
  onOpenUploadModal,
  onOpenDocPicker,
  onOpenInsertImage,
  onOpenInsertTable,
  onOpenReport,
  aiThreshold,
  onThresholdChange,
  historyUndoLength,
  historyRedoLength,
  onUndo,
  onRedo,
  isHumanisedScanned,
  onTriggerHumanise,
  isHumanising,
  humaniseViewMode,
  onHumaniseViewModeChange,
  suggestionsMap,
  isInspectorOpen,
  onToggleInspector,
  onNodeMove,
  onNodeUpdate,
  onNodeDelete,
  onTableCellEdit,
  paperTheme,
  onTogglePaperTheme,
  fontFamily,
  fontSize,
  onExecCommand,
  onFormatSentences,
  similarityScore,
  isSaving,
  wordCount,
  pageCount,
  isSampleDocument = false,
  hideStatusHeader = false,
  isScanning = false,
  isLoading = false,
  equationLatex = "",
  equations = {},
  onCommitParagraph,
  onSplitParagraph,
  onMergeParagraph,
  editRequest = null,
  lang = "en-GB",
  onUnsupportedEdit,
  rescoring = {},
  scanBanner = null,
  layout,
}) => {
  const fid = !!layout;
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const updateCurrentPage = useCallback(() => {
    const box = scrollRef.current;
    if (!box) return;
    const top = box.getBoundingClientRect().top + 120;
    let found = 1;
    box.querySelectorAll<HTMLElement>("article[data-page]").forEach((el) => {
      if (el.getBoundingClientRect().top <= top) found = Number(el.dataset.page) || found;
    });
    setCurrentPage(found);
  }, []);

  // Floating Selection Bubble State
  const [floatingBubble, setFloatingBubble] = useState<{
    top: number;
    left: number;
    text: string;
  } | null>(null);
  const [wordSuggestions, setWordSuggestions] = useState<{
    word: string;
    options: string[];
  } | null>(null);

  // Handle user selecting words/phrases with cursor
  const updateSelectionBubble = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setFloatingBubble(null);
      setWordSuggestions(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length === 0) {
      setFloatingBubble(null);
      setWordSuggestions(null);
      return;
    }

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setFloatingBubble(null);
        return;
      }

      setFloatingBubble({
        top: Math.max(10, rect.top - 8),
        left: rect.left + rect.width / 2,
        text,
      });
    } catch {
      setFloatingBubble(null);
    }
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(updateSelectionBubble, 40);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key.startsWith("Arrow")) {
        setTimeout(updateSelectionBubble, 40);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [updateSelectionBubble]);

  // The bubble follows its selection while scrolling, and goes away when the selection does.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const onScroll = () => updateSelectionBubble();
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, [updateSelectionBubble]);
  useEffect(() => {
    updateSelectionBubble();
  }, [paragraphs, updateSelectionBubble]);

  const [formatMenu, setFormatMenu] = useState<"color" | "bg" | "more" | null>(null);
  useEffect(() => {
    if (!floatingBubble) setFormatMenu(null);
  }, [floatingBubble]);

  /** Applies a formatting change to whatever is selected, across as many sentences as it spans. */
  const applyFormat = (op: FormatOp) => {
    const sel = window.getSelection();
    const scope = scrollRef.current;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !scope) return;
    const range = sel.getRangeAt(0);
    const bodies = Array.from(scope.querySelectorAll<HTMLElement>("[data-body], [data-sid]")).filter((el) => range.intersectsNode(el));
    const all = paragraphs.flatMap((p) => p.sentences);

    const targets: { el: HTMLElement; id: string; from: number; to: number; text: string; html?: string }[] = [];
    for (const el of bodies) {
      const id = el.dataset.body ?? el.dataset.sid;
      const s = id ? all.find((x) => x.id === id) : undefined;
      if (!id || !s || s.locked) continue;
      const from = el.contains(range.startContainer) ? offsetOf(el, range.startContainer, range.startOffset) : 0;
      const to = el.contains(range.endContainer) ? offsetOf(el, range.endContainer, range.endOffset) : lengthOf(el);
      if (to > from) targets.push({ el, id, from, to, text: s.text, html: s.formattedHtml });
    }
    if (targets.length === 0) return;

    // A switch is on for everything or off for everything, never half and half.
    let resolved = op;
    if (op.type === "toggle") {
      const key = op.key;
      resolved = { type: "toggle", key, on: !targets.every((t) => rangeHas(t.text, t.html, t.from, t.to, key)) };
    }

    const updates = targets.map((t) => ({ id: t.id, html: formatRange(t.text, t.html, t.from, t.to, resolved) }));
    onFormatSentences(updates);

    // The page redraws the sentences, so put the selection back to let formats be stacked.
    const first = targets[0];
    const last = targets[targets.length - 1];
    const wasEditing = !!first.el.closest("[data-editing]");
    if (wasEditing) {
      // A paragraph being typed in is the browser's, so its sentences are redrawn by hand.
      targets.forEach((t, i) => {
        const html = (updates[i].html ?? escapeHtml(t.text)).replace(TOKEN_REGEX(), (_m, id: string) => equationHtml(id));
        t.el.innerHTML = html;
      });
    }
    const restore = () => {
      const find = (id: string) => scope.querySelector<HTMLElement>(`[data-body="${id}"], [data-sid="${id}"]`);
      const a = find(first.id);
      const b = find(last.id);
      if (a && b) selectOffsets(a, first.from, b, last.to);
      setTimeout(updateSelectionBubble, 30);
    };
    if (wasEditing) restore();
    else setTimeout(restore, 40);
  };

  const handleHumaniseWordClick = () => {
    if (!floatingBubble) return;
    const cleanWord = floatingBubble.text.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    const matches = ACADEMIC_SYNONYMS[cleanWord];
    if (matches && matches.length > 0) {
      setWordSuggestions({ word: floatingBubble.text, options: matches });
    } else {
      const options = [
        `specifically ${floatingBubble.text}`,
        `more directly, ${floatingBubble.text}`,
        `${floatingBubble.text} in scholarly context`,
      ];
      setWordSuggestions({ word: floatingBubble.text, options });
    }
  };

  const handleApplyWordOption = (replacement: string) => {
    document.execCommand("insertText", false, replacement);
    setFloatingBubble(null);
    setWordSuggestions(null);
  };

  const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const equationHtml = React.useMemo(() => {
    const cache = new Map<string, string>();
    return (id: string): string => {
      const hit = cache.get(id);
      if (hit !== undefined) return hit;
      const eq = equations[id];
      let html = '<span class="text-slate-500 italic">[equation]</span>';
      if (eq?.latex) {
        try {
          html = katex.renderToString(eq.latex, { displayMode: eq.display, throwOnError: false });
        } catch {
          html = `<code>${escapeHtml(eq.latex)}</code>`;
        }
      }
      html = `<span ${EQ_ATTR}="${id}" contenteditable="false" class="eq-atom">${html}</span>`;
      cache.set(id, html);
      return html;
    };
  }, [equations]);

  /** A sentence's body: plain text, saved formatting, or text with its equations drawn in. */
  const renderBody = (s: DocumentSentence): React.ReactNode => {
    if (hasEquation(s.text)) {
      const html = (s.formattedHtml ?? escapeHtml(s.text)).replace(TOKEN_REGEX(), (_m, id: string) => equationHtml(id));
      return <HtmlBody key={`${s.id}-e-${s.formattedHtml ? 1 : 0}`} id={s.id} html={html} />;
    }
    return s.formattedHtml ? (
      <HtmlBody key={`${s.id}-f`} id={s.id} html={s.formattedHtml} />
    ) : (
      <span key={`${s.id}-p`} data-body={s.id}>
        {s.text}
      </span>
    );
  };

  /** 1, 2, 3 for each numbered list, restarting after anything that is not part of the list. */
  const listNumbers = React.useMemo(() => {
    const out = new Map<string, number>();
    const counters: number[] = [];
    for (const n of paragraphs) {
      if (n.type !== "list_item") {
        counters.length = 0;
        continue;
      }
      const lvl = n.level || 0;
      counters.length = lvl + 1;
      counters[lvl] = (counters[lvl] || 0) + 1;
      if (n.listType === "number") out.set(n.id, counters[lvl]);
    }
    return out;
  }, [paragraphs]);

  /* ---- Typing ---- */
  const EDITABLE_TYPES = ["paragraph", "heading", "list_item", "blockquote"];
  const [editing, setEditing] = useState<{ id: string; offset: number | null } | null>(null);

  useEffect(() => {
    if (editRequest) setEditing({ id: editRequest.id, offset: editRequest.offset });
  }, [editRequest?.nonce]);

  // Typing is for your own words, so it is off in Preview, where the page shows suggestions.
  const canType = humaniseViewMode !== "humanised_preview";

  const handleSentenceClick = (e: React.MouseEvent, sentence: DocumentSentence) => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return; // choosing text, not placing a caret
    onSelectSentence(sentence);
    if (!canType || sentence.locked) return;
    const holder = (e.currentTarget as HTMLElement).closest("[data-pid]") as HTMLElement | null;
    if (!holder) return;
    const para = paragraphs.find((x) => x.id === holder.dataset.pid);
    if (!para || !EDITABLE_TYPES.includes(para.type)) return;
    const pos = caretFromPoint(e.clientX, e.clientY);
    const offset = pos && holder.contains(pos.node) ? offsetOf(holder, pos.node, pos.offset) : null;
    setEditing({ id: para.id, offset });
  };

  /** While typing, keep the review panel on the sentence the caret is in. */
  const handleCaret = (para: DocumentParagraphNode, text: string, offset: number) => {
    const parts = splitSentenceTexts(text);
    if (parts.length !== para.sentences.length) return;
    let start = 0;
    for (let i = 0; i < parts.length; i++) {
      const at = text.indexOf(parts[i], start);
      const from = at < 0 ? start : at;
      const end = from + parts[i].length;
      if (offset <= end || i === parts.length - 1) {
        if (para.sentences[i].id !== selectedSentenceId) onSelectSentence(para.sentences[i]);
        return;
      }
      start = end;
    }
  };

  const renderParagraphBody = (para: DocumentParagraphNode, allowEdit = true): React.ReactNode => {
    if (allowEdit && editing?.id === para.id && canType) {
      return (
        <EditableParagraph
          key={`edit-${para.id}-${editRequest?.nonce ?? 0}`}
          sentences={para.sentences}
          equationHtml={equationHtml}
          initialOffset={editing.offset}
          lang={lang}
          onCommit={(text, html, reason) => onCommitParagraph?.(para.id, text, html, reason)}
          onSplit={(text, html, offset) => onSplitParagraph?.(para.id, text, html, offset)}
          onMergeWithPrevious={(text, html) => onMergeParagraph?.(para.id, text, html)}
          onCaret={(text, offset) => handleCaret(para, text, offset)}
          onExit={() => setEditing((cur) => (cur?.id === para.id ? null : cur))}
          onUnsupported={(what) => {
            if (what === "b" || what === "i" || what === "u") {
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed) applyFormat({ type: "toggle", key: what });
              else onUnsupportedEdit?.("Select some text first, then press the shortcut to format it.");
            } else onUnsupportedEdit?.(what);
          }}
        />
      );
    }
    return <span data-pid={para.id}>{para.sentences.map(renderSentenceSpan)}</span>;
  };

  const renderSentenceSpan = (sentence: DocumentSentence) => {
    const isSelected = selectedSentenceId === sentence.id;
    const isHovered = hoveredSentenceId === sentence.id;
    const candidateSuggestions = suggestionsMap[sentence.id];
    const topCandidate = candidateSuggestions?.[0];

    const isAiFlagged =
      isHumanisedScanned &&
      sentence.score &&
      sentence.score.score >= aiThreshold &&
      !sentence.locked;

    // Humanised Preview Mode: shows green human rewrite
    if (humaniseViewMode === "humanised_preview" && isAiFlagged && topCandidate) {
      return (
        <span
          key={sentence.id}
          onClick={() => {
            const sel = window.getSelection();
            if (!sel || sel.toString().trim().length === 0) {
              onSelectSentence(sentence);
            }
          }}
          className="inline-block mx-0.5 my-0.5 px-1 py-0.5 rounded-xs humanised-preview-span transition-all cursor-pointer group"
          title="Click to view alternate rewrites"
        >
          <span>{topCandidate.text}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApplyQuickRewrite(sentence.id, topCandidate);
            }}
            className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95 inline-flex items-center gap-0.5 cursor-pointer"
          >
            ✓ Apply
          </button>
        </span>
      );
    }

    // Clean Mode: pure text without AI flag colors
    if (humaniseViewMode === "clean") {
      return (
        <span
          key={sentence.id}
          onClick={(e) => handleSentenceClick(e, sentence)}
          className={`cursor-text ${isSelected ? "sentence-selected" : ""}`}
        >
          {renderBody(sentence)}{" "}
        </span>
      );
    }

    // Original AI Flagged Mode
    // On a Word page the review marks never move the text: no padding or margins.
    let spanClasses = fid ? "inline cursor-pointer " : "transition-all duration-150 inline relative rounded-xs px-0.5 my-0.5 cursor-pointer ";

    if (isSelected) {
      spanClasses += " sentence-selected ";
    } else if (isHovered) {
      spanClasses += " sentence-hover ";
    }

    const isPending =
      !sentence.locked &&
      !sentence.score &&
      ((isScanning && sentence.text.split(/\s+/).filter(Boolean).length >= 8) || rescoring[sentence.id]);
    if (isPending) spanClasses += " ai-pending ";

    if (isAiFlagged) {
      if (sentence.score?.band === "likely_machine") {
        spanClasses += " ai-flagged-machine ";
      } else {
        spanClasses += " ai-flagged-uncertain ";
      }
    }

    return (
      <span
        key={sentence.id}
        onClick={(e) => handleSentenceClick(e, sentence)}
        onMouseEnter={() => setHoveredSentenceId(sentence.id)}
        onMouseLeave={() => setHoveredSentenceId(null)}
        className={spanClasses}
        title={
          isAiFlagged
            ? `${Math.round((sentence.score?.score || 0) * 100)}% AI likelihood • Click to inspect & rewrite`
            : isPending
            ? "Scoring…"
            : undefined
        }
      >
        {renderBody(sentence)}{" "}
        {sentence.locked && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(sentence.id);
            }}
            className="inline-flex items-center text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-600 dark:text-slate-300 ml-1 font-sans cursor-pointer hover:bg-rose-100"
            title="Locked sentence (protected from rewrites)"
          >
            <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
          </span>
        )}
      </span>
    );
  };

  const flaggedSentences = paragraphs
    .flatMap((p) => p.sentences)
    .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked);

  // Real block heights, measured after drawing, so a page break falls where the text really fills a sheet.
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const pagesRef = useRef<{ items: { p: DocumentParagraphNode }[] }[]>([]);

  // Group paragraphs into A4 sheets. Measured heights decide the breaks; a block not yet measured is estimated.
  const pages = React.useMemo(() => {
    type Item = { p: DocumentParagraphNode; originalIdx: number };
    if (!paragraphs || paragraphs.length === 0) {
      return [{ pageNumber: 1, items: [] as Item[] }];
    }
    const PAGE_CAPACITY = 900; // 1056px sheet minus its top and bottom margins
    const GAP = 16;
    const estimate = (p: DocumentParagraphNode) => {
      const words = p.sentences.reduce((acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length, 0);
      if (p.type === "table") return Math.max(1, p.tableData?.length ?? 1) * 38;
      if (p.type === "image") return Math.round(380 * ((p.widthPercent || 75) / 100)) + 40;
      if (p.type === "heading") return 70;
      return Math.max(28, words * 2.6);
    };

    const result: { pageNumber: number; items: Item[] }[] = [];
    let current: Item[] = [];
    let used = 0;
    const flush = () => {
      if (current.length) result.push({ pageNumber: result.length + 1, items: current });
      current = [];
      used = 0;
    };

    paragraphs.forEach((p, idx) => {
      const h = (measured[p.id] ?? estimate(p)) + GAP;
      const next = paragraphs[idx + 1];
      // A heading never ends a page on its own: it needs room for what follows it.
      const needs = p.type === "heading" && next ? h + Math.min(measured[next.id] ?? estimate(next), 140) : h;
      const fits = used + needs <= PAGE_CAPACITY;
      if (current.length > 0 && (p.pageBreakBefore || !fits)) flush();
      current.push({ p, originalIdx: idx });
      used += h;
    });
    flush();
    return result;
  }, [paragraphs, measured]);
  pagesRef.current = pages;

  // Measure each drawn block. Skipped while typing so a paragraph is never moved out from under the caret.
  React.useLayoutEffect(() => {
    if (editing) return;
    const root = scrollRef.current;
    if (!root) return;
    const next: Record<string, number> = {};
    root.querySelectorAll<HTMLElement>("article.word-a4-page").forEach((article, i) => {
      const holder = article.querySelector<HTMLElement>(".space-y-4");
      const items = pagesRef.current[i]?.items;
      if (!holder || !items) return;
      Array.from(holder.children).forEach((el, k) => {
        const id = items[k]?.p.id;
        if (id) next[id] = (el as HTMLElement).offsetHeight;
      });
    });
    setMeasured((prev) => {
      const keys = Object.keys(next);
      const same = keys.length === Object.keys(prev).length && keys.every((k) => Math.abs((prev[k] ?? -9) - next[k]) < 2);
      return same ? prev : next;
    });
  }, [pages, editing, fontFamily, paperTheme]);

  /* ================================================================== */
  /* Pages drawn from a Word file                                        */
  /* ================================================================== */

  type Piece = { p: DocumentParagraphNode; idx: number; from: number; to: number | null };
  type DxPage = { pageNumber: number; section: number; items: Piece[]; notes: { id: string; html: string }[] };

  const [dxMeasure, setDxMeasure] = useState<Record<string, BlockMeasure>>({});
  const [fit, setFit] = useState(1);
  const sections = layout?.sections ?? [];
  const secOf = (p: DocumentParagraphNode) => Math.min(Math.max(0, p.section ?? 0), Math.max(0, sections.length - 1));
  const geom = (s: number) => {
    const sec = sections[s] ?? sections[0];
    const W = (sec?.widthPt ?? 612) * PX_PER_PT;
    const H = (sec?.heightPt ?? 792) * PX_PER_PT;
    const mt = (sec?.marginTopPt ?? 72) * PX_PER_PT;
    const mb = (sec?.marginBottomPt ?? 72) * PX_PER_PT;
    const ml = (sec?.marginLeftPt ?? 72) * PX_PER_PT;
    const mr = (sec?.marginRightPt ?? 72) * PX_PER_PT;
    return { sec, W, H, mt, mb, ml, mr, C: H - mt - mb };
  };
  const marginsOf = (p: DocumentParagraphNode) => ({ mt: cssPx(p.blockStyle?.marginTop), mb: cssPx(p.blockStyle?.marginBottom) });
  const splittableTypes = ["paragraph", "list_item", "blockquote", "heading"];

  // Lay the blocks onto pages. A paragraph that does not fit is cut between two lines, as Word does.
  const dxPages = React.useMemo<DxPage[]>(() => {
    if (!fid) return [];
    const out: DxPage[] = [];
    let cur: Piece[] = [];
    let notes: { id: string; html: string }[] = [];
    let used = 0;
    let curSec = paragraphs.length ? secOf(paragraphs[0]) : 0;
    const flush = () => {
      out.push({ pageNumber: out.length + 1, section: curSec, items: cur, notes });
      cur = [];
      notes = [];
      used = 0;
    };
    const estimate = (p: DocumentParagraphNode): BlockMeasure => {
      if (p.type === "image") return { h: (p.imageHeightPt ?? 100) * PX_PER_PT, cuts: [] };
      if (p.type === "table") return { h: (p.tableData?.length ?? 1) * 26, cuts: [] };
      const words = p.sentences.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
      return { h: Math.max(20, Math.ceil(words / 12) * 22), cuts: [] };
    };
    const noteHeight = (p: DocumentParagraphNode) =>
      (p.footnotes ?? []).reduce((n, f) => n + (dxMeasure[`fn:${f.id}`]?.h ?? 18), 0);

    paragraphs.forEach((p, idx) => {
      const s = secOf(p);
      if (cur.length > 0 && (s !== curSec || p.pageBreakBefore)) flush();
      curSec = s;
      const C = geom(s).C;
      const m = dxMeasure[p.id] ?? estimate(p);
      const { mt, mb } = marginsOf(p);
      const fnH = noteHeight(p) + (p.footnotes?.length && notes.length === 0 ? 14 : 0);
      const next = paragraphs[idx + 1];
      // A heading (or a paragraph set to keep with the next) brings at least the next line along.
      const keep = p.type === "heading" && next && secOf(next) === s && !next.pageBreakBefore
        ? marginsOf(next).mt + ((dxMeasure[next.id]?.cuts[0] ?? Math.min(dxMeasure[next.id]?.h ?? 24, 60)))
        : 0;
      let from = 0;
      for (let guard = 0; guard < 200; guard++) {
        const top = from === 0 ? mt : 0;
        const need = top + (m.h - from) + mb + (from === 0 ? fnH : 0);
        if (used + need + (from === 0 ? keep : 0) <= C) {
          cur.push({ p, idx, from, to: null });
          if (from === 0 && p.footnotes) notes.push(...p.footnotes);
          used += need;
          return;
        }
        // Try to end this page between two lines of the block.
        const avail = C - used - top - (from === 0 ? fnH : 0);
        const canSplit = splittableTypes.includes(p.type) && m.cuts.length > 0 && editing?.id !== p.id;
        const fitting = canSplit ? m.cuts.filter((c) => c > from + 1 && c - from <= avail) : [];
        if (fitting.length > 0) {
          const cut = Math.max(...fitting);
          cur.push({ p, idx, from, to: cut });
          if (from === 0 && p.footnotes) notes.push(...p.footnotes);
          used += top + (cut - from);
          flush();
          from = cut;
          continue;
        }
        if (cur.length === 0) {
          // Taller than a whole page and cannot be cut: let it run over rather than loop.
          cur.push({ p, idx, from, to: null });
          if (from === 0 && p.footnotes) notes.push(...p.footnotes);
          used += need;
          return;
        }
        flush();
      }
    });
    if (cur.length > 0 || out.length === 0) flush();
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid, paragraphs, dxMeasure, layout, editing?.id]);

  // Fit the page to narrow windows instead of scrolling sideways.
  useEffect(() => {
    if (!fid) return;
    const box = scrollRef.current;
    if (!box) return;
    const update = () => {
      const widest = Math.max(...sections.map((s) => s.widthPt * PX_PER_PT), 400);
      setFit(Math.min(1, Math.max(0.3, (box.clientWidth - 32) / widest)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid, layout]);

  // After drawing: put tabs on their stops, then measure every block so the page breaks fall where they should.
  React.useLayoutEffect(() => {
    if (!fid) return;
    const root = scrollRef.current;
    if (!root || editing) return;
    layoutTabs(root, layout?.defaultTabPt ?? 36);
    const next: Record<string, BlockMeasure> = {};
    root.querySelectorAll<HTMLElement>("[data-dx]").forEach((el) => {
      const id = el.dataset.dx!;
      if (next[id]) return;
      next[id] = measureBlock(el, el.dataset.split === "1");
    });
    root.querySelectorAll<HTMLElement>("[data-fn-measure]").forEach((el) => {
      next[`fn:${el.dataset.fnMeasure}`] = { h: el.offsetHeight, cuts: [] };
    });
    setDxMeasure((prev) => {
      const keys = Object.keys(next);
      const same =
        keys.length === Object.keys(prev).length &&
        keys.every((k) => prev[k] && Math.abs(prev[k].h - next[k].h) < 1 && prev[k].cuts.length === next[k].cuts.length);
      return same ? prev : next;
    });
  });

  const fillFields = (html: string, page: number, total: number) =>
    html.replace(/<span data-field="PAGE"><\/span>/g, String(page)).replace(/<span data-field="NUMPAGES"><\/span>/g, String(total));

  const withEquations = (html: string) => (hasEquation(html) ? html.replace(TOKEN_REGEX(), (_m, id: string) => equationHtml(id)) : html);

  /** Hover buttons for a block that is not text (table or picture). They float, so they never move the page. */
  const blockTools = (p: DocumentParagraphNode, idx: number, label: string) => (
    <div className="absolute -top-6 right-0 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none z-10 font-sans">
      <button type="button" onClick={() => onNodeMove(p.id, "up")} disabled={idx === 0} className="text-[11px] px-2 py-0.5 rounded-lg bg-white/95 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label={`Move ${label} up`}>Up</button>
      <button type="button" onClick={() => onNodeMove(p.id, "down")} disabled={idx >= paragraphs.length - 1} className="text-[11px] px-2 py-0.5 rounded-lg bg-white/95 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label={`Move ${label} down`}>Down</button>
      <button type="button" onClick={() => onNodeDelete(p.id)} className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white/95 border border-rose-200 text-rose-600 hover:bg-rose-50" aria-label={`Remove ${label}`}>Remove</button>
    </div>
  );

  /** One block of a Word page. `copy` is the continuation of a paragraph cut by a page break. */
  const renderDxBlock = (p: DocumentParagraphNode, idx: number, copy: boolean, zeroMargins: boolean): React.ReactNode => {
    const style: React.CSSProperties = { ...(p.blockStyle as React.CSSProperties) };
    if (zeroMargins) {
      style.marginTop = 0;
      style.marginBottom = 0;
    }
    const measureAttrs = copy ? {} : { "data-dx": p.id, "data-split": splittableTypes.includes(p.type) ? "1" : "0" };

    if (p.type === "image") {
      // A picture added in the editor has no Word size yet: it takes its share of the text width.
      const size: React.CSSProperties = p.imageWidthPt
        ? { width: `${p.imageWidthPt}pt`, height: `${p.imageHeightPt ?? 150}pt` }
        : { width: `${p.widthPercent ?? 75}%`, height: "auto" };
      return (
        <div key={p.id} {...measureAttrs} data-node={p.id} className="dx-block relative group" style={{ ...style, margin: style.margin ?? undefined, textAlign: p.alignment === "justify" || !p.alignment ? (p.imageWidthPt ? "left" : "center") : p.alignment }}>
          {!copy && blockTools(p, idx, "picture")}
          {p.imageHtml ? (
            <span dangerouslySetInnerHTML={{ __html: p.imageHtml }} />
          ) : p.imageUrl && !p.imageUnsupported ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt={p.imageCaption ?? ""} style={{ ...size, maxWidth: "100%", display: "inline-block", verticalAlign: "bottom" }} />
          ) : (
            <span className="dx-unsupported" style={{ width: `${p.imageWidthPt ?? 200}pt`, height: `${p.imageHeightPt ?? 150}pt`, display: "inline-flex" }}>
              {p.imageUnsupported ?? "Picture"} (kept in your Word file)
            </span>
          )}
        </div>
      );
    }

    if (p.type === "table" && p.table) {
      const model = p.table;
      return (
        <div key={p.id} {...measureAttrs} data-node={p.id} className="dx-block relative group" style={style}>
          {!copy && blockTools(p, idx, "table")}
          <table className="dx-table" style={model.style as React.CSSProperties}>
            {model.colWidthsPt.length > 0 && (
              <colgroup>
                {model.colWidthsPt.map((w, i) => (
                  <col key={i} style={{ width: `${w}pt` }} />
                ))}
              </colgroup>
            )}
            <tbody>
              {model.rows.map((row, r) => (
                <tr key={r} style={row.heightPt ? { height: `${row.heightPt}pt` } : undefined}>
                  {row.cells.map((cell, c) => {
                    const current = p.tableData?.[r]?.[c] ?? cell.text;
                    const edited = current !== cell.text;
                    const html = edited
                      ? `<div class="dx-p" style="${Object.entries(cell.firstBlockStyle ?? {})
                          .map(([k, v]) => `${k.replace(/[A-Z]/g, (x) => `-${x.toLowerCase()}`)}:${v}`)
                          .join(";")}">${escapeHtml(current) || "<br>"}</div>`
                      : cell.html;
                    return (
                      <td
                        key={`${c}-${edited ? "e" : "o"}`}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                        style={cell.style as React.CSSProperties}
                        contentEditable={!copy && !hasEquation(current)}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const text = (e.currentTarget.textContent || "").replace(/\s+/g, " ").trim();
                          if (text !== current) onTableCellEdit(p.id, r, c, text);
                        }}
                        className="outline-none focus:bg-elite-500/10"
                        dangerouslySetInnerHTML={{ __html: withEquations(html) }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // A table added in the editor: plain grid, one line per cell, styled like a simple Word table.
    if (p.type === "table") {
      return (
        <div key={p.id} {...measureAttrs} data-node={p.id} className="dx-block relative group" style={{ ...style, marginTop: style.marginTop ?? "6pt", marginBottom: style.marginBottom ?? "6pt" }}>
          {!copy && blockTools(p, idx, "table")}
          <table className="dx-table" style={{ width: "100%", tableLayout: "fixed" }}>
            <tbody>
              {(p.tableData ?? []).map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      contentEditable={!copy}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const text = (e.currentTarget.textContent || "").replace(/\s+/g, " ").trim();
                        if (text !== cell) onTableCellEdit(p.id, r, c, text);
                      }}
                      className="outline-none focus:bg-elite-500/10"
                      style={{ border: "0.5pt solid #000", padding: "0 5.4pt", verticalAlign: "top", lineHeight: 1.15 }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Text blocks: paragraphs, headings, list items, quotations and empty lines.
    const textAlign = p.alignment ?? "left";
    const heading = p.type === "heading" ? { role: "heading", "aria-level": p.level ?? 1 } : {};
    return (
      <div
        key={p.id}
        {...measureAttrs}
        {...heading}
        data-tabs={p.tabStops ? JSON.stringify(p.tabStops) : undefined}
        className="dx-block"
        style={{ ...style, textAlign }}
      >
        {p.listMarkerHtml && <span dangerouslySetInnerHTML={{ __html: p.listMarkerHtml }} />}
        {p.isEmptyLine || p.sentences.length === 0 ? <br /> : renderParagraphBody(p, !copy)}
      </div>
    );
  };

  const renderDxPages = () =>
    dxPages.map((page) => {
      const g = geom(page.section);
      const sec = g.sec;
      const firstOfSection = dxPages.find((x) => x.section === page.section)?.pageNumber === page.pageNumber;
      const header = sec ? (sec.titlePg && firstOfSection ? sec.firstHeader : sec.header) : undefined;
      const footer = sec ? (sec.titlePg && firstOfSection ? sec.firstFooter : sec.footer) : undefined;
      const total = dxPages.length;
      return (
        <article
          key={page.pageNumber}
          data-page={page.pageNumber}
          className={`word-a4-page dx-page ${paperTheme === "dark" ? "word-a4-page-dark" : ""} shrink-0 mx-auto`}
          style={{
            width: g.W,
            maxWidth: "none",
            minHeight: g.H,
            padding: `${g.mt}px ${g.mr}px ${g.mb}px ${g.ml}px`,
            fontFamily: layout?.defaultFont,
            fontSize: `${layout?.defaultSizePt ?? 12}pt`,
            lineHeight: "normal",
            zoom: (zoom / 100) * fit,
          }}
        >
          {header && (
            <div className="dx-hf" style={{ top: (sec?.headerPt ?? 36) * PX_PER_PT, paddingLeft: g.ml, paddingRight: g.mr }}>
              <div className="dx-hf-inner" dangerouslySetInnerHTML={{ __html: fillFields(header, page.pageNumber, total) }} />
            </div>
          )}
          <div className="dx-flow" data-holder style={{ minHeight: g.C }}>
            {page.items.map(({ p, idx, from, to }) => {
              const clipped = from > 0 || to !== null;
              const editingHere = editing?.id === p.id;
              if (!clipped || (editingHere && from === 0)) return renderDxBlock(p, idx, false, false);
              if (editingHere) return null;
              const m = dxMeasure[p.id];
              const { mt, mb } = marginsOf(p);
              const height = (to ?? m?.h ?? 0) - from;
              return (
                <div key={`${p.id}@${from}`} style={{ overflow: "hidden", height, marginTop: from === 0 ? mt : 0, marginBottom: to === null ? mb : 0 }}>
                  <div style={{ marginTop: -from }}>{renderDxBlock(p, idx, from > 0, true)}</div>
                </div>
              );
            })}
          </div>
          {page.notes.length > 0 && (
            <div className="absolute" style={{ left: g.ml, right: g.mr, bottom: g.mb }}>
              <div className="dx-footnotes" />
              {page.notes.map((n) => (
                <div key={n.id} data-fn-measure={n.id} className="dx-footnotes-body" dangerouslySetInnerHTML={{ __html: n.html }} />
              ))}
            </div>
          )}
          {footer && (
            <div className="dx-hf" style={{ bottom: (sec?.footerPt ?? 36) * PX_PER_PT, paddingLeft: g.ml, paddingRight: g.mr }}>
              <div className="dx-hf-inner" dangerouslySetInnerHTML={{ __html: fillFields(footer, page.pageNumber, total) }} />
            </div>
          )}
        </article>
      );
    });

  return (
    <div
      ref={editorContainerRef}
      className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950 relative"
    >
      {/* Floating Selection Bubble Toolbar */}
      {floatingBubble && (
        <div
          style={{
            top: `${floatingBubble.top}px`,
            left: `${floatingBubble.left}px`,
          }}
          className="fixed z-50 -translate-x-1/2 -translate-y-full mb-2 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 px-2 py-1.5 flex items-center gap-1 text-xs select-none animate-in fade-in zoom-in-95"
        >
          {([
            ["b", Bold, "Bold (Ctrl+B)", "font-bold"],
            ["i", Italic, "Italic (Ctrl+I)", "italic"],
            ["u", Underline, "Underline (Ctrl+U)", "underline"],
            ["s", Strikethrough, "Strikethrough", "line-through"],
          ] as const).map(([key, Icon, label, cls]) => (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat({ type: "toggle", key });
              }}
              className={`p-1.5 hover:bg-white/20 rounded-lg ${cls}`}
              title={label}
              aria-label={label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Text colour */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setFormatMenu((m) => (m === "color" ? null : "color"));
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg font-bold flex items-center gap-0.5"
              title="Text colour"
              aria-label="Text colour"
              aria-expanded={formatMenu === "color"}
            >
              <span className="text-[13px] leading-none border-b-2 border-rose-400">A</span>
            </button>
            {formatMenu === "color" && (
              <div className="absolute top-full left-0 mt-2 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl w-[148px] z-50">
                <div className="grid grid-cols-5 gap-1.5">
                  {TEXT_COLOURS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.name}
                      aria-label={`Text colour ${c.name}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat({ type: "set", key: "color", value: c.value });
                        setFormatMenu(null);
                      }}
                      className="w-5 h-5 rounded-full border border-white/30 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFormat({ type: "set", key: "color", value: null });
                    setFormatMenu(null);
                  }}
                  className="mt-2 w-full text-[11px] py-1 rounded-lg hover:bg-white/15 text-slate-200"
                >
                  Automatic colour
                </button>
              </div>
            )}
          </div>

          {/* Highlight */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setFormatMenu((m) => (m === "bg" ? null : "bg"));
              }}
              className="p-1.5 hover:bg-white/20 rounded-lg text-amber-300"
              title="Highlight"
              aria-label="Highlight"
              aria-expanded={formatMenu === "bg"}
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>
            {formatMenu === "bg" && (
              <div className="absolute top-full left-0 mt-2 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl w-[132px] z-50">
                <div className="grid grid-cols-4 gap-1.5">
                  {HIGHLIGHTS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.name}
                      aria-label={`Highlight ${c.name}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat({ type: "set", key: "bg", value: c.value });
                        setFormatMenu(null);
                      }}
                      className="w-5 h-5 rounded-md border border-white/30 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFormat({ type: "set", key: "bg", value: null });
                    setFormatMenu(null);
                  }}
                  className="mt-2 w-full text-[11px] py-1 rounded-lg hover:bg-white/15 text-slate-200"
                >
                  No highlight
                </button>
              </div>
            )}
          </div>

          {/* Font, size, super and subscript, clear */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setFormatMenu((m) => (m === "more" ? null : "more"));
              }}
              className="px-1.5 py-1 hover:bg-white/20 rounded-lg font-semibold text-[11px]"
              title="Font, size and more"
              aria-label="Font, size and more"
              aria-expanded={formatMenu === "more"}
            >
              Aa
            </button>
            {formatMenu === "more" && (
              <div className="absolute top-full right-0 mt-2 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl w-[210px] z-50 space-y-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 px-1 pb-1">Font</div>
                  <div className="max-h-[132px] overflow-y-auto">
                    {FONT_CHOICES.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyFormat({ type: "set", key: "font", value: f });
                          setFormatMenu(null);
                        }}
                        className="block w-full text-left text-[12px] px-2 py-1 rounded-lg hover:bg-white/15"
                        style={{ fontFamily: f }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 px-1 pb-1">Size (pt)</div>
                  <div className="flex flex-wrap gap-1">
                    {SIZE_CHOICES.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyFormat({ type: "set", key: "size", value: n });
                          setFormatMenu(null);
                        }}
                        className="min-w-[30px] text-[12px] px-1.5 py-1 rounded-lg hover:bg-white/15"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 pt-1 border-t border-slate-700">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormat({ type: "toggle", key: "sup" });
                      setFormatMenu(null);
                    }}
                    className="flex-1 text-[12px] py-1 rounded-lg hover:bg-white/15"
                    title="Superscript"
                  >
                    x²
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormat({ type: "toggle", key: "sub" });
                      setFormatMenu(null);
                    }}
                    className="flex-1 text-[12px] py-1 rounded-lg hover:bg-white/15"
                    title="Subscript"
                  >
                    x₂
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormat({ type: "clear" });
                      setFormatMenu(null);
                    }}
                    className="flex-1 text-[12px] py-1 rounded-lg hover:bg-white/15"
                    title="Clear formatting"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* ✨ Humanise Word / Selection */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleHumaniseWordClick();
            }}
            className="px-2.5 py-1 bg-gradient-to-r from-elite-500 to-indigo-500 hover:from-elite-400 hover:to-indigo-400 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
            title="Humanise selected word or phrase"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Humanise Word</span>
          </button>

          {/* Micro Popover for Word Alternatives */}
          {wordSuggestions && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 text-slate-900 dark:text-white space-y-1.5 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Scholarly Alternatives for &ldquo;{wordSuggestions.word}&rdquo;
              </div>
              <div className="space-y-1">
                {wordSuggestions.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleApplyWordOption(opt);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-elite-50 dark:hover:bg-elite-950 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-elite-600 dark:hover:text-elite-400 flex items-center justify-between transition-colors"
                  >
                    <span>{opt}</span>
                    <Check className="w-3 h-3 text-emerald-500 opacity-80" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post-Upload Announcement Banner */}
      {hideStatusHeader ? null : !isHumanisedScanned ? (
        <div className="bg-gradient-to-r from-elite-600 via-indigo-600 to-teal-600 text-white px-6 py-2.5 flex items-center justify-between gap-4 shadow-sm z-10 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="font-bold text-xs sm:text-sm">
              Document Loaded: Click Humanise to uncover machine detection patterns
            </span>
            <HelpTooltip
              title="Humanise Document"
              explanation="Analyzes vocabulary rhythm, perplexity, and formulaic stock transitions across each sentence without altering Word formatting."
            />
          </div>
          <button
            onClick={onTriggerHumanise}
            disabled={isHumanising}
            className="px-4 py-1.5 rounded-xl bg-white text-elite-700 hover:bg-slate-100 font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          >
            {isHumanising ? (
              <>
                <div className="w-3 h-3 border-2 border-elite-600 border-t-transparent rounded-full animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-elite-600" />
                <span>✨ Humanise Now</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Status Subheader */
        <div className="px-6 py-2 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Mode:
              <span className="text-elite-600 dark:text-elite-400 capitalize">
                {humaniseViewMode.replace("_", " ")}
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              {flaggedSentences.length} flagged
              <span className="hidden sm:inline"> • {pages.length} {pages.length === 1 ? "page" : "pages"}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDocPicker && (
              <button
                onClick={onOpenDocPicker}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                title="Switch Document"
              >
                <FolderOpen className="w-3.5 h-3.5 text-elite-600" />
                <span>Documents</span>
              </button>
            )}

            {humaniseViewMode === "humanised_preview" && flaggedSentences.length > 0 && (
              <button
                onClick={onApplyAllRewrites}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Apply All Rewrites ({flaggedSentences.length})</span>
              </button>
            )}

            <button
              onClick={onToggleInspector}
              className="lg:hidden p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Toggle Suggestions Drawer"
            >
              {isInspectorOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {scanBanner}

      {/* Multi-Page Scrollable A4 Canvas Area */}
      <div
        ref={scrollRef}
        onScroll={updateCurrentPage}
        className="flex-1 overflow-y-auto py-8 px-3 sm:px-6 lg:px-8 xl:px-10 flex flex-col items-center xl:items-start 2xl:items-center gap-8"
      >
        {fid && isLoading && paragraphs.length === 0 && <div aria-busy="true" className="ai-pending h-40 w-full max-w-2xl" />}
        {fid ? renderDxPages() : pages.map((page) => (
          <article
            key={page.pageNumber}
            data-page={page.pageNumber}
            className={`word-a4-page ${
              paperTheme === "dark" ? "word-a4-page-dark" : ""
            } leading-relaxed text-[16px] flex flex-col shrink-0 mx-auto xl:mx-0 2xl:mx-auto`}
            style={{
              fontFamily: fontFamily,
              fontSize: ({ "2": "13.33px", "3": "16px", "4": "18.67px", "5": "24px" } as Record<string, string>)[fontSize] ?? "16px",
              zoom: zoom / 100,
            }}
          >
            {/* Page Paragraphs & Sentences (No artificial injected headers or footers) */}
            <div className="space-y-4 flex-1 min-h-[720px] pb-6">
              {isLoading && paragraphs.length === 0 && (
                <div aria-busy="true" aria-label="Loading document" className="space-y-3 pt-10">
                  <div className="ai-pending h-8 w-2/3 mx-auto" />
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="ai-pending h-3.5" style={{ width: `${88 - ((i * 7) % 24)}%` }} />
                  ))}
                </div>
              )}
              {page.items.map(({ p, originalIdx }) => {
                // 0. Preserved Empty Line for Title Page & Chapter Layout
                if (p.isEmptyLine) {
                  return <div key={p.id} className="h-5 select-none" />;
                }

                // 1. Heading Elements H1 - H6
                if (p.type === "heading") {
                  const level = p.level || (p.styleName?.includes("1") ? 1 : p.styleName?.includes("2") ? 2 : 3);
                  const hAlign = p.alignment === "center" ? "text-center" : p.alignment === "right" ? "text-right" : "text-left";
                  return (
                    <div key={p.id} className={`my-3 ${hAlign}`}>
                      <h2
                        className={`font-bold tracking-tight ${
                          level === 1
                            ? "text-2xl sm:text-3xl mt-6 mb-3 paper-rule pb-2"
                            : level === 2
                            ? "text-xl sm:text-2xl mt-5 mb-2"
                            : "text-lg font-bold mt-4 mb-1.5"
                        }`}
                        style={{ fontFamily: "inherit" }}
                      >
                        {renderParagraphBody(p)}
                      </h2>
                    </div>
                  );
                }

                // 2. Table Elements
                if (p.type === "table") {
                  return (
                    <div key={p.id} data-node={p.id} className="my-5 relative group">
                      <div className="flex justify-end gap-1 pb-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none">
                        <button
                          type="button"
                          onClick={() => onNodeMove(p.id, "up")}
                          disabled={originalIdx === 0}
                          className="text-[11px] px-2 py-0.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                          aria-label="Move table up"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => onNodeMove(p.id, "down")}
                          disabled={originalIdx >= paragraphs.length - 1}
                          className="text-[11px] px-2 py-0.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                          aria-label="Move table down"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => onNodeDelete(p.id)}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          aria-label="Remove table"
                        >
                          Remove table
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="word-table w-full">
                          {p.tableData && p.tableData.length > 0 ? (
                            <tbody>
                              {p.tableData.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx === 0 ? "paper-th font-bold" : ""}>
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      contentEditable={!hasEquation(cell)}
                                      suppressContentEditableWarning
                                      {...(hasEquation(cell)
                                        ? { dangerouslySetInnerHTML: { __html: escapeHtml(cell).replace(TOKEN_REGEX(), (_m, id: string) => equationHtml(id)) } }
                                        : {})}
                                      onBlur={(e) => {
                                        const text = e.currentTarget.textContent || "";
                                        if (text !== cell) onTableCellEdit(p.id, rIdx, cIdx, text);
                                      }}
                                      className="border border-slate-400/50 px-3.5 py-2 text-xs sm:text-sm outline-none focus:bg-elite-500/10 min-w-[4rem]"
                                    >
                                      {hasEquation(cell) ? undefined : cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          ) : p.rawHtml ? (
                            <tbody>
                              <tr>
                                <td dangerouslySetInnerHTML={{ __html: p.rawHtml }} />
                              </tr>
                            </tbody>
                          ) : null}
                        </table>
                      </div>
                    </div>
                  );
                }

                // 3. Bullet & Numbered List Items
                if (p.type === "list_item") {
                  const level = p.level || 0;
                  return (
                    <div key={p.id} style={{ marginLeft: `${1 + level * 1.5}rem` }} className={`flex items-start gap-2.5 my-1.5 ${p.alignment === "center" ? "text-center" : p.alignment === "right" ? "text-right" : p.alignment === "left" ? "text-left" : "text-justify"}`}>
                      <span className="text-slate-400 dark:text-slate-500 font-bold select-none mt-0.5 text-xs">
                        {p.listType === "number" ? `${listNumbers.get(p.id) ?? 1}.` : level > 0 ? "◦" : "•"}
                      </span>
                      <div className="flex-1">
                        {renderParagraphBody(p)}
                      </div>
                    </div>
                  );
                }

                // 4. Blockquotes
                if (p.type === "blockquote") {
                  return (
                    <blockquote
                      key={p.id}
                      className={`border-l-4 border-elite-500 pl-4 py-1.5 my-4 italic paper-quote rounded-r-xl ${p.alignment === "center" ? "text-center" : p.alignment === "right" ? "text-right" : p.alignment === "justify" ? "text-justify" : ""}`}
                    >
                      {renderParagraphBody(p)}
                    </blockquote>
                  );
                }

                // 5. Embedded Figures & Images (Natural Word rendering: no fake captions or card borders)
                if (p.type === "image") {
                  const idx = paragraphs.findIndex((n) => n.id === p.id);
                  const figAlign = p.widthPercent === 100 && p.alignment === "justify" ? "full" : p.alignment === "justify" ? "center" : p.alignment || "center";
                  return (
                    <div key={p.id} data-node={p.id} className="clear-both">
                      <AcademicFigure
                        id={p.id}
                        url={p.imageUrl || ""}
                        caption={p.imageCaption}
                        align={figAlign}
                        widthPercent={p.widthPercent || 75}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < paragraphs.length - 1}
                        onMoveUp={() => onNodeMove(p.id, "up")}
                        onMoveDown={() => onNodeMove(p.id, "down")}
                        onUpdateImage={(url) => onNodeUpdate(p.id, { imageUrl: url })}
                        onUpdateCaption={(cap) => onNodeUpdate(p.id, { imageCaption: cap })}
                        onUpdateAlign={(a) =>
                          onNodeUpdate(p.id, a === "full" ? { alignment: "justify", widthPercent: 100 } : { alignment: a })
                        }
                        onUpdateWidth={(w) => onNodeUpdate(p.id, { widthPercent: w })}
                        onDelete={() => onNodeDelete(p.id)}
                      />
                    </div>
                  );
                }

                // 6. Standard Academic Paragraph
                const pAlign =
                  p.alignment === "center"
                    ? "text-center"
                    : p.alignment === "right"
                    ? "text-right"
                    : p.alignment === "justify"
                    ? "text-justify"
                    : "text-left";

                return (
                  <div key={p.id} className={`space-y-3 ${pAlign}`}>
                    <div className={`${pAlign} leading-relaxed ${p.styleName === "Caption" ? "text-[0.92em] italic opacity-90" : ""}`}>
                      {renderParagraphBody(p)}
                    </div>
                  </div>
                );
              })}

              {/* Equation on Page 1 (Only for benchmark sample manuscript) */}
              {page.pageNumber === 1 && isSampleDocument && (
                <div
                  contentEditable={false}
                  onClick={onOpenEquationModal}
                  className="my-6 p-4 paper-card hover:border-elite-400 cursor-pointer transition-colors group flex flex-col items-center justify-center select-none"
                >
                  <div className="text-xs font-sans text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sigma className="w-3.5 h-3.5 text-elite-600" /> Equation 1 (protected from rewrites • click to edit)
                  </div>
                  <div
                    className="px-5 py-2.5 paper-card overflow-x-auto max-w-full"
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        try {
                          return katex.renderToString(equationLatex, { displayMode: true, throwOnError: false });
                        } catch {
                          return "";
                        }
                      })(),
                    }}
                  />
                </div>
              )}
            </div>
          </article>
        ))}

        {/* Multi-page Canvas Footer Action: Add New Page */}
        <div className="py-4 select-none">
          <div className="text-xs text-slate-400 text-center font-mono">
            {fid ? dxPages.length : pages.length} {(fid ? dxPages.length : pages.length) === 1 ? "page" : "pages"} • {(wordCount || 0).toLocaleString()} words
          </div>
        </div>
      </div>

      {/* Bottom Word Editing Bar */}
      <EditorBottomBar
        onExecCommand={onExecCommand}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={historyUndoLength > 0}
        canRedo={historyRedoLength > 0}
        wordCount={wordCount}
        pageCount={fid ? dxPages.length : pages.length}
        currentPage={currentPage}
        zoomLevel={zoom}
        onZoomChange={setZoom}
        isSaving={isSaving}
      />
    </div>
  );
};
