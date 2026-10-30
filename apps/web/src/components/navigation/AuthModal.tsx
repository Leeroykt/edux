"use client";

import React, { useState, useEffect } from "react";
import { User, UsageSummary } from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  LogIn,
  KeyRound,
  GraduationCap
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<"status" | "login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("academic_researcher");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      checkUser();
    }
  }, [isOpen]);

  async function checkUser() {
    try {
      const data = await apiClient.getMe();
      if (data && data.user) {
        setCurrentUser(data.user);
        setUsage(data.usage);
        setMode("status");
      } else {
        setMode("login");
      }
    } catch {
      setMode("login");
    }
  }

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const auth = await apiClient.login(cleanEmail, cleanPass);
      setCurrentUser(auth.user);
      onAuthSuccess?.(auth.user);
      setMode("status");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanName = name.trim() || cleanEmail.split("@")[0] || "Academic Scholar";

    if (!cleanEmail || !cleanPass) {
      setError("Please provide an email address and password.");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address (e.g. name@university.edu).");
      return;
    }

    if (cleanPass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const auth = await apiClient.register({
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        role,
      });
      setCurrentUser(auth.user);
      onAuthSuccess?.(auth.user);
      setMode("status");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try another email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await apiClient.logout();
    setCurrentUser(null);
    setMode("login");
  }

  function handleDemoLogin() {
    setEmail("researcher@oxford.ac.uk");
    setPassword("academic123");
    setError(null);
    setLoading(true);
    apiClient
      .login("researcher@oxford.ac.uk", "academic123")
      .then((auth) => {
        setCurrentUser(auth.user);
        onAuthSuccess?.(auth.user);
        setMode("status");
      })
      .catch((err) => setError(err.message || "Demo login failed"))
      .finally(() => setLoading(false));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-elite-600/10 dark:bg-elite-500/20 text-elite-600 dark:text-elite-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === "status" && "Your Session & Quota"}
                {mode === "login" && "Sign In to eduX"}
                {mode === "register" && "Create Researcher Account"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lossless Academic Humanizer & Integrity Suite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher when not in status mode */}
        {mode !== "status" && (
          <div className="px-6 pt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("login");
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("register");
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {mode === "status" && currentUser ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-elite-600 to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-elite-50 dark:bg-elite-950/80 text-elite-700 dark:text-elite-300 border border-elite-200 dark:border-elite-800">
                      {currentUser.planType.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Session (JWT)
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage Quota */}
              {usage && (
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Daily Words Quota</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {usage.wordsScoredToday.toLocaleString()} / {usage.dailyWordCap.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-elite-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (usage.wordsScoredToday / usage.dailyWordCap) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                    <span>Suggestions used: {usage.suggestionsUsedToday} / {usage.dailySuggestionCap}</span>
                    <span>Reset: {usage.resetTime}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold transition-all shadow-sm shadow-elite-600/20 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : mode === "login" ? (
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Signing In..." : "Sign In"}
              </button>

              {/* 1-Click Demo Login */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-elite-50 hover:text-elite-700 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-elite-600" />
                  1-Click Sign In as Oxford Demo Researcher
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} noValidate className="space-y-3.5">
              {/* Field 1: EMAIL FIRST */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@higrades.ac.zw"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-600"
                  />
                </div>
              </div>

              {/* Field 2: PASSWORD */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-600"
                  />
                </div>
              </div>

              {/* Field 3: FULL NAME (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Academic Title <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Alex Hawthorne"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-600"
                  />
                </div>
              </div>

              {/* Field 4: ROLE */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-elite-600"
                >
                  <option value="academic_researcher">Doctoral / Academic Researcher</option>
                  <option value="professor">Faculty Professor / Examiner</option>
                  <option value="student">Postgraduate / Master's Student</option>
                  <option value="independent_author">Independent Scholarly Author</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
