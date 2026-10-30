"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentMeta, UsageSummary, VoiceProfile } from "@edux/schema";
import { apiClient } from "../services/api/apiClient";
import { Navbar } from "../components/navigation/Navbar";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { RootDashboardView } from "../components/dashboard/RootDashboardView";
import { UploadDocxModal } from "../components/editor/UploadDocxModal";
import { FidelityReportModal } from "../components/editor/FidelityReportModal";

export default function RootDashboardPage() {
  const router = useRouter();
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
        const [doc, usg, vp, dbDocs, eduDocs] = await Promise.all([
          apiClient.getDocument("doc_84719a"),
          apiClient.getUsage(),
          apiClient.getVoiceProfile(),
          apiClient.getDocuments(),
          apiClient.getEduProDocuments(),
        ]);

        const combinedDocs = [...dbDocs, ...eduDocs.filter((ed) => !dbDocs.some((d) => d.id === ed.id))];

        // Check if user uploaded a document in this session
        const cached =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("active_document")
            : null;

        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.meta) {
              setDocumentMeta(parsed.meta);
              setUsage(usg);
              setVoiceProfile(vp);
              setDocuments([parsed.meta, ...combinedDocs]);
              return;
            }
          } catch (e) {
            console.error("Error reading cached doc on dashboard:", e);
          }
        }

        setDocumentMeta(doc);
        setUsage(usg);
        setVoiceProfile(vp);
        setDocuments(combinedDocs);
      } catch (err) {
        console.error("Dashboard data error:", err);
      }
    }
    loadData();
  }, []);

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Global Minimalist Topbar */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onUploadClick={() => setIsUploadModalOpen(true)}
      />

      {/* 2. Main App Container with Stationary Uncollapsed Sidebar & Independent Scroll Dashboard */}
      <main className="flex-1 min-h-0 flex overflow-hidden relative">
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
        onDocumentLoaded={(doc, paragraphs) => {
          setIsUploadModalOpen(false);
          router.push("/edit");
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