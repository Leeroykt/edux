"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CornerDownLeft,
  CreditCard,
  Download,
  FileText,
  Globe2,
  HelpCircle,
  Keyboard,
  LogIn,
  Moon,
  PenLine,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
  UserCircle,
  Users,
} from "lucide-react";
import { useSession } from "../../hooks/useSession";
import { useTheme } from "../../services/theme/themeContext";
import { useToast } from "../ui/feedback";
import { dialectLabel } from "../../lib/dialect";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: "Go to" | "Do" | "Settings";
  icon: React.ElementType;
  keywords?: string;
  run: () => void;
}

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Ctrl K", action: "Search and run any command" },
  { keys: "Ctrl Z / Ctrl Y", action: "Undo or redo the last rewrite" },
  { keys: "Esc", action: "Close a dialog or this search" },
  { keys: "↑ ↓ then Enter", action: "Move through results and choose one" },
];

export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const router = useRouter();
  const { user, prefs, setPrefs, openAuth, openUpload } = useSession();
  const { toggleTheme } = useTheme();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [showKeys, setShowKeys] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fire = (id: string) => window.dispatchEvent(new CustomEvent("edux:command", { detail: id }));

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const list: Command[] = [
      { id: "go-docs", group: "Go to", label: "Documents", hint: "Your library", icon: FileText, run: go("/documents"), keywords: "library home papers files" },
      { id: "go-write", group: "Go to", label: "Write", hint: "Open the editor", icon: PenLine, run: go("/edit"), keywords: "editor edit document" },
      ...(user?.planType === "edu_pro"
        ? [{ id: "go-team", group: "Go to" as const, label: "Team board", hint: "Clients and students", icon: Users, run: go("/edupro"), keywords: "clients students cohort kanban" }]
        : []),
      { id: "go-profile", group: "Settings", label: "Profile", hint: "Name, institution, role", icon: UserCircle, run: go("/settings?tab=profile"), keywords: "account name email" },
      { id: "go-writing", group: "Settings", label: "Writing preferences", hint: "English variant, citations, checks", icon: PenLine, run: go("/settings?tab=writing"), keywords: "language british american spelling citation style font grammar" },
      { id: "go-plan", group: "Settings", label: "Plan and billing", hint: "Your plan and limits", icon: CreditCard, run: go("/settings?tab=plan"), keywords: "pricing upgrade subscription money pay" },
      { id: "go-security", group: "Settings", label: "Security", hint: "Password and sessions", icon: Settings, run: go("/settings?tab=security"), keywords: "password sign out delete account" },
      { id: "do-upload", group: "Do", label: "Upload a document", hint: ".docx, .txt or .md", icon: UploadCloud, run: () => openUpload(), keywords: "import add file" },
      { id: "do-rescan", group: "Do", label: "Score this document again", hint: "Runs in the background", icon: RefreshCw, run: () => fire("rescan"), keywords: "scan check detect ai" },
      { id: "do-export", group: "Do", label: "Export to Word", hint: "Clean or tracked changes", icon: Download, run: () => fire("export"), keywords: "download docx" },
      { id: "do-focus", group: "Do", label: "Toggle focus mode", hint: "Hide everything but the page", icon: Sparkles, run: () => fire("focus"), keywords: "distraction zen" },
      {
        id: "do-dialect",
        group: "Settings",
        label: `Default English: switch to ${dialectLabel(prefs.dialect === "en-GB" ? "en-US" : "en-GB")}`,
        hint: `New documents use ${dialectLabel(prefs.dialect)}. Change one document from the editor.`,
        icon: Globe2,
        run: () => {
          const next = prefs.dialect === "en-GB" ? "en-US" : "en-GB";
          setPrefs({ dialect: next });
          toast.show(`New documents will start in ${dialectLabel(next)}.`, { kind: "success" });
        },
        keywords: "english spelling british american uk us language",
      },
      { id: "do-theme", group: "Settings", label: "Switch light or dark mode", icon: Moon, run: () => toggleTheme(), keywords: "theme appearance" },
      { id: "do-tour", group: "Do", label: "Take the guided tour", hint: "A two-minute introduction", icon: HelpCircle, run: () => fire("tour"), keywords: "help onboarding guide start" },
      { id: "do-keys", group: "Do", label: "Keyboard shortcuts", icon: Keyboard, run: () => setShowKeys(true), keywords: "keys hotkeys" },
      { id: "go-help", group: "Go to", label: "Help and how-to guides", icon: HelpCircle, run: go("/help"), keywords: "support faq how" },
      ...(!user ? [{ id: "do-signin", group: "Do" as const, label: "Sign in or create an account", icon: LogIn, run: () => openAuth("login"), keywords: "login register" }] : []),
    ];
    return list;
  }, [router, user, prefs.dialect, setPrefs, openAuth, openUpload, toggleTheme, toast]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setShowKeys(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  const choose = (c?: Command) => {
    if (!c) return;
    onClose();
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const groups = (["Go to", "Do", "Settings"] as const).map((g) => ({ g, items: results.filter((r) => r.group === g) })).filter((x) => x.items.length);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-100"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type what you want to do…"
            aria-label="Search commands"
            className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="text-[10px] font-mono text-slate-400 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {showKeys ? (
          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Keyboard shortcuts</div>
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between text-sm py-1.5">
                <span className="text-slate-600 dark:text-slate-300">{s.action}</span>
                <kbd className="font-mono text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5">{s.keys}</kbd>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
            {groups.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                Nothing matches &ldquo;{query}&rdquo;. Try &ldquo;upload&rdquo;, &ldquo;spelling&rdquo; or &ldquo;export&rdquo;.
              </div>
            )}
            {groups.map(({ g, items }) => (
              <div key={g} className="mb-1">
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g}</div>
                {items.map((c) => {
                  const i = results.indexOf(c);
                  const active = i === index;
                  return (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => choose(c)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                        active ? "bg-elite-50 dark:bg-elite-950/60 text-elite-800 dark:text-elite-200" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <c.icon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="text-xs text-slate-400 truncate hidden sm:block">{c.hint}</span>}
                      {active && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
