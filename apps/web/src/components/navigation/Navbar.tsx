"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Home,
  ChevronDown,
  FolderOpen
} from "lucide-react";
import { UsageSummary, User } from "@edux/schema";
import { AuthModal } from "./AuthModal";
import { apiClient } from "../../services/api/apiClient";

interface NavbarProps {
  documentTitle?: string;
  usage?: UsageSummary | null;
  onExportClick?: () => void;
  onUploadClick?: () => void;
  onOpenDocPicker?: () => void;
  isSaving?: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  documentTitle = "Academic Manuscript.docx",
  usage,
  onExportClick,
  onUploadClick,
  onOpenDocPicker,
  isSaving = false,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  React.useEffect(() => {
    const user = apiClient.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    } else if (apiClient.getToken()) {
      apiClient.getMe().then((res) => {
        if (res && res.user) setCurrentUser(res.user);
      }).catch(() => {});
    }
  }, []);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
    { href: "/edit", label: "Word Editor", icon: <FileText className="w-4 h-4" /> },
    { href: "/report", label: "Similarity", icon: <ShieldCheck className="w-4 h-4" />, badge: "16%" },
    { href: "/edupro", label: "Edu Pro Board", icon: <FolderKanban className="w-4 h-4" />, badge: "Pro" },
    { href: "/plans", label: "Plans", icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shadow-2xs select-none">
      {/* 1. Left: Brand Logo & Breadcrumb / Document State */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo size="sm" showTagline={false} />
        </Link>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Active Document Breadcrumb on /edit */}
        <div className="flex items-center gap-2">
          {pathname === "/edit" ? (
            <>
              <div
                className="max-w-[130px] sm:max-w-xs md:max-w-sm truncate text-xs font-bold text-slate-800 dark:text-slate-100"
                title={documentTitle}
              >
                {documentTitle}
              </div>

              {onOpenDocPicker && (
                <button
                  onClick={onOpenDocPicker}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-elite-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 hover:text-elite-600 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Switch or browse documents"
                >
                  <FolderOpen className="w-3 h-3 text-elite-600" />
                  <span className="hidden sm:inline">Docs</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              )}

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
            </>
          ) : (
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden sm:block">
              {(pathname === "/" || pathname === "/dashboard") && "Overview & Document Manager"}
              {pathname === "/report" && "Turnitin-Style Plagiarism Report"}
              {pathname === "/edupro" && "Institutional Review Board"}
              {pathname === "/plans" && "Subscription & Plan Limits"}
            </div>
          )}
        </div>
      </div>

      {/* 2. Right: Quick Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action: Upload */}
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-elite-50 hover:text-elite-600 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
            title="Upload .docx file"
          >
            <UploadCloud className="w-3.5 h-3.5 text-elite-600" />
            <span className="hidden sm:inline">Upload .docx</span>
          </button>
        )}

        {/* Quick Action: Export (Visible on /edit) */}
        {onExportClick && (
          <button
            onClick={onExportClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-sm shadow-elite-600/20 active:scale-95 transition-all"
            title="Export Word Document"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Dark Mode Switcher */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? "Light Mode" : "Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile Avatar with Plan Badge */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 pl-1 select-none group cursor-pointer"
          title="Account, Session & Plan Quota"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-elite-600 to-teal-400 text-white flex items-center justify-center font-bold text-xs ring-2 ring-elite-100 dark:ring-slate-800 shadow-xs group-hover:scale-105 transition-transform">
            {currentUser?.name
              ? currentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "AH"}
          </div>
          <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-elite-50 dark:bg-elite-950 text-elite-700 dark:text-elite-300 border border-elite-200 dark:border-elite-800">
            {currentUser?.planType === "edu_pro" ? "Edu Pro" : "Individual"}
          </span>
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
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shadow-xl z-50 flex flex-col gap-2 animate-in fade-in">
          {navLinks.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold ${
                pathname === t.href
                  ? "bg-elite-600 text-white"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {t.icon}
                <span>{t.label}</span>
              </div>
              {t.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/20">
                  {t.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Account & Session Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => setCurrentUser(u)}
      />
    </header>
  );
};