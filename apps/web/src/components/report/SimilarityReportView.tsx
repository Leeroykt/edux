import React, { useState } from "react";
import {
  SimilarityReport,
  SimilaritySource,
  SimilarityMatch
} from "@edux/schema";
import {
  ShieldAlert,
  BookOpen,
  Filter,
  ExternalLink,
  Printer,
  FileText,
  Sparkles,
  Info,
  CheckCircle2,
  Sliders,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Cpu
} from "lucide-react";

interface SimilarityReportViewProps {
  report: SimilarityReport;
  documentTitle: string;
  onJumpToEditorSentence: (sentenceId: string) => void;
}

export const SimilarityReportView: React.FC<SimilarityReportViewProps> = ({
  report,
  documentTitle,
  onJumpToEditorSentence,
}) => {
  const [excludeQuotes, setExcludeQuotes] = useState(report.exclusionsApplied.excludeQuotes);
  const [excludeBibliography, setExcludeBibliography] = useState(
    report.exclusionsApplied.excludeBibliography
  );
  const [excludeSmallMatches, setExcludeSmallMatches] = useState(
    report.exclusionsApplied.excludeSmallMatches
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string>(report.matches[0]?.id || "");

  // Dynamically compute adjusted similarity based on exclusions
  let adjustedScore = report.overallPercentage;
  if (!excludeQuotes) adjustedScore += 4;
  if (!excludeBibliography) adjustedScore += 3;
  if (!excludeSmallMatches) adjustedScore += 2;

  const currentMatch = report.matches.find((m) => m.id === selectedMatchId) || report.matches[0];
  const currentSource = report.matchedSources.find((s) => s.id === currentMatch?.sourceId);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-3 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                REPORT #{report.id.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400">• Verified Report</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Similarity & Source Matching Report
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Paper: <strong className="text-slate-700 dark:text-slate-300">{documentTitle}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* CLARITY SECTION: Strictly Separate Similarity vs AI Likelihood */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Box 1: Similarity (Plagiarism) Score - Strictly Blue */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/80 shadow-md shadow-blue-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                1. Plagiarism & Similarity Index
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600">
                Turnitin Benchmark
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-black text-blue-600 dark:text-blue-400">
                {adjustedScore}%
              </div>
              <span className="text-xs text-slate-500 font-medium leading-relaxed">
                Matched against arXiv, PubMed, open academic repositories and web crawl index.
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              <strong>What this means:</strong> Only {adjustedScore}% of the vocabulary sequence matches existing published papers. Lower is better.
            </div>
          </div>

          {/* Box 2: AI Likelihood Score - Strictly Rose/Violet */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-400/70 shadow-md shadow-rose-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                2. AI Detection Likelihood
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-600">
                Probabilistic Estimate
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-black text-amber-500">
                38%
              </div>
              <span className="text-xs text-slate-500 font-medium leading-relaxed">
                Uncertain / Mixed Signals (Some stock transitions flagged in Chapter 1).
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              <strong>What this means:</strong> Measures sentence cadence and formulaic phrases. Can be lowered line by line in the Humaniser Editor.
            </div>
          </div>
        </div>

        {/* Exclusion Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Turnitin Standard Exclusions:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeQuotes}
                onChange={(e) => setExcludeQuotes(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Exclude Quotes (-4%)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeBibliography}
                onChange={(e) => setExcludeBibliography(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Exclude Bibliography (-3%)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeSmallMatches}
                onChange={(e) => setExcludeSmallMatches(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-600 dark:text-slate-300 font-medium">Exclude Small Matches (&lt; 8 words)</span>
            </label>
          </div>
        </div>

        {/* Side-by-Side Source Inspection */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sources List */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>Indexed Matched Sources</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                {report.matchedSources.length} sources
              </span>
            </h3>

            <div className="space-y-2.5">
              {report.matchedSources.map((source, idx) => {
                const isSelected = currentSource?.id === source.id;
                return (
                  <div
                    key={source.id}
                    onClick={() => {
                      const m = report.matches.find((match) => match.sourceId === source.id);
                      if (m) setSelectedMatchId(m.id);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                            {source.name}
                          </h4>
                          {source.authors && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {source.authors} ({source.publicationYear})
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded shrink-0">
                        {source.matchPercentage}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="capitalize">{source.sourcePool.replace("_", " ")}</span>
                      <span>{source.matchedWordCount} words matched</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side by side diff preview */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Side-by-Side Match Inspection
              </h3>
              {currentMatch && (
                <button
                  onClick={() => onJumpToEditorSentence(currentMatch.sentenceId)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span>Open & Humanise in Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {currentMatch && currentSource ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Your Document Text:
                  </span>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-serif text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                    <span className="bg-blue-100/90 dark:bg-blue-900/60 px-1.5 py-0.5 rounded border-b-2 border-blue-500">
                      {currentMatch.originalText}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Matched Source Publication Snippet:
                    </span>
                    {currentSource.url && (
                      <a
                        href={currentSource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Source Link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 font-serif text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                    <span className="bg-amber-100/90 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border-b-2 border-amber-500">
                      {currentMatch.sourceSnippet}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
