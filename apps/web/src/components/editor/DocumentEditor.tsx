"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  DocumentParagraphNode,
  DocumentSentence,
  SuggestionCandidate
} from "@edux/schema";
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
}) => {
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
      return <span key={`${s.id}-e-${s.formattedHtml ? 1 : 0}`} data-body={s.id} dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return s.formattedHtml ? (
      <span key={`${s.id}-f`} data-body={s.id} dangerouslySetInnerHTML={{ __html: s.formattedHtml }} />
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

  const renderParagraphBody = (para: DocumentParagraphNode): React.ReactNode => {
    if (editing?.id === para.id && canType) {
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
          onUnsupported={(what) => onUnsupportedEdit?.(what)}
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
    let spanClasses = "transition-all duration-150 inline relative rounded-xs px-0.5 my-0.5 cursor-pointer ";

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
        {pages.map((page) => (
          <article
            key={page.pageNumber}
            data-page={page.pageNumber}
            className={`word-a4-page ${
              paperTheme === "dark" ? "word-a4-page-dark" : ""
            } leading-relaxed text-[16px] flex flex-col shrink-0 mx-auto xl:mx-0 2xl:mx-auto`}
            style={{
              fontFamily: fontFamily,
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
            Manuscript Canvas • {pages.length} Pages • {(wordCount || 0).toLocaleString()} Words
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
        pageCount={pages.length}
        currentPage={currentPage}
        zoomLevel={zoom}
        onZoomChange={setZoom}
        isSaving={isSaving}
      />
    </div>
  );
};
