"use client";

import React, { useState, useEffect } from "react";
import {
  DocumentMeta,
  DocumentParagraphNode,
  DocumentSentence,
  SimilarityReport,
  UsageSummary,
  VoiceProfile,
  SuggestionCandidate,
  PlanType,
  DocumentStage
} from "@edux/schema";
import { apiClient } from "../services/api/apiClient";
import { MOCK_SUGGESTIONS } from "../services/api/mockData";
import { Navbar, NavTab } from "../components/navigation/Navbar";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { DocumentEditor, InsertedElement } from "../components/editor/DocumentEditor";
import { InspectorPanel } from "../components/editor/InspectorPanel";
import { LatexEquationModal } from "../components/editor/LatexEquationModal";
import { FidelityReportModal } from "../components/editor/FidelityReportModal";
import { UploadDocxModal } from "../components/editor/UploadDocxModal";
import { InsertImageModal } from "../components/editor/InsertImageModal";
import { InsertTableModal } from "../components/editor/InsertTableModal";
import { SimilarityReportView } from "../components/report/SimilarityReportView";
import { IndividualDashboard } from "../components/dashboard/IndividualDashboard";
import { EduProDashboard } from "../components/dashboard/EduProDashboard";
import { PricingModal } from "../components/pricing/PricingModal";

interface HistoryItem {
  sentenceId: string;
  text: string;
  score?: any;
}

