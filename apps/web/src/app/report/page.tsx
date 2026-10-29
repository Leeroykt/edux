"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentMeta, SimilarityReport } from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import { SimilarityReportView } from "../../components/report/SimilarityReportView";

export default function ReportPage() {
  const router = useRouter();
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    async function loadReport() {
      try {
        const [doc, rep] = await Promise.all([
          apiClient.getDocument("doc_84719a"),
          apiClient.getSimilarityReport("doc_84719a"),
        ]);
        setDocumentMeta(doc);
        setSimilarityReport(rep);
      } catch (err) {
        console.error("Report fetch error:", err);
      }
    }
    loadReport();
  }, []);

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          similarityScore={documentMeta?.similarityScore || 16}
        />

        <div className="flex-1 overflow-y-auto">
          {similarityReport ? (
            <SimilarityReportView
              report={similarityReport}
              documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
              onJumpToEditorSentence={() => {
                router.push("/edit");
              }}
            />
          ) : (
            <div className="flex-1 h-full flex items-center justify-center text-slate-400">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading Similarity Report...</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}