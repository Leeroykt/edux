"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentMeta, DocumentStage } from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import { EduProDashboard } from "../../components/dashboard/EduProDashboard";
import { useTheme } from "../../services/theme/themeContext";

export default function EduProPage() {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    async function loadDocs() {
      try {
        const docs = await apiClient.getEduProDocuments();
        setDocuments(docs);
      } catch (err) {
        console.error("EduPro fetch error:", err);
      }
    }
    loadDocs();
  }, []);

  const handleUpdateStage = (docId: string, stage: DocumentStage) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, stage } : d))
    );
    apiClient.updateDocumentStage(docId, stage);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleTheme}
      />

      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <div className="flex-1 overflow-y-auto">
          <EduProDashboard
            documents={documents}
            onOpenDocument={() => router.push("/edit")}
            onUpdateStage={handleUpdateStage}
          />
        </div>
      </main>
    </div>
  );
}