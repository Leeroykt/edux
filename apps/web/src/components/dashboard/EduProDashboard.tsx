import React, { useState } from "react";
import { apiClient } from "../../services/api/apiClient";
import { DocumentMeta, DocumentStage } from "@edux/schema";
import {
  FolderKanban,
  Folder,
  Plus,
  Play,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  Share2,
  FileText,
  BarChart2,
  Filter,
  Layers
} from "lucide-react";

interface EduProDashboardProps {
  documents: DocumentMeta[];
  onOpenDocument: (id: string) => void;
  onUpdateStage: (docId: string, stage: DocumentStage) => void;
}

export const EduProDashboard: React.FC<EduProDashboardProps> = ({
  documents,
  onOpenDocument,
  onUpdateStage,
}) => {
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  const columns: { stage: DocumentStage; label: string; color: string }[] = [
    { stage: "uploaded", label: "Uploaded / Queued", color: "border-slate-300 dark:border-slate-700" },
    { stage: "in_review", label: "In Review / Editing", color: "border-indigo-500" },
    { stage: "returned", label: "Returned to Client", color: "border-teal-500" },
    { stage: "closed", label: "Approved & Closed", color: "border-emerald-500" },
  ];

  const scored = documents.filter((d) => d.status !== "scanning" && d.status !== "error" && (d.overallAiScore ?? 0) > 0);
  const avgAi = scored.length
    ? Math.round((scored.reduce((a, d) => a + (d.overallAiScore ?? 0), 0) / scored.length) * 100)
    : null;
  const openCount = documents.filter((d) => d.stage !== "closed").length;
  const inReview = documents.filter((d) => d.stage === "in_review").length;
  const waiting = documents.filter((d) => d.status === "scanning").length;

  /** Starts scoring for every open document in the background. */
  const handleRunBatch = async () => {
    const targets = documents.filter((d) => d.stage !== "closed");
    if (targets.length === 0) {
      setBatchNotice("There are no open documents to score.");
      return;
    }
    setIsBatchRunning(true);
    setBatchNotice(null);
    const results = await Promise.all(targets.map((d) => apiClient.startScan(d.id)));
    const started = results.filter(Boolean).length;
    setIsBatchRunning(false);
    setBatchNotice(
      started === targets.length
        ? `Scoring started for ${started} document${started === 1 ? "" : "s"}. Open one to follow its progress.`
        : `Scoring started for ${started} of ${targets.length} documents. The others could not be reached.`
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Edu Pro Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Edu Professional
              </span>
              <span className="text-xs text-slate-400"></span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Client & Student Board
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBatch}
              disabled={isBatchRunning}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              {isBatchRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Starting…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Score all open documents</span>
                </>
              )}
            </button>
          </div>
        </div>

        {batchNotice && (
          <div role="status" className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-elite-600 shrink-0" />
            <span>{batchNotice}</span>
          </div>
        )}

        {/* Counts taken from the documents on the board */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Open documents", value: String(openCount), note: `${documents.length} in total` },
            { label: "In review", value: String(inReview), note: "being worked on now" },
            {
              label: "Average machine-like score",
              value: avgAi === null ? "n/a" : `${avgAi}%`,
              note: avgAi === null ? "no scored documents yet" : `over ${scored.length} scored document${scored.length === 1 ? "" : "s"}`,
            },
            { label: "Being scored", value: String(waiting), note: waiting ? "results arrive in the editor" : "nothing waiting" },
          ].map((card) => (
            <div key={card.label} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{card.label}</span>
              <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{card.value}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">{card.note}</span>
            </div>
          ))}
        </div>

        {/* Kanban board */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const docsInColumn = documents.filter((d) => d.stage === col.stage);
            return (
              <div
                key={col.stage}
                className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 min-h-[460px] flex flex-col"
              >
                {/* Column Header */}
                <div className={`border-t-4 ${col.color} pt-2 flex items-center justify-between`}>
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center">
                    {docsInColumn.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1">
                  {docsInColumn.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-sm transition-all space-y-2 group cursor-pointer"
                      onClick={() => onOpenDocument(doc.id)}
                    >
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-2">
                        {doc.title}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {doc.wordCount.toLocaleString()} words • {doc.pageCount} pp.
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="font-bold text-amber-500">
                          {doc.status === "scanning" ? "Scoring…" : `${Math.round((doc.overallAiScore || 0) * 100)}% machine-like`}
                        </span>
                        {doc.similarityScore ? (
                          <span className="font-bold text-blue-600">{doc.similarityScore}% Sim</span>
                        ) : null}
                      </div>

                      {/* Move Stage Selector */}
                      <div className="pt-1.5 flex items-center justify-between gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-slate-400">Move:</span>
                        <select
                          value={doc.stage}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStage(doc.id, e.target.value as DocumentStage);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-300"
                        >
                          <option value="uploaded">Uploaded</option>
                          <option value="in_review">In Review</option>
                          <option value="returned">Returned</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  {docsInColumn.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-center p-3 text-slate-400 text-xs">
                      No documents in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
