import React, { useEffect, useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { X, Check, Sigma, AlertCircle } from "lucide-react";

interface LatexEquationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEquation: (latex: string) => void;
  initialLatex?: string;
}

export const LatexEquationModal: React.FC<LatexEquationModalProps> = ({
  isOpen,
  onClose,
  onSaveEquation,
  initialLatex = "Attention(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V",
}) => {
  const [latex, setLatex] = useState(initialLatex);

  // Start from the current equation each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setLatex(initialLatex);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, initialLatex, onClose]);

  const rendered = useMemo(() => {
    try {
      return { html: katex.renderToString(latex, { displayMode: true, throwOnError: true }), error: null as string | null };
    } catch (err: any) {
      return { html: "", error: String(err?.message || "This formula could not be read.").replace(/^KaTeX parse error: /, "") };
    }
  }, [latex]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Formula editor" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Formula editor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Type LaTeX and see the result as you type
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Live KaTeX Render Box */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Formula Live Preview
            </label>
            <div className="min-h-24 p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-center overflow-x-auto">
              {rendered.error ? (
                <span className="text-xs text-slate-400">Preview unavailable until the formula is valid.</span>
              ) : (
                <div
                  className="text-slate-800 dark:text-slate-100"
                  aria-label="Formula preview"
                  dangerouslySetInnerHTML={{ __html: rendered.html }}
                />
              )}
            </div>
          </div>

          {/* LaTeX Input Textarea */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              LaTeX Code
            </label>
            <textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={3}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Type LaTeX here..."
            />
          </div>

          {/* Preset Formulas Chips */}
          <div>
            <span className="text-[11px] text-slate-400 font-medium block mb-1.5">
              Quick Samples:
            </span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() =>
                  setLatex(
                    "\\sigma(z) = \\frac{1}{1 + e^{-z}}"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-mono transition-colors"
              >
                Sigmoid
              </button>
              <button
                type="button"
                onClick={() =>
                  setLatex(
                    "\\mathcal{L}_{\\text{cross}} = -\\sum_{i=1}^{N} y_i \\log(\\hat{y}_i)"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-mono transition-colors"
              >
                Cross Entropy
              </button>
              <button
                type="button"
                onClick={() =>
                  setLatex(
                    "E = m c^2"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-mono transition-colors"
              >
                Relativity
              </button>
            </div>
          </div>

          {rendered.error ? (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{rendered.error}</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              The formula is kept as LaTeX in the editor. Exporting it as a native Word equation is not available yet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!!rendered.error || !latex.trim()}
            onClick={() => {
              onSaveEquation(latex);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save formula</span>
          </button>
        </div>
      </div>
    </div>
  );
};
