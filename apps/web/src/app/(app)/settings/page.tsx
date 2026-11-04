"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Globe2, Lock, Moon, PenLine, Sun, UserCircle } from "lucide-react";
import { useSession, CitationStyle, WritingMode } from "../../../hooks/useSession";
import { apiClient } from "../../../services/api/apiClient";
import { useTheme } from "../../../services/theme/themeContext";
import { useConfirm, useToast } from "../../../components/ui/feedback";
import { PricingModal } from "../../../components/pricing/PricingModal";
import { DIALECTS, convertSpelling, Dialect } from "../../../lib/dialect";

const TABS = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "writing", label: "Writing", icon: PenLine },
  { id: "plan", label: "Plan and billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Lock },
] as const;
type TabId = (typeof TABS)[number]["id"];

const CITATIONS: CitationStyle[] = ["APA 7", "Harvard", "MLA 9", "Chicago", "IEEE", "Vancouver", "None"];
const FONTS = ["Newsreader", "Times New Roman", "Georgia", "Arial", "Calibri"];
const SAMPLE = "We analyse how colour and behaviour shape the centre of the programme, and organise the findings.";

const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode }> = ({ id, label, hint, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none focus:border-elite-500 focus:ring-2 focus:ring-elite-500/20 disabled:opacity-60";

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
    <div>
      <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
    </div>
    {children}
  </section>
);

function SettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = ((params.get("tab") as TabId) || "profile") as TabId;
  const { user, usage, prefs, setPrefs, setUser, signOut } = useSession();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  // Profile form
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [field, setField] = useState("");
  const [saving, setSaving] = useState(false);

  // Password form
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setInstitution(user.institution || "");
    setField(user.fieldOfStudy || "");
  }, [user]);

  const go = (id: TabId) => router.replace(`/settings?tab=${id}`);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.show("Your name cannot be empty.", { kind: "error" });
      return;
    }
    setSaving(true);
    try {
      const updated = await apiClient.updateProfile({ name, institution, fieldOfStudy: field });
      setUser(updated);
      toast.show("Profile saved.", { kind: "success" });
    } catch (err: any) {
      toast.show(err?.message || "Your profile could not be saved.", { kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (next.length < 8) return setPwError("Choose a new password of at least 8 characters.");
    if (next !== again) return setPwError("The two new passwords do not match.");
    setPwBusy(true);
    try {
      await apiClient.changePassword(current, next);
      setCurrent("");
      setNext("");
      setAgain("");
      toast.show("Password changed.", { kind: "success" });
    } catch (err: any) {
      setPwError(err?.message || "Your password could not be changed.");
    } finally {
      setPwBusy(false);
    }
  };

  const savedPref = <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K], message: string) => {
    setPrefs({ [key]: value } as Partial<typeof prefs>);
    toast.show(message, { kind: "success", ms: 2500 });
  };

  const initials = (user?.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-10">
      <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">Settings</h2>
      <p className="text-sm text-slate-500 mb-6">Your account, how you write, and your plan. Changes save as you make them unless a button says otherwise.</p>

      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        <nav aria-label="Settings sections" className="md:w-52 shrink-0 flex md:flex-col gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap text-left ${
                tab === t.id ? "bg-elite-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-6">
          {tab === "profile" && (
            <form onSubmit={saveProfile} className="space-y-6">
              <Section title="Profile" description="This is how you appear to the people you share documents with.">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-elite-600 text-white text-lg font-bold flex items-center justify-center">{initials}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field id="s-name" label="Full name">
                    <input id="s-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  </Field>
                  <Field id="s-email" label="Email" hint="Your sign-in address cannot be changed here.">
                    <input id="s-email" className={inputClass} value={user?.email || ""} disabled />
                  </Field>
                  <Field id="s-inst" label="Institution or company">
                    <input id="s-inst" className={inputClass} value={institution} onChange={(e) => setInstitution(e.target.value)} autoComplete="organization" />
                  </Field>
                  <Field id="s-field" label="Field or department">
                    <input id="s-field" className={inputClass} value={field} onChange={(e) => setField(e.target.value)} />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className="rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-50">
                    {saving ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </Section>
            </form>
          )}

          {tab === "writing" && (
            <>
              <Section title="Default English" description="New documents start in this variant. Each document keeps its own, which you can change from the language menu in the editor.">
                <div role="radiogroup" aria-label="English variant" className="grid sm:grid-cols-2 gap-3">
                  {DIALECTS.map((d) => (
                    <label
                      key={d.id}
                      className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                        prefs.dialect === d.id ? "border-elite-500 bg-elite-50/70 dark:bg-elite-950/40" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="dialect"
                        className="sr-only"
                        checked={prefs.dialect === d.id}
                        onChange={() => savedPref("dialect", d.id as Dialect, `New documents will start in ${d.label}.`)}
                      />
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Globe2 className="w-4 h-4 text-elite-600" />
                        {d.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{d.example}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 italic font-serif leading-relaxed">
                        {convertSpelling(SAMPLE, d.id).text}
                      </div>
                    </label>
                  ))}
                </div>
              </Section>

              <Section title="Defaults for new documents" description="Each document keeps its own writing type and referencing style, and you can change them in the editor.">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field id="w-mode" label="Kind of writing">
                    <select id="w-mode" className={inputClass} value={prefs.writingMode} onChange={(e) => savedPref("writingMode", e.target.value as WritingMode, "Saved.")}>
                      <option value="academic">Academic</option>
                      <option value="scientific">Scientific</option>
                      <option value="executive">Executive and business</option>
                    </select>
                  </Field>
                  <Field id="w-cite" label="Referencing style">
                    <select id="w-cite" className={inputClass} value={prefs.citationStyle} onChange={(e) => savedPref("citationStyle", e.target.value as CitationStyle, "Saved.")}>
                      {CITATIONS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="w-font" label="Page font">
                    <select id="w-font" className={inputClass} value={prefs.fontFamily} onChange={(e) => savedPref("fontFamily", e.target.value, "Saved.")}>
                      {FONTS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.grammarChecks}
                    onChange={(e) => savedPref("grammarChecks", e.target.checked, e.target.checked ? "Grammar checks on." : "Grammar checks off.")}
                    className="mt-1 accent-elite-600"
                  />
                  <span>
                    <span className="block text-sm font-medium">Grammar and clarity checks</span>
                    <span className="block text-xs text-slate-500">Flags repeated words, a/an, spacing, very long sentences and filler words as you review.</span>
                  </span>
                </label>
              </Section>

              <Section title="Display">
                <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
                  {([
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "system", label: "Match my device", icon: Globe2 },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      role="radio"
                      aria-checked={theme === t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                        theme === t.id ? "border-elite-500 bg-elite-50/70 dark:bg-elite-950/40" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}

          {tab === "plan" && (
            <>
              <Section title="Your plan">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Current plan</div>
                    <div className="font-serif text-2xl font-semibold capitalize">{user?.planType.replace(/_/g, " ")}</div>
                  </div>
                  {usage && (
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      {[
                        { label: "Words today", used: usage.wordsScoredToday, cap: usage.dailyWordCap },
                        { label: "Suggestions", used: usage.suggestionsUsedToday, cap: usage.dailySuggestionCap },
                        { label: "Active papers", used: usage.activePapersCount, cap: usage.activePapersCap },
                      ].map((m) => (
                        <div key={m.label}>
                          <div className="text-xs text-slate-500">{m.label}</div>
                          <div className="font-semibold">
                            {Math.min(m.used, m.cap).toLocaleString()} <span className="text-slate-400 font-normal">/ {m.cap.toLocaleString()}</span>
                            {m.used >= m.cap && <span className="ml-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">limit reached</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
              <div className="[&>div]:!p-0 [&>div]:!bg-transparent [&>div]:overflow-visible">
                <PricingModal currentPlan={user?.planType || "free_trial"} onSelectPlan={() => {}} />
              </div>
            </>
          )}

          {tab === "security" && (
            <>
              <form onSubmit={changePassword}>
                <Section title="Password" description="Use at least 8 characters.">
                  <div className="grid gap-4 max-w-md">
                    <Field id="p-cur" label="Current password">
                      <input id="p-cur" type="password" autoComplete="current-password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} required />
                    </Field>
                    <Field id="p-new" label="New password">
                      <input id="p-new" type="password" autoComplete="new-password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} required />
                    </Field>
                    <Field id="p-again" label="Repeat new password">
                      <input id="p-again" type="password" autoComplete="new-password" className={inputClass} value={again} onChange={(e) => setAgain(e.target.value)} required />
                    </Field>
                  </div>
                  {pwError && (
                    <div role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm px-3.5 py-2.5 max-w-md">
                      {pwError}
                    </div>
                  )}
                  <div>
                    <button type="submit" disabled={pwBusy} className="rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-50">
                      {pwBusy ? "Changing…" : "Change password"}
                    </button>
                  </div>
                </Section>
              </form>

              <Section title="This device">
                <p className="text-sm text-slate-500">Signing out keeps your documents saved to your account.</p>
                <div>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: "Sign out of eduX?", message: "You can sign back in at any time.", confirmLabel: "Sign out" });
                      if (!ok) return;
                      await signOut();
                      router.push("/");
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold px-5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-slate-500">Loading settings…</div>}>
      <SettingsInner />
    </Suspense>
  );
}
