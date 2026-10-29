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
import { Navbar, NavTab } from "../components/navigation/Navbar";
import { DocumentEditor } from "../components/editor/DocumentEditor";
import { InspectorPanel } from "../components/editor/InspectorPanel";
import { LatexEquationModal } from "../components/editor/LatexEquationModal";
import { FidelityReportModal } from "../components/editor/FidelityReportModal";
import { UploadDocxModal } from "../components/editor/UploadDocxModal";
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
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [eduProDocuments, setEduProDocuments] = useState<DocumentMeta[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanType>("individual");

  // Modes & View settings: "ai" (default humaniser) | "similarity" (Turnitin check) | "clean"
  const [activeMode, setActiveMode] = useState<"ai" | "similarity" | "clean">("ai");
  const [aiThreshold, setAiThreshold] = useState(0.45);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Modals
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Undo and Redo Stacks
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

        // Pre-select sentence s_02 (which has high AI machine likelihood)
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
    setIsInspectorOpen(true);
    setIsLoadingSuggestions(true);
    try {
      const candidates = await apiClient.getSentenceSuggestions(sentence.id);
      setSuggestions(candidates);
    } catch (e) {
      console.error("Failed to load suggestions:", e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle applying a human rewrite
  const handleApplyRewrite = async (candidate: SuggestionCandidate) => {
    if (!selectedSentence) return;
    setIsSaving(true);

    // Push current state to undo stack, and clear redo stack
    setUndoStack((prev) => [
      {
        sentenceId: selectedSentence.id,
        text: selectedSentence.text,
        score: selectedSentence.score,
      },
      ...prev,
    ]);
    setRedoStack([]);

    // Update paragraph state locally with new text and humanized score
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

    // Update selected sentence
    setSelectedSentence((prev) =>
      prev ? { ...prev, text: candidate.text, score: humanScore } : null
    );

    // Increment usage meter
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

  // Handle Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [actionToUndo, ...remainingUndo] = undoStack;

    // Find current sentence text to push to redo stack
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

    // Restore previous text
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

  // Handle Redo (Right on the side of Undo)
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

  // When a new document is uploaded
  const handleDocumentUploaded = (name: string) => {
    if (documentMeta) {
      setDocumentMeta({
        ...documentMeta,
        title: name,
        updatedAt: new Date().toISOString(),
      });
    }
    setCurrentTab("editor");
    setActiveMode("ai");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Global Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
        usage={usage}
        onExportClick={() => setIsExportModalOpen(true)}
        onUploadClick={() => setIsUploadModalOpen(true)}
        isSaving={isSaving}
      />

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: Document Humaniser Editor (M12) */}
        {currentTab === "editor" && (
          <div className="flex-1 flex overflow-hidden w-full">
            <DocumentEditor
              paragraphs={paragraphs}
              selectedSentenceId={selectedSentence?.id || null}
              onSelectSentence={handleSelectSentence}
              onApplyQuickRewrite={(sid, c) => handleApplyRewrite(c)}
              onToggleLock={handleToggleLock}
              onOpenEquationModal={() => setIsEquationModalOpen(true)}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              aiThreshold={aiThreshold}
              onThresholdChange={setAiThreshold}
              activeMode={activeMode}
              onModeChange={setActiveMode}
              historyUndoLength={undoStack.length}
              historyRedoLength={redoStack.length}
              onUndo={handleUndo}
              onRedo={handleRedo}
              overallAiScore={documentMeta?.overallAiScore || 0.38}
              similarityScore={documentMeta?.similarityScore || 16}
              isInspectorOpen={isInspectorOpen}
              onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
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

        {/* VIEW 2: Turnitin-Style Similarity Report (M9) */}
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
              setActiveMode("similarity");
            }}
          />
        )}

        {/* VIEW 3: Individual Workspace (M13) */}
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

        {/* VIEW 4: Edu Pro Board (M14) */}
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

        {/* VIEW 5: Pricing Plans (M2) */}
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

      {/* Upload .docx Modal */}
      <UploadDocxModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentLoaded={handleDocumentUploaded}
      />

      {/* LaTeX Equation Modal (M5) */}
      <LatexEquationModal
        isOpen={isEquationModalOpen}
        onClose={() => setIsEquationModalOpen(false)}
        onSaveEquation={(newLatex) => {
          console.log("Equation updated to:", newLatex);
        }}
      />

      {/* Fidelity Export Modal (M4.16 - M4.18) */}
      <FidelityReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
      />
    </div>
  );
}
