"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  DocumentMeta,
  DocumentParagraphNode,
  DocumentSentence,
  SentenceScore,
  SimilarityReport,
  UsageSummary,
  VoiceProfile,
  SuggestionCandidate
} from "@edux/schema";
import { apiClient } from "../../../services/api/apiClient";
import { MOCK_SUGGESTIONS } from "../../../services/api/mockData";
import { EditorToolbar } from "../../../components/editor/EditorToolbar";
import { DocumentEditor } from "../../../components/editor/DocumentEditor";
import { InspectorPanel } from "../../../components/editor/InspectorPanel";
import { LatexEquationModal } from "../../../components/editor/LatexEquationModal";
import { FidelityReportModal } from "../../../components/editor/FidelityReportModal";
import { DocumentPickerModal } from "../../../components/editor/DocumentPickerModal";
import { InsertImageModal } from "../../../components/editor/InsertImageModal";
import { InsertTableModal } from "../../../components/editor/InsertTableModal";
import { getActiveDocument, setActiveDocument } from "../../../services/storage/documentStore";
import { useScan } from "../../../hooks/useScan";
import { useSession } from "../../../hooks/useSession";
import { useConfirm, useToast } from "../../../components/ui/feedback";
import { convertSpelling, findSpellingIssues, dialectLabel } from "../../../lib/dialect";

interface HistoryItem {
  sentenceId: string;
  text: string;
  score?: any;
}

