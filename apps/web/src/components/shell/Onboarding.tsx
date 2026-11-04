"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, FileSearch, Globe2, PenLine, Sparkles, UploadCloud } from "lucide-react";
import { useSession, CitationStyle, WritingMode } from "../../hooks/useSession";
import { DIALECTS, Dialect } from "../../lib/dialect";

const STEPS = ["Welcome", "Your writing", "Get started"] as const;

const MODES: { id: WritingMode; title: string; text: string }[] = [
  { id: "academic", title: "Academic", text: "Essays, theses, dissertations and journal papers, with citations." },
  { id: "scientific", title: "Scientific", text: "Lab reports, papers and methods sections with precise, checkable claims." },
  { id: "executive", title: "Executive and business", text: "Reports, briefs and proposals that need to be clear and concise." },
];

const CITATIONS: CitationStyle[] = ["APA 7", "Harvard", "MLA 9", "Chicago", "IEEE", "None"];

/** First-run guide. Opens once for a new writer, and again from the command palette. */
export const Onboarding: React.FC = () => {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { ready, prefs, setPrefs, openUpload } = useSession();
  const [forced, setForced] = useState(false);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<WritingMode>(prefs.writingMode);
  const [dialect, setDialect] = useState<Dialect>(prefs.dialect);
  const [citation, setCitation] = useState<CitationStyle>(prefs.citationStyle);

  const onAppPage = ["/documents", "/edit"].some((p) => pathname.startsWith(p));
  const open = forced || (ready && !prefs.onboarded && onAppPage);

  useEffect(() => {
    const onCommand = (e: Event) => {
      if ((e as CustomEvent).detail === "tour") {
        setStep(0);
        setMode(prefs.writingMode);
        setDialect(prefs.dialect);
        setCitation(prefs.citationStyle);
        setForced(true);
      }
    };
    window.addEventListener("edux:command", onCommand);
    return () => window.removeEventListener("edux:command", onCommand);
  }, [prefs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  const save = () => setPrefs({ writingMode: mode, dialect, citationStyle: citation, onboarded: true });

  const finish = (savePrefs: boolean) => {
    if (savePrefs) save();
    else setPrefs({ onboarded: true });
    setForced(false);
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        {/* Progress */}
        <div className="px-7 pt-6">
          <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${i <= step ? "bg-elite-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                <div className={`mt-1.5 text-[11px] font-medium ${i === step ? "text-elite-700 dark:text-elite-300" : "text-slate-400"}`}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-7 py-6 min-h-[330px]">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 id="onboarding-title" className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  A calm place to write well
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  eduX helps you finish academic and executive writing you can stand behind. Here is how it works.
                </p>
              </div>
              <ol className="space-y-3">
                {[
                  { icon: UploadCloud, title: "Bring your draft", text: "Upload a Word file or paste text. Your layout, headings and tables come with it." },
                  { icon: FileSearch, title: "See what needs attention", text: "Each sentence is checked for grammar, clarity, spelling for your English, and how machine-like it reads." },
                  { icon: Sparkles, title: "Fix it your way", text: "Accept a suggested rewrite or edit by hand. Every change is yours to approve, and you can undo it." },
                ].map((s, i) => (
                  <li key={s.title} className="flex gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-elite-50 dark:bg-elite-950 text-elite-600 dark:text-elite-300 flex items-center justify-center shrink-0">
                      <s.icon className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {i + 1}. {s.title}
                      </div>
                      <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.text}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-slate-400">Scores are estimates to guide your editing. They are never proof of how a text was written.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 id="onboarding-title" className="font-serif text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Set up your writing
                </h2>
                <p className="mt-1 text-sm text-slate-500">You can change any of this later in Settings.</p>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <PenLine className="w-3.5 h-3.5" /> What do you write most?
                </legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {MODES.map((m) => (
                    <label
                      key={m.id}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-colors ${
                        mode === m.id ? "border-elite-500 bg-elite-50/70 dark:bg-elite-950/40" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input type="radio" name="mode" className="sr-only" checked={mode === m.id} onChange={() => setMode(m.id)} />
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                        {m.title}
                        {mode === m.id && <Check className="w-4 h-4 text-elite-600" />}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 leading-relaxed">{m.text}</div>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1.5">
                  <Globe2 className="w-3.5 h-3.5" /> Which English do you use?
                </legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {DIALECTS.map((d) => (
                    <label
                      key={d.id}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-colors ${
                        dialect === d.id ? "border-elite-500 bg-elite-50/70 dark:bg-elite-950/40" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input type="radio" name="dialect" className="sr-only" checked={dialect === d.id} onChange={() => setDialect(d.id)} />
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                        {d.label}
                        {dialect === d.id && <Check className="w-4 h-4 text-elite-600" />}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{d.example}</div>
                    </label>
                  ))}
                </div>
              </fieldset>

              {mode === "academic" && (
                <div>
                  <label htmlFor="onb-citation" className="text-xs font-semibold text-slate-500 block mb-1.5">
                    Usual citation style
                  </label>
                  <select
                    id="onb-citation"
                    value={citation}
                    onChange={(e) => setCitation(e.target.value as CitationStyle)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm"
                  >
                    {CITATIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 id="onboarding-title" className="font-serif text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  You are ready
                </h2>
                <p className="mt-1 text-sm text-slate-500">Choose how to begin. Nothing is shared or changed until you say so.</p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    finish(true);
                    openUpload();
                  }}
                  className="w-full flex items-center gap-3.5 rounded-2xl border border-elite-500 bg-elite-50/70 dark:bg-elite-950/40 p-4 text-left hover:bg-elite-50 dark:hover:bg-elite-950/60"
                >
                  <UploadCloud className="w-5 h-5 text-elite-600 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Upload my document</div>
                    <div className="text-xs text-slate-500">Word, plain text or Markdown</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    finish(true);
                    router.push("/edit");
                  }}
                  className="w-full flex items-center gap-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-slate-300"
                >
                  <FileSearch className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Look around with a sample paper</div>
                    <div className="text-xs text-slate-500">See flags and suggestions before using your own work</div>
                  </div>
                </button>
              </div>
              <p className="text-xs text-slate-400">Press Ctrl K at any time to find any feature by name.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-7 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
          <button onClick={() => finish(step > 0)} className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Skip for now
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800">
                Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button onClick={() => setStep(step + 1)} className="px-5 py-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold">
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
