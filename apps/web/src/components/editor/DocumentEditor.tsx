"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  DocumentParagraphNode,
  DocumentSentence,
  SuggestionCandidate
} from "@edux/schema";
import katex from "katex";
import "katex/dist/katex.min.css";
import { EditorBottomBar } from "./EditorBottomBar";
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
  similarityScore,
  isSaving,
  wordCount,
  pageCount,
  isSampleDocument = false,
  hideStatusHeader = false,
  isScanning = false,
  isLoading = false,
  equationLatex = "",
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
          onClick={() => onSelectSentence(sentence)}
          className={`cursor-text ${isSelected ? "sentence-selected" : ""}`}
        >
          {sentence.formattedHtml ? (
            <span dangerouslySetInnerHTML={{ __html: sentence.formattedHtml }} />
          ) : (
            sentence.text
          )}{" "}
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
        onClick={() => {
          const sel = window.getSelection();
          if (!sel || sel.toString().trim().length === 0) {
            onSelectSentence(sentence);
          }
        }}
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
        {sentence.formattedHtml ? (
          <span dangerouslySetInnerHTML={{ __html: sentence.formattedHtml }} />
        ) : (
          sentence.text
        )}{" "}
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

  // Group paragraphs into realistic multi-page A4 canvas sheets
  const pages = React.useMemo(() => {
    if (!paragraphs || paragraphs.length === 0) {
      return [{ pageNumber: 1, items: [] as { p: DocumentParagraphNode; originalIdx: number }[] }];
    }
    const result: { pageNumber: number; items: { p: DocumentParagraphNode; originalIdx: number }[] }[] = [];
    let currentPageItems: { p: DocumentParagraphNode; originalIdx: number }[] = [];
    let currentWords = 0;

    paragraphs.forEach((p, idx) => {
      const pWordCount = p.sentences.reduce(
        (acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length,
        0
      );
      // Academic A4 sheet capacity: ~520 words per page or explicit page break before section
      const shouldBreak =
        currentPageItems.length > 0 &&
        (p.pageBreakBefore || (currentWords + pWordCount > 520 && pWordCount > 0 && pWordCount <= 520));

      if (shouldBreak) {
        result.push({
          pageNumber: result.length + 1,
          items: currentPageItems,
        });
        currentPageItems = [{ p, originalIdx: idx }];
        currentWords = pWordCount;
      } else {
        currentPageItems.push({ p, originalIdx: idx });
        currentWords += pWordCount;
      }
    });

    if (currentPageItems.length > 0) {
      result.push({
        pageNumber: result.length + 1,
        items: currentPageItems,
      });
    }

    return result;
  }, [paragraphs]);

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
          {/* Bold */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onExecCommand("bold");
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg font-bold"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onExecCommand("italic");
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg italic font-serif"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onExecCommand("underline");
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg underline"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Strikethrough */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onExecCommand("strikeThrough");
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg line-through"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          {/* Yellow Highlight Marker */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onExecCommand("hiliteColor", "#fef08a");
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg text-amber-300"
            title="Highlight Selection"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1" />

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
            } leading-relaxed text-[16px] flex flex-col mx-auto xl:mx-0 2xl:mx-auto`}
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
                        {p.sentences.map(renderSentenceSpan)}
                      </h2>
                    </div>
                  );
                }

                // 2. Table Elements
                if (p.type === "table") {
                  return (
                    <div key={p.id} className="my-5 relative group">
                      <div className="flex justify-end gap-1 pb-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none">
                        <button
                          type="button"
                          onClick={() => onNodeMove(p.id, "up")}
                          className="text-[11px] px-2 py-0.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          aria-label="Move table up"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => onNodeMove(p.id, "down")}
                          className="text-[11px] px-2 py-0.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const text = e.currentTarget.textContent || "";
                                        if (text !== cell) onTableCellEdit(p.id, rIdx, cIdx, text);
                                      }}
                                      className="border border-slate-400/50 px-3.5 py-2 text-xs sm:text-sm outline-none focus:bg-elite-500/10 min-w-[4rem]"
                                    >
                                      {cell}
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
                  return (
                    <div key={p.id} className="flex items-start gap-2.5 my-1.5 ml-4 text-justify">
                      <span className="text-slate-400 dark:text-slate-500 font-bold select-none mt-0.5 text-xs">
                        {p.listType === "number" ? `${p.orderNo || 1}.` : "•"}
                      </span>
                      <div className="flex-1">
                        {p.sentences.map(renderSentenceSpan)}
                      </div>
                    </div>
                  );
                }

                // 4. Blockquotes
                if (p.type === "blockquote") {
                  return (
                    <blockquote
                      key={p.id}
                      className="border-l-4 border-elite-500 pl-4 py-1.5 my-4 italic paper-quote rounded-r-xl"
                    >
                      {p.sentences.map(renderSentenceSpan)}
                    </blockquote>
                  );
                }

                // 5. Embedded Figures & Images (Natural Word rendering: no fake captions or card borders)
                if (p.type === "image") {
                  const idx = paragraphs.findIndex((n) => n.id === p.id);
                  const figAlign = p.widthPercent === 100 && p.alignment === "justify" ? "full" : p.alignment === "justify" ? "center" : p.alignment || "center";
                  return (
                    <div key={p.id} className="clear-both">
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
                    <div className={`${pAlign} leading-relaxed`}>
                      {p.sentences.map(renderSentenceSpan)}
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
