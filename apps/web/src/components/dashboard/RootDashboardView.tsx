"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  ShieldCheck,
  UploadCloud,
  Clock,
  ArrowRight,
  Search,
  BookOpen,
  TrendingUp,
  Award,
  ChevronRight
} from "lucide-react";
import { DocumentMeta, UsageSummary, VoiceProfile } from "@edux/schema";
import { BatchOperationsModal, BatchModalMode } from "./BatchOperationsModal";

interface RootDashboardViewProps {
  lastDocument: DocumentMeta;
  documents: DocumentMeta[];
  usage: UsageSummary;
  voiceProfile: VoiceProfile;
  onOpenUploadModal: () => void;
}

export const RootDashboardView: React.FC<RootDashboardViewProps> = ({
  lastDocument,
  documents,
  usage,
  voiceProfile,
  onOpenUploadModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "in_review" | "uploaded" | "returned">("all");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [batchModalMode, setBatchModalMode] = useState<BatchModalMode | null>(null);

  // Extended mock papers for the dashboard
  const allPapers: DocumentMeta[] = [
    lastDocument,
    ...documents,
    {
      id: "doc_105",
      ownerId: "usr_99120",
      title: "Algorithmic Fairness in Automated Grading Systems.docx",
      status: "ready",
      stage: "uploaded",
      currentVersionId: "v_1",
      ownerDeclaredOwn: true,
      wordCount: 4520,
      pageCount: 14,
      overallAiScore: 0.12,
      similarityScore: 9,
      createdAt: "2026-10-25T10:00:00Z",
      updatedAt: "2026-10-29T14:30:00Z",
    },
    {
      id: "doc_106",
      ownerId: "usr_99120",
      title: "Quantum Key Distribution Protocols in Mesh Networks.docx",
      status: "ready",
      stage: "in_review",
      currentVersionId: "v_2",
      ownerDeclaredOwn: true,
      wordCount: 6100,
      pageCount: 19,
      overallAiScore: 0.65,
      similarityScore: 21,
      createdAt: "2026-10-24T12:00:00Z",
      updatedAt: "2026-10-28T09:15:00Z",
    },
    {
      id: "doc_107",
      ownerId: "usr_99120",
      title: "Ethical Dialectics of Autonomous Machine Translation.docx",
      status: "ready",
      stage: "returned",
      currentVersionId: "v_3",
      ownerDeclaredOwn: true,
      wordCount: 3200,
      pageCount: 10,
      overallAiScore: 0.08,
      similarityScore: 5,
      createdAt: "2026-10-20T08:00:00Z",
      updatedAt: "2026-10-27T16:45:00Z",
    },
  ];

  // Filtering
  const filteredPapers = allPapers.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFilter === "all") return matchesSearch;
    return matchesSearch && doc.stage === selectedFilter;
  });

  const isAllSelected =
    filteredPapers.length > 0 && selectedDocIds.length === filteredPapers.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredPapers.map((d) => d.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedDocsObjects = allPapers.filter((d) => selectedDocIds.includes(d.id));

  return (
    <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 1. Header Banner & User Profile Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Academic Author & Integrity Workspace
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-elite-100 text-elite-700 dark:bg-elite-950 dark:text-elite-300 border border-elite-200 dark:border-elite-800">
                Scholar Pro
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Welcome back, <strong className="text-slate-800 dark:text-slate-200 font-bold">Dr. Alex Hawthorne</strong> • University of Oxford • Dept of Computer Science & Linguistics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Real Document (.docx)</span>
            </button>
          </div>
        </div>

        {/* 2. Hero Card: "Continue Editing" Last Manuscript */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-elite-900 via-indigo-900 to-slate-900 border border-elite-700/40 p-5 sm:p-6 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-elite-500/20 to-teal-400/10 blur-3xl pointer-events-none rounded-full" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-elite-200 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Continue Editing • Last Active Manuscript</span>
              </div>

              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white line-clamp-1">
                {lastDocument.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 font-serif italic line-clamp-2 bg-white/5 p-3 rounded-xl border border-white/10">
                “In the contemporary landscape of artificial intelligence, foundational models have revolutionized textual comprehension across academic domains. Our experiments confirm scholarly prose displays higher burstiness...”
              </p>

              {/* Document Key Metas */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-300 font-medium pt-1">
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <FileText className="w-3.5 h-3.5 text-elite-300" />
                  {lastDocument.wordCount.toLocaleString()} words ({lastDocument.pageCount} pages)
                </span>
                <span className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-400/30 text-rose-200 px-2.5 py-1 rounded-lg font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  14 AI Flagged
                </span>
                <span className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-200 px-2.5 py-1 rounded-lg font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {lastDocument.similarityScore}% Similarity
                </span>
                <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Clock className="w-3 h-3" /> Modified 12m ago
                </span>
              </div>
            </div>

            {/* Big Action Button linking to /edit */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0">
              <Link
                href="/edit"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-elite-500 to-indigo-500 hover:from-elite-400 hover:to-indigo-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-elite-600/30 active:scale-95 transition-all text-center"
              >
                <span>Resume in Word Canvas</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href="/report"
                  className="flex-1 text-center py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  Similarity Report
                </Link>
                <Link
                  href="/plans"
                  className="flex-1 text-center py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  Plan Limits
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Executive KPI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Managed Papers</span>
              <BookOpen className="w-4 h-4 text-elite-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {allPapers.length} Manuscripts
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +3 added this week
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Avg AI Likelihood</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              14.2% <span className="text-xs font-normal text-slate-500">Safe</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Below 20% academic threshold
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Turnitin Similarity</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              12.8% <span className="text-xs font-normal text-slate-500">Avg</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Strict citation separation
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Monthly Quota Meter</span>
              <Award className="w-4 h-4 text-elite-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {usage.wordsScoredToday.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ 30k</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-elite-600 rounded-full"
                style={{
                  width: `${Math.round((usage.wordsScoredToday / usage.dailyWordCap) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 4. "Manage Your Documents" Main Data Workspace */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
          {/* Controls Bar: Search & Stage Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search manuscripts by title, keyword, or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-elite-500"
                />
              </div>
            </div>

            {/* Stage Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto">
              {(
                [
                  { id: "all", label: "All Papers" },
                  { id: "uploaded", label: "Uploaded" },
                  { id: "in_review", label: "In Review" },
                  { id: "returned", label: "Returned" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    selectedFilter === tab.id
                      ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 pl-6 pr-3 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded accent-elite-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Document Title</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">AI Detection</th>
                  <th className="py-3.5 px-3">Similarity</th>
                  <th className="py-3.5 px-3">Words</th>
                  <th className="py-3.5 px-3">Last Modified</th>
                  <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredPapers.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  const aiPercent = Math.round((doc.overallAiScore || 0) * 100);
                  const isHighAi = aiPercent > 40;

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isChecked ? "bg-elite-50/30 dark:bg-elite-950/20" : ""
                      }`}
                    >
                      <td className="py-3.5 pl-6 pr-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(doc.id)}
                          className="rounded accent-elite-600 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <Link
                              href="/edit"
                              className="font-bold text-slate-900 dark:text-white hover:text-elite-600 dark:hover:text-elite-400 transition-colors line-clamp-1"
                            >
                              {doc.title}
                            </Link>
                            <span className="text-[10px] text-slate-400 font-mono">
                              DOCX • Lossless OOXML
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            doc.stage === "uploaded"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : doc.stage === "in_review"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {doc.stage?.replace("_", " ") || "uploaded"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${
                            isHighAi
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {aiPercent}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {doc.similarityScore || 0}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {doc.wordCount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 pr-6 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href="/edit"
                            className="px-2.5 py-1 rounded-lg bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 hover:bg-elite-600 hover:text-white font-bold text-xs transition-all"
                            title="Open in Word Canvas"
                          >
                            Edit
                          </Link>
                          <Link
                            href="/report"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white font-bold text-xs transition-all"
                            title="View Similarity Report"
                          >
                            Report
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Standalone Batch Operations Modal */}
      {batchModalMode && (
        <BatchOperationsModal
          isOpen={batchModalMode !== null}
          mode={batchModalMode}
          onClose={() => setBatchModalMode(null)}
          selectedDocs={selectedDocsObjects}
          allDocs={allPapers}
          onBatchProcessed={() => {
            console.log("Batch processed successfully");
          }}
        />
      )}
    </div>
  );
};