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
      <div className="flex items-center gap-1 text-[11px] text-slate-500">
        <span className="hidden sm:inline">Click a sentence to review it. Use the toolbar above to align a paragraph.</span>
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
