"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, FileText, Loader2, RefreshCw, Search, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { DocumentMeta } from "@edux/schema";
import { apiClient } from "../../../services/api/apiClient";
import { clearActiveDocument, getActiveDocument } from "../../../services/storage/documentStore";
import { useSession, ChecklistStep } from "../../../hooks/useSession";
import { useConfirm, useToast } from "../../../components/ui/feedback";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "uploaded", label: "Drafts" },
  { id: "in_review", label: "In review" },
  { id: "returned", label: "Returned" },
  { id: "closed", label: "Done" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, ready, checklist, prefs, openUpload, refreshUsage } = useSession();
  const confirm = useConfirm();
  const toast = useToast();

  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [server, active] = await Promise.all([apiClient.getDocuments(), getActiveDocument()]);
    const merged = active?.meta ? [active.meta, ...server.filter((d) => d.id !== active.meta.id)] : server;
    setDocs(merged.filter((d) => d.id !== "doc_84719a" && !d.id.startsWith("mock")));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (ready && user) void load();
    else if (ready) setLoading(false);
  }, [ready, user, load]);

  // A scan that is still running changes a document's status, so check back until it settles.
  const anyScanning = docs.some((d) => d.status === "scanning");
  useEffect(() => {
    if (!anyScanning) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [anyScanning, load]);

  const shown = useMemo(
    () =>
      docs.filter(
        (d) => d.title.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || d.stage === filter)
      ),
    [docs, query, filter]
  );

  const allSelected = shown.length > 0 && selected.length === shown.length;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const rescore = async () => {
    setBusy(true);
    const results = await Promise.all(selected.map((id) => apiClient.startScan(id)));
    const ok = results.filter(Boolean).length;
    toast.show(
      ok === results.length
        ? `Scoring started for ${ok} document${ok === 1 ? "" : "s"}.`
        : `Scoring started for ${ok} of ${results.length}. Open the others in the editor first.`,
      { kind: ok ? "success" : "error" }
    );
    setSelected([]);
    setBusy(false);
    void load();
  };

  const remove = async () => {
    const names = docs.filter((d) => selected.includes(d.id));
    const ok = await confirm({
      title: names.length === 1 ? `Delete “${names[0].title}”?` : `Delete ${names.length} documents?`,
      message: "They will be removed from your library for good. This cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const active = await getActiveDocument();
    const results = await Promise.all(selected.map((id) => apiClient.deleteDocument(id)));
    if (active && selected.includes(active.meta.id)) await clearActiveDocument();
    toast.show(`Deleted ${results.filter(Boolean).length} document${selected.length === 1 ? "" : "s"}.`, { kind: "success" });
    setSelected([]);
    setBusy(false);
    void load();
    void refreshUsage();
  };

  const steps: { id: ChecklistStep; title: string; text: string; cta?: { label: string; run: () => void } }[] = [
    { id: "uploaded", title: "Add a document", text: "Upload a Word file or text.", cta: { label: "Upload", run: openUpload } },
    { id: "scored", title: "Review the flags", text: "Open it and look at what is highlighted.", cta: { label: "Open editor", run: () => router.push("/edit") } },
    { id: "rewrote", title: "Accept a rewrite", text: "Pick a suggestion for one sentence." },
    { id: "exported", title: "Export to Word", text: "Download the finished file." },
  ];
  const done = steps.filter((s) => checklist[s.id]).length;

  if (!ready || loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-6" aria-busy="true" aria-label="Loading documents">
        <div className="ai-pending h-9 w-72" />
        <div className="ai-pending h-28 w-full rounded-2xl" />
        <div className="ai-pending h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 lg:p-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {greeting()}
            {user ? `, ${user.name.split(" ")[0]}` : ""}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {docs.length === 0
              ? "Start with one document. It takes about a minute to see what needs attention."
              : `${docs.length} document${docs.length === 1 ? "" : "s"} in your library.`}
          </p>
        </div>
        <button
          onClick={openUpload}
          className="flex items-center gap-2 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm"
        >
          <UploadCloud className="w-4 h-4" />
          Upload document
        </button>
      </div>

      {done < steps.length && (
        <section aria-label="Getting started" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Getting started</h3>
            <span className="text-xs font-medium text-slate-500">
              {done} of {steps.length} done
            </span>
          </div>
          <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-800 mb-5 overflow-hidden">
            <div className="h-full bg-elite-500 transition-all duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((s, i) => {
              const complete = checklist[s.id];
              return (
                <li
                  key={s.id}
                  className={`rounded-xl border p-3.5 flex flex-col gap-2 ${
                    complete ? "border-elite-200 dark:border-elite-900 bg-elite-50/50 dark:bg-elite-950/20" : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        complete ? "bg-elite-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {complete ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{s.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.text}</p>
                  {!complete && s.cta && (
                    <button onClick={s.cta.run} className="mt-auto self-start text-xs font-semibold text-elite-700 dark:text-elite-300 hover:underline flex items-center gap-0.5">
                      {s.cta.label} <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {docs.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-elite-50 dark:bg-elite-950 text-elite-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Your library is empty</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Upload a draft and eduX will check grammar, spelling for your English, and how machine-like each sentence reads. You decide what to change.
          </p>
          <div className="flex justify-center gap-2.5 pt-1">
            <button onClick={openUpload} className="rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-sm font-semibold px-5 py-2.5">
              Upload a document
            </button>
            <Link href="/edit" className="rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold px-5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              Try a sample paper
            </Link>
          </div>
        </section>
      ) : (
        <section aria-label="Your documents" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents"
                aria-label="Search documents"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm outline-none focus:border-elite-500"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter by stage">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    filter === f.id ? "bg-elite-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="px-4 py-2.5 flex items-center justify-between bg-elite-50/70 dark:bg-elite-950/30 border-b border-slate-100 dark:border-slate-800 text-sm">
              <span className="font-medium" aria-live="polite">
                {selected.length} selected
              </span>
              <div className="flex gap-2">
                <button onClick={rescore} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50">
                  <RefreshCw className="w-3.5 h-3.5" /> Score again
                </button>
                <button onClick={remove} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          )}

          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            <li className="px-4 py-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : shown.map((d) => d.id))} aria-label="Select all" className="accent-elite-600" />
              <span className="flex-1">Document</span>
              <span className="hidden sm:block w-28">Machine-like</span>
              <span className="hidden md:block w-24 text-right">Words</span>
              <span className="hidden md:block w-24 text-right">Edited</span>
            </li>
            {shown.length === 0 && <li className="p-10 text-center text-sm text-slate-500">No documents match.</li>}
            {shown.map((d) => {
              const pct = Math.round((d.overallAiScore ?? 0) * 100);
              return (
                <li key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} aria-label={`Select ${d.title}`} className="accent-elite-600" />
                  <Link href={`/edit?doc=${d.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{d.title}</span>
                      <span className="block text-xs text-slate-500">{d.pageCount} page{d.pageCount === 1 ? "" : "s"}</span>
                    </span>
                  </Link>
                  <span className="hidden sm:flex w-28 items-center gap-1.5 text-xs font-medium">
                    {d.status === "scanning" ? (
                      <span className="flex items-center gap-1.5 text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring</span>
                    ) : d.status === "error" ? (
                      <span className="text-rose-600">Not scored</span>
                    ) : (
                      <span className={`flex items-center gap-1 ${pct >= 60 ? "text-ai-machine" : pct >= 30 ? "text-ai-uncertain" : "text-ai-human"}`}>
                        <Sparkles className="w-3.5 h-3.5" /> {pct}%
                      </span>
                    )}
                  </span>
                  <span className="hidden md:block w-24 text-right text-xs text-slate-500">{d.wordCount.toLocaleString()}</span>
                  <span className="hidden md:block w-24 text-right text-xs text-slate-500">{ago(d.updatedAt)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
