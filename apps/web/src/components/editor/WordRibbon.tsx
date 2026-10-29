import React, { useState } from "react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  Sigma,
  Sparkles,
  Sliders,
  CheckCheck,
  Split,
  Eye,
  Type,
  Heading1,
  Heading2,
  Quote,
  Palette,
  Sun,
  Moon
} from "lucide-react";

interface WordRibbonProps {
  activeRibbonTab: "home" | "insert" | "humanise" | "view";
  onTabChange: (tab: "home" | "insert" | "humanise" | "view") => void;
  // Home formatting
  onExecCommand: (command: string, value?: string) => void;
  fontFamily: string;
  onFontFamilyChange: (f: string) => void;
  fontSize: string;
  onFontSizeChange: (s: string) => void;
  // History
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Insert actions
  onOpenInsertImage: () => void;
  onOpenInsertTable: () => void;
  onOpenEquationModal: () => void;
  // Humaniser actions
  onTriggerHumanise: () => void;
  isHumanising: boolean;
  humaniseViewMode: "original_flags" | "humanised_preview" | "split" | "clean";
  onHumaniseViewModeChange: (mode: "original_flags" | "humanised_preview" | "split" | "clean") => void;
  onApplyAllRewrites: () => void;
  flaggedCount: number;
  aiThreshold: number;
  onThresholdChange: (v: number) => void;
  // Paper Theme
  paperTheme: "white" | "dark";
  onTogglePaperTheme: () => void;
}

export const WordRibbon: React.FC<WordRibbonProps> = ({
  activeRibbonTab,
  onTabChange,
  onExecCommand,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenInsertImage,
  onOpenInsertTable,
  onOpenEquationModal,
  onTriggerHumanise,
  isHumanising,
  humaniseViewMode,
  onHumaniseViewModeChange,
  onApplyAllRewrites,
  flaggedCount,
  aiThreshold,
  onThresholdChange,
  paperTheme,
  onTogglePaperTheme,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs select-none z-20 shrink-0">
      {/* Top Ribbon Tabs: Home, Insert, Humanise & Review, View */}
      <div className="flex items-center px-4 pt-1.5 border-b border-slate-200/80 dark:border-slate-800/80 gap-1 bg-slate-50/60 dark:bg-slate-950/60 text-xs font-semibold">
        <button
          onClick={() => onTabChange("home")}
          className={`px-3 py-1.5 rounded-t-lg transition-all ${
            activeRibbonTab === "home"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Home
        </button>

        <button
          onClick={() => onTabChange("insert")}
          className={`px-3 py-1.5 rounded-t-lg transition-all ${
            activeRibbonTab === "insert"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Insert
        </button>

        <button
          onClick={() => onTabChange("humanise")}
          className={`px-3.5 py-1.5 rounded-t-lg transition-all flex items-center gap-1.5 ${
            activeRibbonTab === "humanise"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 font-bold"
              : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Humaniser & Review</span>
          {flaggedCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {flaggedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange("view")}
          className={`px-3 py-1.5 rounded-t-lg transition-all ${
            activeRibbonTab === "view"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          View & Canvas
        </button>
      </div>

      {/* Main Ribbon Command Bar */}
      <div className="px-4 py-2 flex flex-wrap items-center gap-3 min-h-[50px] overflow-x-auto">
        {/* TAB 1: HOME (Font, Paragraph, Word Styling) */}
        {activeRibbonTab === "home" && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Undo & Redo (Side by side) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Font Family Dropdown */}
            <select
              value={fontFamily}
              onChange={(e) => {
                onFontFamilyChange(e.target.value);
                onExecCommand("fontName", e.target.value);
              }}
              className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
              <option value="Garamond">Garamond</option>
            </select>

            {/* Font Size Dropdown */}
            <select
              value={fontSize}
              onChange={(e) => {
                onFontSizeChange(e.target.value);
                onExecCommand("fontSize", e.target.value);
              }}
              className="px-2 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="3">12 pt</option>
              <option value="2">10 pt</option>
              <option value="4">14 pt</option>
              <option value="5">18 pt</option>
              <option value="6">24 pt</option>
            </select>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* B, I, U, S */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onExecCommand("bold")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all font-bold"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExecCommand("italic")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all italic"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExecCommand("underline")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all underline"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExecCommand("strikeThrough")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all line-through"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Alignment */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onExecCommand("justifyLeft")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExecCommand("justifyCenter")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all"
                title="Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExecCommand("justifyRight")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExecCommand("justifyFull")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all"
                title="Justify"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => onExecCommand("insertUnorderedList")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExecCommand("insertOrderedList")}
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-all"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: INSERT (Image, Table, LaTeX, Break) */}
        {activeRibbonTab === "insert" && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenInsertImage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
            >
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <span>Insert Image / Figure</span>
            </button>

            <button
              onClick={onOpenInsertTable}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
            >
              <TableIcon className="w-4 h-4 text-indigo-500" />
              <span>Insert Table</span>
            </button>

            <button
              onClick={onOpenEquationModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Sigma className="w-4 h-4 text-indigo-500" />
              <span>LaTeX Formula</span>
            </button>
          </div>
        )}

        {/* TAB 3: HUMANISE & REVIEW */}
        {activeRibbonTab === "humanise" && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* The Big Prominent "Humanise Document" Button */}
            <button
              onClick={onTriggerHumanise}
              disabled={isHumanising}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {isHumanising ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scanning & Humanising...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Humanise Document</span>
                </>
              )}
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* 3-Way Mode Switcher: Original with AI Flags vs Humanised Preview vs Clean */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => onHumaniseViewModeChange("original_flags")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  humaniseViewMode === "original_flags"
                    ? "bg-white dark:bg-slate-900 text-rose-600 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="Show original text with AI places colored in amber/rose"
              >
                1. Original (AI Flagged)
              </button>

              <button
                onClick={() => onHumaniseViewModeChange("humanised_preview")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  humaniseViewMode === "humanised_preview"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="Show humanised versions in green ready to accept"
              >
                <span>2. Humanised Preview</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              <button
                onClick={() => onHumaniseViewModeChange("clean")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  humaniseViewMode === "clean"
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Clean Doc
              </button>
            </div>

            {/* Apply All Rewrites Action Button */}
            {humaniseViewMode === "humanised_preview" && (
              <button
                onClick={onApplyAllRewrites}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Apply All Humanised Rewrites</span>
              </button>
            )}

            {/* Sensitivity Slider */}
            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Flag Above:
              </span>
              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.05"
                value={aiThreshold}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer accent-indigo-600"
              />
              <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {Math.round(aiThreshold * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: VIEW & CANVAS (Paper Color) */}
        {activeRibbonTab === "view" && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Paper Canvas:</span>
            <button
              onClick={onTogglePaperTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                paperTheme === "white"
                  ? "bg-white border-slate-300 text-slate-800 shadow-xs"
                  : "bg-slate-800 border-slate-700 text-white"
              }`}
            >
              {paperTheme === "white" ? "Classic White A4 Sheet" : "Dark Contrast Sheet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
