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
  AlertCircle,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  X
} from "lucide-react";
import { HelpTooltip } from "../ui/HelpTooltip";
import { checkSentence } from "../../lib/writingChecks";
import { convertSpelling, Dialect, dialectLabel } from "../../lib/dialect";

interface InspectorPanelProps {
  selectedSentence: DocumentSentence | null;
  suggestions: SuggestionCandidate[];
  isLoadingSuggestions: boolean;
  suggestionsError?: string | null;
  onRetrySuggestions?: () => void;
  isRescoring?: boolean;
  isScanning?: boolean;
  tone: "academic" | "neutral" | "conversational";
  onToneChange: (tone: "academic" | "neutral" | "conversational") => void;
  onApplySuggestion: (candidate: SuggestionCandidate) => void;
  dialect: Dialect;
  grammarChecks: boolean;
  onFixSentence: (sentence: DocumentSentence, text: string) => void;
  onToggleLock: (sentenceId: string) => void;
  report: SimilarityReport | null;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export type InspectorTab = "suggestions" | "scores" | "similarity";

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedSentence,
  suggestions,
  isLoadingSuggestions,
  suggestionsError = null,
  onRetrySuggestions,
  isRescoring = false,
  isScanning = false,
  tone,
  onToneChange,
  onApplySuggestion,
  dialect,
  grammarChecks,
  onFixSentence,
  onToggleLock,
  report,
  isOpen,
  onCloseMobile,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>("suggestions");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({});

  const score = selectedSentence?.score;
  const match = report?.matches.find((m) => m.sentenceId === selectedSentence?.id);
  const matchedSource = report?.matchedSources.find((s) => s.id === match?.sourceId);

  const getReasonBadgeLabel = (reason: ReasonChip) => {
    switch (reason) {
      case "uniform_rhythm":
        return "Monotonous Cadence";
      case "generic_phrasing":
        return "Generic Phrasing";
      case "stock_transitions":
        return "Stock Transition Words";
      case "repetitive_openers":
        return "Repetitive Sentence Opener";
      case "low_specificity":
        return "Low Specificity";
      case "academic_formulaic":
        return "Formulaic Academic Phrasing";
      case "repetitive_structure":
        return "Repetitive Structure";
      case "cliche_collocations":
        return "Cliché Word Pairings";
      case "unnatural_symmetry":
        return "Unnatural Symmetry";
      default:
        return String(reason).replace(/_/g, " ");
    }
  };

