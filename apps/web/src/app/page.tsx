"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  Briefcase,
  Check,
  FileText,
  Globe2,
  GraduationCap,
  Languages,
  Moon,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import { Logo } from "../components/brand/Logo";
import { AuthModal } from "../components/navigation/AuthModal";
import { apiClient } from "../services/api/apiClient";
import { useTheme } from "../services/theme/themeContext";
import { User } from "@edux/schema";
import { DIALECTS, Dialect, convertSpelling, guessDialect } from "../lib/dialect";
import { checkSentence, WritingIssue } from "../lib/writingChecks";

const SAMPLE =
  "Furthermore, it is essential to consider the implications of automated heuristics within contemporary research. We organize the the data by colour and analyse it carefully. The results were very very clear, and a unique idea emerged from the centre of the programme.";
const WORD_LIMIT = 300;

interface Row {
  text: string;
  score: number | null;
  reasons: string[];
  spelling: { from: string; to: string }[];
  grammar: WritingIssue[];
  suggestion?: string;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .filter(Boolean);
}

const FEATURES = [
  { icon: BookOpenCheck, title: "Grammar and clarity", text: "Repeated words, a/an, spacing, run-on sentences and filler, each with a one-click fix." },
  { icon: Languages, title: "Your English, consistently", text: "Choose British or American. Mixed spelling is flagged and converted in one confirmed step, with undo." },
  { icon: ScanSearch, title: "Machine-likeness, honestly", text: "Each sentence gets an estimate with reasons. It is a prompt to look again, never a verdict on who wrote it." },
  { icon: Wand2, title: "Rewrites you approve", text: "Suggestions are checked against the original meaning. Nothing changes until you accept it." },
  { icon: FileText, title: "Word in, Word out", text: "Upload a .docx and export it back, with every accepted change as a real tracked change." },
  { icon: Sparkles, title: "A calm place to work", text: "A quiet page, a focus mode, and everything else one keystroke away." },
];

const AUDIENCES = [
  { icon: GraduationCap, title: "Students and researchers", text: "Polish a thesis chapter or journal paper, keep citations and headings, and hand it in with confidence." },
  { icon: BookOpenCheck, title: "Academics and editors", text: "Review other people's drafts, keep a record of every change, and return clean, tracked files." },
  { icon: Briefcase, title: "Executives and teams", text: "Reports, briefs and proposals that read clearly, in the English your readers expect." },
];

