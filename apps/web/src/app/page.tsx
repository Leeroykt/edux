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
import { SimilarityReportView } from "../components/report/SimilarityReportView";
import { IndividualDashboard } from "../components/dashboard/IndividualDashboard";
import { EduProDashboard } from "../components/dashboard/EduProDashboard";
import { PricingModal } from "../components/pricing/PricingModal";

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

  // Modals & Controls
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [aiThreshold, setAiThreshold] = useState(0.5);
  const [activeLayer, setActiveLayer] = useState<"both" | "ai" | "similarity" | "none">("both");
  const [historyUndoStack, setHistoryUndoStack] = useState<
    { sentenceId: string; prevText: string; prevScore?: any }[]
  >([]);
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

        // Pre-select the second sentence (which has machine signals) for immediate demo
        if (struct[1]?.sentences[0]) {
          handleSelectSentence(struct[1].sentences[0]);
        }
      } catch (err) {
        console.error("Initial load error:", err);
      }
    }
    init();
  }, []);

  // Handle sentence selection & load AI suggestions (M10.8)
  const handleSelectSentence = async (sentence: DocumentSentence) => {
    setSelectedSentence(sentence);
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

  // Handle applying a rewrite (M10.9)
  const handleApplyRewrite = async (candidate: SuggestionCandidate) => {
    if (!selectedSentence) return;
    setIsSaving(true);

    // Save previous state to history undo stack
    setHistoryUndoStack((prev) => [
      {
        sentenceId: selectedSentence.id,
        prevText: selectedSentence.text,
        prevScore: selectedSentence.score,
      },
      ...prev,
    ]);

    // Update paragraph state locally with new text and improved human score
    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          if (s.id === selectedSentence.id) {
            return {
              ...s,
              text: candidate.text,
              score: {
                sentenceId: s.id,
                score: 0.14, // Lowered AI probability
                band: "likely_human",
                confidence: 0.94,
                reasons: [],
              },
            };
          }
          return s;
        }),
      }))
    );

    // Increment usage
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
      // Refresh selected sentence view
      setSelectedSentence((prev) =>
        prev
          ? {
              ...prev,
              text: candidate.text,
              score: {
                sentenceId: prev.id,
                score: 0.14,
                band: "likely_human",
                confidence: 0.94,
                reasons: [],
              },
            }
          : null
      );
    }
  };

  // Handle Undo (M4.13)
  const handleUndo = () => {
    if (historyUndoStack.length === 0) return;
    const [lastAction, ...remaining] = historyUndoStack;
    setHistoryUndoStack(remaining);

    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          if (s.id === lastAction.sentenceId) {
            return {
              ...s,
              text: lastAction.prevText,
              score: lastAction.prevScore,
            };
          }
          return s;
        }),
      }))
    );

    if (selectedSentence?.id === lastAction.sentenceId) {
      setSelectedSentence((prev) =>
        prev
          ? {
              ...prev,
              text: lastAction.prevText,
              score: lastAction.prevScore,
            }
          : null
      );
    }
  };

  // Toggle Lock per sentence (M4.15)
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

  // Kanban Stage update (M14.3)
  const handleUpdateStage = async (docId: string, stage: DocumentStage) => {
    setEduProDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, stage } : d))
    );
    await apiClient.updateDocumentStage(docId, stage);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Global Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
        usage={usage}
        onExportClick={() => setIsExportModalOpen(true)}
        isSaving={isSaving}
      />

      {/* Main Tab Views */}
      <main className="flex-1 flex overflow-hidden">
        {/* VIEW 1: Document Editor & Review Layer (M12) */}
        {currentTab === "editor" && (
          <div className="flex-1 flex overflow-hidden">
            <DocumentEditor
              paragraphs={paragraphs}
              selectedSentenceId={selectedSentence?.id || null}
              onSelectSentence={handleSelectSentence}
              onApplyQuickRewrite={(sid, c) => handleApplyRewrite(c)}
              onToggleLock={handleToggleLock}
              onOpenEquationModal={() => setIsEquationModalOpen(true)}
              aiThreshold={aiThreshold}
              onThresholdChange={setAiThreshold}
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              historyUndoLength={historyUndoStack.length}
              onUndo={handleUndo}
            />

            <InspectorPanel
              selectedSentence={selectedSentence}
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              onApplySuggestion={handleApplyRewrite}
              onToggleLock={handleToggleLock}
              report={similarityReport}
            />
          </div>
        )}

        {/* VIEW 2: Turnitin-Style Similarity & Combined Report (M9) */}
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
            }}
          />
        )}

        {/* VIEW 3: Individual Dashboard (M13) */}
        {currentTab === "individual_dash" && usage && voiceProfile && (
          <IndividualDashboard
            documents={documentMeta ? [documentMeta] : []}
            usage={usage}
            voiceProfile={voiceProfile}
            onOpenDocument={() => setCurrentTab("editor")}
            onUploadSimulate={() => setCurrentTab("editor")}
            onNavigateToPricing={() => setCurrentTab("pricing")}
          />
        )}

        {/* VIEW 4: Edu Pro Board & Analytics (M14) */}
        {currentTab === "edu_pro_dash" && (
          <EduProDashboard
            documents={eduProDocuments}
            onOpenDocument={() => setCurrentTab("editor")}
            onUpdateStage={handleUpdateStage}
          />
        )}

        {/* VIEW 5: Pricing & Limits (M2) */}
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
