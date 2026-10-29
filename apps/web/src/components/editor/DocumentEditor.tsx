import React, { useState } from "react";
import {
  DocumentParagraphNode,
  DocumentSentence,
  SuggestionCandidate
} from "@edux/schema";
import {
  Sparkles,
  ShieldCheck,
  Sliders,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Eye,
  Sigma,
  UploadCloud,
  Layers,
  HelpCircle,
  PanelRightOpen,
  PanelRightClose
} from "lucide-react";

interface DocumentEditorProps {
  paragraphs: DocumentParagraphNode[];
  selectedSentenceId: string | null;
  onSelectSentence: (sentence: DocumentSentence) => void;
  onApplyQuickRewrite: (sentenceId: string, candidate: SuggestionCandidate) => void;
  onToggleLock: (sentenceId: string) => void;
  onOpenEquationModal: () => void;
  onOpenUploadModal: () => void;
  aiThreshold: number;
  onThresholdChange: (val: number) => void;
  activeMode: "ai" | "similarity" | "clean";
  onModeChange: (mode: "ai" | "similarity" | "clean") => void;
  historyUndoLength: number;
  historyRedoLength: number;
  onUndo: () => void;
  onRedo: () => void;
  overallAiScore?: number;
  similarityScore?: number;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  paragraphs,
  selectedSentenceId,
  onSelectSentence,
  onApplyQuickRewrite,
  onToggleLock,
  onOpenEquationModal,
  onOpenUploadModal,
  aiThreshold,
  onThresholdChange,
  activeMode,
  onModeChange,
  historyUndoLength,
  historyRedoLength,
  onUndo,
  onRedo,
  overallAiScore = 0.38,
  similarityScore = 16,
  isInspectorOpen,
  onToggleInspector,
}) => {
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);

  // Helper to determine styling for a sentence based on the active distinct mode
  const getSentenceClasses = (sentence: DocumentSentence) => {
    const isSelected = selectedSentenceId === sentence.id;
    const isHovered = hoveredSentenceId === sentence.id;
    let base = "cursor-pointer transition-all duration-150 inline relative rounded-sm px-0.5 my-0.5 ";

    if (isSelected) {
      base += " ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 ";
    } else if (isHovered) {
      base += " bg-slate-100 dark:bg-slate-800/80 ";
    }

    if (sentence.locked) {
      base += " border-l-2 border-slate-400 opacity-80 ";
      return base;
    }

    // MODE 1: AI Humanizer Mode (Strictly separate from Similarity)
    if (activeMode === "ai") {
      if (sentence.score && sentence.score.score >= aiThreshold) {
        if (sentence.score.band === "likely_machine") {
          base += " bg-rose-100/80 dark:bg-rose-950/50 text-slate-900 dark:text-slate-100 border-b-2 border-rose-500 ";
        } else if (sentence.score.band === "uncertain") {
          base += " bg-amber-100/80 dark:bg-amber-950/50 border-b-2 border-dashed border-amber-500 ";
        }
      }
    }

    // MODE 2: Similarity / Plagiarism Mode (Strictly separate from AI)
    if (activeMode === "similarity") {
      if (sentence.similarityMatchId) {
        base += " bg-blue-100/80 dark:bg-blue-950/60 border-b-2 border-blue-500 text-blue-950 dark:text-blue-100 ";
      }
    }

    return base;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Document Sub-Toolbar: Clean, Simple, Responsive */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
        {/* Left: Unmistakable Mode Switcher (Separate AI vs Similarity) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700">
            {/* Mode 1: AI Humanizer */}
            <button
              onClick={() => onModeChange("ai")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMode === "ai"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>AI Humanizer</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-mono">
                {Math.round(overallAiScore * 100)}%
              </span>
            </button>

            {/* Mode 2: Similarity / Turnitin */}
            <button
              onClick={() => onModeChange("similarity")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMode === "similarity"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Similarity Check</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono">
                {similarityScore}%
              </span>
            </button>

            {/* Mode 3: Clean */}
            <button
              onClick={() => onModeChange("clean")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                activeMode === "clean"
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Clean Text
            </button>
          </div>

          {/* AI Threshold slider only shown when in AI mode */}
          {activeMode === "ai" && (
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Sliders className="w-3 h-3" /> Flag Above:
              </span>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={aiThreshold}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-indigo-600"
              />
              <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                {Math.round(aiThreshold * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Center / Right: Upload Docx, Undo + Redo together, LaTeX, and Drawer Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Upload .docx Button */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300/80 dark:border-slate-700 transition-all shadow-2xs"
            title="Upload a new .docx to humanise"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Upload Document</span>
          </button>

          {/* Undo and Redo right next to each other */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={onUndo}
              disabled={historyUndoLength === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Undo last change (U)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Undo</span>
            </button>

            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            <button
              onClick={onRedo}
              disabled={historyRedoLength === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Redo previous change"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Redo</span>
            </button>
          </div>

          {/* LaTeX formula button */}
          <button
            onClick={onOpenEquationModal}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-all"
            title="Edit LaTeX Equation"
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>LaTeX</span>
          </button>

          {/* Inspector Panel Toggle for Mobile / Small screens */}
          <button
            onClick={onToggleInspector}
            className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Toggle Sidebar"
          >
            {isInspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas Scroll Area (Responsive & fluid) */}
      <div className="flex-1 overflow-y-auto py-6 sm:py-8 px-2 sm:px-4 flex justify-center">
        {/* Responsive Paper Canvas */}
        <article className="w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-12 md:p-16 shadow-page border border-slate-200/80 dark:border-slate-800 font-serif leading-relaxed text-sm sm:text-base text-slate-800 dark:text-slate-200 transition-all">
          {/* Header line */}
          <div className="text-[11px] font-sans text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex items-center justify-between uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Lossless Word Document (.docx)
            </span>
            <span>Page 1 of 12</span>
          </div>

          {/* User Guidance Banner */}
          <div className="mb-6 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs font-sans text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span><strong>How it works:</strong> Click any highlighted sentence below to view verified human rewrite suggestions in the right panel.</span>
            </span>
            <span className="hidden sm:inline text-[11px] font-mono text-indigo-500 font-semibold">
              Mode: {activeMode === "ai" ? "AI Detection" : activeMode === "similarity" ? "Similarity" : "Clean"}
            </span>
          </div>

          {/* Render Document Paragraphs */}
          <div className="space-y-5">
            {paragraphs.map((p) => {
              const isHeading = p.type === "heading";
              return (
                <div
                  key={p.id}
                  className={
                    isHeading
                      ? "font-sans font-bold text-slate-900 dark:text-white text-lg sm:text-xl tracking-tight mt-6 mb-3"
                      : "text-justify"
                  }
                >
                  {p.sentences.map((sentence) => {
                    return (
                      <span
                        key={sentence.id}
                        onClick={() => onSelectSentence(sentence)}
                        onMouseEnter={() => setHoveredSentenceId(sentence.id)}
                        onMouseLeave={() => setHoveredSentenceId(null)}
                        className={getSentenceClasses(sentence)}
                      >
                        {sentence.text}{" "}
                        {/* Lock Badge if protected */}
                        {sentence.locked && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleLock(sentence.id);
                            }}
                            className="inline-flex items-center text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-600 dark:text-slate-300 ml-1 font-sans cursor-pointer hover:bg-rose-100"
                            title="Locked sentence - excluded from rewriting"
                          >
                            <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
                          </span>
                        )}
                        {/* Similarity Number Badge if match */}
                        {activeMode === "similarity" && sentence.similarityMatchId && (
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-sans font-bold bg-blue-600 text-white rounded-full ml-1 align-super"
                            title="Matched source [1]"
                          >
                            1
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })}

            {/* LaTeX Formula Demonstration Block */}
            <div
              onClick={onOpenEquationModal}
              className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all group flex flex-col items-center justify-center select-none"
            >
              <div className="text-xs font-sans text-slate-400 mb-2 flex items-center gap-1.5">
                <Sigma className="w-3.5 h-3.5 text-indigo-500" /> Equation 1 (Protected OMML Token • Click to edit in LaTeX)
              </div>
              <div className="text-base sm:text-lg font-mono tracking-wider text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs group-hover:shadow-sm text-center">
                {"Attention(Q, K, V) = softmax\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V"}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
