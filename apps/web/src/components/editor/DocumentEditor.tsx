"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  DocumentParagraphNode,
  DocumentSentence,
  SuggestionCandidate
} from "@edux/schema";
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

export interface InsertedElement {
  id: string;
  type: "image" | "table";
  afterParagraphIndex: number;
  data: any;
}

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
  insertedElements: InsertedElement[];
  onMoveElementUp: (id: string) => void;
  onMoveElementDown: (id: string) => void;
  onUpdateElement: (id: string, partialData: any) => void;
  onDeleteElement: (id: string) => void;
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
  insertedElements,
  onMoveElementUp,
  onMoveElementDown,
  onUpdateElement,
  onDeleteElement,
  paperTheme,
  onTogglePaperTheme,
  fontFamily,
  fontSize,
  onExecCommand,
  similarityScore,
  isSaving,
  wordCount,
  pageCount,
}) => {
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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
      // Group: 2 to 3 paragraphs per sheet or ~260 words
      if (
        currentPageItems.length >= 2 &&
        (currentWords + pWordCount > 260 || currentPageItems.length >= 3)
      ) {
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
      className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100/90 dark:bg-slate-950/80 relative"
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
      {!isHumanisedScanned ? (
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
            <span className="text-xs text-slate-500 font-medium">
              {flaggedSentences.length} sentences flagged • {pages.length} Pages Active
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

      {/* Multi-Page Scrollable A4 Canvas Area */}
      <div className="flex-1 overflow-y-auto py-8 px-2 sm:px-6 flex flex-col items-center gap-10">
        {pages.map((page) => (
          <article
            key={page.pageNumber}
            contentEditable={true}
            suppressContentEditableWarning={true}
            className={`word-a4-page ${
              paperTheme === "dark" ? "word-a4-page-dark" : ""
            } leading-relaxed text-[16px] flex flex-col justify-between`}
            style={{
              fontFamily: fontFamily,
            }}
          >
            {/* Running Page Header */}
            <div
              contentEditable={false}
              className="text-[11px] font-sans text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 mb-8 flex items-center justify-between uppercase tracking-wider select-none shrink-0"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-elite-600" />
                Word Document (.docx) • Real-time Editing Active
              </span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                Page {page.pageNumber} of {pages.length}
              </span>
            </div>

            {/* Page Paragraphs & Sentences */}
            <div className="space-y-6 flex-1 min-h-[700px]">
              {page.items.map(({ p, originalIdx }) => {
                const isHeading = p.type === "heading";
                return (
                  <div key={p.id} className="space-y-3">
                    <div
                      className={
                        isHeading
                          ? "font-bold text-slate-900 dark:text-white text-xl tracking-tight mt-6 mb-3"
                          : "text-justify"
                      }
                    >
                      {p.sentences.map((sentence) => {
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
                        if (
                          humaniseViewMode === "humanised_preview" &&
                          isAiFlagged &&
                          topCandidate
                        ) {
                          return (
                            <span
                              key={sentence.id}
                              contentEditable={false}
                              onClick={() => {
                                const sel = window.getSelection();
                                if (!sel || sel.toString().trim().length === 0) {
                                  onSelectSentence(sentence);
                                }
                              }}
                              className="inline-block mx-0.5 my-1 p-1 rounded-xs humanised-preview-span text-emerald-950 dark:text-emerald-100 transition-all cursor-pointer group"
                              title="Click to view alternate rewrites"
                            >
                              <span>{topCandidate.text}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyQuickRewrite(sentence.id, topCandidate);
                                }}
                                className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95 inline-flex items-center gap-0.5"
                              >
                                ✓ Apply
                              </button>
                            </span>
                          );
                        }

                        // Original AI Flagged Mode
                        let spanClasses =
                          "transition-all duration-150 inline relative rounded-xs px-0.5 my-0.5 cursor-text ";

                        if (isSelected) {
                          spanClasses +=
                            " ring-2 ring-elite-500 bg-elite-50 dark:bg-elite-950/70 ";
                        } else if (isHovered) {
                          spanClasses += " bg-slate-100 dark:bg-slate-800 ";
                        }

                        if (humaniseViewMode === "original_flags" && isAiFlagged) {
                          if (sentence.score?.band === "likely_machine") {
                            spanClasses +=
                              " ai-flagged-machine text-slate-900 dark:text-slate-100 ";
                          } else {
                            spanClasses += " ai-flagged-uncertain ";
                          }
                        }

                        return (
                          <span
                            key={sentence.id}
                            onClick={() => {
                              // Only select sentence drawer if user didn't select words
                              const sel = window.getSelection();
                              if (!sel || sel.toString().trim().length === 0) {
                                onSelectSentence(sentence);
                              }
                            }}
                            onMouseEnter={() => setHoveredSentenceId(sentence.id)}
                            onMouseLeave={() => setHoveredSentenceId(null)}
                            className={spanClasses}
                          >
                            {sentence.text}{" "}
                            {sentence.locked && (
                              <span
                                contentEditable={false}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleLock(sentence.id);
                                }}
                                className="inline-flex items-center text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-600 dark:text-slate-300 ml-1 font-sans cursor-pointer hover:bg-rose-100"
                                title="Locked sentence"
                              >
                                <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {/* Render Inserted Elements (Academic Figures & Tables) */}
                    {insertedElements
                      .filter((el) => el.afterParagraphIndex === originalIdx)
                      .map((el) => {
                        if (el.type === "image") {
                          return (
                            <AcademicFigure
                              key={el.id}
                              id={el.id}
                              url={el.data.url}
                              caption={el.data.caption}
                              align={el.data.align || "center"}
                              widthPercent={el.data.widthPercent || 75}
                              canMoveUp={originalIdx > 0}
                              canMoveDown={originalIdx < paragraphs.length - 1}
                              onMoveUp={() => onMoveElementUp(el.id)}
                              onMoveDown={() => onMoveElementDown(el.id)}
                              onUpdateImage={(newUrl) =>
                                onUpdateElement(el.id, { url: newUrl })
                              }
                              onUpdateCaption={(newCap) =>
                                onUpdateElement(el.id, { caption: newCap })
                              }
                              onUpdateAlign={(newAlign) =>
                                onUpdateElement(el.id, { align: newAlign })
                              }
                              onUpdateWidth={(newW) =>
                                onUpdateElement(el.id, { widthPercent: newW })
                              }
                              onDelete={() => onDeleteElement(el.id)}
                            />
                          );
                        }
                        if (el.type === "table") {
                          return (
                            <div
                              key={el.id}
                              contentEditable={false}
                              className="overflow-x-auto my-3 select-none"
                            >
                              <table className="word-table">
                                <thead>
                                  <tr>
                                    {Array.from({ length: el.data.cols }).map((_, c) => (
                                      <th key={c}>Column {c + 1}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from({ length: el.data.rows - 1 }).map((_, r) => (
                                    <tr key={r}>
                                      {Array.from({ length: el.data.cols }).map((_, c) => (
                                        <td key={c}>
                                          Data cell {r + 1},{c + 1}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                        return null;
                      })}
                  </div>
                );
              })}

              {/* Equation on Page 1 */}
              {page.pageNumber === 1 && (
                <div
                  contentEditable={false}
                  onClick={onOpenEquationModal}
                  className="my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-elite-400 cursor-pointer transition-all group flex flex-col items-center justify-center select-none"
                >
                  <div className="text-xs font-sans text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sigma className="w-3.5 h-3.5 text-elite-600" /> Equation 1 (Protected OMML • Click to edit in LaTeX)
                  </div>
                  <div className="text-base sm:text-lg font-mono tracking-wider text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs group-hover:shadow-sm text-center">
                    {"Attention(Q, K, V) = softmax\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V"}
                  </div>
                </div>
              )}
            </div>

            {/* Running Page Footer */}
            <div
              contentEditable={false}
              className="text-[11px] font-sans text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4 mt-8 flex items-center justify-between select-none shrink-0"
            >
              <span>eduX Academic Integrity & Lossless Manuscript Engine</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">
                Page {page.pageNumber}
              </span>
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
        isSaving={isSaving}
      />
    </div>
  );
};
