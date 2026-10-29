import React, { useState } from "react";
import { Logo } from "../brand/Logo";
import {
  FileText,
  BarChart3,
  ShieldCheck,
  FolderKanban,
  Download,
  CreditCard,
  Sparkles,
  UploadCloud,
  Menu,
  X
} from "lucide-react";
import { UsageSummary } from "@edux/schema";

export type NavTab = "editor" | "report" | "individual_dash" | "edu_pro_dash" | "pricing";

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  documentTitle: string;
  usage: UsageSummary | null;
  onExportClick: () => void;
  onUploadClick: () => void;
  isSaving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  documentTitle,
  usage,
  onExportClick,
  onUploadClick,
  isSaving = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    { id: "editor", label: "Humaniser Editor", icon: <FileText className="w-4 h-4" /> },
    {
      id: "report",
      label: "Similarity / Plagiarism",
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: "16% Match",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
    },
    { id: "individual_dash", label: "My Papers", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "edu_pro_dash", label: "Edu Pro Board", icon: <FolderKanban className="w-4 h-4" />, badge: "Pro", badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" },
    { id: "pricing", label: "Plans", icon: <CreditCard className="w-4 h-4" /> },
  ];

  const wordsPercentage = usage
    ? Math.min(100, Math.round((usage.wordsScoredToday / usage.dailyWordCap) * 100))
    : 0;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Left: Brand Logo & Upload Shortcut */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Logo size="sm" showTagline={false} />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Upload Button: Prominent & unmistakable */}
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Upload Word Document (.docx)"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload .docx</span>
        </button>

        <div className="hidden xl:flex items-center gap-2 max-w-[200px] truncate text-xs font-medium text-slate-500">
          <span className="truncate">{documentTitle}</span>
          {isSaving ? (
            <span className="text-amber-500 text-[10px] flex items-center gap-1">● Saving</span>
          ) : (
            <span className="text-emerald-500 text-[10px] flex items-center gap-1">● Synced</span>
          )}
        </div>
      </div>

      {/* Center: Desktop Navigation Tabs */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
        {tabs.map((t) => {
          const isActive = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-slate-900/5"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${t.badgeColor || "bg-indigo-100 text-indigo-700"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Export Button, Usage Quota, Mobile Menu Trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {usage && (
          <div
            onClick={() => onTabChange("pricing")}
            className="hidden sm:flex flex-col cursor-pointer bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
            title="View Daily Cap & Upgrades"
          >
            <div className="flex items-center justify-between text-[11px] gap-3">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" /> Quota
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {wordsPercentage}%
              </span>
            </div>
            <div className="w-24 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  wordsPercentage > 85 ? "bg-rose-500" : "bg-indigo-600"
                }`}
                style={{ width: `${wordsPercentage}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 active:scale-95 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shadow-xl z-50 flex flex-col gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onTabChange(t.id);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                currentTab === t.id
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {t.icon}
                <span>{t.label}</span>
              </div>
              {t.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.badgeColor || "bg-indigo-100 text-indigo-700"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
