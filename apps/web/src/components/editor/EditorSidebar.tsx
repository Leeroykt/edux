"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  ShieldCheck,
  FolderKanban,
  BarChart3,
  CreditCard,
  Sparkles,
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
  UploadCloud,
  CheckCircle2,
  FolderOpen
} from "lucide-react";
import { HelpTooltip } from "../ui/HelpTooltip";

interface EditorSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  similarityScore?: number;
  paperCount?: number;
  // Humaniser Actions (used on /edit)
  onTriggerHumanise?: () => void;
  isHumanising?: boolean;
  humaniseViewMode?: "original_flags" | "humanised_preview" | "split" | "clean";
  onHumaniseViewModeChange?: (mode: "original_flags" | "humanised_preview" | "split" | "clean") => void;
  onApplyAllRewrites?: () => void;
  flaggedCount?: number;
  aiThreshold?: number;
  onThresholdChange?: (val: number) => void;
  // Insert Actions
  onOpenInsertImage?: () => void;
  onOpenInsertTable?: () => void;
  onOpenEquationModal?: () => void;
  onExecCommand?: (command: string, value?: string) => void;
  // Formatting & Styles
  fontFamily?: string;
  onFontFamilyChange?: (f: string) => void;
  fontSize?: string;
  onFontSizeChange?: (s: string) => void;
  paperTheme?: "white" | "dark";
  onTogglePaperTheme?: () => void;
  // Document Upload
  onOpenUploadModal?: () => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  similarityScore = 16,
  paperCount = 18,
  onTriggerHumanise,
  isHumanising = false,
  humaniseViewMode = "original_flags",
  onHumaniseViewModeChange,
  onApplyAllRewrites,
  flaggedCount = 14,
  aiThreshold = 0.45,
  onThresholdChange,
  onOpenInsertImage,
  onOpenInsertTable,
  onOpenEquationModal,
  onExecCommand,
  fontFamily = "Times New Roman",
  onFontFamilyChange,
  fontSize = "3",
  onFontSizeChange,
  paperTheme = "white",
  onTogglePaperTheme,
  onOpenUploadModal,
}) => {
  const pathname = usePathname();
  const [editorSubSection, setEditorSubSection] = useState<"humanise" | "insert" | "format">("humanise");

  const isEditorPage = pathname === "/edit";

  const mainNavItems = [
    {
      href: "/dashboard",
      label: "User Dashboard",
      icon: <Home className="w-4 h-4" />,
      badge: `${paperCount}`,
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      href: "/edit",
      label: "Word Editor",
      icon: <FileText className="w-4 h-4" />,
      badge: null,
      badgeColor: "",
    },
    {
      href: "/report",
      label: "Similarity & Plagiarism",
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: `${similarityScore}%`,
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    },
    {
      href: "/edupro",
      label: "Edu Pro Board",
      icon: <FolderKanban className="w-4 h-4" />,
      badge: "Pro",
      badgeColor: "bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black shadow-2xs",
    },
    {
      href: "/plans",
      label: "Plans",
      icon: <CreditCard className="w-4 h-4" />,
      badge: null,
      badgeColor: "",
    },
  ];

  /* ---------------- COLLAPSED VIEW ---------------- */
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-3 gap-2 select-none z-20 shrink-0 h-full sticky top-0">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-elite-600 hover:bg-elite-50 dark:hover:bg-elite-950 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />

        {/* Main Nav Items (Icons Only) */}
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-2.5 rounded-xl transition-all relative group ${
                isActive
                  ? "bg-elite-600 text-white shadow-md shadow-elite-600/20"
                  : "text-slate-500 hover:text-elite-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={`${item.label} ${item.badge ? `(${item.badge})` : ""}`}
            >
              {item.icon}
              {item.badge && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </Link>
          );
        })}

        {isEditorPage && onTriggerHumanise && (
          <>
            <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />
            <button
              onClick={onTriggerHumanise}
              className="p-2.5 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 hover:bg-elite-100 transition-colors relative"
              title="✨ Humanise Document"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            {onOpenInsertImage && (
              <button
                onClick={onOpenInsertImage}
                className="p-2.5 rounded-xl text-slate-500 hover:text-elite-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Insert Image / Figure"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </aside>
    );
  }

  /* ---------------- EXPANDED SIDEBAR VIEW ---------------- */
  return (
    <aside className="w-64 sm:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-20 shrink-0 select-none shadow-xs sticky top-0">
      {/* 1. Header with Collapse Button */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Platform Menu
          </span>
          <HelpTooltip
            title="eduX Navigation"
            explanation="Seamlessly switch between your Master Dashboard, Word Editor canvas, Plagiarism checks, and Pro workflows."
          />
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Top-Level Main Navigation (SPA Links) */}
      <div className="p-2.5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1">
          Navigation
        </div>
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-elite-600 text-white shadow-sm shadow-elite-600/25"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* 3. Sub-workbench Area (Visible when on /edit) */}
      {isEditorPage ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px] font-bold">
            <button
              onClick={() => setEditorSubSection("humanise")}
              className={`py-1.5 rounded-lg transition-all ${
                editorSubSection === "humanise"
                  ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Humaniser
            </button>
            <button
              onClick={() => setEditorSubSection("insert")}
              className={`py-1.5 rounded-lg transition-all ${
                editorSubSection === "insert"
                  ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Insert
            </button>
            <button
              onClick={() => setEditorSubSection("format")}
              className={`py-1.5 rounded-lg transition-all ${
                editorSubSection === "format"
                  ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Format
            </button>
          </div>

          {/* Sub-workbench Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* SUB-SECTION 1: HUMANISE */}
            {editorSubSection === "humanise" && (
              <div className="space-y-4">
                {onTriggerHumanise && (
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
                )}

                {/* View Mode Selector */}
                {onHumaniseViewModeChange && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>View Mode:</span>
                      <HelpTooltip
                        title="Document View Modes"
                        explanation="Original (AI Flags) reveals machine patterns in amber/rose. Humanised Preview shows recommended rewrites in emerald green. Clean hides annotations."
                      />
                    </div>

                    <div className="space-y-1 text-xs">
                      <button
                        onClick={() => onHumaniseViewModeChange("original_flags")}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          humaniseViewMode === "original_flags"
                            ? "border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Original (AI Flags)
                        </span>
                        {flaggedCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-200/70 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
                            {flaggedCount} flagged
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => onHumaniseViewModeChange("humanised_preview")}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          humaniseViewMode === "humanised_preview"
                            ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Humanised Preview
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Click Apply
                        </span>
                      </button>

                      <button
                        onClick={() => onHumaniseViewModeChange("clean")}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          humaniseViewMode === "clean"
                            ? "border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Clean Word View
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Apply All Rewrites */}
                {onApplyAllRewrites && (
                  <button
                    onClick={onApplyAllRewrites}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-600" /> Apply All Rewrites
                  </button>
                )}

                {/* Threshold Slider */}
                {onThresholdChange && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Flag Threshold:
                      </span>
                      <span className="font-mono font-bold text-elite-600 dark:text-elite-400">
                        {(aiThreshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.8"
                      step="0.05"
                      value={aiThreshold}
                      onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                      className="w-full accent-elite-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>20% (Strict)</span>
                      <span>80% (Lenient)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-SECTION 2: INSERT */}
            {editorSubSection === "insert" && (
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Insert Document Figures
                </div>

                {onOpenInsertImage && (
                  <button
                    onClick={onOpenInsertImage}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-elite-500 hover:bg-elite-50/30 dark:hover:bg-elite-950/30 transition-all text-left flex items-start gap-3 group"
                  >
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-elite-600">
                        Local Image / Figure
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Crop, frame, and move in Word
                      </div>
                    </div>
                  </button>
                )}

                {onOpenInsertTable && (
                  <button
                    onClick={onOpenInsertTable}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-elite-500 hover:bg-elite-50/30 dark:hover:bg-elite-950/30 transition-all text-left flex items-start gap-3 group"
                  >
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                      <TableIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-elite-600">
                        Word Table
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Configurable rows & columns
                      </div>
                    </div>
                  </button>
                )}

                {onOpenEquationModal && (
                  <button
                    onClick={onOpenEquationModal}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-elite-500 hover:bg-elite-50/30 dark:hover:bg-elite-950/30 transition-all text-left flex items-start gap-3 group"
                  >
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                      <Sigma className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-elite-600">
                        LaTeX Equation
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Converted directly to Word OMML
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* SUB-SECTION 3: FORMAT */}
            {editorSubSection === "format" && (
              <div className="space-y-4">
                {onFontFamilyChange && onExecCommand && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Document Typeface:
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => {
                        onFontFamilyChange(e.target.value);
                        onExecCommand("fontName", e.target.value);
                      }}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-elite-500"
                    >
                      <option value="Times New Roman">Times New Roman (Academic)</option>
                      <option value="Arial">Arial (Clean Sans)</option>
                      <option value="Calibri">Calibri (Modern Word)</option>
                      <option value="Georgia">Georgia (Editorial Serif)</option>
                      <option value="Inter">Inter (Digital Sans)</option>
                    </select>
                  </div>
                )}

                {onFontSizeChange && onExecCommand && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Body Font Size:
                    </label>
                    <select
                      value={fontSize}
                      onChange={(e) => {
                        onFontSizeChange(e.target.value);
                        onExecCommand("fontSize", e.target.value);
                      }}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-elite-500"
                    >
                      <option value="1">10 pt (Small Citation)</option>
                      <option value="2">11 pt (Standard Academic)</option>
                      <option value="3">12 pt (APA / MLA Standard)</option>
                      <option value="4">14 pt (Subheading)</option>
                      <option value="5">18 pt (Document Title)</option>
                    </select>
                  </div>
                )}

                {onTogglePaperTheme && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      A4 Paper Canvas:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={onTogglePaperTheme}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                          paperTheme === "white"
                            ? "border-elite-600 bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 shadow-2xs"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" /> Paper White
                      </button>
                      <button
                        onClick={onTogglePaperTheme}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                          paperTheme === "dark"
                            ? "border-elite-600 bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 shadow-2xs"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" /> Obsidian Dark
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Secondary info on other pages: User storage & quick resume */
        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>Account Quota</span>
                <span className="text-elite-600 font-mono">42%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-elite-600 w-[42%]" />
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between">
                <span>12,450 / 30,000 words</span>
                <span>Resets Midnight</span>
              </div>
            </div>

            <Link
              href="/edit"
              className="w-full py-2.5 px-3 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-700 dark:text-elite-300 hover:bg-elite-100 border border-elite-200 dark:border-elite-800 text-xs font-bold flex items-center justify-between group transition-all"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-elite-600" />
                <span>Jump to Word Canvas</span>
              </span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
            eduX Academic Engine v1.0 • Lossless OOXML
          </div>
        </div>
      )}
    </aside>
  );
};