export default function LandingPage() {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [text, setText] = useState(SAMPLE);
  const [dialect, setDialect] = useState<Dialect>("en-GB");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "rewrite" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const overLimit = words > WORD_LIMIT;

  useEffect(() => {
    setDialect(guessDialect());
    // A Google sign-in that did not finish comes back here; show the sign-in box with the reason.
    if (new URLSearchParams(window.location.search).get("auth_error")) {
      setAuthMode("login");
      setAuthOpen(true);
    }
    const cached = apiClient.getCurrentUser();
    if (cached) setUser(cached);
    else if (apiClient.getToken()) apiClient.getMe().then((r) => r?.user && setUser(r.user)).catch(() => {});
  }, []);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const check = async () => {
    if (!text.trim() || overLimit) return;
    setBusy("check");
    setError(null);
    try {
      const sentences = splitSentences(text);
      const data = await apiClient.detectSentences({
        documentId: "guest",
        sentences: sentences.map((t, i) => ({ id: `g_${i}`, text: t })),
      });
      const byId = new Map<string, any>((Array.isArray(data?.scores) ? data.scores : []).map((s: any) => [s.sentenceId, s]));
      setRows(
        sentences.map((t, i) => {
          const sc = byId.get(`g_${i}`);
          return {
            text: t,
            score: sc ? sc.score : null,
            reasons: sc?.reasons ?? [],
            spelling: convertSpelling(t, dialect).changes.map((c) => ({ from: c.from, to: c.to })),
            grammar: checkSentence(t),
          };
        })
      );
      const engines: string[] = data?.engines || [];
      setNote(
        engines.includes("reference") || engines.length === 0
          ? "Machine-likeness here comes from a simple built-in heuristic, so treat it as a rough hint."
          : null
      );
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const suggest = async () => {
    if (!rows) return;
    setBusy("rewrite");
    setError(null);
    try {
      const next = [...rows];
      let i = 0;
      const worker = async () => {
        while (i < next.length) {
          const idx = i++;
          const r = next[idx];
          if ((r.score ?? 0) < 0.45 && r.spelling.length === 0 && r.grammar.length === 0) continue;
          try {
            const res = await apiClient.generateModelRewrites({
              sentenceId: `g_${idx}`,
              text: r.text,
              contextParagraph: text,
              tone: "academic",
              dialect,
            });
            const top = res?.suggestions?.[0]?.text;
            if (top && top !== r.text) next[idx] = { ...r, suggestion: top };
          } catch {
            // one failure should not stop the rest
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      setRows(next);
    } finally {
      setBusy(null);
    }
  };

  const use = (idx: number) => {
    if (!rows?.[idx]?.suggestion) return;
    setText((t) => t.replace(rows[idx].text, rows[idx].suggestion as string));
    setRows(null);
  };

  const flagged = rows?.filter((r) => (r.score ?? 0) >= 0.45).length ?? 0;
  const issues = rows?.reduce((n, r) => n + r.spelling.length + r.grammar.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-elite-600 focus:text-white focus:px-4 focus:py-2">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto h-16 px-5 flex items-center gap-6">
          <Link href="/" aria-label="eduX home">
            <Logo size="sm" />
          </Link>
          <nav aria-label="Page sections" className="hidden md:flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
            <a href="#how" className="hover:text-slate-900 dark:hover:text-white">How it works</a>
            <a href="#try" className="hover:text-slate-900 dark:hover:text-white">Try it</a>
            <a href="#plans" className="hover:text-slate-900 dark:hover:text-white">Plans</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user ? (
              <Link href="/documents" className="whitespace-nowrap rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-3 sm:px-4 py-2">
                <span className="sm:hidden">Documents</span>
                <span className="hidden sm:inline">Open your documents</span>
              </Link>
            ) : (
              <>
                <button onClick={() => openAuth("login")} className="rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-slate-200/70 dark:hover:bg-slate-800">
                  Sign in
                </button>
                <button onClick={() => openAuth("register")} className="rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-4 py-2">
                  Start free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-elite-700 dark:text-elite-300">For students, researchers and teams</p>
            <h1 className="mt-4 font-serif text-5xl sm:text-6xl font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.05]">
              Clear, correct writing you can stand behind.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl">
              eduX checks your grammar and clarity, keeps your spelling consistent in British or American English, and shows which sentences read as machine-written, with rewrites you approve one by one.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={() => (user ? router.push("/documents") : openAuth("register"))}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white font-semibold px-6 py-3.5 shadow-sm"
              >
                {user ? "Open your documents" : "Start free"} <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#try" className="w-full sm:w-auto text-center rounded-xl border border-slate-300 dark:border-slate-600 font-semibold px-6 py-3.5 hover:bg-slate-200/60 dark:hover:bg-slate-800">
                Try it on a paragraph
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {["No credit card", "Works with Word files", "Your documents stay yours"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-elite-600" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Illustration of the editor */}
          <figure aria-label="Illustration of the editor" className="relative">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-page overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="ml-2 font-medium">Chapter 2, Methods.docx</span>
              </div>
              <div className="grid sm:grid-cols-[1.4fr_1fr]">
                <div className="p-6 font-serif text-[15px] leading-7 bg-[#fffefc] dark:bg-[#1d2026]">
                  <p>
                    <span className="ai-flagged-machine">Furthermore, it is essential to recognise that the self-attention mechanism serves as the cornerstone of modern representations.</span>{" "}
                    We <span className="rounded-sm bg-amber-200/60 dark:bg-amber-500/25 px-0.5">organize</span> the data by colour and test each model on held-out samples.{" "}
                    <span className="ai-flagged-uncertain">The results were very, very clear.</span>
                  </p>
                </div>
                <div className="p-4 space-y-2.5 text-xs border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white">Review</div>
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-2.5">
                    <div className="font-medium">organize → organise</div>
                    <div className="text-slate-600 dark:text-slate-400">Spelling for British English</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                    <div className="font-medium">Filler words</div>
                    <div className="text-slate-600 dark:text-slate-400">“very, very” can be cut</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                    <div className="font-medium">Reads as machine-like</div>
                    <div className="text-slate-600 dark:text-slate-400">72% estimate</div>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="mt-2 text-xs text-slate-500 text-center">Illustration</figcaption>
          </figure>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="max-w-6xl mx-auto px-5 py-20">
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Three steps, no surprises</h2>
            <ol className="mt-10 grid md:grid-cols-3 gap-6">
              {[
                { n: 1, title: "Bring your draft", text: "Upload a Word file or paste text. Headings, lists and tables come with it." },
                { n: 2, title: "See what needs attention", text: "Grammar, clarity, spelling for your English, and how machine-like each sentence reads." },
                { n: 3, title: "Fix it your way", text: "Accept a suggested rewrite or edit by hand, undo anything, and export to Word with tracked changes." },
              ].map((s) => (
                <li key={s.n} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="w-8 h-8 rounded-full bg-elite-600 text-white text-sm font-bold flex items-center justify-center">{s.n}</div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-5 py-20">
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-white max-w-2xl">Everything a careful writer needs, in one quiet place</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="w-10 h-10 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-300 flex items-center justify-center">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Try it */}
        <section id="try" className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="max-w-6xl mx-auto px-5 py-20">
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Try it on a paragraph</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl">Paste up to {WORD_LIMIT} words. Nothing is saved, and no account is needed.</p>

            <div className="mt-8 grid lg:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label htmlFor="try-text" className="text-sm font-semibold">Your text</label>
                  <div role="radiogroup" aria-label="English variant" className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs font-semibold">
                    {DIALECTS.map((d) => (
                      <button
                        key={d.id}
                        role="radio"
                        aria-checked={dialect === d.id}
                        aria-label={d.label}
                        onClick={() => {
                          setDialect(d.id);
                          setRows(null);
                        }}
                        className={`px-3 py-1 rounded-md flex items-center gap-1.5 ${dialect === d.id ? "bg-elite-600 text-white" : "text-slate-600 dark:text-slate-300"}`}
                      >
                        <Globe2 className="w-3 h-3" />
                        {d.short}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="try-text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setRows(null);
                  }}
                  rows={9}
                  className="w-full flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3.5 font-serif text-[15px] leading-7 outline-none focus:border-elite-500"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`text-xs font-mono ${overLimit ? "text-rose-600 font-semibold" : "text-slate-600 dark:text-slate-400"}`}>
                    {words} / {WORD_LIMIT} words
                  </span>
                  <button
                    onClick={check}
                    disabled={busy !== null || !text.trim() || overLimit}
                    className="rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-50"
                  >
                    {busy === "check" ? "Checking…" : "Check my text"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 min-h-[22rem]" aria-live="polite">
                {error && <div role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm px-3.5 py-2.5 mb-3">{error}</div>}
                {!rows && !error && (
                  <div className="h-full min-h-[18rem] flex flex-col items-center justify-center text-center text-sm text-slate-600 dark:text-slate-400 gap-2">
                    <ShieldCheck className="w-7 h-7 text-slate-400" />
                    Your review appears here, sentence by sentence.
                  </div>
                )}
                {rows && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="text-sm font-semibold">
                        {issues} spelling or grammar point{issues === 1 ? "" : "s"} · {flagged} sentence{flagged === 1 ? "" : "s"} read as machine-like
                      </div>
                      <button onClick={suggest} disabled={busy !== null} className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
                        <Wand2 className="w-3.5 h-3.5" /> {busy === "rewrite" ? "Working…" : "Suggest fixes"}
                      </button>
                    </div>
                    <ul className="space-y-2.5 max-h-[26rem] overflow-y-auto pr-1">
                      {rows.map((r, i) => {
                        const pct = r.score === null ? null : Math.round(r.score * 100);
                        return (
                          <li key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-2">
                            <p className="font-serif leading-relaxed">{r.text}</p>
                            <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
                              {pct !== null && (
                                <span className={`rounded-full px-2 py-0.5 ${pct >= 60 ? "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300" : pct >= 30 ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300" : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"}`}>
                                  {pct}% machine-like
                                </span>
                              )}
                              {r.spelling.map((s) => (
                                <span key={s.from} className="rounded-full px-2 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                                  {s.from} → {s.to}
                                </span>
                              ))}
                              {r.grammar.map((g) => (
                                <span key={g.id} className="rounded-full px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{g.message}</span>
                              ))}
                            </div>
                            {r.suggestion && (
                              <div className="rounded-lg bg-elite-50/70 dark:bg-elite-950/30 border border-elite-100 dark:border-elite-900 p-2.5 space-y-1.5">
                                <p className="font-serif leading-relaxed">{r.suggestion}</p>
                                <button onClick={() => use(i)} className="text-xs font-semibold text-elite-700 dark:text-elite-300 hover:underline">Use this</button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {note && <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">{note}</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="max-w-6xl mx-auto px-5 py-20">
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Built for people who write for a reader</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <a.icon className="w-6 h-6 text-elite-600 dark:text-elite-300" />
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Honesty */}
        <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="max-w-4xl mx-auto px-5 py-16">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">What our scores mean, and what they do not</h2>
            <ul className="mt-6 space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
              <li className="flex gap-3"><Check className="w-5 h-5 text-elite-600 shrink-0 mt-0.5" />A machine-likeness score estimates how closely a sentence resembles typical machine-written text. It is a reason to look again.</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-elite-600 shrink-0 mt-0.5" />Detectors make mistakes, especially on formal, technical or non-native writing. A score is never proof of how something was written.</li>
              <li className="flex gap-3"><Check className="w-5 h-5 text-elite-600 shrink-0 mt-0.5" />We never promise that any text will pass any detector. We help you write clearly, in your own voice.</li>
            </ul>
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="max-w-6xl mx-auto px-5 py-20">
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Plans</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Start free. Paid plans are not open for purchase yet, so nothing is charged today.</p>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              { name: "Single paper", price: "$5", per: "one time", points: ["One document, edited for 30 days", "Clean and tracked Word export"] },
              { name: "Individual", price: "$5", per: "per month", points: ["3 active papers", "30,000 words checked a day", "British or American English"], featured: true },
              { name: "Edu Professional", price: "$15", per: "per month", points: ["40 active papers", "Client folders and a team board", "150,000 words checked a day"] },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl p-6 border ${p.featured ? "border-elite-500 bg-white dark:bg-slate-900 shadow-elite" : "border-slate-200 dark:border-slate-800"}`}>
                <h3 className="font-semibold text-slate-900 dark:text-white">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-serif text-4xl font-semibold">{p.price}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{p.per}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-2"><Check className="w-4 h-4 text-elite-600 shrink-0 mt-0.5" />{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <button onClick={() => (user ? router.push("/documents") : openAuth("register"))} className="inline-flex items-center gap-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white font-semibold px-6 py-3.5">
              {user ? "Open your documents" : "Create a free account"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
          <Logo size="sm" />
          <nav aria-label="Footer" className="flex items-center gap-5">
            <Link href="/help" className="hover:text-slate-900 dark:hover:text-white">Help</Link>
            <button onClick={() => openAuth("login")} className="hover:text-slate-900 dark:hover:text-white">Sign in</button>
          </nav>
        </div>
      </footer>

      <AuthModal
        isOpen={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={(u) => {
          setUser(u);
          setAuthOpen(false);
          router.push("/documents");
        }}
      />
    </div>
  );
}
