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
  X,
  Sun,
  Moon,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { UsageSummary } from "@edux/schema";
import { HelpTooltip } from "../ui/HelpTooltip";

export type NavTab = "editor" | "report" | "individual_dash" | "edu_pro_dash" | "pricing";

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  documentTitle: string;
  usage: UsageSummary | null;
  onExportClick: () => void;
  onUploadClick: () => void;
  isSaving?: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  documentTitle,
  usage,
  onExportClick,
  onUploadClick,
  isSaving = false,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "editor", label: "Word Editor", icon: <FileText className="w-4 h-4" /> },
    {
      id: "report",
      label: "Similarity & Plagiarism",
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: "16%"
    },
    { id: "individual_dash", label: "My Papers", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "edu_pro_dash", label: "Edu Pro Board", icon: <FolderKanban className="w-4 h-4" />, badge: "Pro" },
    { id: "pricing", label: "Plans", icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shadow-2xs">
      {/* 1. Left: Brand Logo & Active State */}
      <div className="flex items-center gap-4">
        <Logo size="sm" showTagline={false} />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Active Document State Pill */}
        <div className="flex items-center gap-2">
          <div className="max-w-[180px] sm:max-w-xs truncate text-xs font-bold text-slate-800 dark:text-slate-100" title={documentTitle}>
            {documentTitle}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {isSaving ? (
              <span className="text-amber-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Saving...
              </span>
            ) : (
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Synced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Center: Streamlined View Switcher */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
        {tabs.map((t) => {
          const isActive = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-elite-600 dark:text-elite-400 shadow-sm shadow-slate-900/5 font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-elite-100 text-elite-700 dark:bg-elite-950 dark:text-elite-300">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Quick Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action: Upload */}
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-elite-50 hover:text-elite-600 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
          title="Upload .docx file"
        >
          <UploadCloud className="w-3.5 h-3.5 text-elite-600" />
          <span className="hidden sm:inline">Upload .docx</span>
        </button>

        {/* Quick Action: Export */}
        <button
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-sm shadow-elite-600/20 active:scale-95 transition-all"
          title="Export Word Document"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Dark Mode Switcher */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? "Light Mode" : "Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile Avatar with Plan Badge */}
        <div
          onClick={() => onTabChange("pricing")}
          className="flex items-center gap-2 pl-1 cursor-pointer select-none group"
          title="Account & Plan Quota"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-elite-600 to-teal-400 text-white flex items-center justify-center font-bold text-xs ring-2 ring-elite-100 dark:ring-slate-800 shadow-xs group-hover:scale-105 transition-transform">
            AH
          </div>
          <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-elite-50 dark:bg-elite-950 text-elite-700 dark:text-elite-300 border border-elite-200 dark:border-elite-800">
            Individual
          </span>
        </div>

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
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shadow-xl z-50 flex flex-col gap-2 animate-in fade-in">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onTabChange(t.id);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold ${
                currentTab === t.id
                  ? "bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-400 font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {t.icon}
                <span>{t.label}</span>
              </div>
              {t.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-elite-100 text-elite-700">
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
