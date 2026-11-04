import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  iconOnly?: boolean;
}

const ICON = { sm: "w-7 h-7", md: "w-9 h-9", lg: "w-11 h-11", xl: "w-14 h-14" } as const;
const TEXT = { sm: "text-xl", md: "text-2xl", lg: "text-3xl", xl: "text-4xl" } as const;

/** A page with a check: written, then checked. */
export const Logo: React.FC<LogoProps> = ({ className = "", size = "md", showTagline = false, iconOnly = false }) => (
  <div className={`flex items-center gap-2.5 select-none ${className}`}>
    <div className={`${ICON[size]} shrink-0 rounded-xl bg-elite-600 text-white flex items-center justify-center shadow-sm`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" className="w-[62%] h-[62%]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z" />
        <path d="M14 3.5V8h4" />
        <path d="m9 14.2 2 2 4-4.4" />
      </svg>
    </div>
    {!iconOnly && (
      <div className="flex flex-col leading-none">
        <span className={`${TEXT[size]} font-serif font-semibold tracking-tight text-slate-900 dark:text-white`}>
          edu<span className="text-elite-600 dark:text-elite-400">X</span>
        </span>
        {showTagline && <span className="mt-1 text-[11px] font-medium text-slate-500">Write well. Check it. Own it.</span>}
      </div>
    )}
  </div>
);
