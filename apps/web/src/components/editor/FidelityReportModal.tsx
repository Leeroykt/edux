import React, { useEffect, useMemo, useState } from "react";
import { X, Download, CheckCircle2, ListChecks, FileCheck, FileCode, Check, AlertCircle } from "lucide-react";
import { DocumentParagraphNode } from "@edux/schema";
import { downloadDocxFile, summariseExport } from "../../services/docx/docxExport";
import { EquationMap } from "../../lib/equations";
import { getSourceFile } from "../../services/storage/documentStore";

interface FidelityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  paragraphs?: DocumentParagraphNode[];
  equations?: EquationMap;
  /** Used to find the original Word file, when the document was uploaded from one. */
  documentId?: string;
  onExported?: () => void;
}

export const FidelityReportModal: React.FC<FidelityReportModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  paragraphs = [],
  equations = {},
  documentId,
  onExported,
}) => {
  const [exportMode, setExportMode] = useState<"clean" | "tracked">("clean");
  const [source, setSource] = useState<ArrayBuffer | null>(null);
  useEffect(() => {
    if (!isOpen || !documentId) return;
    let live = true;
    getSourceFile(documentId).then((s) => live && setSource(s));
    return () => {
      live = false;
    };
  }, [isOpen, documentId]);
  const fromWord = !!source && paragraphs.some((p) => p.docx);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => summariseExport(paragraphs), [paragraphs]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await downloadDocxFile(documentTitle, paragraphs, { exportMode, equations, source: fromWord ? source : null });
      onExported?.();
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Export .docx error:", err);
      setIsExporting(false);
      setError("The Word file could not be created. Please try again.");
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Export Word document" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Export Word Document (.docx)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Built from your document as it stands in the editor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Mode Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Select Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setExportMode("clean")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  exportMode === "clean"
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-600" /> Clean Output
                  </div>
                  {exportMode === "clean" && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Your document with every accepted rewrite applied.
                </p>
              </div>

              <div
                onClick={() => setExportMode("tracked")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  exportMode === "tracked"
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-indigo-600" /> Tracked changes
                  </div>
                  {exportMode === "tracked" && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Each rewritten sentence becomes a Word revision (deleted original, inserted rewrite) you can accept or reject in Word.
                </p>
              </div>
            </div>
          </div>

          {/* What the file will contain, counted from the document */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-elite-600" />
                What this file will contain
              </span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
              <div className="flex justify-between"><span>Headings</span><span className="font-mono">{summary.headings}</span></div>
              <div className="flex justify-between"><span>Paragraphs</span><span className="font-mono">{summary.paragraphs}</span></div>
              <div className="flex justify-between"><span>List items</span><span className="font-mono">{summary.listItems}</span></div>
              <div className="flex justify-between"><span>Tables</span><span className="font-mono">{summary.tables}</span></div>
              <div className="flex justify-between"><span>Images</span><span className="font-mono">{summary.imagesIncluded}</span></div>
              <div className="flex justify-between"><span>Equations</span><span className="font-mono">{summary.equations}</span></div>
              <div className="flex justify-between">
                <span>Sentences you rewrote</span>
                <span className="font-mono">{summary.editedSentences}</span>
              </div>
            </div>
            {summary.imagesSkipped > 0 && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{summary.imagesSkipped} image{summary.imagesSkipped === 1 ? "" : "s"} could not be read and will be left out.</span>
              </div>
            )}
            {exportMode === "tracked" && summary.editedSentences === 0 && (
              <div className="flex items-start gap-1.5 text-[11px] text-slate-500 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>You have not rewritten any sentences yet, so there are no tracked changes to show.</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              {fromWord
                ? "This is your original Word file with only your changes written in. Everything you did not edit (layout, styles, fonts, headers, footers, footnotes, pictures and equations) is kept exactly as it was."
                : "The file is rebuilt from the text, headings, lists, tables, images and basic formatting shown in the editor. Word equations are kept as real Word equations. Headers, footers and footnotes are not carried over, so check the file before you submit it."}
            </p>
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting || exportComplete}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-70"
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating {exportMode === "clean" ? "Clean" : "Tracked"} .docx...</span>
              </>
            ) : exportComplete ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Downloaded Successfully!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download .docx File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
