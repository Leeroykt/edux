import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, X, Sparkles, Check } from "lucide-react";

interface HelpTooltipProps {
  title: string;
  explanation: string;
  tip?: string;
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  explanation,
  tip,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-4 h-4 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 hover:text-elite-600 dark:hover:text-elite-400 hover:bg-elite-50 dark:hover:bg-elite-950 flex items-center justify-center transition-all cursor-pointer select-none"
        title={`Click for help: ${title}`}
      >
        <HelpCircle className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-elite z-50 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-elite-600 dark:text-elite-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {explanation}
          </p>

          {tip && (
            <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 leading-normal">
              <strong>Tip:</strong> {tip}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-elite-600 text-white font-bold text-[11px] hover:bg-elite-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
