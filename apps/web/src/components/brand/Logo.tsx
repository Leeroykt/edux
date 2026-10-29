import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = "",
  size = "md",
  showTagline = false,
  iconOnly = false,
}) => {
  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-11 h-11",
    xl: "w-14 h-14",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Dynamic SVG Icon Emblem */}
      <div
        className={`relative ${iconSizes[size]} flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 shadow-md shadow-indigo-950/20 ring-1 ring-white/15 overflow-hidden group`}
      >
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/30 to-teal-400/20 opacity-80 group-hover:opacity-100 transition-opacity" />

        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5 relative z-10 drop-shadow-sm"
        >
          {/* Document Fold Silhouette */}
          <path
            d="M6 8C6 6.34315 7.34315 5 9 5H18L26 13V24C26 25.6569 24.6569 27 23 27H9C7.34315 27 6 25.6569 6 24V8Z"
            fill="url(#doc_grad)"
            fillOpacity="0.3"
            stroke="url(#stroke_grad)"
            strokeWidth="1.2"
          />
          {/* Fold Corner */}
          <path
            d="M18 5V11C18 12.1046 18.8954 13 20 13H26"
            stroke="url(#stroke_grad)"
            strokeWidth="1.2"
          />

          {/* Precision Cross / 'X' Mark symbolizing Verification & Integrity */}
          <path
            d="M11 14L21 24"
            stroke="url(#x_grad_1)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M21 14L11 24"
            stroke="url(#x_grad_2)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Central AI spark indicator */}
          <circle cx="16" cy="19" r="1.5" fill="#38bdf8" className="animate-pulse" />

          <defs>
            <linearGradient id="doc_grad" x1="6" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="stroke_grad" x1="6" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a5b4fc" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="x_grad_1" x1="11" y1="14" x2="21" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="x_grad_2" x1="21" y1="14" x2="11" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818cf8" />
              <stop offset="1" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Text */}
      {!iconOnly && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-tight font-bold">
            <span className={`${textSizes[size]} text-slate-900 dark:text-white font-sans font-extrabold tracking-tight`}>
              edu
            </span>
            <span
              className={`${textSizes[size]} bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 bg-clip-text text-transparent font-sans font-black ml-0.5`}
            >
              X
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
              v1.0
            </span>
          </div>

          {showTagline && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              Document Fidelity & Academic Integrity
            </span>
          )}
        </div>
      )}
    </div>
  );
};
