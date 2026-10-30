"use client";

import React, { useState, useEffect } from "react";
import {
  DocumentMeta,
  DocumentParagraphNode,
  DocumentSentence,
  SimilarityReport,
  UsageSummary,
  VoiceProfile,
  SuggestionCandidate
} from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { MOCK_SUGGESTIONS } from "../../services/api/mockData";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import { DocumentEditor, InsertedElement } from "../../components/editor/DocumentEditor";
import { InspectorPanel } from "../../components/editor/InspectorPanel";
import { LatexEquationModal } from "../../components/editor/LatexEquationModal";
import { FidelityReportModal } from "../../components/editor/FidelityReportModal";
import { UploadDocxModal } from "../../components/editor/UploadDocxModal";
import { DocumentPickerModal } from "../../components/editor/DocumentPickerModal";
import { InsertImageModal } from "../../components/editor/InsertImageModal";
import { InsertTableModal } from "../../components/editor/InsertTableModal";

interface HistoryItem {
  sentenceId: string;
  text: string;
  score?: any;
}

export default function WordEditorPage() {
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [allDocuments, setAllDocuments] = useState<DocumentMeta[]>([]);
  const [isDocPickerOpen, setIsDocPickerOpen] = useState<boolean>(false);
  const [paragraphs, setParagraphs] = useState<DocumentParagraphNode[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<DocumentSentence | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionCandidate[]>([]);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, SuggestionCandidate[]>>(MOCK_SUGGESTIONS);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

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

  // Inserted Elements (Academic Figures & Tables) - Start clean with zero phantom images
  const [insertedElements, setInsertedElements] = useState<InsertedElement[]>([]);

  // Modals
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isInsertImageModalOpen, setIsInsertImageModalOpen] = useState(false);
  const [isInsertTableModalOpen, setIsInsertTableModalOpen] = useState(false);

  // Elite Undo & Redo History
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Keyboard shortcut listener for Undo (Ctrl+Z) and Redo (Ctrl+Y or Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack, paragraphs]);

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const [doc, struct, rep, usg, dbDocs, eduDocs] = await Promise.all([
          apiClient.getDocument("doc_84719a"),
          apiClient.getDocumentStructure("doc_84719a"),
          apiClient.getSimilarityReport("doc_84719a"),
          apiClient.getUsage(),
          apiClient.getDocuments(),
          apiClient.getEduProDocuments(),
        ]);

        const libraryDocs = [...dbDocs, ...eduDocs.filter((ed) => !dbDocs.some((d) => d.id === ed.id))];

        // Check if there is an active document uploaded by the user in this session
        const cached =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("active_document")
            : null;

        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.meta && parsed.paragraphs) {
              setDocumentMeta(parsed.meta);
              setParagraphs(parsed.paragraphs);
              setSimilarityReport(rep);
              setUsage(usg);
              setAllDocuments([parsed.meta, ...libraryDocs]);
              setInsertedElements([]);

              // Dynamically build suggestions for any flagged sentence in the real document
              const dynamicSuggs: Record<string, SuggestionCandidate[]> = {
                ...MOCK_SUGGESTIONS,
              };
              parsed.paragraphs.forEach((p: DocumentParagraphNode) => {
                p.sentences.forEach((s: DocumentSentence) => {
                  if (s.score && s.score.score >= 0.45 && !dynamicSuggs[s.id]) {
                    dynamicSuggs[s.id] = [
                      {
                        id: `sug_${s.id}_1`,
                        sentenceId: s.id,
                        text: s.text.replace(
                          /furthermore|moreover|in conclusion|delve|testament|crucial|pivotal|landscape/gi,
                          (match) => {
                            const lower = match.toLowerCase();
                            if (lower === "furthermore") return "specifically";
                            if (lower === "moreover") return "in addition";
                            if (lower === "crucial") return "essential";
                            if (lower === "pivotal") return "central";
                            if (lower === "landscape") return "field";
                            if (lower === "delve") return "examine";
                            return "clear";
                          }
                        ),
                        strategy: "plain_phrasing",
                        meaningScore: 98,
                        scoreDelta: -75,
                        plainExplanation:
                          "Refactored formulaic stock transition into high-fidelity human academic phrasing.",
                        lockedTokensPreserved: true,
                      },
                    ];
                  }
                });
              });
              setSuggestionsMap(dynamicSuggs);
              return;
            }
          } catch (e) {
            console.error("Error reading cached document:", e);
          }
        }

        // Default mock manuscript
        setDocumentMeta(doc);
        setParagraphs(struct);
        setSimilarityReport(rep);
        setUsage(usg);
        setAllDocuments(libraryDocs);
      } catch (err) {
        console.error("Editor init error:", err);
      }
    }
    init();
  }, []);

  // Handle switching document from document picker
  const handleSelectDocumentFromPicker = async (targetDoc: DocumentMeta) => {
    setIsSaving(true);
    try {
      setSelectedSentence(null);
      setInsertedElements([]);
      const cached =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("active_document")
          : null;

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.meta?.id === targetDoc.id && parsed.paragraphs) {
            setDocumentMeta(parsed.meta);
            setParagraphs(parsed.paragraphs);
            return;
          }
        } catch {}
      }

      const struct = await apiClient.getDocumentStructure(targetDoc.id);
      setDocumentMeta(targetDoc);
      setParagraphs(struct);
    } catch (err) {
      console.error("Error loading selected document:", err);
    } finally {
      setIsSaving(false);
    }
  };

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
      await new Promise((resolve) => setTimeout(resolve, 800));
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

    // Persist to backend database & decrement quota
    apiClient.applySuggestion(selectedSentence.id, {
      suggestionId: candidate.id,
      text: candidate.text,
    }).catch((err) => console.warn("API apply suggestion error:", err));

    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 500);
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
    setTimeout(() => setIsSaving(false), 600);
  };

  // Elite Undo
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

  // Elite Redo
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

  // Image and Table Manipulation Handlers
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

  const handleDeleteElement = (id: string) => {
    setInsertedElements((prev) => prev.filter((el) => el.id !== id));
  };

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
    apiClient.toggleSentenceLock(sentenceId).catch((err) => console.warn("API toggle lock error:", err));
  };

  const handleDocumentUploaded = (
    doc: DocumentMeta,
    parsedParagraphs: DocumentParagraphNode[]
  ) => {
    setDocumentMeta(doc);
    setParagraphs(parsedParagraphs);
    setInsertedElements([]);
    setIsHumanisedScanned(false);
    setSelectedSentence(null);

    const dynamicSuggs: Record<string, SuggestionCandidate[]> = {
      ...MOCK_SUGGESTIONS,
    };
    parsedParagraphs.forEach((p) => {
      p.sentences.forEach((s) => {
        if (s.score && s.score.score >= 0.45 && !dynamicSuggs[s.id]) {
          dynamicSuggs[s.id] = [
            {
              id: `sug_${s.id}_1`,
              sentenceId: s.id,
              text: s.text.replace(
                /furthermore|moreover|in conclusion|delve|testament|crucial|pivotal|landscape/gi,
                (match) => {
                  const lower = match.toLowerCase();
                  if (lower === "furthermore") return "specifically";
                  if (lower === "moreover") return "in addition";
                  if (lower === "crucial") return "essential";
                  if (lower === "pivotal") return "central";
                  if (lower === "landscape") return "field";
                  if (lower === "delve") return "examine";
                  return "clear";
                }
              ),
              strategy: "plain_phrasing",
              meaningScore: 98,
              scoreDelta: -75,
              plainExplanation:
                "Refactored formulaic stock transition into high-fidelity human academic phrasing.",
              lockedTokensPreserved: true,
            },
          ];
        }
      });
    });
    setSuggestionsMap(dynamicSuggs);
  };

  const flaggedSentences = paragraphs
    .flatMap((p) => p.sentences)
    .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked);

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Global Navbar with Document Title & Status */}
      <Navbar
        documentTitle={documentMeta?.title || "Academic Manuscript.docx"}
        usage={usage}
        onExportClick={() => setIsExportModalOpen(true)}
        onUploadClick={() => setIsUploadModalOpen(true)}
        onOpenDocPicker={() => setIsDocPickerOpen(true)}
        isSaving={isSaving}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* 2. Main Workbench: Left Stationary Sidebar + Word Editor Canvas + Right Inspector */}
      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          similarityScore={documentMeta?.similarityScore || 16}
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
            onOpenDocPicker={() => setIsDocPickerOpen(true)}
            onOpenInsertImage={() => setIsInsertImageModalOpen(true)}
            onOpenInsertTable={() => setIsInsertTableModalOpen(true)}
            onOpenReport={() => {}}
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
            isSampleDocument={documentMeta?.id === "doc_84719a" || documentMeta?.id === "doc_101"}
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

      <DocumentPickerModal
        isOpen={isDocPickerOpen}
        onClose={() => setIsDocPickerOpen(false)}
        documents={allDocuments}
        currentDocId={documentMeta?.id}
        onSelectDocument={handleSelectDocumentFromPicker}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />
    </div>
  );
}