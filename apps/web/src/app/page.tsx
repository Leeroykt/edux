"use client";

import React, { useState, useEffect } from "react";
import { DocumentMeta, UsageSummary, VoiceProfile } from "@edux/schema";
import { apiClient } from "../services/api/apiClient";
import { Navbar } from "../components/navigation/Navbar";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { RootDashboardView } from "../components/dashboard/RootDashboardView";
import { UploadDocxModal } from "../components/editor/UploadDocxModal";
import { FidelityReportModal } from "../components/editor/FidelityReportModal";

export default function RootDashboardPage() {
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [doc, usg, vp, eduDocs] = await Promise.all([
          apiClient.getDocument("doc_84719a"),
          apiClient.getUsage(),
          apiClient.getVoiceProfile(),
          apiClient.getEduProDocuments(),
        ]);
        setDocumentMeta(doc);
        setUsage(usg);
        setVoiceProfile(vp);
        setDocuments(eduDocs);
      } catch (err) {
        console.error("Dashboard data error:", err);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Global Minimalist Topbar */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onUploadClick={() => setIsUploadModalOpen(true)}
      />

      {/* 2. Main App Container with Uncollapsed Sidebar & Dashboard Content */}
      <main className="flex-1 flex overflow-hidden relative">
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          similarityScore={documentMeta?.similarityScore || 16}
          paperCount={documents.length + 1}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />

        {documentMeta && usage && voiceProfile ? (
          <RootDashboardView
            lastDocument={documentMeta}
            documents={documents}
            usage={usage}
            voiceProfile={voiceProfile}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <div className="w-4 h-4 border-2 border-elite-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading Academic Dashboard...</span>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <UploadDocxModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentLoaded={(name) => {
          console.log("Document loaded:", name);
          setIsUploadModalOpen(false);
        }}
      />

      <FidelityReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
      />
    </div>
  );
}