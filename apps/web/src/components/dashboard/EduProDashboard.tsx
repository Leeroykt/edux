import React, { useState } from "react";
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
  const [activeFolder, setActiveFolder] = useState("Undergraduate Theses 2026");
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchSuccessNotice, setBatchSuccessNotice] = useState(false);

  const columns: { stage: DocumentStage; label: string; color: string }[] = [
    { stage: "uploaded", label: "Uploaded / Queued", color: "border-slate-300 dark:border-slate-700" },
    { stage: "in_review", label: "In Review / Editing", color: "border-indigo-500" },
    { stage: "returned", label: "Returned to Client", color: "border-teal-500" },
    { stage: "closed", label: "Approved & Closed", color: "border-emerald-500" },
  ];

  const handleRunBatch = () => {
    setIsBatchRunning(true);
    setTimeout(() => {
      setIsBatchRunning(false);
      setBatchSuccessNotice(true);
      setTimeout(() => setBatchSuccessNotice(false), 3000);
    }, 1200);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Edu Pro Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Edu Professional Workspace (M14)
              </span>
              <span className="text-xs text-slate-400">• Multi-Document & Cohort Management</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Client & Student Workflow Board
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
                  <span>Batch Scoring Folder...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Batch Scoring (M14.7)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Batch Success Banner */}
        {batchSuccessNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Batch check completed: 4 documents evaluated for AI likelihood and similarity indexing.</span>
            </div>
          </div>
        )}

        {/* Throughput & Quality Snapshot Analytics (M14.5, M14.6) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg Turnaround
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              3.8 hrs
            </div>
            <span className="text-[11px] text-emerald-600 flex items-center gap-0.5 mt-1">
              <Clock className="w-3 h-3" /> Under 24h SLA target
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg AI Score Drop
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              -42%
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Across all accepted rewrites
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Rewrite Acceptance Rate
            </span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              88.4%
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              High stylistic match
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Client Folders
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              6 Folders
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Up to 40 active documents
            </span>
          </div>
        </div>

        {/* Folder Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Folder className="w-3.5 h-3.5" /> Folder:
          </span>
          {["Undergraduate Theses 2026", "Medical Ethics Cohort", "Journal Submissions (Spring)"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeFolder === f
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
          <button className="px-2 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-indigo-600 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> New Folder
          </button>
        </div>

        {/* 4-Column Kanban Document Board (M14.3) */}
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
                          {Math.round((doc.overallAiScore || 0) * 100)}% AI
                        </span>
                        <span className="font-bold text-blue-600">
                          {doc.similarityScore || 0}% Sim
                        </span>
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
