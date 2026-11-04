"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export type ToastKind = "success" | "info" | "error";

interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (text: string, options?: { kind?: ToastKind; action?: Toast["action"]; ms?: number }) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

/* ------------------------------------------------------------------ */
/* Confirmation dialog                                                 */
/* ------------------------------------------------------------------ */

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" is for things that cannot be undone. */
  tone?: "default" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn>(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (text, options = {}) => {
      const id = nextId.current++;
      const kind = options.kind ?? "info";
      setToasts((prev) => [...prev.slice(-3), { id, text, kind, action: options.action }]);
      setTimeout(() => dismiss(id), options.ms ?? (kind === "error" ? 8000 : 4500));
    },
    [dismiss]
  );

  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })),
    []
  );

  const close = (ok: boolean) => {
    dialog?.resolve(ok);
    setDialog(null);
  };

  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) return;
    // Destructive actions start on "Cancel" so a stray Enter cannot delete anything.
    (dialog.tone === "danger" ? cancelRef.current : confirmRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dialog.resolve(false);
        setDialog(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  const icon = (kind: ToastKind) =>
    kind === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    ) : kind === "error" ? (
      <XCircle className="w-4 h-4 text-rose-300 shrink-0" />
    ) : (
      <Info className="w-4 h-4 text-sky-300 shrink-0" />
    );

  return (
    <ToastContext.Provider value={{ show }}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* Toasts */}
        <div
          aria-live="polite"
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-[min(92vw,26rem)] pointer-events-none"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={`pointer-events-auto w-full flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium shadow-2xl border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                t.kind === "error"
                  ? "bg-rose-700 text-white border-rose-500"
                  : "bg-slate-900 text-white border-slate-700"
              }`}
            >
              {icon(t.kind)}
              <span className="flex-1 leading-relaxed">{t.text}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="font-bold text-elite-300 hover:text-white underline underline-offset-2 shrink-0"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-white/60 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Confirmation */}
        {dialog && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close(false);
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    dialog.tone === "danger"
                      ? "bg-rose-100 dark:bg-rose-950 text-rose-600"
                      : "bg-elite-50 dark:bg-elite-950 text-elite-600"
                  }`}
                >
                  {dialog.tone === "danger" ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                <div className="space-y-1.5">
                  <h2 id="confirm-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {dialog.title}
                  </h2>
                  <div id="confirm-message" className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {dialog.message}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  ref={cancelRef}
                  onClick={() => close(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-elite-500"
                >
                  {dialog.cancelLabel ?? "Cancel"}
                </button>
                <button
                  ref={confirmRef}
                  onClick={() => close(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                    dialog.tone === "danger"
                      ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                      : "bg-elite-600 hover:bg-elite-700 focus:ring-elite-500"
                  }`}
                >
                  {dialog.confirmLabel ?? "Continue"}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
};
