import React, { useState } from "react";
import { Check, Sparkles, Shield, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { PlanType } from "@edux/schema";

interface PricingModalProps {
  currentPlan: PlanType;
  onSelectPlan: (plan: PlanType) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  currentPlan,
  onSelectPlan,
}) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [subscribedNotice, setSubscribedNotice] = useState<string | null>(null);

  const handleChoose = (plan: PlanType, title: string) => {
    onSelectPlan(plan);
    setSubscribedNotice(title);
    setTimeout(() => setSubscribedNotice(null), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Transparent Academic Integrity Plans (M2)
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            Choose the right tier for your writing
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Honest pricing built on our fair-use license: personal writing on Individual, client & student papers on Edu Professional.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Billed Monthly</span>
            <button
              onClick={() =>
                setBillingCycle((prev) => (prev === "monthly" ? "annual" : "monthly"))
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                billingCycle === "annual" ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  billingCycle === "annual" ? "translate-x-5" : ""
                }`}
              />
            </button>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              Billed Annually <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">2 Months Free</span>
            </span>
          </div>
        </div>

        {subscribedNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Successfully updated plan to <strong>{subscribedNotice}</strong>! Your limits have been updated.</span>
          </div>
        )}

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: Pay Per Paper */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Single Paper Pass
              </div>
              <div>
                <span className="text-4xl font-black text-slate-900 dark:text-white">$5</span>
                <span className="text-xs text-slate-400"> / one-time</span>
              </div>
              <p className="text-xs text-slate-500">
                Ideal for a single thesis submission or urgent journal manuscript.
              </p>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 document, unlimited edits for 30 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Full AI likelihood & similarity report</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Clean & Tracked Changes .docx export</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChoose("pay_per_paper", "Single Paper Pass")}
              className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Buy 1 Paper Pass ($5)
            </button>
          </div>

          {/* Card 2: Individual ($5 / mo) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-indigo-600 shadow-lg shadow-indigo-600/10 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
              Most Popular for Students
            </div>

            <div className="space-y-4">
              <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                <span>Individual Plan</span>
                {currentPlan === "individual" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 border border-indigo-200">
                    Current Plan
                  </span>
                )}
              </div>
              <div>
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  ${billingCycle === "annual" ? "4.15" : "5"}
                </span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <p className="text-xs text-slate-500">
                Licensed for your own academic writing, theses, and coursework.
              </p>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>3 active papers</strong> at a time (archive anytime)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>30,000 words</strong> scored per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span><strong>300 rewrite suggestions</strong> per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>1 Personal Voice Profile (learned cadence)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Word style profiles (APA 7th, Harvard)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChoose("individual", "Individual Plan")}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {currentPlan === "individual" ? "Active Plan" : "Upgrade to Individual ($5/mo)"}
            </button>
          </div>

          {/* Card 3: Edu Professional ($15 / mo) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="font-bold text-sm text-teal-600 dark:text-teal-400">
                Edu Professional
              </div>
              <div>
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  ${billingCycle === "annual" ? "12.50" : "15"}
                </span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <p className="text-xs text-slate-500">
                For tutors, lecturers, editors, proofreaders & writing centres.
              </p>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Work on other people's papers (clients & students)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span><strong>40 active papers</strong> at a time</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span><strong>150,000 words</strong> & 1,500 suggestions / day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Folders, Kanban board & Batch tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Multiple client voice profiles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Expiring read-only share & return links</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleChoose("edu_pro", "Edu Professional")}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm shadow-teal-600/20 active:scale-95 transition-all"
            >
              Get Edu Professional ($15/mo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
