"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentMeta, UsageSummary, VoiceProfile, User } from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import { RootDashboardView } from "../../components/dashboard/RootDashboardView";
import { UploadDocxModal } from "../../components/editor/UploadDocxModal";
import { AuthModal } from "../../components/navigation/AuthModal";
import { FidelityReportModal } from "../../components/editor/FidelityReportModal";
import { Lock, LogIn, Sparkles, GraduationCap } from "lucide-react";
import { MOCK_DOCUMENT, MOCK_USAGE, MOCK_VOICE_PROFILE } from "../../services/api/mockData";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [usage, setUsage] = useState<UsageSummary>(MOCK_USAGE);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>(MOCK_VOICE_PROFILE);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
        const user = apiClient.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        } else if (apiClient.getToken()) {
          const meData = await apiClient.getMe();
          if (meData?.user) setCurrentUser(meData.user);
        }

        const [usg, vp, dbDocs] = await Promise.all([
          apiClient.getUsage(),
          apiClient.getVoiceProfile(),
          apiClient.getDocuments(),
        ]);

        if (usg) setUsage(usg);
        if (vp) setVoiceProfile(vp);

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
              const userDocs = [parsed.meta, ...(dbDocs || []).filter((d) => d.id !== parsed.meta.id)];
              setDocuments(userDocs);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error("Error reading cached doc on dashboard:", e);
          }
        }

        setDocuments(dbDocs || []);
        if (dbDocs && dbDocs.length > 0) {
          setDocumentMeta(dbDocs[0]);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setIsLoading(false);
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

      {/* 2. Main App Container */}
      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          similarityScore={documentMeta?.similarityScore || 0}
          paperCount={documents.length}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center p-8 text-slate-400">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="w-5 h-5 border-2 border-elite-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading your research workspace...</span>
              </div>
            </div>
          ) : !currentUser ? (
            /* Guest Gate */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-elite-600/10 text-elite-600 dark:text-elite-400 flex items-center justify-center shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Researcher Sign-In Required
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Guest visitors can humanize samples directly on the home page. Sign in or register to manage your personal manuscripts, access lossless Word editing, and view similarity reports.
              </p>
              <div className="flex items-center gap-3 pt-2 w-full">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold transition-all shadow-md shadow-elite-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="py-3 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <RootDashboardView
              lastDocument={documentMeta || {
                id: "doc_empty",
                ownerId: currentUser.id,
                title: "No Document Uploaded Yet",
                status: "ready",
                stage: "uploaded",
                currentVersionId: "v_0",
                ownerDeclaredOwn: true,
                wordCount: 0,
                pageCount: 1,
                overallAiScore: 0,
                similarityScore: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }}
              documents={documents}
              usage={usage}
              voiceProfile={voiceProfile}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <UploadDocxModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentLoaded={(doc, paragraphs) => {
          setIsUploadModalOpen(false);
          setDocumentMeta(doc);
          setDocuments((prev) => [doc, ...prev]);
          router.push("/edit");
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          setCurrentUser(u);
          setIsAuthModalOpen(false);
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
