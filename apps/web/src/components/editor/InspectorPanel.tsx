import React, { useState } from "react";
import {
  DocumentSentence,
  SuggestionCandidate,
  ReasonChip,
  SimilarityReport
} from "@edux/schema";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Unlock,
  BookOpen,
  FileSpreadsheet,
  History,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal
} from "lucide-react";

interface InspectorPanelProps {
  selectedSentence: DocumentSentence | null;
  suggestions: SuggestionCandidate[];
  isLoadingSuggestions: boolean;
  onApplySuggestion: (candidate: SuggestionCandidate) => void;
  onToggleLock: (sentenceId: string) => void;
  report: SimilarityReport | null;
}

export type InspectorTab = "suggestions" | "scores" | "similarity" | "formatting" | "history";

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedSentence,
  suggestions,
  isLoadingSuggestions,
  onApplySuggestion,
  onToggleLock,
  report,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>("suggestions");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({});
  const [toneSetting, setToneSetting] = useState<"academic" | "neutral" | "conversational">("academic");

  const score = selectedSentence?.score;
  const match = report?.matches.find((m) => m.sentenceId === selectedSentence?.id);
  const matchedSource = report?.matchedSources.find((s) => s.id === match?.sourceId);

  const getReasonBadgeLabel = (reason: ReasonChip) => {
    switch (reason) {
      case "uniform_rhythm":
        return "Monotonous Cadence";
      case "generic_phrasing":
        return "Generic Transition";
      case "stock_transitions":
        return "Stock Academic Opener";
      case "repetitive_openers":
        return "Repetitive Syntax";
      default:
        return reason.replace("_", " ");
    }
  };

  return (
    <aside className="w-80 lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-4rem)] z-30 shrink-0 select-none">
      {/* Inspector Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold px-2 pt-2 bg-slate-50/50 dark:bg-slate-950/50 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all border-b-2 ${
            activeTab === "suggestions"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Rewrites</span>
          {suggestions.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-[10px] font-bold flex items-center justify-center">
              {suggestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("scores")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all border-b-2 ${
            activeTab === "scores"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>AI Score</span>
        </button>

        <button
          onClick={() => setActiveTab("similarity")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all border-b-2 ${
            activeTab === "similarity"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Matches</span>
          {match && (
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("formatting")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition-all border-b-2 ${
            activeTab === "formatting"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Style</span>
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selectedSentence ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Sparkles className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600 mb-3 animate-pulse" />
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              Select any sentence
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Click any sentence in the document to inspect AI signals, similarity, and generate verified human rewrites.
            </p>
          </div>
        ) : (
          <>
            {/* Sentence Preview Card with Lock toggle */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  Target Sentence ({selectedSentence.id})
                </span>
                <button
                  onClick={() => onToggleLock(selectedSentence.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedSentence.locked
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                >
                  {selectedSentence.locked ? (
                    <>
                      <Lock className="w-3 h-3" /> Locked
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" /> Unlocked
                    </>
                  )}
                </button>
              </div>
              <p className="font-serif italic text-slate-700 dark:text-slate-200 leading-normal">
                "{selectedSentence.text}"
              </p>
            </div>

            {/* TAB 1: SUGGESTIONS */}
            {activeTab === "suggestions" && (
              <div className="space-y-3">
                {/* Tone Controls */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" /> Tone:
                  </span>
                  <div className="flex gap-1 text-[11px]">
                    {(["academic", "neutral", "conversational"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setToneSetting(t)}
                        className={`px-2 py-0.5 rounded capitalize transition-all ${
                          toneSetting === t
                            ? "bg-indigo-600 text-white font-medium"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingSuggestions ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">
                      Generating checked candidates & verifying meaning...
                    </span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>This sentence reads naturally and has a low AI likelihood score. No rewrite required.</span>
                  </div>
                ) : (
                  suggestions.map((c, i) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                          {c.strategy.replace("_", " ")}
                        </span>

                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span
                            className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                            title="Entailment verification: meaning preserved"
                          >
                            <CheckCircle2 className="w-3 h-3" /> {c.meaningScore}% Meaning
                          </span>
                          <span
                            className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                            title="AI score reduction"
                          >
                            <TrendingDown className="w-3 h-3" /> {c.scoreDelta}% AI
                          </span>
                        </div>
                      </div>

                      <p className="font-serif text-xs md:text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                        {c.text}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {c.plainExplanation}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        {/* Feedback Thumbs */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setFeedbackGiven((prev) => ({ ...prev, [c.id]: "up" }))
                            }
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              feedbackGiven[c.id] === "up" ? "text-emerald-600" : "text-slate-400"
                            }`}
                            title="Helpful rewrite"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setFeedbackGiven((prev) => ({ ...prev, [c.id]: "down" }))
                            }
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              feedbackGiven[c.id] === "down" ? "text-rose-600" : "text-slate-400"
                            }`}
                            title="Changed meaning or poor flow"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Apply Button */}
                        <button
                          onClick={() => onApplySuggestion(c)}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all active:scale-95 shadow-xs flex items-center gap-1"
                        >
                          <span>Apply</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: AI SCORE DETAILS */}
            {activeTab === "scores" && (
              <div className="space-y-4">
                {score ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                        Machine Likelihood
                      </div>
                      <div
                        className={`text-3xl font-extrabold my-1 ${
                          score.band === "likely_machine"
                            ? "text-rose-600"
                            : score.band === "uncertain"
                            ? "text-amber-500"
                            : "text-emerald-600"
                        }`}
                      >
                        {Math.round(score.score * 100)}%
                      </div>
                      <div className="text-xs font-semibold capitalize text-slate-600 dark:text-slate-300">
                        Band: {score.band.replace("_", " ")}
                      </div>
                    </div>

                    {/* Reasons */}
                    <div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                        Detected Phrasing Patterns:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {score.reasons.length > 0 ? (
                          score.reasons.map((r) => (
                            <span
                              key={r}
                              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            >
                              {getReasonBadgeLabel(r)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Natural human sentence rhythm with no repetitive markers.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ethical disclaimer badge */}
                    <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        AI likelihood scores are probabilistic estimates based on vocabulary burstiness and sentence rhythm—never definitive proof of authorship.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Score data unavailable for this sentence.</div>
                )}
              </div>
            )}

            {/* TAB 3: SIMILARITY MATCHES */}
            {activeTab === "similarity" && (
              <div className="space-y-3">
                {match && matchedSource ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-900 dark:text-blue-200">
                          Matched Source [1]
                        </span>
                        <span className="font-mono font-bold text-blue-600 bg-white dark:bg-slate-900 px-2 py-0.5 rounded">
                          {match.similarityScore}% Overlap
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-2">
                        {matchedSource.name}
                      </div>
                      {matchedSource.authors && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {matchedSource.authors} ({matchedSource.publicationYear})
                        </div>
                      )}
                      {matchedSource.url && (
                        <a
                          href={matchedSource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-2 font-medium"
                        >
                          View source paper <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="text-xs">
                      <div className="font-semibold text-slate-500 mb-1">Source Snippet:</div>
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-serif italic text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        "{match.sourceSnippet}"
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    No similarity overlap found in indexed academic repositories or open web for this sentence.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: FORMATTING STYLES */}
            {activeTab === "formatting" && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                    Active Style: APA 7th Edition
                  </div>
                  <div className="text-slate-500 space-y-1 text-[11px]">
                    <div>• Font: Times New Roman, 12pt</div>
                    <div>• Spacing: 2.0 (Double spaced)</div>
                    <div>• Margins: 1.0 inch all sides</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Style Compliance Status
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Heading & run styles match profile
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
