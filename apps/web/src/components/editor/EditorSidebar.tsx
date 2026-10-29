import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sliders,
  CheckCheck,
  Layers,
  Image as ImageIcon,
  Table as TableIcon,
  Sigma,
  Indent,
  Outdent,
  Type,
  Sun,
  Moon,
  BookOpen,
  FileText,
  AlignLeft
} from "lucide-react";
import { HelpTooltip } from "../ui/HelpTooltip";

interface EditorSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Humaniser Actions
  onTriggerHumanise: () => void;
  isHumanising: boolean;
  humaniseViewMode: "original_flags" | "humanised_preview" | "split" | "clean";
  onHumaniseViewModeChange: (mode: "original_flags" | "humanised_preview" | "split" | "clean") => void;
  onApplyAllRewrites: () => void;
  flaggedCount: number;
  aiThreshold: number;
  onThresholdChange: (val: number) => void;
  // Insert Actions
  onOpenInsertImage: () => void;
  onOpenInsertTable: () => void;
  onOpenEquationModal: () => void;
  onExecCommand: (command: string, value?: string) => void;
  // Formatting & Styles
  fontFamily: string;
  onFontFamilyChange: (f: string) => void;
  fontSize: string;
  onFontSizeChange: (s: string) => void;
  paperTheme: "white" | "dark";
  onTogglePaperTheme: () => void;
  // Navigate to similarity report
  onOpenReport: () => void;
  similarityScore: number;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onTriggerHumanise,
  isHumanising,
  humaniseViewMode,
  onHumaniseViewModeChange,
  onApplyAllRewrites,
  flaggedCount,
  aiThreshold,
  onThresholdChange,
  onOpenInsertImage,
  onOpenInsertTable,
  onOpenEquationModal,
  onExecCommand,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  paperTheme,
  onTogglePaperTheme,
  onOpenReport,
  similarityScore,
}) => {
  const [activeSection, setActiveSection] = useState<"humanise" | "insert" | "format">("humanise");

  if (isCollapsed) {
    return (
      <aside className="w-14 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 gap-4 select-none z-20 shrink-0">
        {/* Expand Trigger Button */}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-elite-600 hover:bg-elite-50 transition-colors"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />

        {/* Quick Action Icons */}
        <button
          onClick={onTriggerHumanise}
          className="p-2.5 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 hover:bg-elite-100 transition-colors relative"
          title="✨ Humanise Document"
        >
          <Sparkles className="w-4 h-4" />
          {flaggedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {flaggedCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenInsertImage}
          className="p-2.5 rounded-xl text-slate-500 hover:text-elite-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Insert Image / Figure"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenInsertTable}
          className="p-2.5 rounded-xl text-slate-500 hover:text-elite-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Insert Word Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenEquationModal}
          className="p-2.5 rounded-xl text-slate-500 hover:text-elite-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Insert LaTeX Formula"
        >
          <Sigma className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenReport}
          className="p-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
          title="Similarity Check"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 sm:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-4rem)] z-20 shrink-0 select-none shadow-xs">
      {/* Sidebar Header & Collapse Toggle */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Editor Workbench
          </span>
          <HelpTooltip
            title="Word Editor Workbench"
            explanation="This sidebar organizes all humanisation, insertion, and style formatting tools. You can collapse it anytime for an unobstructed full-page Word view."
          />
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav Pill Toggles */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px] font-bold">
        <button
          onClick={() => setActiveSection("humanise")}
          className={`py-1.5 rounded-lg transition-all ${
            activeSection === "humanise"
              ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Humaniser
        </button>
        <button
          onClick={() => setActiveSection("insert")}
          className={`py-1.5 rounded-lg transition-all ${
            activeSection === "insert"
              ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Insert
        </button>
        <button
          onClick={() => setActiveSection("format")}
          className={`py-1.5 rounded-lg transition-all ${
            activeSection === "format"
              ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Format
        </button>
      </div>

      {/* Sidebar Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* SECTION 1: HUMANISE TOOLS */}
        {activeSection === "humanise" && (
          <div className="space-y-4">
            {/* Main Action Button */}
            <button
              onClick={onTriggerHumanise}
              disabled={isHumanising}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-elite-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isHumanising ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scanning Sentences...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Humanise Document</span>
                </>
              )}
            </button>

            {/* View Mode Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>View Mode:</span>
                <HelpTooltip
                  title="Document View Modes"
                  explanation="1. Original (AI Flagged): Highlights machine-like sentences in amber/rose. 2. Humanised Preview: Previews recommended rewrites in emerald green ready to accept. 3. Clean: View without any marks."
                />
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => onHumaniseViewModeChange("original_flags")}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    humaniseViewMode === "original_flags"
                      ? "border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Original (AI Flags)
                  </span>
                  {flaggedCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-200/70 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                      {flaggedCount} flagged
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onHumaniseViewModeChange("humanised_preview")}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    humaniseViewMode === "humanised_preview"
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Humanised Preview
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">Ready</span>
                </button>

                <button
                  onClick={() => onHumaniseViewModeChange("clean")}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    humaniseViewMode === "clean"
                      ? "border-slate-400 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span>Clean Word Doc</span>
                </button>
              </div>
            </div>

            {/* Apply All Rewrites */}
            {humaniseViewMode === "humanised_preview" && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={onApplyAllRewrites}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Apply All Rewrites ({flaggedCount})</span>
                </button>
              </div>
            )}

            {/* Sensitivity Slider with Help */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  AI Sensitivity
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs font-bold text-elite-600 dark:text-elite-400">
                    {Math.round(aiThreshold * 100)}%
                  </span>
                  <HelpTooltip
                    title="Detection Sensitivity Threshold"
                    explanation="Sentences with AI probability scores above this threshold are flagged in amber/red. Lowering the slider catches subtle machine cadence; raising it focuses strictly on blatant AI patterns."
                    tip="Academic writing often has formulaic vocabulary. A threshold of 45-50% avoids false positives."
                  />
                </div>
              </div>

              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.05"
                value={aiThreshold}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-elite-600"
              />
            </div>
          </div>
        )}

        {/* SECTION 2: INSERT TOOLS */}
        {activeSection === "insert" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span>Insert Elements:</span>
              <HelpTooltip
                title="Word Elements"
                explanation="Insert images, tables, formulas, or indentation directly into the document canvas. Elements are preserved as native OOXML structures on export."
              />
            </div>

            <button
              onClick={onOpenInsertImage}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-elite-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition-all text-left"
            >
              <div className="p-1.5 rounded-lg bg-elite-50 dark:bg-elite-950 text-elite-600">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div>Insert Figure / Image</div>
                <div className="text-[10px] text-slate-400 font-normal">Add caption & preview</div>
              </div>
            </button>

            <button
              onClick={onOpenInsertTable}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-elite-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition-all text-left"
            >
              <div className="p-1.5 rounded-lg bg-elite-50 dark:bg-elite-950 text-elite-600">
                <TableIcon className="w-4 h-4" />
              </div>
              <div>
                <div>Insert Table</div>
                <div className="text-[10px] text-slate-400 font-normal">Custom rows & cols grid</div>
              </div>
            </button>

            <button
              onClick={onOpenEquationModal}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-elite-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition-all text-left"
            >
              <div className="p-1.5 rounded-lg bg-elite-50 dark:bg-elite-950 text-elite-600">
                <Sigma className="w-4 h-4" />
              </div>
              <div>
                <div>Insert LaTeX Formula</div>
                <div className="text-[10px] text-slate-400 font-normal">Native Word OMML export</div>
              </div>
            </button>

            {/* Indent Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Paragraph Indentation:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onExecCommand("outdent")}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                  title="Indent Left (Shift+Tab)"
                >
                  <Outdent className="w-3.5 h-3.5" />
                  <span>Indent Left</span>
                </button>
                <button
                  onClick={() => onExecCommand("indent")}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                  title="Indent Right (Tab)"
                >
                  <Indent className="w-3.5 h-3.5" />
                  <span>Indent Right</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: FORMAT & WORD STYLES */}
        {activeSection === "format" && (
          <div className="space-y-4">
            {/* Font Chooser */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Document Font
              </label>
              <select
                value={fontFamily}
                onChange={(e) => {
                  onFontFamilyChange(e.target.value);
                  onExecCommand("fontName", e.target.value);
                }}
                className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="Times New Roman">Times New Roman</option>
                <option value="Raleway">Raleway</option>
                <option value="Arial">Arial</option>
                <option value="Calibri">Calibri</option>
                <option value="Georgia">Georgia</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Base Text Size
              </label>
              <select
                value={fontSize}
                onChange={(e) => {
                  onFontSizeChange(e.target.value);
                  onExecCommand("fontSize", e.target.value);
                }}
                className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="3">12 pt (Standard Academic)</option>
                <option value="2">10 pt</option>
                <option value="4">14 pt (Headings)</option>
                <option value="5">18 pt (Titles)</option>
              </select>
            </div>

            {/* Paper Theme */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Paper Canvas Color
              </label>
              <button
                onClick={onTogglePaperTheme}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-between"
              >
                <span>{paperTheme === "white" ? "Classic White A4" : "Dark Contrast Sheet"}</span>
                {paperTheme === "white" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer: Quick Integrity Pill */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Similarity:</span>
          <span className="font-mono font-bold text-blue-600">{similarityScore}%</span>
        </div>
        <button
          onClick={onOpenReport}
          className="text-elite-600 dark:text-elite-400 font-bold hover:underline text-[11px]"
        >
          View Report →
        </button>
      </div>
    </aside>
  );
};
