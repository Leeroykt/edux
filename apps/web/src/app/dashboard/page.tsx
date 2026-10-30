"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentMeta, UsageSummary, VoiceProfile } from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import { RootDashboardView } from "../../components/dashboard/RootDashboardView";
import { UploadDocxModal } from "../../components/editor/UploadDocxModal";
import { FidelityReportModal } from "../../components/editor/FidelityReportModal";
import { MOCK_DOCUMENT, MOCK_USAGE, MOCK_VOICE_PROFILE } from "../../services/api/mockData";

export default function DashboardPage() {
  const router = useRouter();
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta>(MOCK_DOCUMENT);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [usage, setUsage] = useState<UsageSummary>(MOCK_USAGE);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>(MOCK_VOICE_PROFILE);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Load initial data safely
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

        const combinedDocs = [
          ...(dbDocs || []),
          ...(eduDocs || []).filter((ed) => !(dbDocs || []).some((d) => d.id === ed.id)),
        ];

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
              if (usg) setUsage(usg);
              if (vp) setVoiceProfile(vp);
              setDocuments([parsed.meta, ...combinedDocs]);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error("Error reading cached doc on dashboard:", e);
          }
        }

        if (doc) setDocumentMeta(doc);
        if (usg) setUsage(usg);
        if (vp) setVoiceProfile(vp);
        setDocuments(combinedDocs);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-900 text-slate-100 transition-colors">
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

        <div className="flex-1 overflow-y-auto">
          <RootDashboardView
            lastDocument={documentMeta}
            documents={documents}
            usage={usage}
            voiceProfile={voiceProfile}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
          />
        </div>
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
