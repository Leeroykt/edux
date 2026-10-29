import React, { useState } from "react";
import {
  DocumentParagraphNode,
  DocumentSentence,
  ScoreBand,
  SuggestionCandidate
} from "@edux/schema";
import {
  Sparkles,
  ShieldAlert,
  Sliders,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Check,
  Eye,
  Sigma,
  Zap,
  Edit3
} from "lucide-react";

interface DocumentEditorProps {
  paragraphs: DocumentParagraphNode[];
  selectedSentenceId: string | null;
  onSelectSentence: (sentence: DocumentSentence) => void;
  onApplyQuickRewrite: (sentenceId: string, candidate: SuggestionCandidate) => void;
  onToggleLock: (sentenceId: string) => void;
  onOpenEquationModal: () => void;
  aiThreshold: number;
  onThresholdChange: (val: number) => void;
  activeLayer: "both" | "ai" | "similarity" | "none";
  onLayerChange: (layer: "both" | "ai" | "similarity" | "none") => void;
  historyUndoLength: number;
  onUndo: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  paragraphs,
  selectedSentenceId,
  onSelectSentence,
  onApplyQuickRewrite,
  onToggleLock,
  onOpenEquationModal,
  aiThreshold,
  onThresholdChange,
  activeLayer,
  onLayerChange,
  historyUndoLength,
  onUndo,
}) => {
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);

  // Helper to determine styling for a sentence based on AI score & Similarity
  const getSentenceClasses = (sentence: DocumentSentence) => {
    const isSelected = selectedSentenceId === sentence.id;
    const isHovered = hoveredSentenceId === sentence.id;
    let base = "cursor-pointer transition-all duration-150 inline relative rounded px-0.5 my-0.5 ";

    if (isSelected) {
      base += " ring-2 ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 ";
    } else if (isHovered) {
      base += " bg-slate-100 dark:bg-slate-800 ";
    }

    if (sentence.locked) {
      base += " border-l-2 border-slate-400 opacity-85 ";
      return base;
    }

    // AI Layer
    if (activeLayer === "ai" || activeLayer === "both") {
      if (sentence.score && sentence.score.score >= aiThreshold) {
        if (sentence.score.band === "likely_machine") {
          base += " bg-rose-100/70 dark:bg-rose-950/40 text-slate-900 dark:text-slate-100 border-b-2 border-rose-500 ";
        } else if (sentence.score.band === "uncertain") {
          base += " bg-amber-100/70 dark:bg-amber-950/40 border-b-2 border-dashed border-amber-500 ";
        }
      }
    }

    // Similarity Layer
    if (activeLayer === "similarity" || activeLayer === "both") {
      if (sentence.similarityMatchId) {
        base += " bg-blue-100/70 dark:bg-blue-950/50 border-b-2 border-blue-500 text-blue-950 dark:text-blue-100 ";
      }
    }

    return base;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Document Sub-Toolbar */}
      <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-20 shrink-0">
        {/* Left: View Layers */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Eye className="w-3.5 h-3.5" /> Layer:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: "both", label: "Combined" },
                { id: "ai", label: "AI Bands" },
                { id: "similarity", label: "Similarity" },
                { id: "none", label: "Clean" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => onLayerChange(opt.id)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeLayer === opt.id
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Sensitivity Slider */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-400" /> Threshold:
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={aiThreshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 w-8">
            {Math.round(aiThreshold * 100)}%
          </span>
        </div>

        {/* Right: Quick Actions (Undo, Equation, Math) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={historyUndoLength === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Undo last change (U)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <button
            onClick={onOpenEquationModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-all"
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>LaTeX Box</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas Scroll Area */}
      <div className="flex-1 overflow-y-auto py-8 px-4 flex justify-center">
        {/* Word-style Paper Canvas */}
        <article className="word-page font-serif leading-relaxed text-[16px] text-slate-800 dark:text-slate-200">
          {/* Header line */}
          <div className="text-[11px] font-sans text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 mb-8 flex justify-between uppercase tracking-wider">
            <span>eduX Lossless DOCX Engine • Working Copy</span>
            <span>Page 1 of 12</span>
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
                      ? "font-sans font-bold text-slate-900 dark:text-white text-xl tracking-tight mt-6 mb-3"
                      : "text-justify"
                  }
                >
                  {p.sentences.map((sentence) => {
                    const isSelected = selectedSentenceId === sentence.id;
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
                        {activeLayer !== "none" &&
                          activeLayer !== "ai" &&
                          sentence.similarityMatchId && (
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

            {/* LaTeX Formula Demonstration Block (Section M5) */}
            <div
              onClick={onOpenEquationModal}
              className="my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all group flex flex-col items-center justify-center select-none"
            >
              <div className="text-xs font-sans text-slate-400 mb-2 flex items-center gap-1.5">
                <Sigma className="w-3.5 h-3.5 text-indigo-500" /> Equation 1 (Protected OMML Token • Click to edit in LaTeX)
              </div>
              <div className="text-lg font-mono tracking-wider text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 px-5 py-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-xs group-hover:shadow-sm">
                {"Attention(Q, K, V) = softmax\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V"}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
