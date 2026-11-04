"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,

  FolderOpen,
  Globe2,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  PanelRight,
  Plus,
  Redo2,
  RefreshCw,
  Sigma,
  SlidersHorizontal,
  Table as TableIcon,
  Type,
  Undo2,
  Wand2,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { DIALECTS, Dialect, dialectLabel } from "../../lib/dialect";

export type Align = "left" | "center" | "right" | "justify";

export type ViewMode = "original_flags" | "humanised_preview" | "split" | "clean";

const Menu: React.FC<{
  label: React.ReactNode;
  title: string;
  align?: "left" | "right";
  children: (close: () => void) => React.ReactNode;
  active?: boolean;
}> = ({ label, title, align = "left", children, active }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
          active || open
            ? "border-elite-500 bg-elite-50 dark:bg-elite-950/50 text-elite-800 dark:text-elite-200"
            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        {label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 min-w-[220px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

const Item: React.FC<{ icon?: React.ElementType; label: string; hint?: string; onClick: () => void; checked?: boolean }> = ({
  icon: Icon,
  label,
  hint,
  onClick,
  checked,
}) => (
  <button
    role="menuitem"
    onClick={onClick}
    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
  >
    {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
    <span className="flex-1">
      {label}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </span>
    {checked && <Check className="w-4 h-4 text-elite-600" />}
  </button>
);

const VIEWS: { id: ViewMode; label: string; hint: string }[] = [
  { id: "original_flags", label: "Review", hint: "See what needs attention" },
  { id: "humanised_preview", label: "Preview", hint: "See rewrites in place" },
  { id: "clean", label: "Clean", hint: "Read it without marks" },
];

const FONTS = ["Newsreader", "Times New Roman", "Georgia", "Arial", "Calibri"];
const SIZES: [string, string][] = [["2", "10 pt"], ["3", "12 pt"], ["4", "14 pt"], ["5", "18 pt"]];

interface Props {
  title: string;
  isSaving: boolean;
  onOpenDocPicker: () => void;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  flaggedCount: number;
  threshold: number;
  onThreshold: (v: number) => void;
  onInsertImage: () => void;
  onInsertTable: () => void;
  onInsertFormula: () => void;
  fontFamily: string;
  onFontFamily: (f: string) => void;
  fontSize: string;
  onFontSize: (s: string) => void;
  paperTheme: "white" | "dark";
  onPaperTheme: () => void;
  dialect: Dialect;
  onDialect: (d: Dialect) => void;
  spellingIssues: number;
  onConvertSpelling: () => void;
  onRescan: () => void;
  isRescanning: boolean;
  onApplyAll: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  focus: boolean;
  onFocus: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  /** Alignment of the paragraph being edited, if one is selected. */
  alignment?: Align;
  canAlign: boolean;
  onAlign: (a: Align) => void;
  onJustifyAll: () => void;
}

export const EditorToolbar: React.FC<Props> = (p) => {
  return (
    <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur px-3 sm:px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Document */}
      <div className="flex items-center gap-2 min-w-0 mr-1">
        <button
          onClick={p.onOpenDocPicker}
          title="Switch document"
          className="flex items-center gap-2 min-w-0 rounded-lg px-2 py-1.5 hover:bg-slate-200/70 dark:hover:bg-slate-800"
        >
          <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate max-w-[10rem] sm:max-w-[16rem] text-sm font-semibold text-slate-900 dark:text-white">{p.title}</span>
        </button>
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap" aria-live="polite">
          <span className={`w-1.5 h-1.5 rounded-full ${p.isSaving ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          {p.isSaving ? "Saving…" : "Saved"}
        </span>
      </div>

      {!p.focus && (
        <>
          {/* View */}
          <div role="tablist" aria-label="View" className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={p.viewMode === v.id}
                title={v.hint}
                onClick={() => p.onViewMode(v.id)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  p.viewMode === v.id ? "bg-elite-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {p.flaggedCount > 0 && (
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{p.flaggedCount} to review</span>
          )}

          {p.viewMode === "humanised_preview" && p.flaggedCount > 0 && (
            <button onClick={p.onApplyAll} className="flex items-center gap-1.5 rounded-lg bg-elite-600 hover:bg-elite-700 text-white px-3 py-1.5 text-xs font-semibold">
              <Wand2 className="w-3.5 h-3.5" /> Apply checked rewrites
            </button>
          )}

          <div className="hidden md:block h-5 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Tools */}
          <div className="flex items-center gap-1.5">
            <button onClick={p.onUndo} disabled={!p.canUndo} aria-label="Undo" title="Undo (Ctrl Z)" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={p.onRedo} disabled={!p.canRedo} aria-label="Redo" title="Redo (Ctrl Y)" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30">
              <Redo2 className="w-4 h-4" />
            </button>

            <div role="group" aria-label="Paragraph alignment" className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
              {([
                { id: "left", label: "Align left", icon: AlignLeft },
                { id: "center", label: "Centre", icon: AlignCenter },
                { id: "right", label: "Align right", icon: AlignRight },
                { id: "justify", label: "Justify", icon: AlignJustify },
              ] as const).map((a) => (
                <button
                  key={a.id}
                  onClick={() => p.onAlign(a.id)}
                  disabled={!p.canAlign}
                  aria-label={a.label}
                  aria-pressed={p.alignment === a.id}
                  title={p.canAlign ? a.label : "Click a paragraph first"}
                  className={`p-1.5 rounded-md ${
                    p.alignment === a.id ? "bg-elite-600 text-white" : "text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                  } disabled:opacity-40 disabled:hover:bg-transparent`}
                >
                  <a.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <Menu title="Insert" label={<><Plus className="w-3.5 h-3.5" /> Insert</>}>
              {(close) => (
                <>
                  <Item icon={ImageIcon} label="Image or figure" hint="With caption and cropping" onClick={() => { close(); p.onInsertImage(); }} />
                  <Item icon={TableIcon} label="Table" onClick={() => { close(); p.onInsertTable(); }} />
                  <Item icon={Sigma} label="Formula" hint="Type LaTeX, see it live" onClick={() => { close(); p.onInsertFormula(); }} />
                </>
              )}
            </Menu>

            <Menu title="Page appearance" label={<><Type className="w-3.5 h-3.5" /> Page</>}>
              {(close) => (
                <div className="p-1.5 space-y-3 w-60">
                  <div>
                    <label htmlFor="tb-font" className="block text-[11px] font-semibold text-slate-500 mb-1">Font</label>
                    <select id="tb-font" value={p.fontFamily} onChange={(e) => p.onFontFamily(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
                      {FONTS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tb-size" className="block text-[11px] font-semibold text-slate-500 mb-1">Text size</label>
                    <select id="tb-size" value={p.fontSize} onChange={(e) => p.onFontSize(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
                      {SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <button onClick={() => { close(); p.onJustifyAll(); }} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                    Justify all body text
                  </button>
                  <button onClick={() => { p.onPaperTheme(); close(); }} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                    {p.paperTheme === "white" ? "Use a dark page" : "Use a light page"}
                  </button>
                </div>
              )}
            </Menu>

            <Menu title="How strict the checks are" label={<><SlidersHorizontal className="w-3.5 h-3.5" /> Strictness</>}>
              {() => (
                <div className="p-2 w-64 space-y-2">
                  <label htmlFor="tb-thr" className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Flag sentences above <span className="font-mono">{Math.round(p.threshold * 100)}%</span>
                  </label>
                  <input id="tb-thr" type="range" min="0.2" max="0.85" step="0.05" value={p.threshold} onChange={(e) => p.onThreshold(parseFloat(e.target.value))} className="w-full accent-elite-600" />
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Flag more</span>
                    <span>Flag fewer</span>
                  </div>
                </div>
              )}
            </Menu>

            <Menu
              title="English variant"
              active={p.spellingIssues > 0}
              label={<><Globe2 className="w-3.5 h-3.5" /> {p.dialect === "en-GB" ? "British" : "American"}{p.spellingIssues > 0 && <span className="ml-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5">{p.spellingIssues}</span>}</>}
            >
              {(close) => (
                <>
                  {DIALECTS.map((d) => (
                    <Item key={d.id} label={d.label} hint={d.example} checked={p.dialect === d.id} onClick={() => { p.onDialect(d.id); close(); }} />
                  ))}
                  {p.spellingIssues > 0 && (
                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <Item
                        icon={Wand2}
                        label={`Convert ${p.spellingIssues} word${p.spellingIssues === 1 ? "" : "s"} to ${dialectLabel(p.dialect)}`}
                        hint="You will be asked to confirm"
                        onClick={() => { close(); p.onConvertSpelling(); }}
                      />
                    </div>
                  )}
                </>
              )}
            </Menu>
          </div>
        </>
      )}

      {/* Right group */}
      <div className="ml-auto flex items-center gap-1.5">
        {!p.focus && (
          <button
            onClick={p.onRescan}
            disabled={p.isRescanning}
            title="Score the whole document again"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${p.isRescanning ? "animate-spin" : ""}`} />
            Re-check
          </button>
        )}
        <button onClick={p.onFocus} aria-pressed={p.focus} title={p.focus ? "Leave focus mode" : "Focus mode: just you and the page"} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          {p.focus ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{p.focus ? "Exit focus" : "Focus"}</span>
        </button>
        {!p.focus && (
          <button onClick={p.onToggleInspector} aria-pressed={p.inspectorOpen} aria-label="Toggle review panel" title="Review panel" className={`p-1.5 rounded-lg border ${p.inspectorOpen ? "border-elite-500 text-elite-700 dark:text-elite-300 bg-elite-50 dark:bg-elite-950/50" : "border-slate-200 dark:border-slate-700 text-slate-500"} hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <PanelRight className="w-4 h-4" />
          </button>
        )}
        <button onClick={p.onExport} className="flex items-center gap-1.5 rounded-lg bg-elite-600 hover:bg-elite-700 text-white px-3.5 py-1.5 text-xs font-semibold">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>
    </div>
  );
};