function ScanBanner({ scan, onRetry }: { scan: { status: string; done: number; total: number; error?: string }; onRetry: () => void }) {
  const pct = scan.total > 0 ? Math.min(100, Math.round((scan.done / scan.total) * 100)) : 0;
  if (scan.status === "failed") {
    return (
      <div className="px-6 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-rose-700 dark:text-rose-300">
          Scoring stopped{scan.error ? `: ${scan.error}` : "."} Scores shown so far are kept.
        </span>
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="px-6 py-2 bg-elite-50 dark:bg-elite-950/50 border-b border-elite-100 dark:border-elite-900 text-xs">
      <div className="flex items-center justify-between gap-3 font-semibold text-elite-700 dark:text-elite-300">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-elite-500 border-t-transparent rounded-full animate-spin" />
          Scoring your document. You can keep reading and editing.
        </span>
        <span className="font-mono">
          {scan.total > 0 ? `${scan.done}/${scan.total} sentences` : "Starting…"}
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-elite-100 dark:bg-elite-900 overflow-hidden">
        <div
          className="h-full bg-elite-600 transition-all duration-500"
          style={{ width: `${scan.total > 0 ? pct : 8}%` }}
        />
      </div>
    </div>
  );
}

/** True when a server-backed document still has scorable sentences without a score. */
function needsScan(meta: DocumentMeta, paragraphs: DocumentParagraphNode[]): boolean {
  if (!meta.id.startsWith("doc_user_")) return false;
  if (meta.status === "scanning") return true;
  return paragraphs.some((p) =>
    p.sentences.some(
      (s) => !s.score && !s.ignored && !s.locked && p.type !== "heading" && s.text.split(/\s+/).filter(Boolean).length >= 8
    )
  );
}

export default function WordEditorPage() {
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [allDocuments, setAllDocuments] = useState<DocumentMeta[]>([]);
  const [isDocPickerOpen, setIsDocPickerOpen] = useState<boolean>(false);
  const [paragraphs, setParagraphs] = useState<DocumentParagraphNode[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<DocumentSentence | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionCandidate[]>([]);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, SuggestionCandidate[]>>({});
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [tone, setTone] = useState<"academic" | "neutral" | "conversational">("academic");
  const [scanDocId, setScanDocId] = useState<string | null>(null);
  const [scanRunKey, setScanRunKey] = useState(0);
  const [rescoring, setRescoring] = useState<Record<string, boolean>>({});
  const [prefetching, setPrefetching] = useState(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [equationLatex, setEquationLatex] = useState(
    "\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V"
  );
  const [similarityReport, setSimilarityReport] = useState<SimilarityReport | null>(null);

  const toast = useToast();
  const confirm = useConfirm();
  const { prefs, setPrefs, completeStep, refreshUsage, openUpload } = useSession();
  const [focusMode, setFocusMode] = useState(false);
  const [paperTheme, setPaperTheme] = useState<"white" | "dark">("white");
  const [fontFamily, setFontFamily] = useState<string>(prefs.fontFamily);
  const [fontSize, setFontSize] = useState<string>("3");

  // Humaniser Flow & Modes
  const [isHumanisedScanned, setIsHumanisedScanned] = useState<boolean>(true);
  const [isHumanising, setIsHumanising] = useState<boolean>(false);
  const [humaniseViewMode, setHumaniseViewMode] = useState<"original_flags" | "humanised_preview" | "split" | "clean">("original_flags");
  const [aiThreshold, setAiThreshold] = useState<number>(0.45);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // The inspector sits beside the page on wide screens and slides over it on small ones.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1180px)");
    setIsInspectorOpen(wide.matches);
  }, []);

  // Modals
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isInsertImageModalOpen, setIsInsertImageModalOpen] = useState(false);
  const [isInsertTableModalOpen, setIsInsertTableModalOpen] = useState(false);

  // Elite Undo & Redo History
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
        const [dbDocs, eduDocs] = await Promise.all([
          apiClient.getDocuments(),
          apiClient.getEduProDocuments(),
        ]);

        const libraryDocs = [...dbDocs, ...eduDocs.filter((ed) => !dbDocs.some((d) => d.id === ed.id))];

        // Check if there is an active document uploaded by the user in this session
        const activeStored = await getActiveDocument();

        // A link such as /edit?doc=abc opens that document.
        const wanted = new URLSearchParams(window.location.search).get("doc");
        if (wanted && !(activeStored && activeStored.meta?.id === wanted)) {
          const target = libraryDocs.find((d) => d.id === wanted);
          if (target) {
            try {
              const struct = await apiClient.getDocumentStructure(wanted);
              setDocumentMeta(target);
              setParagraphs(struct);
              setSimilarityReport(null);
              setAllDocuments(libraryDocs);
              setSuggestionsMap({});
              if (target.status === "scanning") setScanDocId(target.id);
              return;
            } catch (err) {
              showNotice("That document could not be opened. Showing your latest one instead.", "error");
            }
          }
        }

        if (activeStored && activeStored.meta && activeStored.paragraphs) {
          try {
            setDocumentMeta(activeStored.meta);
            setParagraphs(activeStored.paragraphs);
            setSimilarityReport(null);
            setAllDocuments([activeStored.meta, ...libraryDocs]);

            setSuggestionsMap({});
            if (needsScan(activeStored.meta, activeStored.paragraphs)) {
              setScanDocId(activeStored.meta.id);
            }
            return;
          } catch (e) {
            console.error("Error reading cached document:", e);
          }
        }

        // Check if there is text imported from the landing page
        const importedText =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("editor_imported_text")
            : null;

        if (importedText) {
          window.sessionStorage.removeItem("editor_imported_text");
          const cleanImported = importedText.trim();
          const importId = `doc_user_import_${Date.now()}`;
          const nodeId = `${importId}_p1`;
          const sentences = cleanImported.split(/(?<=[.!?])\s+/).filter(Boolean).map((text, idx) => ({
            id: `${importId}_s${idx + 1}`,
            nodeId,
            paragraphIndex: 0,
            text,
            charStart: 0,
            charEnd: text.length,
            locked: false,
            ignored: false,
          }));

          const importedDoc: DocumentMeta = {
            id: importId,
            ownerId: "user",
            title: "Humanized Paper Draft.docx",
            status: "scanning",
            stage: "uploaded",
            currentVersionId: "v_1",
            ownerDeclaredOwn: true,
            wordCount: cleanImported.split(/\s+/).filter(Boolean).length,
            pageCount: 1,
            overallAiScore: 0,
            similarityScore: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const importedParagraphs: DocumentParagraphNode[] = [
            {
              id: nodeId,
              documentId: importedDoc.id,
              type: "paragraph",
              styleName: "Body Text",
              sentences,
              orderNo: 1,
            },
          ];

          apiClient
            .createDocument({ id: importId, title: importedDoc.title, paragraphs: importedParagraphs })
            .catch((err) => console.warn("Failed to persist imported text:", err));
          setScanDocId(importId);
          setDocumentMeta(importedDoc);
          setParagraphs(importedParagraphs);
          setAllDocuments([importedDoc, ...libraryDocs]);
          return;
        }

        // If user has personal uploaded documents in DB, load their latest document
        const userUploadedDocs = dbDocs.filter((d) => d.id !== "doc_84719a" && !d.id.startsWith("mock"));
        if (userUploadedDocs.length > 0) {
          const firstUserDoc = userUploadedDocs[0];
          try {
            const userStruct = await apiClient.getDocumentStructure(firstUserDoc.id);
            setDocumentMeta(firstUserDoc);
            setParagraphs(userStruct);
            setAllDocuments(libraryDocs);
            setSuggestionsMap({});
            setSimilarityReport(null);
            if (firstUserDoc.status === "scanning") setScanDocId(firstUserDoc.id);
            return;
          } catch {}
        }

        // Default initial academic sample
        const [doc, struct, rep] = await Promise.all([
          apiClient.getDocument("doc_84719a"),
          apiClient.getDocumentStructure("doc_84719a"),
          apiClient.getSimilarityReport("doc_84719a"),
        ]);
        setSuggestionsMap(MOCK_SUGGESTIONS);
        setDocumentMeta(doc);
        setParagraphs(struct);
        setSimilarityReport(rep);
        setAllDocuments(libraryDocs);
      } catch (err) {
        console.error("Editor init error:", err);
      }
    }
    init().finally(() => setIsLoadingDoc(false));
  }, []);

  const showNotice = (text: string, kind: "info" | "error" = "info") => toast.show(text, { kind });

  // ---- Background scan: scores stream in while the author keeps working ----
  const latestRef = useRef({ meta: documentMeta, paragraphs });
  latestRef.current = { meta: documentMeta, paragraphs };

  const mergeScores = useCallback((scores: SentenceScore[]) => {
    if (scores.length === 0) return;
    const byId = new Map(scores.map((sc) => [sc.sentenceId, sc]));
    setParagraphs((prev) =>
      prev.map((p) => {
        let touched = false;
        const sentences = p.sentences.map((s) => {
          const sc = byId.get(s.id);
          if (!sc) return s;
          touched = true;
          return { ...s, score: sc };
        });
        return touched ? { ...p, sentences } : p;
      })
    );
    setSelectedSentence((prev) => {
      const sc = prev ? byId.get(prev.id) : undefined;
      return prev && sc ? { ...prev, score: sc } : prev;
    });
  }, []);

  const recreateOnServer = useCallback(async () => {
    const { meta, paragraphs: paras } = latestRef.current;
    if (!meta) return false;
    try {
      await apiClient.createDocument({ id: meta.id, title: meta.title, paragraphs: paras });
      return true;
    } catch {
      return false;
    }
  }, []);

  const scan = useScan({
    documentId: scanDocId,
    runKey: scanRunKey,
    onScores: mergeScores,
    onMissing: recreateOnServer,
  });
  const isScanning = scan.status === "running";

  useEffect(() => {
    if (scan.status === "done") {
      completeStep("scored");
      void refreshUsage();
    }
  }, [scan.status]);

  // Keep the author's work across reloads without blocking typing or scoring.
  useEffect(() => {
    if (!documentMeta || !documentMeta.id.startsWith("doc_user_") || paragraphs.length === 0) return;
    const t = setTimeout(() => {
      setActiveDocument(documentMeta, paragraphs).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [documentMeta, paragraphs]);

  // Handle switching document from document picker
  const handleSelectDocumentFromPicker = async (targetDoc: DocumentMeta) => {
    setIsSaving(true);
    try {
      suggestAbort.current?.abort();
      setSelectedSentence(null);
      setSuggestions([]);
      setSuggestionsError(null);
      setUndoStack([]);
      setRedoStack([]);
      const activeStored = await getActiveDocument();
      if (activeStored && activeStored.meta?.id === targetDoc.id && activeStored.paragraphs) {
        setDocumentMeta(activeStored.meta);
        setParagraphs(activeStored.paragraphs);
        setSuggestionsMap({});
        setScanDocId(needsScan(activeStored.meta, activeStored.paragraphs) ? activeStored.meta.id : null);
        return;
      }

      const struct = await apiClient.getDocumentStructure(targetDoc.id);
      setDocumentMeta(targetDoc);
      setParagraphs(struct);
      setSuggestionsMap(targetDoc.id === "doc_84719a" ? MOCK_SUGGESTIONS : {});
      setScanDocId(targetDoc.status === "scanning" ? targetDoc.id : null);
    } catch (err) {
      console.error("Error loading selected document:", err);
      showNotice("Could not open that document.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Suggestions: cancellable, cached, with a visible error and retry ----
  const suggestAbort = useRef<AbortController | null>(null);

  const loadSuggestions = async (sentence: DocumentSentence, force = false) => {
    suggestAbort.current?.abort();
    const cached = suggestionsMap[sentence.id];
    if (cached && !force) {
      setSuggestions(cached);
      setSuggestionsError(null);
      setIsLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    suggestAbort.current = controller;
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    setSuggestions([]);
    try {
      const candidates = await apiClient.getSentenceSuggestions(sentence.id, { tone, dialect: prefs.dialect }, controller.signal);
      if (controller.signal.aborted) return;
      setSuggestions(candidates);
      setSuggestionsMap((prev) => ({ ...prev, [sentence.id]: candidates }));
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === "AbortError") return;
      setSuggestionsError(err?.message || "Could not generate rewrites.");
    } finally {
      if (!controller.signal.aborted) setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSentence = (sentence: DocumentSentence) => {
    setSelectedSentence(sentence);
    setIsInspectorOpen(true);
    if (sentence.locked) {
      suggestAbort.current?.abort();
      setSuggestions([]);
      setSuggestionsError(null);
      setIsLoadingSuggestions(false);
      return;
    }
    loadSuggestions(sentence);
  };

  const handleToneChange = (next: "academic" | "neutral" | "conversational") => {
    setTone(next);
  };

  // New tone means new candidates for the open sentence.
  const toneRef = useRef(tone);
  useEffect(() => {
    if (toneRef.current === tone) return;
    toneRef.current = tone;
    if (selectedSentence && !selectedSentence.locked) loadSuggestions(selectedSentence, true);
  }, [tone]);

  /** Fetches candidates for many sentences, three at a time, updating as each lands. */
  const prefetchSuggestions = async (targets: DocumentSentence[]) => {
    const todo = targets.filter((s) => !suggestionsMap[s.id] && !s.locked);
    if (todo.length === 0) return;
    setPrefetching(true);
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const s = todo[next++];
        try {
          const candidates = await apiClient.getSentenceSuggestions(s.id, { tone, dialect: prefs.dialect });
          setSuggestionsMap((prev) => ({ ...prev, [s.id]: candidates }));
        } catch {
          // one failure should not stop the rest
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setPrefetching(false);
  };

  // Preview mode shows rewrites inline, so fetch them for the flagged sentences.
  useEffect(() => {
    if (humaniseViewMode !== "humanised_preview") return;
    const flagged = paragraphs
      .flatMap((p) => p.sentences)
      .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked)
      .slice(0, 60);
    prefetchSuggestions(flagged);
  }, [humaniseViewMode, aiThreshold, scan.status]);

  // Re-scan the whole document on request.
  const handleTriggerHumanise = async () => {
    if (!documentMeta) return;
    setHumaniseViewMode("original_flags");
    if (!documentMeta.id.startsWith("doc_user_")) {
      showNotice("This sample document is already scored.");
      return;
    }
    setIsHumanising(true);
    try {
      let started = await apiClient.startScan(documentMeta.id);
      if (!started && (await recreateOnServer())) started = await apiClient.startScan(documentMeta.id);
      if (started) {
        setScanDocId(documentMeta.id);
        setScanRunKey((k) => k + 1);
      } else {
        showNotice("Could not start scoring. Check your connection and try again.", "error");
      }
    } finally {
      setIsHumanising(false);
    }
  };

  // Formatting execCommand
  const handleExecCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  /** Writes new text into a sentence, then re-scores it in the background. */
  const replaceSentenceText = (sentenceId: string, text: string, suggestionId?: string) => {
    completeStep("rewrote");
    void refreshUsage();
    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) =>
          s.id === sentenceId
            ? {
                ...s,
                text,
                formattedHtml: undefined,
                score: undefined,
                edited: true,
                originalText: s.originalText ?? s.text,
              }
            : s
        ),
      }))
    );
    setSelectedSentence((prev) =>
      prev && prev.id === sentenceId ? { ...prev, text, formattedHtml: undefined, score: undefined } : prev
    );
    setSuggestionsMap((prev) => {
      const { [sentenceId]: _gone, ...rest } = prev;
      return rest;
    });

    apiClient
      .applySuggestion(sentenceId, { suggestionId, text })
      .catch((err) => console.warn("API apply suggestion error:", err));

    setRescoring((prev) => ({ ...prev, [sentenceId]: true }));
    apiClient.rescoreSentence(sentenceId, text).then((score) => {
      setRescoring((prev) => {
        const { [sentenceId]: _done, ...rest } = prev;
        return rest;
      });
      if (score) mergeScores([score]);
    });
  };

  // Apply Single Rewrite
  const handleApplyRewrite = (candidate: SuggestionCandidate) => {
    if (!selectedSentence) return;

    setUndoStack((prev) => [
      { sentenceId: selectedSentence.id, text: selectedSentence.text, score: selectedSentence.score },
      ...prev,
    ]);
    setRedoStack([]);
    setSuggestions([]);

    replaceSentenceText(selectedSentence.id, candidate.text, candidate.id);

    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 500);
  };

  // Apply All Rewrites: only candidates that passed the meaning check are applied.
  const handleApplyAllRewrites = async () => {
    const flagged = paragraphs
      .flatMap((p) => p.sentences)
      .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked);
    if (flagged.length === 0) {
      showNotice("No flagged sentences at this threshold.");
      return;
    }

    await prefetchSuggestions(flagged);

    // Read the freshest cache after the prefetch settles.
    let applied = 0;
    let skipped = 0;
    setSuggestionsMap((current) => {
      const history: HistoryItem[] = [];
      for (const s of flagged) {
        const top = current[s.id]?.[0];
        if (top && top.meaningScore >= 90) {
          history.push({ sentenceId: s.id, text: s.text, score: s.score });
          applied += 1;
        } else {
          skipped += 1;
        }
      }
      // Defer so state updates do not run inside this updater.
      queueMicrotask(() => {
        setUndoStack((prev) => [...history, ...prev]);
        setRedoStack([]);
        for (const s of flagged) {
          const top = current[s.id]?.[0];
          if (top && top.meaningScore >= 90) replaceSentenceText(s.id, top.text, top.id);
        }
        showNotice(
          applied > 0
            ? `Applied ${applied} checked rewrite${applied === 1 ? "" : "s"}${
                skipped ? `, left ${skipped} for you to review` : ""
              }.`
            : "No rewrite passed the meaning check, so nothing was changed. Review sentences one by one.",
          applied > 0 ? "info" : "error"
        );
      });
      return current;
    });

    setHumaniseViewMode("original_flags");
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
              formattedHtml: undefined,
              score: actionToUndo.score,
              edited: s.originalText !== undefined && actionToUndo.text !== s.originalText,
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
              formattedHtml: undefined,
              score: actionToRedo.score,
              edited: s.originalText !== undefined && actionToRedo.text !== s.originalText,
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

  // ---- Images and tables are ordinary document nodes, so they are saved and exported ----
  const insertNode = (node: Omit<DocumentParagraphNode, "orderNo" | "documentId">) => {
    const docId = documentMeta?.id || "doc_local";
    setParagraphs((prev) => {
      const at = selectedSentence
        ? prev.findIndex((p) => p.sentences.some((s) => s.id === selectedSentence.id))
        : -1;
      const index = at >= 0 ? at + 1 : prev.length;
      const next = [...prev];
      next.splice(index, 0, { ...node, documentId: docId, orderNo: index + 1 });
      return next.map((p, i) => ({ ...p, orderNo: i + 1 }));
    });
  };

  const handleInsertImage = (imageUrl: string, caption?: string) => {
    insertNode({
      id: `${documentMeta?.id || "doc"}_img_${Date.now()}`,
      type: "image",
      styleName: "Figure",
      imageUrl,
      imageCaption: caption || "",
      alignment: "center",
      widthPercent: 75,
      sentences: [],
    });
    showNotice("Image added after the selected paragraph.");
  };

  const handleInsertTable = (rows: number, cols: number) => {
    insertNode({
      id: `${documentMeta?.id || "doc"}_tbl_${Date.now()}`,
      type: "table",
      styleName: "Table",
      tableData: Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (r === 0 ? `Heading ${c + 1}` : ""))
      ),
      sentences: [],
    });
    showNotice("Table added. Click a cell to type in it.");
  };

  const handleNodeMove = (id: string, direction: "up" | "down") => {
    setParagraphs((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((p, k) => ({ ...p, orderNo: k + 1 }));
    });
  };

  const handleNodeUpdate = (id: string, patch: Partial<DocumentParagraphNode>) => {
    setParagraphs((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleNodeDelete = (id: string) => {
    setParagraphs((prev) => prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, orderNo: i + 1 })));
    showNotice("Removed.");
  };

  const handleTableCellEdit = (id: string, row: number, col: number, text: string) => {
    setParagraphs((prev) =>
      prev.map((p) =>
        p.id === id && p.tableData
          ? { ...p, tableData: p.tableData.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? text : c)) : r)) }
          : p
      )
    );
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
    suggestAbort.current?.abort();
    setDocumentMeta(doc);
    setParagraphs(parsedParagraphs);
    setSelectedSentence(null);
    setSuggestions([]);
    setSuggestionsMap({});
    setUndoStack([]);
    setRedoStack([]);
    setHumaniseViewMode("original_flags");
    setScanDocId(doc.id);
    setScanRunKey((k) => k + 1);
  };

  const flaggedSentences = paragraphs
    .flatMap((p) => p.sentences)
    .filter((s) => s.score && s.score.score >= aiThreshold && !s.locked);

  /* ---- English variant: find and convert spelling from the other variant ---- */
  const spellingTargets = useMemo(() => {
    const out: { sentence: DocumentSentence; text: string; count: number }[] = [];
    for (const p of paragraphs) {
      // Quotations keep their original spelling.
      if (p.type === "blockquote" || p.type === "image") continue;
      for (const sent of p.sentences) {
        if (sent.locked) continue;
        const { text, changes } = convertSpelling(sent.text, prefs.dialect);
        if (changes.length) out.push({ sentence: sent, text, count: changes.length });
      }
    }
    return out;
  }, [paragraphs, prefs.dialect]);
  const spellingIssues = spellingTargets.reduce((n, t) => n + t.count, 0);

  /** Writes corrected text into a sentence without touching its score. Returns what was there before. */
  const applyTextFix = (sentenceId: string, text: string) => {
    let before = "";
    setParagraphs((prev) =>
      prev.map((p) => ({
        ...p,
        sentences: p.sentences.map((s) => {
          if (s.id !== sentenceId) return s;
          before = s.text;
          return { ...s, text, formattedHtml: undefined, edited: true, originalText: s.originalText ?? s.text };
        }),
      }))
    );
    setSelectedSentence((prev) => (prev && prev.id === sentenceId ? { ...prev, text } : prev));
    apiClient.applySuggestion(sentenceId, { text, kind: "spelling" }).catch(() => {});
    return before;
  };

  const handleFixSentence = (sentence: DocumentSentence, text: string) => {
    setUndoStack((prev) => [{ sentenceId: sentence.id, text: sentence.text, score: sentence.score }, ...prev]);
    setRedoStack([]);
    applyTextFix(sentence.id, text);
    toast.show("Fixed.", { kind: "success", ms: 2500 });
  };

  const handleConvertSpelling = async () => {
    if (spellingTargets.length === 0) return;
    const ok = await confirm({
      title: `Convert to ${dialectLabel(prefs.dialect)}?`,
      message: (
        <>
          {spellingIssues} word{spellingIssues === 1 ? "" : "s"} in {spellingTargets.length} sentence{spellingTargets.length === 1 ? "" : "s"} will change, for
          example &ldquo;{findSpellingIssues(spellingTargets[0].sentence.text, prefs.dialect)[0].from}&rdquo; to &ldquo;
          {findSpellingIssues(spellingTargets[0].sentence.text, prefs.dialect)[0].to}&rdquo;. Quotations and locked sentences are left alone, and you can undo this.
        </>
      ),
      confirmLabel: "Convert",
    });
    if (!ok) return;

    const changed = spellingTargets.map((t) => ({ id: t.sentence.id, from: t.sentence.text, score: t.sentence.score, to: t.text }));
    changed.forEach((c) => applyTextFix(c.id, c.to));
    setUndoStack((prev) => [...changed.map((c) => ({ sentenceId: c.id, text: c.from, score: c.score })), ...prev]);
    setRedoStack([]);
    toast.show(`Converted ${spellingIssues} word${spellingIssues === 1 ? "" : "s"} to ${dialectLabel(prefs.dialect)}.`, {
      kind: "success",
      ms: 9000,
      action: {
        label: "Undo",
        onClick: () => {
          changed.forEach((c) => applyTextFix(c.id, c.from));
          setSelectedSentence(null);
        },
      },
    });
  };

  /* ---- Commands from the palette, and documents uploaded from the shell ---- */
  const commandRef = useRef<(id: string) => void>(() => {});
  commandRef.current = (id) => {
    if (id === "rescan") void handleTriggerHumanise();
    else if (id === "export") setIsExportModalOpen(true);
    else if (id === "focus") setFocusMode((f) => !f);
  };
  useEffect(() => {
    const onCommand = (e: Event) => commandRef.current((e as CustomEvent).detail);
    const onLoaded = (e: Event) => {
      const { doc, paragraphs: paras } = (e as CustomEvent).detail;
      handleDocumentUploaded(doc, paras);
    };
    window.addEventListener("edux:command", onCommand);
    window.addEventListener("edux:document-loaded", onLoaded);
    return () => {
      window.removeEventListener("edux:command", onCommand);
      window.removeEventListener("edux:document-loaded", onLoaded);
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <EditorToolbar
        title={documentMeta?.id === "doc_84719a" ? `Sample: ${documentMeta.title}` : documentMeta?.title || "Sample paper"}
        isSaving={isSaving}
        onOpenDocPicker={() => setIsDocPickerOpen(true)}
        viewMode={humaniseViewMode}
        onViewMode={setHumaniseViewMode}
        flaggedCount={flaggedSentences.length}
        threshold={aiThreshold}
        onThreshold={setAiThreshold}
        onInsertImage={() => setIsInsertImageModalOpen(true)}
        onInsertTable={() => setIsInsertTableModalOpen(true)}
        onInsertFormula={() => setIsEquationModalOpen(true)}
        fontFamily={fontFamily}
        onFontFamily={setFontFamily}
        fontSize={fontSize}
        onFontSize={setFontSize}
        paperTheme={paperTheme}
        onPaperTheme={() => setPaperTheme(paperTheme === "white" ? "dark" : "white")}
        dialect={prefs.dialect}
        onDialect={(d) => {
          setPrefs({ dialect: d });
          setSuggestionsMap({});
          toast.show(`Writing in ${dialectLabel(d)}.`, { kind: "success", ms: 2500 });
        }}
        spellingIssues={spellingIssues}
        onConvertSpelling={handleConvertSpelling}
        onRescan={handleTriggerHumanise}
        isRescanning={isHumanising || isScanning}
        onApplyAll={handleApplyAllRewrites}
        onExport={() => setIsExportModalOpen(true)}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        focus={focusMode}
        onFocus={() => setFocusMode((f) => !f)}
        inspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((o) => !o)}
      />

      {!focusMode && spellingIssues > 0 && (
        <div className="shrink-0 px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 bg-amber-50 dark:bg-amber-950/25 border-b border-amber-200/70 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
          <span>
            {spellingIssues} word{spellingIssues === 1 ? " uses" : "s use"} {prefs.dialect === "en-GB" ? "American" : "British"} spelling.
          </span>
          <button onClick={handleConvertSpelling} className="font-semibold underline underline-offset-2 hover:no-underline">
            Convert to {dialectLabel(prefs.dialect)}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <DocumentEditor
          paragraphs={paragraphs}
          selectedSentenceId={selectedSentence?.id || null}
          onSelectSentence={handleSelectSentence}
          onApplyQuickRewrite={(sid, c) => handleApplyRewrite(c)}
          onApplyAllRewrites={handleApplyAllRewrites}
          onToggleLock={handleToggleLock}
          onOpenEquationModal={() => setIsEquationModalOpen(true)}
          onOpenUploadModal={openUpload}
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
          isHumanisedScanned={true}
          onTriggerHumanise={handleTriggerHumanise}
          isHumanising={isHumanising}
          humaniseViewMode={humaniseViewMode}
          onHumaniseViewModeChange={setHumaniseViewMode}
          suggestionsMap={suggestionsMap}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
          onNodeMove={handleNodeMove}
          onNodeUpdate={handleNodeUpdate}
          onNodeDelete={handleNodeDelete}
          onTableCellEdit={handleTableCellEdit}
          paperTheme={paperTheme}
          onTogglePaperTheme={() => setPaperTheme(paperTheme === "white" ? "dark" : "white")}
          fontFamily={fontFamily}
          fontSize={fontSize}
          onExecCommand={handleExecCommand}
          similarityScore={documentMeta?.similarityScore ?? 0}
          isSaving={isSaving}
          wordCount={documentMeta?.wordCount || 0}
          pageCount={documentMeta?.pageCount || 1}
          isSampleDocument={documentMeta?.id === "doc_84719a" || documentMeta?.id === "doc_101"}
          isScanning={isScanning}
          isLoading={isLoadingDoc}
          equationLatex={equationLatex}
          rescoring={rescoring}
          hideStatusHeader
          scanBanner={
            scan.status === "running" || scan.status === "failed" ? <ScanBanner scan={scan} onRetry={handleTriggerHumanise} /> : null
          }
        />

        {!focusMode && (
          <InspectorPanel
            selectedSentence={selectedSentence}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            suggestionsError={suggestionsError}
            onRetrySuggestions={() => selectedSentence && loadSuggestions(selectedSentence, true)}
            isRescoring={!!(selectedSentence && rescoring[selectedSentence.id])}
            isScanning={isScanning}
            tone={tone}
            onToneChange={handleToneChange}
            onApplySuggestion={handleApplyRewrite}
            onToggleLock={handleToggleLock}
            report={similarityReport}
            isOpen={isInspectorOpen}
            onCloseMobile={() => setIsInspectorOpen(false)}
            dialect={prefs.dialect}
            grammarChecks={prefs.grammarChecks}
            onFixSentence={handleFixSentence}
          />
        )}
      </div>

      {prefetching && (
        <div className="fixed bottom-16 right-4 z-[60] px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold border border-slate-700 flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-elite-400 border-t-transparent rounded-full animate-spin" />
          Preparing rewrites…
        </div>
      )}

      <InsertImageModal isOpen={isInsertImageModalOpen} onClose={() => setIsInsertImageModalOpen(false)} onInsert={handleInsertImage} />
      <InsertTableModal isOpen={isInsertTableModalOpen} onClose={() => setIsInsertTableModalOpen(false)} onInsertTable={handleInsertTable} />
      <LatexEquationModal
        isOpen={isEquationModalOpen}
        onClose={() => setIsEquationModalOpen(false)}
        initialLatex={equationLatex}
        onSaveEquation={(newLatex) => {
          setEquationLatex(newLatex);
          showNotice("Formula saved.");
        }}
      />
      <FidelityReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentTitle={documentMeta?.title || "Sample paper"}
        paragraphs={paragraphs}
        onExported={() => completeStep("exported")}
      />
      <DocumentPickerModal
        isOpen={isDocPickerOpen}
        onClose={() => setIsDocPickerOpen(false)}
        documents={allDocuments}
        currentDocId={documentMeta?.id}
        onSelectDocument={handleSelectDocumentFromPicker}
        onOpenUploadModal={openUpload}
      />
    </div>
  );
}
