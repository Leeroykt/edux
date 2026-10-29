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

  // Humaniser Flow & Modes
  const [isHumanisedScanned, setIsHumanisedScanned] = useState<boolean>(true);
  const [isHumanising, setIsHumanising] = useState<boolean>(false);
  const [humaniseViewMode, setHumaniseViewMode] = useState<"original_flags" | "humanised_preview" | "split" | "clean">("original_flags");
  const [aiThreshold, setAiThreshold] = useState<number>(0.45);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Inserted Elements (Images & Tables)
  const [insertedElements, setInsertedElements] = useState<InsertedElement[]>([
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

  // Trigger Humanise Document flow
  const handleTriggerHumanise = () => {
    setIsHumanising(true);
    setTimeout(() => {
      setIsHumanising(false);
      setIsHumanisedScanned(true);
      setHumaniseViewMode("original_flags");
    }, 1000);
  };

  // Sentence Selection
  const handleSelectSentence = async (sentence: DocumentSentence) => {
    setSelectedSentence(sentence);
    setIsInspectorOpen(true);
    setIsLoadingSuggestions(true);
    try {
      const candidates = await apiClient.getSentenceSuggestions(sentence.id);
      setSuggestions(candidates);
      setSuggestionsMap((prev) => ({ ...prev, [sentence.id]: candidates }));
    } catch (e) {
      console.error("Failed to load suggestions:", e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Apply one single rewrite
  const handleApplyRewrite = async (candidate: SuggestionCandidate) => {
    if (!selectedSentence) return;
    setIsSaving(true);

    setUndoStack((prev) => [
      {
        sentenceId: selectedSentence.id,
        text: selectedSentence.text,
        score: selectedSentence.score,
      },
      ...prev,
    ]);
    setRedoStack([]);

    const humanScore = {
      sentenceId: selectedSentence.id,
      score: 0.12,
      band: "likely_human" as const,
      confidence: 0.95,
      reasons: [],
    };

    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          if (s.id === selectedSentence.id) {
            return {
              ...s,
              text: candidate.text,
              score: humanScore,
            };
          }
          return s;
        }),
      }))
    );

    setSelectedSentence((prev) =>
      prev ? { ...prev, text: candidate.text, score: humanScore } : null
    );

    if (usage) {
      setUsage({
        ...usage,
        suggestionsUsedToday: usage.suggestionsUsedToday + 1,
      });
    }

    try {
      await apiClient.applySuggestion(selectedSentence.id, {
        suggestionId: candidate.id,
        text: candidate.text,
      });
    } catch (err) {
      console.error("Failed to apply remotely:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Apply All Rewrites in 1-Click
  const handleApplyAllRewrites = () => {
    setIsSaving(true);

    const changesToPush: HistoryItem[] = [];

    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          const suggestions = suggestionsMap[s.id];
          if (suggestions && suggestions[0] && s.score && s.score.score >= aiThreshold && !s.locked) {
            changesToPush.push({
              sentenceId: s.id,
              text: s.text,
              score: s.score,
            });
            return {
              ...s,
              text: suggestions[0].text,
              score: {
                sentenceId: s.id,
                score: 0.12,
                band: "likely_human" as const,
                confidence: 0.95,
                reasons: [],
              },
            };
          }
          return s;
        }),
      }))
    );

    setUndoStack((prev) => [...changesToPush, ...prev]);
    setRedoStack([]);
    setHumaniseViewMode("clean");
    setIsSaving(false);
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

  // Insert Image handler
  const handleInsertImage = (imageUrl: string, caption?: string) => {
    setInsertedElements((prev) => [
      ...prev,
      {
        id: `img_${Date.now()}`,
        type: "image",
        afterParagraphIndex: 1,
        data: { url: imageUrl, caption },
      },
    ]);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Global Navbar */}
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

      {/* Main App Container */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: Document Humaniser Editor */}
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
              paperTheme={paperTheme}
              onTogglePaperTheme={() =>
                setPaperTheme(paperTheme === "white" ? "dark" : "white")
              }
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
        )}

        {/* VIEW 3: Individual Workspace */}
        {currentTab === "individual_dash" && usage && voiceProfile && (
          <IndividualDashboard
            documents={documentMeta ? [documentMeta] : []}
            usage={usage}
            voiceProfile={voiceProfile}
            onOpenDocument={() => setCurrentTab("editor")}
            onUploadSimulate={() => setIsUploadModalOpen(true)}
            onNavigateToPricing={() => setCurrentTab("pricing")}
          />
        )}

        {/* VIEW 4: Edu Pro Board */}
        {currentTab === "edu_pro_dash" && (
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
        )}

        {/* VIEW 5: Pricing Plans */}
        {currentTab === "pricing" && (
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
        )}
      </main>

      {/* Modals */}
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
