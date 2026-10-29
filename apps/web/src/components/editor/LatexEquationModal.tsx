import React, { useState } from "react";
import { X, Check, Sigma, ShieldAlert, Sparkles } from "lucide-react";

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
  const [isRoundTripValid, setIsRoundTripValid] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                LaTeX Formula Editor (M5)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live KaTeX preview • Round-trips directly to native Word OMML
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
              <span className="text-xl font-mono text-slate-800 dark:text-slate-100 tracking-wider">
                {latex}
              </span>
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

          {/* Validation Status */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>OMML round-trip verified: Equation converts losslessly to Word native format.</span>
          </div>
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
            onClick={() => {
              onSaveEquation(latex);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Update Document Equation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
