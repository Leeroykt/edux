import React from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Undo2,
  Redo2,
  Indent,
  Outdent,
  CheckCircle2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut
} from "lucide-react";

interface EditorBottomBarProps {
  onExecCommand: (command: string, value?: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  wordCount: number;
  pageCount: number;
  currentPage?: number;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  isSaving: boolean;
}

export const EditorBottomBar: React.FC<EditorBottomBarProps> = ({
  onExecCommand,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  wordCount,
  pageCount,
  currentPage = 1,
  zoomLevel,
  onZoomChange,
  isSaving,
}) => {
  const highlightColor = "#fef08a";

  return (
    <footer className="h-11 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-xs select-none z-20 shrink-0 transition-colors shadow-2xs">
      {/* Left: Quick Format Tools */}
      <div className="flex items-center gap-1">
        {/* Undo & Redo */}
        <div className="flex items-center gap-0.5 mr-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

        {/* B, I, U, S */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onExecCommand("bold")}
            className="p-1 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand("italic")}
            className="p-1 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 italic transition-all"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand("underline")}
            className="p-1 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 underline transition-all"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand("strikeThrough")}
            className="p-1 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 line-through transition-all"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

        {/* Highlight & Text color */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => onExecCommand("hiliteColor", highlightColor)}
            className="p-1 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-all"
            title="Highlight selection"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          </button>

          <button
            onClick={() => onExecCommand("foreColor", "#4f46e5")}
            className="p-1 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-all"
            title="Text colour"
          >
            <Palette className="w-3.5 h-3.5 text-elite-600" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

        {/* Indent controls */}
        <div className="hidden md:flex items-center gap-0.5">
          <button
            onClick={() => onExecCommand("outdent")}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Outdent Left"
          >
            <Outdent className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand("indent")}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Indent Right"
          >
            <Indent className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Save State */}
      <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-500 font-mono whitespace-nowrap">
        {isSaving ? (
          <span className="text-amber-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Saving…
          </span>
        ) : (
          <span className="text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Saved on this device
          </span>
        )}
      </div>

      {/* Right: Word Count, Page Count, Zoom */}
      <div className="flex items-center gap-3 text-slate-500 text-[11px] font-medium whitespace-nowrap">
        <span>{(wordCount || 0).toLocaleString()} words</span>
        <span>•</span>
        <span>Page {Math.min(currentPage, pageCount || 1)} of {pageCount || 1}</span>

        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onZoomChange(Math.max(50, zoomLevel - 10))}
            disabled={zoomLevel <= 50}
            className="p-1 hover:text-slate-800 dark:hover:text-white disabled:opacity-30"
            title="Zoom out" aria-label="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button onClick={() => onZoomChange(100)} className="font-mono text-[10px] w-9 text-center hover:text-slate-800 dark:hover:text-white" title="Reset zoom">{zoomLevel}%</button>
          <button
            onClick={() => onZoomChange(Math.min(200, zoomLevel + 10))}
            disabled={zoomLevel >= 200}
            className="p-1 hover:text-slate-800 dark:hover:text-white disabled:opacity-30"
            title="Zoom in" aria-label="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>
    </footer>
  );
};