export default function EduxApplication() {
  const [currentTab, setCurrentTab] = useState<NavTab>("editor");
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [paragraphs, setParagraphs] = useState<DocumentParagraphNode[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<DocumentSentence | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionCandidate[]>([]);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, SuggestionCandidate[]>>(MOCK_SUGGESTIONS);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [eduProDocuments, setEduProDocuments] = useState<DocumentMeta[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanType>("individual");

  // Dark Mode & Paper Canvas Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [paperTheme, setPaperTheme] = useState<"white" | "dark">("white");
  const [fontFamily, setFontFamily] = useState<string>("Times New Roman");
  const [fontSize, setFontSize] = useState<string>("3");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Humaniser Flow & Modes
  const [isHumanisedScanned, setIsHumanisedScanned] = useState<boolean>(true);
  const [isHumanising, setIsHumanising] = useState<boolean>(false);
  const [humaniseViewMode, setHumaniseViewMode] = useState<"original_flags" | "humanised_preview" | "split" | "clean">("original_flags");
  const [aiThreshold, setAiThreshold] = useState<number>(0.45);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Inserted Elements (Images & Tables)
  const [insertedElements, setInsertedElements] = useState<InsertedElement[]>([
    {
      id: "elem_img_1",
      type: "image",
      afterParagraphIndex: 1,
      data: {
        url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
        caption: "Figure 1: Benchmark comparative performance across sequence lengths.",
        align: "center",
        widthPercent: 75,
      },
    },
    {
      id: "elem_table_1",
      type: "table",
      afterParagraphIndex: 2,
      data: { rows: 3, cols: 3 },
    },
  ]);

  // Modals
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isInsertImageModalOpen, setIsInsertImageModalOpen] = useState(false);
  const [isInsertTableModalOpen, setIsInsertTableModalOpen] = useState(false);

  // Undo & Redo History
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Apply dark mode to document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const [doc, struct, rep, usg, vp, eduDocs] = await Promise.all([
          apiClient.getDocument("doc_84719a"),
          apiClient.getDocumentStructure("doc_84719a"),
          apiClient.getSimilarityReport("doc_84719a"),
          apiClient.getUsage(),
          apiClient.getVoiceProfile(),
          apiClient.getEduProDocuments(),
        ]);

        setDocumentMeta(doc);
        setParagraphs(struct);
        setSimilarityReport(rep);
        setUsage(usg);
        setVoiceProfile(vp);
        setEduProDocuments(eduDocs);

        if (struct[1]?.sentences[0]) {
          handleSelectSentence(struct[1].sentences[0]);
        }
      } catch (err) {
        console.error("Initial load error:", err);
      }
    }
    init();
  }, []);

  // Handle sentence selection
  const handleSelectSentence = async (sentence: DocumentSentence) => {
    setSelectedSentence(sentence);
    setIsLoadingSuggestions(true);
    try {
      const candidates = await apiClient.getSentenceSuggestions(sentence.id);
      setSuggestions(candidates);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Humanise Document Scan Simulation
  const handleTriggerHumanise = async () => {
    setIsHumanising(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setIsHumanisedScanned(true);
      setHumaniseViewMode("original_flags");
    } finally {
      setIsHumanising(false);
    }
  };

  // Formatting execCommand
  const handleExecCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  // Apply Single Rewrite
  const handleApplyRewrite = (candidate: SuggestionCandidate) => {
    if (!selectedSentence) return;

    setUndoStack((prev) => [
      {
        sentenceId: selectedSentence.id,
        text: selectedSentence.text,
        score: selectedSentence.score,
      },
      ...prev,
    ]);
    setRedoStack([]);

    const updatedText = candidate.text;
    const updatedScore = {
      sentenceId: selectedSentence.id,
      score: 0.08,
      band: "likely_human" as const,
      confidence: 0.96,
      reasons: [],
      modelDetails: {
        perplexityScore: 185.4,
        burstinessScore: 0.94,
      },
    };

    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) =>
          s.id === selectedSentence.id
            ? { ...s, text: updatedText, score: updatedScore }
            : s
        ),
      }))
    );

    setSelectedSentence((prev) =>
      prev ? { ...prev, text: updatedText, score: updatedScore } : null
    );

    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 600);
  };

  // Apply All Rewrites
  const handleApplyAllRewrites = () => {
    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          if (s.score && s.score.score >= aiThreshold && !s.locked) {
            const topCandidate = suggestionsMap[s.id]?.[0];
            if (topCandidate) {
              return {
                ...s,
                text: topCandidate.text,
                score: {
                  sentenceId: s.id,
                  score: 0.09,
                  band: "likely_human" as const,
                  confidence: 0.95,
                  reasons: [],
                  modelDetails: {
                    perplexityScore: 178.2,
                    burstinessScore: 0.91,
                  },
                },
              };
            }
          }
          return s;
        }),
      }))
    );

    setHumaniseViewMode("clean");
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 700);
  };

  // Handle Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [actionToUndo, ...remainingUndo] = undoStack;

    const currentSentence = paragraphs
      .flatMap((p) => p.sentences)
      .find((s) => s.id === actionToUndo.sentenceId);

    if (currentSentence) {
      setRedoStack((prev) => [
        {
          sentenceId: currentSentence.id,
          text: currentSentence.text,
          score: currentSentence.score,
        },
        ...prev,
      ]);
    }

    setUndoStack(remainingUndo);

    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          if (s.id === actionToUndo.sentenceId) {
            return {
              ...s,
              text: actionToUndo.text,
              score: actionToUndo.score,
            };
          }
          return s;
        }),
      }))
    );

    if (selectedSentence?.id === actionToUndo.sentenceId) {
      setSelectedSentence((prev) =>
        prev
          ? {
              ...prev,
              text: actionToUndo.text,
              score: actionToUndo.score,
            }
          : null
      );
    }
  };

  // Handle Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [actionToRedo, ...remainingRedo] = redoStack;

    const currentSentence = paragraphs
      .flatMap((p) => p.sentences)
      .find((s) => s.id === actionToRedo.sentenceId);

    if (currentSentence) {
      setUndoStack((prev) => [
        {
          sentenceId: currentSentence.id,
          text: currentSentence.text,
          score: currentSentence.score,
        },
        ...prev,
      ]);
    }

    setRedoStack(remainingRedo);

    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          if (s.id === actionToRedo.sentenceId) {
            return {
              ...s,
              text: actionToRedo.text,
              score: actionToRedo.score,
            };
          }
          return s;
        }),
      }))
    );

    if (selectedSentence?.id === actionToRedo.sentenceId) {
      setSelectedSentence((prev) =>
        prev
          ? {
              ...prev,
              text: actionToRedo.text,
              score: actionToRedo.score,
            }
          : null
      );
    }
  };

  // Insert Image handler (local upload or preset with default styling)
  const handleInsertImage = (imageUrl: string, caption?: string) => {
    setInsertedElements((prev) => [
      ...prev,
      {
        id: `img_${Date.now()}`,
        type: "image",
        afterParagraphIndex: 1,
        data: {
          url: imageUrl,
          caption: caption || "Figure: Uploaded image illustration",
          align: "center",
          widthPercent: 75,
        },
      },
    ]);
  };

  // Move Element Up (swaps position with previous paragraph)
  const handleMoveElementUp = (id: string) => {
    setInsertedElements((prev) =>
      prev.map((el) => {
        if (el.id === id && el.afterParagraphIndex > 0) {
          return { ...el, afterParagraphIndex: el.afterParagraphIndex - 1 };
        }
        return el;
      })
    );
  };

  // Move Element Down (swaps position with next paragraph)
  const handleMoveElementDown = (id: string) => {
    setInsertedElements((prev) =>
      prev.map((el) => {
        if (el.id === id && el.afterParagraphIndex < paragraphs.length - 1) {
          return { ...el, afterParagraphIndex: el.afterParagraphIndex + 1 };
        }
        return el;
      })
    );
  };

  // Update Element data (for crop, caption, align, width)
  const handleUpdateElement = (id: string, partialData: any) => {
    setInsertedElements((prev) =>
      prev.map((el) => {
        if (el.id === id) {
          return {
            ...el,
            data: {
              ...el.data,
              ...partialData,
            },
          };
        }
        return el;
      })
    );
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    setInsertedElements((prev) => prev.filter((el) => el.id !== id));
  };

  // Insert Table handler
  const handleInsertTable = (rows: number, cols: number) => {
    setInsertedElements((prev) => [
      ...prev,
      {
        id: `tbl_${Date.now()}`,
        type: "table",
        afterParagraphIndex: 2,
        data: { rows, cols },
      },
    ]);
  };

  // Toggle Lock
  const handleToggleLock = (sentenceId: string) => {
    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) =>
          s.id === sentenceId ? { ...s, locked: !s.locked } : s
        ),
      }))
    );
    if (selectedSentence?.id === sentenceId) {
      setSelectedSentence((prev) => (prev ? { ...prev, locked: !prev.locked } : null));
    }
  };

  // Document Uploaded handler
  const handleDocumentUploaded = (name: string) => {
    if (documentMeta) {
      setDocumentMeta({
        ...documentMeta,
        title: name,
        updatedAt: new Date().toISOString(),
      });
    }
    setIsHumanisedScanned(false);
    setCurrentTab("editor");
  };

  const flaggedSentences = paragraphs
    .flatMap((p) => p.sentences)
    .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Global Minimalist Topbar (Logo, Active State, Quick Actions, Profile) */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
        usage={usage}
        onExportClick={() => setIsExportModalOpen(true)}
        onUploadClick={() => setIsUploadModalOpen(true)}
        isSaving={isSaving}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* 2. Main App Container with Left Platform Navigation Sidebar */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Platform Sidebar (Always available to navigate: Word Editor, Similarity 16%, My Papers, Edu Pro Board, Plans) */}
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          similarityScore={documentMeta?.similarityScore || 16}
          paperCount={4}
          onTriggerHumanise={handleTriggerHumanise}
          isHumanising={isHumanising}
          humaniseViewMode={humaniseViewMode}
          onHumaniseViewModeChange={setHumaniseViewMode}
          onApplyAllRewrites={handleApplyAllRewrites}
          flaggedCount={flaggedSentences.length}
          aiThreshold={aiThreshold}
          onThresholdChange={setAiThreshold}
          onOpenInsertImage={() => setIsInsertImageModalOpen(true)}
          onOpenInsertTable={() => setIsInsertTableModalOpen(true)}
          onOpenEquationModal={() => setIsEquationModalOpen(true)}
          onExecCommand={handleExecCommand}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          paperTheme={paperTheme}
          onTogglePaperTheme={() =>
            setPaperTheme(paperTheme === "white" ? "dark" : "white")
          }
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />

        {/* VIEW 1: Document Humaniser Editor Workspace */}
        {currentTab === "editor" && (
          <div className="flex-1 flex overflow-hidden w-full">
            <DocumentEditor
              paragraphs={paragraphs}
              selectedSentenceId={selectedSentence?.id || null}
              onSelectSentence={handleSelectSentence}
              onApplyQuickRewrite={(sid, c) => handleApplyRewrite(c)}
              onApplyAllRewrites={handleApplyAllRewrites}
              onToggleLock={handleToggleLock}
              onOpenEquationModal={() => setIsEquationModalOpen(true)}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onOpenInsertImage={() => setIsInsertImageModalOpen(true)}
              onOpenInsertTable={() => setIsInsertTableModalOpen(true)}
              onOpenReport={() => setCurrentTab("report")}
              aiThreshold={aiThreshold}
              onThresholdChange={setAiThreshold}
              historyUndoLength={undoStack.length}
              historyRedoLength={redoStack.length}
              onUndo={handleUndo}
              onRedo={handleRedo}
              isHumanisedScanned={isHumanisedScanned}
              onTriggerHumanise={handleTriggerHumanise}
              isHumanising={isHumanising}
              humaniseViewMode={humaniseViewMode}
              onHumaniseViewModeChange={setHumaniseViewMode}
              suggestionsMap={suggestionsMap}
              isInspectorOpen={isInspectorOpen}
              onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
              insertedElements={insertedElements}
              onMoveElementUp={handleMoveElementUp}
              onMoveElementDown={handleMoveElementDown}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              paperTheme={paperTheme}
              onTogglePaperTheme={() =>
                setPaperTheme(paperTheme === "white" ? "dark" : "white")
              }
              fontFamily={fontFamily}
              fontSize={fontSize}
              onExecCommand={handleExecCommand}
              similarityScore={documentMeta?.similarityScore || 16}
              isSaving={isSaving}
              wordCount={documentMeta?.wordCount || 3840}
              pageCount={documentMeta?.pageCount || 12}
            />

            <InspectorPanel
              selectedSentence={selectedSentence}
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              onApplySuggestion={handleApplyRewrite}
              onToggleLock={handleToggleLock}
              report={similarityReport}
              isOpen={isInspectorOpen}
              onCloseMobile={() => setIsInspectorOpen(false)}
            />
          </div>
        )}

        {/* VIEW 2: Turnitin-Style Similarity Report */}
        {currentTab === "report" && similarityReport && (
          <div className="flex-1 overflow-y-auto">
            <SimilarityReportView
              report={similarityReport}
              documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
              onJumpToEditorSentence={(sid) => {
                const sentence = paragraphs
                  .flatMap((p) => p.sentences)
                  .find((s) => s.id === sid);
                if (sentence) handleSelectSentence(sentence);
                setCurrentTab("editor");
                setHumaniseViewMode("original_flags");
              }}
            />
          </div>
        )}

        {/* VIEW 3: Individual Workspace (My Papers) */}
        {currentTab === "individual_dash" && usage && voiceProfile && (
          <div className="flex-1 overflow-y-auto">
            <IndividualDashboard
              documents={documentMeta ? [documentMeta] : []}
              usage={usage}
              voiceProfile={voiceProfile}
              onOpenDocument={() => setCurrentTab("editor")}
              onUploadSimulate={() => setIsUploadModalOpen(true)}
              onNavigateToPricing={() => setCurrentTab("pricing")}
            />
          </div>
        )}

        {/* VIEW 4: Edu Pro Board */}
        {currentTab === "edu_pro_dash" && (
          <div className="flex-1 overflow-y-auto">
            <EduProDashboard
              documents={eduProDocuments}
              onOpenDocument={() => setCurrentTab("editor")}
              onUpdateStage={(docId, stage) => {
                setEduProDocuments((prev) =>
                  prev.map((d) => (d.id === docId ? { ...d, stage } : d))
                );
                apiClient.updateDocumentStage(docId, stage);
              }}
            />
          </div>
        )}

        {/* VIEW 5: Pricing Plans */}
        {currentTab === "pricing" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
            <PricingModal
              currentPlan={currentPlan}
              onSelectPlan={(plan) => {
                setCurrentPlan(plan);
                if (usage) {
                  if (plan === "edu_pro") {
                    setUsage({
                      ...usage,
                      dailyWordCap: 150000,
                      dailySuggestionCap: 1500,
                      activePapersCap: 40,
                    });
                  } else if (plan === "individual") {
                    setUsage({
                      ...usage,
                      dailyWordCap: 30000,
                      dailySuggestionCap: 300,
                      activePapersCap: 3,
                    });
                  }
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Global Modals */}
      <UploadDocxModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentLoaded={handleDocumentUploaded}
      />

      <InsertImageModal
        isOpen={isInsertImageModalOpen}
        onClose={() => setIsInsertImageModalOpen(false)}
        onInsert={handleInsertImage}
      />

      <InsertTableModal
        isOpen={isInsertTableModalOpen}
        onClose={() => setIsInsertTableModalOpen(false)}
        onInsertTable={handleInsertTable}
      />

      <LatexEquationModal
        isOpen={isEquationModalOpen}
        onClose={() => setIsEquationModalOpen(false)}
        onSaveEquation={(newLatex) => {
          console.log("Equation updated to:", newLatex);
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