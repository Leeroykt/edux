"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentMeta, SimilarityReport } from "@edux/schema";
import { apiClient } from "../../../services/api/apiClient";
import { SimilarityReportView } from "../../../components/report/SimilarityReportView";

export default function ReportPage() {
  const router = useRouter();
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);

  useEffect(() => {
    Promise.all([apiClient.getDocument("doc_84719a"), apiClient.getSimilarityReport("doc_84719a")])
      .then(([doc, rep]) => {
        setDocumentMeta(doc);
        setSimilarityReport(rep);
      })
      .catch((err) => console.error("Report fetch error:", err));
  }, []);

  return (
    <>
      <div
        role="note"
        className="px-6 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 text-xs font-semibold text-amber-800 dark:text-amber-300"
      >
        Sample report. Source matching is not connected yet, so these percentages and sources are illustrative and do not
        describe your document.
      </div>
      {similarityReport ? (
        <SimilarityReportView
          report={similarityReport}
          documentTitle={documentMeta?.title || "Sample document"}
          onJumpToEditorSentence={() => router.push("/edit")}
        />
      ) : (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium gap-2">
          <div className="w-4 h-4 border-2 border-elite-600 border-t-transparent rounded-full animate-spin" />
          Loading report…
        </div>
      )}
    </>
  );
}
