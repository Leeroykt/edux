"use client";

import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UploadCloud,
  X,
  Search,
  ArrowRight,
  FolderOpen
} from "lucide-react";
import { DocumentMeta, DocumentParagraphNode } from "@edux/schema";

interface DocumentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentMeta[];
  currentDocId?: string;
  onSelectDocument: (doc: DocumentMeta) => void;
  onOpenUploadModal: () => void;
}

export const DocumentPickerModal: React.FC<DocumentPickerModalProps> = ({
  isOpen,
  onClose,
  documents,
  currentDocId,
  onSelectDocument,
  onOpenUploadModal,
}) => {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 flex items-center justify-center shadow-xs">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Select Document to Edit
              </h3>
              <p className="text-xs text-slate-500">
                Choose a manuscript from your library or upload a new one
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenUploadModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload New</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-elite-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs font-medium">No matching manuscripts found</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = doc.id === currentDocId;
              const aiPercent = Math.round((doc.overallAiScore || 0) * 100);

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDocument(doc);
                    onClose();
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                    isSelected
                      ? "border-elite-500 bg-elite-50/40 dark:bg-elite-950/30 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-elite-300 dark:hover:border-elite-800 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-elite-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-elite-100 dark:group-hover:bg-elite-950 group-hover:text-elite-600"
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {doc.title}
                        </h4>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-elite-600 text-white shrink-0">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-400">
                        <span>{(doc.wordCount || 0).toLocaleString()} words</span>
                        <span>•</span>
                        <span>{doc.pageCount || 1} pages</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-rose-500 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          {aiPercent}% AI
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-blue-500 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          {doc.similarityScore || 0}% Sim
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 group-hover:bg-elite-600 group-hover:text-white"
                      }`}
                    >
                      <span>{isSelected ? "Editing" : "Open"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredDocs.length} documents in library</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
