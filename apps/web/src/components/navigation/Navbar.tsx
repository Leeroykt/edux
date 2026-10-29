import React from "react";
import { Logo } from "../brand/Logo";
import {
  FileText,
  BarChart3,
  ShieldCheck,
  FolderKanban,
  Download,
  CreditCard,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { UsageSummary } from "@edux/schema";

export type NavTab = "editor" | "report" | "individual_dash" | "edu_pro_dash" | "pricing";

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  documentTitle: string;
  usage: UsageSummary | null;
  onExportClick: () => void;
  isSaving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  documentTitle,
  usage,
  onExportClick,
  isSaving = false,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "editor", label: "Editor", icon: <FileText className="w-4 h-4" /> },
    { id: "report", label: "Similarity & AI Report", icon: <ShieldCheck className="w-4 h-4" />, badge: "16%" },
    { id: "individual_dash", label: "My Papers", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "edu_pro_dash", label: "Edu Pro Board", icon: <FolderKanban className="w-4 h-4" />, badge: "Pro" },
    { id: "pricing", label: "Plans & Limits", icon: <CreditCard className="w-4 h-4" /> },
  ];

  const wordsPercentage = usage
    ? Math.min(100, Math.round((usage.wordsScoredToday / usage.dailyWordCap) * 100))
    : 0;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Left: Brand Logo & Document Title */}
      <div className="flex items-center gap-5">
        <Logo size="sm" showTagline={false} />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-2">
          <div className="max-w-[220px] lg:max-w-xs truncate text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100" title={documentTitle}>
            {documentTitle}
          </div>
          <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            {isSaving ? (
              <span className="text-amber-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Saving...
              </span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Synced
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
        {tabs.map((t) => {
          const isActive = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-slate-900/5 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/40"
              }`}
            >
              {t.icon}
              <span className="hidden md:inline">{t.label}</span>
              {t.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                    t.id === "report"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Usage Meter, Export Button, Profile */}
      <div className="flex items-center gap-3">
        {usage && (
          <div
            onClick={() => onTabChange("pricing")}
            className="hidden lg:flex flex-col cursor-pointer bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between text-[11px] gap-3">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" /> Daily Quota
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {wordsPercentage}%
              </span>
            </div>
            <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  wordsPercentage > 85
                    ? "bg-rose-500"
                    : wordsPercentage > 60
                    ? "bg-amber-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${wordsPercentage}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-semibold shadow-sm shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export .docx</span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-teal-400 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 dark:ring-slate-800 shadow-sm">
            AH
          </div>
        </div>
      </div>
    </header>
  );
};
