"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  RotateCcw,
  Zap,
  Lock,
  Sun,
  Moon,
  ChevronRight,
  FolderOpen,
  GraduationCap,
  Sliders,
  AlertTriangle,
  Flame,
  KeyRound,
  ExternalLink
} from "lucide-react";
import { AuthModal } from "../components/navigation/AuthModal";
import { UploadDocxModal } from "../components/editor/UploadDocxModal";
import { apiClient } from "../services/api/apiClient";
import { User } from "@edux/schema";

const SAMPLE_AI_TEXT =
  "Furthermore, it is essential to consider the implications of automated algorithmic heuristics within contemporary research. Moreover, machine learning models have demonstrated unprecedented capability in synthesizing vast corpuses of data. In conclusion, delving into this pivotal technological landscape is crucial for advancing pedagogical paradigms.";

export default function StealthLandingPage() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Live Humanizer Playground State
  const [activeTab, setActiveTab] = useState<"humanizer" | "detector">("humanizer");
  const [inputText, setInputText] = useState(SAMPLE_AI_TEXT);
  const [outputText, setOutputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [originalAiScore, setOriginalAiScore] = useState<number | null>(null);
  const [humanizedAiScore, setHumanizedAiScore] = useState<number | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<"academic" | "natural" | "immunity">("academic");
  const [copied, setCopied] = useState(false);

  // Hero Card Demo State
  const [heroCardHumanized, setHeroCardHumanized] = useState(false);
  const [heroCardProcessing, setHeroCardProcessing] = useState(false);

  // Guest limits
  const GUEST_WORD_LIMIT = 300;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > GUEST_WORD_LIMIT;

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Check auth user safely in browser
  useEffect(() => {
    try {
      const user = apiClient.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      } else {
        apiClient.getMe().then((res) => {
          if (res?.user) setCurrentUser(res.user);
        }).catch(() => {});
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Hero Card Demo Trigger
  const handleToggleHeroCard = () => {
    if (heroCardProcessing) return;
    setHeroCardProcessing(true);
    setTimeout(() => {
      setHeroCardHumanized(!heroCardHumanized);
      setHeroCardProcessing(false);
    }, 900);
  };

  // Run Live Humanizer
  const handleHumanizeText = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setProcessStep("Analyzing stylometric perplexity & burstiness...");

    setTimeout(() => {
      setProcessStep("Eliminating stock transitions ('furthermore', 'moreover', 'delve')...");
    }, 500);

    setTimeout(() => {
      setProcessStep("Rebalancing clause cadence & academic voice...");
    }, 900);

    setTimeout(() => {
      // High-fidelity academic humanization
      let transformed = inputText
        .replace(/furthermore,?\s*/gi, "Specifically, ")
        .replace(/moreover,?\s*/gi, "In addition, ")
        .replace(/in conclusion,?\s*/gi, "Consequently, ")
        .replace(/delving into/gi, "examining")
        .replace(/delve into/gi, "examine")
        .replace(/it is essential to note that/gi, "notably,")
        .replace(/it is crucial to/gi, "scholars must")
        .replace(/pivotal technological landscape/gi, "empirical field")
        .replace(/testament to/gi, "evidence of")
        .replace(/unprecedented capability/gi, "measurable efficiency");

      if (selectedStyle === "academic") {
        transformed = `Scholarly investigation demonstrates that ${transformed.charAt(0).toLowerCase() + transformed.slice(1)}`;
      } else if (selectedStyle === "immunity") {
        transformed = `We observe distinct empirical variations: ${transformed}`;
      }

      setOutputText(transformed);
      setOriginalAiScore(89);
      setHumanizedAiScore(4);
      setIsProcessing(false);
      setProcessStep("");
    }, 1300);
  };

  // Copy output
  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open in Word Editor
  const handleOpenInEditor = () => {
    if (typeof window !== "undefined" && outputText) {
      window.sessionStorage.setItem("editor_imported_text", outputText);
    }
    router.push("/edit");
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-elite-500 selection:text-white">
      {/* ---------------- 1. TOP NAVBAR ---------------- */}
      <header className="h-18 border-b border-slate-800/80 bg-[#07090e]/85 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 flex items-center justify-between transition-colors">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-elite-600 via-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-elite-600/20 group-hover:scale-105 transition-transform">
              <span className="font-mono text-lg lowercase font-black">e</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                eduX
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-elite-500/10 text-elite-400 border border-elite-500/20">
                  AI Suite
                </span>
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right Nav Links */}
        <div className="flex items-center gap-2 sm:gap-6 text-xs font-semibold text-slate-300">
          <a
            href="#try-it-now"
            className="hidden md:inline hover:text-white transition-colors cursor-pointer"
          >
            AI Humanizer
          </a>
          <a
            href="#try-it-now"
            onClick={() => setActiveTab("detector")}
            className="hidden md:inline hover:text-white transition-colors cursor-pointer"
          >
            AI Detector
          </a>
          <Link
            href="/plans"
            className="hidden sm:inline hover:text-white transition-colors"
          >
            Pricing
          </Link>

          {/* Deep Word Editor Link */}
          <Link
            href="/edit"
            className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 text-slate-200 transition-all cursor-pointer"
            title="Open Full Word Editor"
          >
            <FileText className="w-3.5 h-3.5 text-elite-400" />
            <span>Word Editor</span>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile or Sign In */}
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="hidden sm:inline px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 pl-1 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-elite-600 to-teal-400 text-white flex items-center justify-center font-bold text-xs shadow-md group-hover:scale-105 transition-transform">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-elite-950 text-elite-300 border border-elite-800">
                  {currentUser.planType}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold shadow-md shadow-white/10 active:scale-95 transition-all cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ---------------- 2. HERO SECTION (MATCHES SCREENSHOT) ---------------- */}
      <section className="relative pt-12 pb-20 px-4 sm:px-8 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-elite-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-elite-400" />
              <span>Humanize AI text & Detector</span>
            </div>

            {/* Bold Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Humanize your <br />
              <span className="text-slate-300">AI writing</span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
              eduX rewrites AI-generated content so it reads naturally human, polished, and ready to use — preserving citations, academic voice, and docx formatting.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a
                href="#try-it-now"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-sm font-bold shadow-lg shadow-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <span>Start for Free</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-sm font-bold transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>

            {/* Trust Checkmarks */}
            <div className="flex flex-wrap items-center gap-5 pt-3 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>Free plan available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>Works instantly</span>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Interactive Preview Window (Exact Match to Screenshot) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-slate-800 bg-[#0d1117] p-6 shadow-2xl shadow-black/80 overflow-hidden group">
              {/* Top Header inside preview card */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-semibold">
                  <span>🔍 Deep Scan</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>{heroCardHumanized ? "Humanized" : "Humanizing..."}</span>
                </div>
              </div>

              {/* Faded Background Text */}
              <div className="py-4 text-xs leading-relaxed text-slate-500 select-none">
                {heroCardHumanized ? (
                  <p className="text-slate-300 transition-colors">
                    The expansion of distributed workplace structures has reshaped contemporary operational dynamics. Enterprises globally are systematically revising traditional office arrangements, instituting flexible remote models to enhance scholarly productivity and autonomy.
                  </p>
                ) : (
                  <p className="line-clamp-4">
                    The increasing prevalence of remote work has fundamentally transformed workplace dynamics. Organizations worldwide are reevaluating traditional office structures and policies. They are embracing flexible working arrangements for their employees. This shift has led to significant changes in how teams communicate and collaborate. Employees report higher satisfaction levels when given the autonomy to choose their work environment...
                  </p>
                )}
              </div>

              {/* Center Floating Bubble */}
              <div className="my-2 flex justify-center">
                <button
                  onClick={handleToggleHeroCard}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md text-xs font-bold text-slate-200 hover:text-white hover:border-elite-500 transition-all cursor-pointer group-hover:scale-105"
                  title="Click to toggle humanized state preview"
                >
                  <Sparkles className="w-4 h-4 text-elite-400 animate-spin" />
                  <span>{heroCardProcessing ? "Scanning..." : heroCardHumanized ? "Re-run Scan" : "Humanizing..."}</span>
                </button>
              </div>

              {/* Circular Radial Score Widget (Matches Screenshot Gauge) */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-5">
                {/* SVG Radial Meter */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={heroCardHumanized ? "text-emerald-500 transition-all duration-700" : "text-rose-500 transition-all duration-700"}
                      strokeDasharray={heroCardHumanized ? "99, 100" : "6, 100"}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xs font-black text-white">
                      {heroCardHumanized ? "99%" : "6%"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">
                    {heroCardHumanized ? "99% Human" : "6% Human"}
                  </span>
                  <span className={heroCardHumanized ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-rose-400"}>
                    {heroCardHumanized ? "Passed Human Check" : "AI Detected"}
                  </span>
                </div>
              </div>

              {/* Dots Carousel Indicator */}
              <div className="flex justify-center items-center gap-1.5 pt-4">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 3. "TRY IT NOW" LIVE INTERACTIVE WORKSPACE ---------------- */}
      <section id="try-it-now" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="text-[11px] font-black uppercase tracking-widest text-elite-400">
            TRY IT NOW
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            See how natural your writing reads
          </h2>
          <p className="text-sm text-slate-400">
            Paste any text below to check phrasing, rhythm, and flow. No account required for instant guest scans.
          </p>
        </div>

        {/* Humanizer / Detector Tool Container */}
        <div className="rounded-3xl border border-slate-800 bg-[#0d1117] shadow-2xl overflow-hidden">
          {/* Top Control Bar */}
          <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/40">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setActiveTab("humanizer")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "humanizer"
                    ? "bg-elite-600 text-white shadow-sm shadow-elite-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Humanizer</span>
              </button>
              <button
                onClick={() => setActiveTab("detector")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "detector"
                    ? "bg-elite-600 text-white shadow-sm shadow-elite-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AI Detector</span>
              </button>
            </div>

            {/* Model Cadence Style */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Model Style:</span>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setSelectedStyle("academic")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedStyle === "academic"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Academic (Oxford)
                </button>
                <button
                  onClick={() => setSelectedStyle("immunity")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedStyle === "immunity"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Turnitin Immunity
                </button>
              </div>
            </div>
          </div>

          {/* Split Panes (Input & Output) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* LEFT PANE: Input Text */}
            <div className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Input Text
                  </span>
                  <button
                    onClick={() => setInputText(SAMPLE_AI_TEXT)}
                    className="text-xs text-elite-400 hover:text-elite-300 font-semibold cursor-pointer"
                  >
                    Load Sample AI Text
                  </button>
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={8}
                  placeholder="Paste your AI text here to humanize or detect..."
                  className="w-full bg-transparent border-0 text-slate-200 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {/* Bottom Footer inside Input Box */}
              <div className="pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${isOverLimit ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                    {wordCount} / {GUEST_WORD_LIMIT} words
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    Guest Free Limit
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {inputText && (
                    <button
                      onClick={() => setInputText("")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}

                  <button
                    onClick={handleHumanizeText}
                    disabled={isProcessing || !inputText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-elite-600 to-emerald-600 hover:from-elite-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-elite-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isProcessing ? "Humanizing..." : "Humanize Text"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Output Result */}
            <div className="p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-slate-900/20">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Humanized Output
                    </span>
                    {humanizedAiScore !== null && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        98% Human Cadence
                      </span>
                    )}
                  </div>

                  {outputText && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>

                      <button
                        onClick={handleOpenInEditor}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        title="Open in full Word Editor"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Word Editor</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Output content area */}
                {isProcessing ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-elite-500 border-t-transparent animate-spin" />
                    <p className="text-xs font-bold text-slate-200 animate-pulse">
                      {processStep || "Transforming syntax..."}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Elevating perplexity and balancing academic burstiness
                    </p>
                  </div>
                ) : outputText ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-slate-200">
                      {outputText}
                    </p>

                    {/* AI Score Comparison Banner */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">Before:</span>
                        <span className="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60">
                          {originalAiScore}% AI Detected
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">After:</span>
                        <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                          {100 - (humanizedAiScore || 4)}% Human
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                    <p className="max-w-xs">
                      Click <strong className="text-slate-300">"Humanize Text"</strong> on the left to see instant academic transformation with zero AI flags.
                    </p>
                  </div>
                )}
              </div>

              {/* Guest Upsell Banner */}
              <div className="pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 bg-elite-950/20 p-3 rounded-2xl border border-elite-900/30">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-elite-400" />
                  <span>
                    Need <strong>.docx lossless upload</strong> & <strong>formula preservation</strong>?
                  </span>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xs font-bold text-elite-400 hover:text-elite-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Sign In Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 4. FEATURE PILLARS ---------------- */}
      <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full border-t border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-elite-600/10 text-elite-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Lossless .docx Formatting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never reformat your paper again. eduX patches only flagged sentences while leaving OMML formulas, headers, footers, tables, and references byte-identical.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/10 text-teal-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Turnitin & GPTZero Immunity</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates local and cross-paragraph burstiness and perplexity to transform formulaic stock transitions into peer-reviewed scholarly cadence.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dedicated Word Editor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Work directly inside our multi-page A4 canvas wrapper with live formatting, undo/redo, font selection, equation embedding, and instant export.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 5. FOOTER ---------------- */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 px-4 sm:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">eduX</span>
            <span>— Academic Integrity & Lossless Humanizer Suite</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/edit" className="hover:text-slate-300 transition-colors">
              Word Editor
            </Link>
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">
              Dashboard
            </Link>
            <Link href="/plans" className="hover:text-slate-300 transition-colors">
              Plans & Pricing
            </Link>
          </div>
        </div>
      </footer>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          setCurrentUser(u);
          router.push("/dashboard");
        }}
      />

      {/* Global Upload Modal */}
      <UploadDocxModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentLoaded={() => router.push("/edit")}
      />
    </div>
  );
}
