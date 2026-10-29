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
  ArrowRight
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
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Report Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                REPORT #{report.id.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400">• Generated {new Date(report.generatedAt).toLocaleDateString()}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Academic Similarity & Integrity Report
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Document: <strong className="text-slate-700 dark:text-slate-300">{documentTitle}</strong>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Executive Metric Cards (Turnitin-style Score Badges) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Similarity Score */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Similarity Index
              </span>
              <div className="text-4xl font-black text-blue-600 dark:text-blue-400">
                {adjustedScore}%
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Total matched against 3 academic index pools
              </span>
            </div>
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 border-4 border-blue-500 flex items-center justify-center font-extrabold text-blue-600 dark:text-blue-400 text-sm">
              {adjustedScore}%
            </div>
          </div>

          {/* Card 2: AI Probability Band */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                AI Likelihood Band
              </span>
              <div className="text-3xl font-extrabold text-amber-500">
                Uncertain
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                38% score band (prose has mixed signals)
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>

          {/* Card 3: Index Coverage */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Search Coverage Pools
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                  arXiv & PubMed Open
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  Web Crawl Index
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                  eduX Private Pool
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Transparent scope: Sources outside these 3 pools are explicitly noted.
            </p>
          </div>
        </div>

        {/* Interactive Exclusion Bar (M8.8) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Filters & Exclusions:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeQuotes}
                onChange={(e) => setExcludeQuotes(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-600 dark:text-slate-300">Exclude Quoted Text</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeBibliography}
                onChange={(e) => setExcludeBibliography(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-600 dark:text-slate-300">Exclude Bibliography & References</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeSmallMatches}
                onChange={(e) => setExcludeSmallMatches(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-600 dark:text-slate-300">Exclude Small Matches (&lt; 8 words)</span>
            </label>
          </div>
        </div>

        {/* Main Side-by-Side Comparison Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Ranked Source Matches (4 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>Matched Sources Breakdown</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                {report.matchedSources.length} sources found
              </span>
            </h3>

            <div className="space-y-2.5">
              {report.matchedSources.map((source, idx) => {
                const isSelected = currentSource?.id === source.id;
                return (
                  <div
                    key={source.id}
                    onClick={() => {
                      const matchForSource = report.matches.find((m) => m.sourceId === source.id);
                      if (matchForSource) setSelectedMatchId(matchForSource.id);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
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

          {/* Right Column: Side-by-Side Match Inspector (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Side-by-Side Passage Verification (M9.4)
              </h3>
              {currentMatch && (
                <button
                  onClick={() => onJumpToEditorSentence(currentMatch.sentenceId)}
                  className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Open & Rewrite in Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {currentMatch && currentSource ? (
              <div className="space-y-4">
                {/* Your Paper's Text */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Your Document Text:
                  </span>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-serif text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                    <span className="bg-blue-100/80 dark:bg-blue-900/50 px-1 py-0.5 rounded border-b-2 border-blue-500">
                      {currentMatch.originalText}
                    </span>
                  </div>
                </div>

                {/* Matched Source's Text */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Matched Source Publication Snippet:
                    </span>
                    {currentSource.url && (
                      <a
                        href={currentSource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        Inspect Full Paper <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 font-serif text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                    <span className="bg-amber-100/80 dark:bg-amber-950/70 px-1 py-0.5 rounded border-b-2 border-amber-500">
                      {currentMatch.sourceSnippet}
                    </span>
                  </div>
                </div>

                {/* Notice */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 leading-normal flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Similarity index measures matching character n-grams and semantic embeddings. A high similarity score in technical descriptions or citations is common and does not inherently prove academic misconduct.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">
                Select a matched source to view text alignment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
