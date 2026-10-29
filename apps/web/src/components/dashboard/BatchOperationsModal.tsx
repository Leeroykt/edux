"use client";

import React, { useState } from "react";
import {
  X,
  UploadCloud,
  Sparkles,
  ShieldCheck,
  Download,
  FileText,
  CheckCircle2,
  FolderArchive,
  FileSpreadsheet,
  FileCheck2,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { DocumentMeta } from "@edux/schema";

export type BatchModalMode =
  | "upload"
  | "detect_ai"
  | "check_similarity"
  | "export_fixed"
  | "export_results"
  | "export_reports"
  | "import_batch";

interface BatchOperationsModalProps {
  isOpen: boolean;
  mode: BatchModalMode;
  onClose: () => void;
  selectedDocs: DocumentMeta[];
  allDocs: DocumentMeta[];
  onBatchProcessed?: () => void;
}

export const BatchOperationsModal: React.FC<BatchOperationsModalProps> = ({
  isOpen,
  mode,
  onClose,
  selectedDocs,
  allDocs,
  onBatchProcessed,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const targetDocs = selectedDocs.length > 0 ? selectedDocs : allDocs.slice(0, 4);

  const handleStartProcess = () => {
    setIsProcessing(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          setCompleted(true);
          onBatchProcessed?.();
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleDownloadCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Title,Status,Word Count,Page Count,AI Score (%),Similarity (%),Last Modified"]
        .concat(
          targetDocs.map(
            (d) =>
              `"${d.title}","${d.status}",${d.wordCount},${d.pageCount},${Math.round(
                (d.overallAiScore || 0) * 100
              )}%,${d.similarityScore || 0}%,"${new Date(d.updatedAt).toLocaleDateString()}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eduX_Audit_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  const handleDownloadFixedDocs = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCompleted(true);
      // Simulate download
      const link = document.createElement("a");
      link.setAttribute(
        "href",
        "data:application/zip;base64,UEsDBBQAAAAIAAAAIQAAAAAAAAAAAAAAAA=="
      );
      link.setAttribute("download", `eduX_Humanised_Fixed_Docs_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1200);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const names = Array.from(e.dataTransfer.files).map((f) => f.name);
      setUploadedFiles((prev) => [...prev, ...names]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map((f) => f.name);
      setUploadedFiles((prev) => [...prev, ...names]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400">
              {mode === "upload" || mode === "import_batch" ? (
                <UploadCloud className="w-5 h-5" />
              ) : mode === "detect_ai" ? (
                <Sparkles className="w-5 h-5" />
              ) : mode === "check_similarity" ? (
                <ShieldCheck className="w-5 h-5" />
              ) : mode === "export_results" ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {mode === "upload" && "Batch Document Upload"}
                {mode === "import_batch" && "Import Workspace Batch (.zip / .docx)"}
                {mode === "detect_ai" && `Run Batch AI Detection (${targetDocs.length} Papers)`}
                {mode === "check_similarity" && `Batch Similarity Check (${targetDocs.length} Papers)`}
                {mode === "export_fixed" && `Export Fixed Clean .docx (${targetDocs.length} Papers)`}
                {mode === "export_results" && "Export Audit Results Spreadsheet (CSV)"}
                {mode === "export_reports" && "Export Institutional PDF Certificates"}
              </h3>
              <p className="text-xs text-slate-500">
                Lossless OOXML academic pipeline with batch worker processing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* 1. UPLOAD & IMPORT BATCH */}
          {(mode === "upload" || mode === "import_batch") && (
            <div className="space-y-4">
              <input
                type="file"
                multiple
                id="batch-file-input"
                onChange={handleFileInput}
                accept=".docx,.pdf,.zip"
                className="hidden"
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("batch-file-input")?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-elite-500 bg-elite-50/50 dark:bg-elite-950/50"
                    : "border-slate-300 dark:border-slate-700 hover:border-elite-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-elite-100 dark:bg-elite-950 text-elite-600 dark:text-elite-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Click to select multiple documents or drop folder / zip
                </div>
                <div className="text-xs text-slate-500">
                  Accepts .docx (native lossless), .pdf (pre-scanned), or .zip archives
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Files Queued for Batch Ingestion ({uploadedFiles.length}):
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    {uploadedFiles.map((name, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-elite-600 shrink-0" />
                          <span className="truncate">{name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Ready
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. BATCH DETECTION / SIMILARITY */}
          {(mode === "detect_ai" || mode === "check_similarity") && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                You are about to run parallel integrity analysis across{" "}
                <strong className="text-slate-900 dark:text-white font-bold">
                  {targetDocs.length} manuscripts
                </strong>
                .
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {targetDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-elite-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {doc.wordCount.toLocaleString()} words • {doc.pageCount} pages
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isProcessing ? (
                        <span className="text-[11px] font-mono text-elite-600 dark:text-elite-400 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Scanning...
                        </span>
                      ) : completed ? (
                        <span className="text-[11px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Scanned
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Queued</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span>Batch Worker Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-elite-600 to-teal-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {completed && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Batch analysis completed successfully! All confidence intervals and Turnitin indexes updated.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. EXPORT RESULTS (CSV) */}
          {mode === "export_results" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Academic Integrity Spreadsheet (.CSV)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Structured export with AI percentage, Turnitin similarity score, burstiness, and word counts.
                    </p>
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-500 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  Includes: Document Title, Status, Word Count, AI Likelihood %, Similarity %, Last Modified.
                </div>
              </div>
            </div>
          )}

          {/* 4. EXPORT FIXED DOCS */}
          {mode === "export_fixed" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <FolderArchive className="w-8 h-8 text-elite-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Batch Clean Word Documents (.ZIP)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Lossless OOXML files with humanised sentences applied, all comments, formulas, and citations 100% preserved.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Target: {targetDocs.length} clean documents packaged into a single zip archive.
                </div>
              </div>
            </div>
          )}

          {/* 5. EXPORT REPORTS (PDF) */}
          {mode === "export_reports" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="w-8 h-8 text-indigo-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Audit-Ready Academic Certificates
                    </h4>
                    <p className="text-xs text-slate-500">
                      Formal university submission certificates with SHA-256 digital fingerprint and similarity breakdown.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {completed ? "Done" : "Cancel"}
          </button>

          <div>
            {(mode === "upload" || mode === "import_batch") && (
              <button
                onClick={() => {
                  setIsProcessing(true);
                  setTimeout(() => {
                    setIsProcessing(false);
                    setCompleted(true);
                    onBatchProcessed?.();
                    onClose();
                  }, 800);
                }}
                disabled={uploadedFiles.length === 0}
                className="px-5 py-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 disabled:opacity-40 transition-all"
              >
                Ingest {uploadedFiles.length} Document(s)
              </button>
            )}

            {(mode === "detect_ai" || mode === "check_similarity") && (
              <button
                onClick={handleStartProcess}
                disabled={isProcessing || completed}
                className="px-5 py-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : completed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finished</span>
                  </>
                ) : (
                  <span>Start Batch Analysis</span>
                )}
              </button>
            )}

            {mode === "export_results" && (
              <button
                onClick={handleDownloadCSV}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV Spreadsheet
              </button>
            )}

            {mode === "export_fixed" && (
              <button
                onClick={handleDownloadFixedDocs}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Clean ZIP
              </button>
            )}

            {mode === "export_reports" && (
              <button
                onClick={() => {
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Generate PDF Certificates
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};