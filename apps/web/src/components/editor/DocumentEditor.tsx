import React, { useState, useRef } from "react";
import {
  DocumentParagraphNode,
  DocumentSentence,
  SuggestionCandidate
} from "@edux/schema";
import { EditorSidebar } from "./EditorSidebar";
import { EditorBottomBar } from "./EditorBottomBar";
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
  // Paper Theme
  paperTheme: "white" | "dark";
  onTogglePaperTheme: () => void;
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
  paperTheme,
  onTogglePaperTheme,
  similarityScore,
  isSaving,
  wordCount,
  pageCount,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [fontSize, setFontSize] = useState("3");
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const handleExecCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const flaggedSentences = paragraphs
    .flatMap((p) => p.sentences)
    .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-200/70 dark:bg-slate-950">
      {/* Main Body with Collapsible Left Sidebar + Document Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Left Collapsible Sidebar */}
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onTriggerHumanise={onTriggerHumanise}
          isHumanising={isHumanising}
          humaniseViewMode={humaniseViewMode}
          onHumaniseViewModeChange={onHumaniseViewModeChange}
          onApplyAllRewrites={onApplyAllRewrites}
          flaggedCount={flaggedSentences.length}
          aiThreshold={aiThreshold}
          onThresholdChange={onThresholdChange}
          onOpenInsertImage={onOpenInsertImage}
          onOpenInsertTable={onOpenInsertTable}
          onOpenEquationModal={onOpenEquationModal}
          onExecCommand={handleExecCommand}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          paperTheme={paperTheme}
          onTogglePaperTheme={onTogglePaperTheme}
          onOpenReport={onOpenReport}
          similarityScore={similarityScore}
        />

        {/* 2. Document Canvas Wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/90 dark:bg-slate-950/80">
          {/* Post-Upload Announcement Banner */}
          {!isHumanisedScanned ? (
            <div className="bg-gradient-to-r from-elite-600 via-indigo-600 to-teal-600 text-white px-6 py-2.5 flex items-center justify-between gap-4 shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="font-bold text-xs sm:text-sm">
                  Document Ready: Click Humanise to uncover machine patterns
                </span>
                <HelpTooltip
                  title="Humanise Document"
                  explanation="Analyzes vocabulary rhythm, perplexity, and formulaic stock transitions across each sentence without altering Word formatting."
                />
              </div>

              <button
                onClick={onTriggerHumanise}
                disabled={isHumanising}
                className="px-4 py-1.5 rounded-xl bg-white text-elite-700 hover:bg-slate-50 font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                {isHumanising ? "Scanning..." : "✨ Humanise Document"}
              </button>
            </div>
          ) : (
            /* Sub-header status bar */
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2 flex items-center justify-between text-xs z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-300">View:</span>
                {humaniseViewMode === "original_flags" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[11px]">
                    Original with AI Flags
                  </span>
                )}
                {humaniseViewMode === "humanised_preview" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Humanised Places Preview
                  </span>
                )}
                {humaniseViewMode === "clean" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-bold text-[11px]">
                    Clean Text
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {humaniseViewMode === "humanised_preview" && (
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
              className={`word-a4-page ${paperTheme === "dark" ? "word-a4-page-dark" : ""} font-serif leading-relaxed text-[16px]`}
              style={{ fontFamily: fontFamily }}
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
                            ? "font-sans font-bold text-slate-900 dark:text-white text-xl tracking-tight mt-6 mb-3"
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
                                <span className="font-serif">{topCandidate.text}</span>
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

                      {/* Render Inserted Elements */}
                      {insertedElements
                        .filter((el) => el.afterParagraphIndex === pIdx)
                        .map((el) => {
                          if (el.type === "image") {
                            return (
                              <figure key={el.id} contentEditable={false} className="word-figure">
                                <img src={el.data.url} alt="Figure" className="max-h-72 object-contain" />
                                {el.data.caption && <figcaption>{el.data.caption}</figcaption>}
                              </figure>
                            );
                          }
                          if (el.type === "table") {
                            return (
                              <div key={el.id} className="overflow-x-auto my-3">
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

          {/* 3. Bottom Quick-Editing Toolbar inside the wrapper */}
          <EditorBottomBar
            onExecCommand={handleExecCommand}
            canUndo={historyUndoLength > 0}
            canRedo={historyRedoLength > 0}
            onUndo={onUndo}
            onRedo={onRedo}
            wordCount={wordCount}
            pageCount={pageCount}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
};
