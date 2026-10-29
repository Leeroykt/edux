"use client";

import React, { useState, useRef } from "react";
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
  CheckCircle2,
  Lock,
  Sigma,
  CheckCheck,
  PanelRightOpen,
  PanelRightClose
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

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  paragraphs,
  selectedSentenceId,
  onSelectSentence,
  onApplyQuickRewrite,
  onApplyAllRewrites,
  onToggleLock,
  onOpenEquationModal,
  onOpenUploadModal,
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
  const editorRef = useRef<HTMLDivElement>(null);

  const flaggedSentences = paragraphs
    .flatMap((p) => p.sentences)
    .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100/90 dark:bg-slate-950/80">
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
              {flaggedSentences.length} sentences flagged
            </span>
          </div>

          <div className="flex items-center gap-2">
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
              {isInspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable A4 Sheet Area */}
      <div className="flex-1 overflow-y-auto py-8 px-2 sm:px-4 flex justify-center">
        <article
          ref={editorRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          className={`word-a4-page ${paperTheme === "dark" ? "word-a4-page-dark" : ""} leading-relaxed text-[16px]`}
          style={{
            fontFamily: fontFamily,
          }}
        >
          {/* Header line */}
          <div
            contentEditable={false}
            className="text-[11px] font-sans text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 mb-8 flex items-center justify-between uppercase tracking-wider select-none"
          >
            <span>Word Document (.docx) • Real-time Editing Active</span>
            <span>Page 1 of {pageCount}</span>
          </div>

          {/* Render Paragraphs & Sentences */}
          <div className="space-y-6">
            {paragraphs.map((p, pIdx) => {
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
                      if (humaniseViewMode === "humanised_preview" && isAiFlagged && topCandidate) {
                        return (
                          <span
                            key={sentence.id}
                            contentEditable={false}
                            onClick={() => onSelectSentence(sentence)}
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
                        "transition-all duration-150 inline relative rounded-xs px-0.5 my-0.5 cursor-pointer ";

                      if (isSelected) {
                        spanClasses += " ring-2 ring-elite-500 bg-elite-50 dark:bg-elite-950/70 ";
                      } else if (isHovered) {
                        spanClasses += " bg-slate-100 dark:bg-slate-800 ";
                      }

                      if (humaniseViewMode === "original_flags" && isAiFlagged) {
                        if (sentence.score?.band === "likely_machine") {
                          spanClasses += " ai-flagged-machine text-slate-900 dark:text-slate-100 ";
                        } else {
                          spanClasses += " ai-flagged-uncertain ";
                        }
                      }

                      return (
                        <span
                          key={sentence.id}
                          onClick={() => onSelectSentence(sentence)}
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
                    .filter((el) => el.afterParagraphIndex === pIdx)
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
                            canMoveUp={pIdx > 0}
                            canMoveDown={pIdx < paragraphs.length - 1}
                            onMoveUp={() => onMoveElementUp(el.id)}
                            onMoveDown={() => onMoveElementDown(el.id)}
                            onUpdateImage={(newUrl) => onUpdateElement(el.id, { url: newUrl })}
                            onUpdateCaption={(newCap) => onUpdateElement(el.id, { caption: newCap })}
                            onUpdateAlign={(newAlign) => onUpdateElement(el.id, { align: newAlign })}
                            onUpdateWidth={(newW) => onUpdateElement(el.id, { widthPercent: newW })}
                            onDelete={() => onDeleteElement(el.id)}
                          />
                        );
                      }
                      if (el.type === "table") {
                        return (
                          <div key={el.id} contentEditable={false} className="overflow-x-auto my-3 select-none">
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
                                      <td key={c}>Data cell {r + 1},{c + 1}</td>
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

            {/* LaTeX Equation */}
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
          </div>
        </article>
      </div>

      {/* Bottom Word Editing Bar */}
      <EditorBottomBar
        onExecCommand={onExecCommand}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={historyUndoLength > 0}
        canRedo={historyRedoLength > 0}
        wordCount={wordCount}
        pageCount={pageCount}
        isSaving={isSaving}
      />
    </div>
  );
};