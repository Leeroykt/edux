"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { emitCommand } from "../../../components/shell/AppShell";
import { SHORTCUTS } from "../../../components/shell/CommandPalette";

const FIND: { what: string; where: string; href: string }[] = [
  { what: "Choose British or American English", where: "Settings → Writing", href: "/settings?tab=writing" },
  { what: "Upload a document", where: "Upload button, top right", href: "/documents" },
  { what: "Export to Word, with tracked changes", where: "Write → Export", href: "/edit" },
  { what: "See your plan and daily limits", where: "Settings → Plan and billing", href: "/settings?tab=plan" },
  { what: "Change your password", where: "Settings → Security", href: "/settings?tab=security" },
  { what: "Switch between light and dark", where: "Settings → Writing → Display", href: "/settings?tab=writing" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What does the machine-like score mean?",
    a: "It estimates how closely a sentence resembles typical machine-written text. It is a prompt to look again, not a verdict. Detectors make mistakes, especially on formal, technical or non-native writing, so never treat a score as proof of how something was written.",
  },
  {
    q: "Will eduX change my writing without asking?",
    a: "No. Every rewrite and spelling change is a suggestion you accept. Accepted changes can be undone, and tracked-changes export shows each one so a reader can accept or reject it in Word.",
  },
  {
    q: "How does the English variant work?",
    a: "Pick British or American English in Settings. Spelling from the other variant is flagged, you can convert a whole document in one step, and rewrites are produced in your variant. Quoted text and locked sentences are left exactly as written.",
  },
  {
    q: "What happens to my document?",
    a: "Your file is split into sentences in your browser. The text of each sentence is sent to our service to be checked, and your library is stored on your account. Delete a document from Documents and it is removed.",
  },
  {
    q: "What is not supported yet?",
    a: "Source and plagiarism matching is not connected, so the Sources report is an illustration. Word equations, headers, footers and footnotes are not carried through export yet.",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 lg:p-10 space-y-10">
      <header>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Help</h2>
        <p className="text-sm text-slate-500 mt-1.5">Short answers, and where to find things.</p>
        <button onClick={() => emitCommand("tour")} className="mt-4 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-5 py-2.5">
          Take the two-minute tour
        </button>
      </header>

      <section aria-labelledby="find">
        <h3 id="find" className="font-serif text-xl font-semibold mb-3">Where do I find…</h3>
        <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {FIND.map((f) => (
            <li key={f.what}>
              <Link href={f.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className="flex-1 text-sm font-medium">{f.what}</span>
                <span className="text-xs text-slate-500">{f.where}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-2">Or press <kbd className="font-mono border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">Ctrl K</kbd> and type what you want.</p>
      </section>

      <section aria-labelledby="keys">
        <h3 id="keys" className="font-serif text-xl font-semibold mb-3">Keyboard shortcuts</h3>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{s.action}</span>
              <kbd className="font-mono text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq">
        <h3 id="faq" className="font-serif text-xl font-semibold mb-3">Questions</h3>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold list-none flex items-center justify-between">
                {f.q}
                <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
