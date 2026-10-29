import React, { useState } from "react";
import {
  DocumentMeta,
  UsageSummary,
  VoiceProfile
} from "@edux/schema";
import {
  UploadCloud,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  TrendingDown,
  Trash2,
  Archive,
  Plus
} from "lucide-react";

interface IndividualDashboardProps {
  documents: DocumentMeta[];
  usage: UsageSummary;
  voiceProfile: VoiceProfile;
  onOpenDocument: (id: string) => void;
  onUploadSimulate: () => void;
  onNavigateToPricing: () => void;
}

export const IndividualDashboard: React.FC<IndividualDashboardProps> = ({
  documents,
  usage,
  voiceProfile,
  onOpenDocument,
  onUploadSimulate,
  onNavigateToPricing,
}) => {
  const [isOwnPaperConfirmed, setIsOwnPaperConfirmed] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome & Quota Overview Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Individual Writer Workspace (M13)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Active plan: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Individual ($5/mo)</strong> • Licensed for personal academic papers
            </p>
          </div>

          <button
            onClick={onNavigateToPricing}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span>Manage Plan & Limits</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Widgets Grid: Usage Meter, Voice Profile, Personal Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Widget 1: Usage Meter */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Daily Usage Meter
              </span>
              <span className="font-mono text-indigo-600">
                {Math.round((usage.wordsScoredToday / usage.dailyWordCap) * 100)}%
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Words Scored Today:</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {usage.wordsScoredToday.toLocaleString()} / {usage.dailyWordCap.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${(usage.wordsScoredToday / usage.dailyWordCap) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Rewrite Suggestions Used:</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {usage.suggestionsUsedToday} / {usage.dailySuggestionCap}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${(usage.suggestionsUsedToday / usage.dailySuggestionCap) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Active Paper Slots:</span>
                <span className="font-semibold text-indigo-600">
                  {usage.activePapersCount} of {usage.activePapersCap} used
                </span>
              </div>
            </div>
          </div>

          {/* Widget 2: Personal Voice Profile (M6.4) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Learned Voice Profile
              </span>
              <span className="font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px]">
                {voiceProfile.strengthScore}% Calibrated
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
              {voiceProfile.guideSummary}
            </p>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>{voiceProfile.sampleCount} reference documents added</span>
              <button className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Upload Samples
              </button>
            </div>
          </div>

          {/* Widget 3: Personal Writing Tips */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Personal Writing Tip</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Frequent Opener:</strong> You started 4 consecutive sentences with <em>"Furthermore"</em> and <em>"In addition"</em> in Chapter 2. Consider varying clause order.
            </div>

            <div className="pt-1 text-[11px] text-slate-400">
              Derived from your personal stylometric pattern analysis.
            </div>
          </div>
        </div>

        {/* Upload Drop Zone Card with Own-Paper Confirmation (M13.10) */}
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Drag & Drop your .docx file to scan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports Microsoft Word (.docx, .dotx) up to 50 MB with instant equation and table extraction.
            </p>
          </div>

          {/* Own-paper checkbox */}
          <div className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <input
              type="checkbox"
              id="ownPaper"
              checked={isOwnPaperConfirmed}
              onChange={(e) => setIsOwnPaperConfirmed(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="ownPaper" className="text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              I confirm this is my own writing (Individual Plan License Requirement)
            </label>
          </div>

          <div>
            <button
              onClick={onUploadSimulate}
              disabled={!isOwnPaperConfirmed}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              Browse Files or Load Demo Document
            </button>
          </div>
        </div>

        {/* My Active Papers List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
            <span>My Active Papers ({documents.length})</span>
            <span className="text-xs font-normal text-slate-400">
              {usage.activePapersCap - usage.activePapersCount} slots remaining
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc.id)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                        {doc.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {doc.wordCount.toLocaleString()} words • {doc.pageCount} pages • {doc.currentVersionId}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {doc.stage.replace("_", " ")}
                  </span>
                </div>

                {/* Score Indicators */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> {Math.round((doc.overallAiScore || 0) * 100)}% AI Band
                    </span>
                    <span className="text-blue-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {doc.similarityScore || 0}% Similarity
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Edited {new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
