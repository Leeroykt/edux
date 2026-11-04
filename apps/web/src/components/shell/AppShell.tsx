"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileText,
  HelpCircle,
  LogIn,
  LogOut,
  Moon,
  PenLine,
  Search,
  Settings,
  Sun,
  UploadCloud,
  UserCircle,
  Users,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { AuthModal } from "../navigation/AuthModal";
import { UploadDocxModal } from "../editor/UploadDocxModal";
import { CommandPalette } from "./CommandPalette";
import { Onboarding } from "./Onboarding";
import { SessionProvider, useSession } from "../../hooks/useSession";
import { useTheme } from "../../services/theme/themeContext";
import { useConfirm, useToast } from "../ui/feedback";
import { DocumentMeta, DocumentParagraphNode } from "@edux/schema";

/** Pages that only make sense for a signed-in writer. */
const PROTECTED = ["/documents", "/settings", "/edupro"];

const TITLES: Record<string, string> = {
  "/documents": "Documents",
  "/edit": "Write",
  "/settings": "Settings",
  "/edupro": "Team",
  "/report": "Sources",
  "/help": "Help",
};

export function emitCommand(id: string) {
  window.dispatchEvent(new CustomEvent("edux:command", { detail: id }));
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [uploadOpen, setUploadOpen] = useState(false);

  const openAuth = useCallback((mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);
  const openUpload = useCallback(() => setUploadOpen(true), []);

  return (
    <SessionProvider onOpenAuth={openAuth} onOpenUpload={openUpload}>
      <ShellFrame>{children}</ShellFrame>
      <AuthGate open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
      <UploadGate open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </SessionProvider>
  );
};

/** Wires the shared sign-in dialog to the session. */
const AuthGate: React.FC<{ open: boolean; mode: "login" | "register"; onClose: () => void }> = ({ open, mode, onClose }) => {
  const { setUser } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <AuthModal
      isOpen={open}
      initialMode={mode}
      onClose={onClose}
      onAuthSuccess={(u) => {
        setUser(u);
        onClose();
        if (pathname === "/") router.push("/documents");
      }}
    />
  );
};

/** One upload dialog for the whole app. The open editor hears about the result through an event. */
const UploadGate: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { completeStep } = useSession();
  return (
    <UploadDocxModal
      isOpen={open}
      onClose={onClose}
      onDocumentLoaded={(doc: DocumentMeta, paragraphs: DocumentParagraphNode[], equations) => {
        completeStep("uploaded");
        window.dispatchEvent(new CustomEvent("edux:document-loaded", { detail: { doc, paragraphs, equations } }));
      }}
    />
  );
};

const ShellFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, ready, usage, openAuth, openUpload, signOut, setUser } = useSession();
  const toast = useToast();
  const { resolvedTheme, toggleTheme } = useTheme();
  const confirm = useConfirm();

  const isEditor = pathname.startsWith("/edit");
  const [railOpen, setRailOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // The editor gets the room: the rail starts as icons there, and on narrow screens everywhere.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1100px)").matches;
    setRailOpen(wide && !isEditor);
  }, [isEditor]);

  // Ctrl/Cmd+K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // The server ended the session (it expired or was revoked): say so, and offer to sign back in.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      toast.show("Your session ended, so you have been signed out. Sign in again to carry on.", {
        kind: "error",
        ms: 12000,
        action: { label: "Sign in", onClick: () => openAuth("login") },
      });
    };
    window.addEventListener("edux:session-expired", onExpired);
    return () => window.removeEventListener("edux:session-expired", onExpired);
  }, [setUser, toast, openAuth]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      title: "Sign out of eduX?",
      message: "Your documents stay saved. You can sign back in at any time.",
      confirmLabel: "Sign out",
    });
    if (!ok) return;
    await signOut();
    router.push("/");
  };

  const nav = [
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/edit", label: "Write", icon: PenLine },
    ...(user?.planType === "edu_pro" ? [{ href: "/edupro", label: "Team", icon: Users }] : []),
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const title = TITLES[Object.keys(TITLES).find((k) => isActive(k)) || ""] || "";
  const needsSignIn = PROTECTED.some((p) => isActive(p)) && ready && !user;
  const usagePct = usage && usage.dailyWordCap > 0 ? Math.min(100, Math.round((usage.wordsScoredToday / usage.dailyWordCap) * 100)) : null;
  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const railItem = (href: string, label: string, Icon: React.ElementType) => (
    <Link
      key={href}
      href={href}
      title={railOpen ? undefined : label}
      aria-current={isActive(href) ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive(href)
          ? "bg-elite-600 text-white shadow-sm"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
      } ${railOpen ? "" : "justify-center px-0"}`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      {railOpen && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <div className="h-dvh flex bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-elite-600 focus:text-white focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      {/* Rail (hidden on phones) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-[width] duration-200 ${
          railOpen ? "w-56" : "w-[68px]"
        }`}
      >
        <div className={`h-14 flex items-center border-b border-slate-200 dark:border-slate-800 ${railOpen ? "px-4" : "justify-center"}`}>
          <Link href={user ? "/documents" : "/"} aria-label="eduX home">
            <Logo size="sm" iconOnly={!railOpen} showTagline={false} />
          </Link>
        </div>

        <nav className="flex-1 p-2.5 space-y-1" aria-label="Main">
          {nav.map((n) => railItem(n.href, n.label, n.icon))}
        </nav>

        <div className="p-2.5 space-y-1 border-t border-slate-200 dark:border-slate-800">
          {railItem("/settings", "Settings", Settings)}
          {railItem("/help", "Help", HelpCircle)}
          <button
            onClick={() => setRailOpen((o) => !o)}
            aria-label={railOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 ${
              railOpen ? "" : "justify-center px-0"
            }`}
          >
            {railOpen ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
            {railOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur">
          <div className="md:hidden">
            <Link href={user ? "/documents" : "/"} aria-label="eduX home">
              <Logo size="sm" iconOnly showTagline={false} />
            </Link>
          </div>
          <h1 className="font-serif text-lg font-semibold tracking-tight text-slate-900 dark:text-white hidden sm:block">
            {title}
          </h1>

          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto md:ml-4 flex-1 max-w-md flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 px-3 py-1.5 text-xs text-slate-500 hover:border-elite-400 transition-colors"
            aria-label="Search or run a command"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left truncate">Search or run a command…</span>
            <kbd className="hidden sm:inline rounded border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">Ctrl K</kbd>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {usagePct !== null && (
              <div className="hidden lg:flex flex-col gap-1 w-28" title={`${usage!.wordsScoredToday.toLocaleString()} of ${usage!.dailyWordCap.toLocaleString()} words scored today`}>
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                  <span>Today</span>
                  <span>{usagePct}%</span>
                </div>
                <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-elite-500 transition-all" style={{ width: `${usagePct}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={openUpload}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-semibold px-3 py-2 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload
            </button>

            <button
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className="w-8 h-8 rounded-full bg-elite-600 text-white text-xs font-bold flex items-center justify-center hover:bg-elite-700"
                >
                  {initials}
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    </div>
                    {[
                      { href: "/settings?tab=profile", label: "Profile", icon: UserCircle },
                      { href: "/settings?tab=writing", label: "Writing preferences", icon: PenLine },
                      { href: "/settings?tab=plan", label: "Plan and billing", icon: CreditCard },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <item.icon className="w-4 h-4 text-slate-400" />
                        {item.label}
                      </Link>
                    ))}
                    <button
                      role="menuitem"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <LogOut className="w-4 h-4 text-slate-400" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              ready && (
                <button
                  onClick={() => openAuth("login")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </button>
              )
            )}
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0 outline-none">
          {needsSignIn ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-sm text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-elite-50 dark:bg-elite-950 text-elite-600 flex items-center justify-center">
                  <UserCircle className="w-6 h-6" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">Sign in to continue</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Your documents, settings and plan live with your account. Creating one takes under a minute.
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button onClick={() => openAuth("login")} className="px-5 py-2.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold">
                    Sign in
                  </button>
                  <button onClick={() => openAuth("register")} className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
                    Create account
                  </button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 grid border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur"
        style={{ gridTemplateColumns: `repeat(${nav.length + 1}, minmax(0, 1fr))` }}
      >
        {[...nav, { href: "/settings", label: "Settings", icon: Settings }].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(n.href) ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              isActive(n.href) ? "text-elite-600 dark:text-elite-400" : "text-slate-500"
            }`}
          >
            <n.icon className="w-5 h-5" />
            {n.label}
          </Link>
        ))}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Onboarding />
    </div>
  );
};