  return (
    <aside
      className={`fixed lg:static top-16 right-0 bottom-0 z-30 w-[min(24rem,100vw)] lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out shadow-2xl lg:shadow-none select-none ${
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Mobile Drawer Header */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
          Review
        </span>
        <button
          onClick={onCloseMobile}
          aria-label="Close review panel"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold px-2 pt-2 bg-slate-50/50 dark:bg-slate-950/50 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl transition-all border-b-2 ${
            activeTab === "suggestions"
              ? "border-elite-600 text-elite-600 dark:text-elite-400 bg-white dark:bg-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Rewrites</span>
          {suggestions.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-elite-100 dark:bg-elite-950 text-elite-600 text-[10px] font-bold flex items-center justify-center">
              {suggestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("scores")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl transition-all border-b-2 ${
            activeTab === "scores"
              ? "border-elite-600 text-elite-600 dark:text-elite-400 bg-white dark:bg-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Checks</span>
        </button>

        <button
          onClick={() => setActiveTab("similarity")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl transition-all border-b-2 ${
            activeTab === "similarity"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Sources</span>
          {match && <span className="w-2 h-2 rounded-full bg-blue-500" />}
        </button>

      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selectedSentence ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Sparkles className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600 mb-3 animate-pulse" />
            <h2 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Select a sentence
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              Click a sentence to see rewrites, spelling and grammar fixes, and how machine-like it reads.
            </p>
          </div>
        ) : (
          <>
            {/* Target Sentence Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Selected sentence</span>
                  <HelpTooltip
                    title="Sentence Locking"
                    explanation="Locking a sentence protects its text from being scored or rewritten by AI. Ideal for direct quotations, specialized terminology, or formulas."
                  />
                </div>
                <button
                  onClick={() => onToggleLock(selectedSentence.id)}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    selectedSentence.locked
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                  title="Lock to prevent AI rewriting"
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
              <p className="font-serif italic text-slate-800 dark:text-slate-100 leading-normal">
                "{selectedSentence.text}"
              </p>
            </div>

            {/* TAB 1: HUMAN REWRITES */}
            {activeTab === "suggestions" && (
              <div className="space-y-3">
                {/* Tone Controls */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <SlidersHorizontal className="w-3 h-3" /> Tone:
                    <HelpTooltip
                      title="Rewrite Tone Profiles"
                      explanation="Selects the stylistic vocabulary profile used to generate suggestions. 'Academic' maintains rigorous empirical vocabulary while varying clause rhythm."
                    />
                  </div>
                  <div className="flex gap-1 text-[11px]">
                    {(["academic", "neutral", "conversational"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => onToneChange(t)}
                        className={`px-2 py-0.5 rounded-md capitalize transition-all ${
                          tone === t
                            ? "bg-elite-600 text-white font-bold"
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
                    <div className="w-6 h-6 border-2 border-elite-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">
                      Generating human rewrites & checking meaning...
                    </span>
                  </div>
                ) : suggestionsError ? (
                  <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{suggestionsError}</span>
                    </div>
                    {onRetrySuggestions && (
                      <button
                        onClick={onRetrySuggestions}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                ) : selectedSentence.locked ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>This sentence is locked. Unlock it to see rewrites.</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No rewrite to suggest for this sentence.</span>
                  </div>
                ) : (
                  suggestions.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-elite-300 dark:hover:border-elite-700 transition-all shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 border border-elite-100 dark:border-elite-900">
                          {c.strategy.replace(/_/g, " ")}
                        </span>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                          {c.meaningScore <= 0 ? (
                            <span
                              className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded"
                              title="This rewrite has not been checked for meaning. Read it carefully before applying."
                            >
                              Unchecked
                            </span>
                          ) : (
                          <span
                            className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                            title="Entailment verification: original and new sentence mean the exact same thing"
                          >
                            ✓ {c.meaningScore}% Meaning
                            <HelpTooltip
                              title="Meaning Preservation Check"
                              explanation="Evaluates semantic entailment using natural language inference (NLI). Ensures the rewrite preserves facts, numbers, citations, and core argument."
                            />
                          </span>
                          )}
                          {c.scoreDelta !== 0 && (
                            <span
                              className="text-elite-600 dark:text-elite-400 bg-elite-50 dark:bg-elite-950 px-1.5 py-0.5 rounded"
                              title="Expected change in AI likelihood"
                            >
                              {c.scoreDelta}% AI
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="font-serif text-xs md:text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                        "{c.text}"
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {c.plainExplanation}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setFeedbackGiven((prev) => ({ ...prev, [c.id]: "up" }))
                            }
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
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
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                              feedbackGiven[c.id] === "down" ? "text-rose-600" : "text-slate-400"
                            }`}
                            title="Poor rewrite"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => onApplySuggestion(c)}
                          className="px-3.5 py-1.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white font-bold text-xs shadow-sm shadow-elite-600/20 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <span>Apply Rewrite</span>
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
                {(() => {
                  const spelling = convertSpelling(selectedSentence.text, dialect);
                  const grammar = grammarChecks ? checkSentence(selectedSentence.text) : [];
                  const none = spelling.changes.length === 0 && grammar.length === 0;
                  return (
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Spelling and grammar</div>
                      {none && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-500">
                          Nothing to fix in this sentence.
                        </div>
                      )}
                      {spelling.changes.length > 0 && (
                        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
                          <div className="text-xs text-amber-900 dark:text-amber-200">
                            {spelling.changes.map((c) => `${c.from} → ${c.to}`).join(", ")}
                            <span className="block text-[11px] opacity-80 mt-0.5">Spelling for {dialectLabel(dialect)}.</span>
                          </div>
                          {!selectedSentence.locked && (
                            <button onClick={() => onFixSentence(selectedSentence, spelling.text)} className="text-xs font-semibold rounded-lg bg-elite-600 hover:bg-elite-700 text-white px-3 py-1.5">
                              Fix spelling
                            </button>
                          )}
                        </div>
                      )}
                      {grammar.map((g) => (
                        <div key={g.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${g.kind === "grammar" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"}`}>
                              {g.kind === "grammar" ? "Grammar" : "Clarity"}
                            </span>
                            <span className="text-slate-700 dark:text-slate-200 leading-relaxed">{g.message}</span>
                          </div>
                          {g.fixedText && !selectedSentence.locked && (
                            <button onClick={() => onFixSentence(selectedSentence, g.fixedText!)} className="text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                              Apply fix
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">How machine-like it reads</div>
                {score ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <span>AI Probability</span>
                        <HelpTooltip
                          title="Probabilistic AI Score"
                          explanation="Measures vocabulary perplexity and sentence burstiness. High scores indicate repetitive clause lengths or formulaic transition markers."
                        />
                      </div>
                      <div
                        className={`text-3xl font-black my-1 ${
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
                        {score.band.replace(/_/g, " ")} Phrasing
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                        Why this was flagged:
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

                    {score.engine === "reference" && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                        Scored by the built-in reference heuristic, not a trained model. Treat it as a rough hint.
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        AI scores reflect formulaic rhythm and vocabulary burstiness—not definitive proof.
                      </span>
                    </div>
                  </div>
                ) : isRescoring || isScanning ? (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-elite-500 border-t-transparent rounded-full animate-spin" />
                    Scoring this sentence…
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    No score for this sentence. Sentences under about eight words, headings and locked text are not scored on their own.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SIMILARITY */}
            {activeTab === "similarity" && (
              <div className="space-y-3">
                {match && matchedSource ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-900 dark:text-blue-200">
                          Matched Source [1]
                        </span>
                        <span className="font-mono font-bold text-blue-600 bg-white dark:bg-slate-900 px-2 py-0.5 rounded">
                          {match.similarityScore}% Match
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-2">
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
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-2 font-medium"
                        >
                          View source publication <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="text-xs">
                      <div className="font-semibold text-slate-500 mb-1">Source Snippet:</div>
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-serif italic text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        "{match.sourceSnippet}"
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    No similarity overlap found for this sentence.
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </aside>
  );
};
