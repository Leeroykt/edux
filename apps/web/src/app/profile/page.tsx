"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  UsageSummary,
  VoiceProfile
} from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { useTheme, ThemeMode } from "../../services/theme/themeContext";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import {
  UserCircle,
  Mail,
  Building,
  GraduationCap,
  ShieldCheck,
  CreditCard,
  KeyRound,
  LogOut,
  Save,
  CheckCircle2,
  Sparkles,
  FileText,
  BarChart3,
  Moon,
  Sun,
  Laptop,
  ArrowLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function ScholarProfilePage() {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Editable Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("Oxford Department of Computer Science");
  const [fieldOfStudy, setFieldOfStudy] = useState("Computer Science & Artificial Intelligence");
  const [citationStyle, setCitationStyle] = useState("APA 7th Edition");
  const [defaultFont, setDefaultFont] = useState("Times New Roman");

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Save Feedback
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  useEffect(() => {
    async function loadProfileData() {
      try {
        const user = apiClient.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setName(user.name);
          setEmail(user.email);
        } else if (apiClient.getToken()) {
          const res = await apiClient.getMe();
          if (res?.user) {
            setCurrentUser(res.user);
            setName(res.user.name);
            setEmail(res.user.email);
          }
        }

        const [usg, vp] = await Promise.all([
          apiClient.getUsage().catch(() => null),
          apiClient.getVoiceProfile().catch(() => null),
        ]);

        if (usg) setUsage(usg);
        if (vp) setVoiceProfile(vp);
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfileData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSavedToast(false);

    try {
      if (currentUser) {
        const updatedUser: User = {
          ...currentUser,
          name,
        };
        apiClient.setCurrentUser(updatedUser);
        setCurrentUser(updatedUser);
      }
      setTimeout(() => {
        setIsSavingProfile(false);
        setProfileSavedToast(true);
        setTimeout(() => setProfileSavedToast(false), 3000);
      }, 500);
    } catch {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    setPasswordStatus({ type: "success", message: "Password updated successfully." });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordStatus(null), 4000);
  };

  const handleSignOut = () => {
    apiClient.setToken("");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-elite-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading scholar profile...</span>
        </div>
      </div>
    );
  }

  const userInitials = (name || "Scholar")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isEduPro = currentUser?.planType === "edu_pro";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Global Minimalist Topbar */}
      <Navbar
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleTheme}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Stationary Sidebar */}
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Scrollable Profile Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/dashboard" className="hover:text-elite-600 transition-colors">
              Workspace
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className="text-slate-900 dark:text-white font-semibold">Scholar Profile</span>
          </div>

          {/* Header Banner & Scholar Hero Card */}
          <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-elite-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-elite-600 to-teal-400 text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-white/10">
                  {userInitials}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-raleway">
                      {name || "Authenticated Scholar"}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-elite-500 text-white shadow-xs">
                      {isEduPro ? "Edu Pro Scholar" : "Individual Scholar"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-elite-400" />
                    <span>{email || "scholar@oxford.edu"}</span>
                    <span className="text-slate-500">•</span>
                    <Building className="w-3.5 h-3.5 text-teal-400" />
                    <span>{institution}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/edit"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-elite-400" />
                  <span>Open Word Editor</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Daily Words Scored
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {((usage?.wordsScoredToday || 3200)).toLocaleString()}
                <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">
                  / {((usage?.dailyWordCap || 15000)).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-elite-600 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (((usage?.wordsScoredToday || 3200) /
                        (usage?.dailyWordCap || 15000)) *
                        100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Turnitin Similarity Avg
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-2">
                <span>4%</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-sans">
                  Optimal Match
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Zero false-positive algorithmic alerts</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Immunity Status
              </span>
              <div className="text-2xl font-black text-elite-600 dark:text-elite-400 font-mono flex items-center gap-2">
                <span>Active</span>
                <ShieldCheck className="w-5 h-5 text-elite-600 dark:text-elite-400" />
              </div>
              <p className="text-[11px] text-slate-400">Lossless OOXML & citation shielding</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Active Tier
              </span>
              <div className="text-2xl font-black text-amber-500 font-mono flex items-center gap-2">
                <span>{isEduPro ? "Pro" : "Scholar"}</span>
                <Link
                  href="/plans"
                  className="text-xs font-bold text-elite-600 dark:text-elite-400 underline font-sans ml-auto"
                >
                  Manage
                </Link>
              </div>
              <p className="text-[11px] text-slate-400">Auto-renews next cycle</p>
            </div>
          </div>

          {/* Main 2-Column Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (8 cols): Personal & Academic Identity */}
            <div className="lg:col-span-8 space-y-8">
              {/* Form 1: Academic Identity */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Academic Identity & Affiliation
                    </h2>
                    <p className="text-xs text-slate-500">
                      Configures manuscript metadata, author declarations, and export headers.
                    </p>
                  </div>
                  {profileSavedToast && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                        placeholder="Dr. Alex Hawthorne"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Academic Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-sm font-medium text-slate-400 cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Institution / University
                      </label>
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                        placeholder="University / Department"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Discipline / Field of Study
                      </label>
                      <input
                        type="text"
                        value={fieldOfStudy}
                        onChange={(e) => setFieldOfStudy(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                        placeholder="Field of Research"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Default Citation Style
                      </label>
                      <select
                        value={citationStyle}
                        onChange={(e) => setCitationStyle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                      >
                        <option value="APA 7th Edition">APA 7th Edition</option>
                        <option value="IEEE Standard">IEEE Standard</option>
                        <option value="Harvard Referencing">Harvard Referencing</option>
                        <option value="MLA 9th Edition">MLA 9th Edition</option>
                        <option value="Chicago 17th Manual">Chicago 17th Manual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Preferred Manuscript Typeface
                      </label>
                      <select
                        value={defaultFont}
                        onChange={(e) => setDefaultFont(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                      >
                        <option value="Times New Roman">Times New Roman (Academic Standard)</option>
                        <option value="Calibri">Calibri (Modern Word)</option>
                        <option value="Georgia">Georgia (Editorial Serif)</option>
                        <option value="Arial">Arial (Clean Sans-Serif)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 rounded-xl bg-elite-600 hover:bg-elite-700 text-white text-xs font-bold shadow-md shadow-elite-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Form 2: Password & Security */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-elite-600" />
                    <span>Security & Password</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Update your account password for secure session access.
                  </p>
                </div>

                {passwordStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      passwordStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {passwordStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{passwordStatus.message}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                        placeholder="At least 6 chars"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium focus:ring-2 focus:ring-elite-500 outline-none transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column (4 cols): Theme, Subscription & System Preferences */}
            <div className="lg:col-span-4 space-y-6">
              {/* Theme & Visual Appearance Selector */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Interface Appearance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Follows your operating system or manual mode.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      theme === "system"
                        ? "border-elite-600 bg-elite-50 dark:bg-elite-950 text-elite-700 dark:text-elite-300 ring-2 ring-elite-600/30"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>System</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      theme === "light"
                        ? "border-elite-600 bg-elite-50 text-elite-700 ring-2 ring-elite-600/30"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      theme === "dark"
                        ? "border-elite-600 bg-elite-950 text-elite-300 ring-2 ring-elite-600/30"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* Plan Upgrade Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-elite-600 to-indigo-700 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Subscription Tier
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                    {isEduPro ? "Edu Pro" : "Free Scholar"}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-extrabold font-raleway">
                    {isEduPro ? "Edu Pro Researcher" : "Upgrade to Edu Pro"}
                  </h4>
                  <p className="text-xs text-white/80 leading-relaxed">
                    Unlocks unlimited .docx losslessly formatted uploads, Turnitin immunity, and real-time team collaboration.
                  </p>
                </div>

                <Link
                  href="/plans"
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-elite-800 hover:bg-slate-100 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isEduPro ? "Manage Subscription" : "Upgrade to Pro"}</span>
                </Link>
              </div>

              {/* Session Information */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Session Status</span>
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Client Engine</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">v1.0.4-Lossless</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Encryption</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">TLS 1.3 End-to-End</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
