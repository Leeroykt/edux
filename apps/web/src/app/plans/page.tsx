"use client";

import React, { useState, useEffect } from "react";
import { PlanType, UsageSummary, User } from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import { PricingModal } from "../../components/pricing/PricingModal";
import { useTheme } from "../../services/theme/themeContext";

export default function PlansPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanType>("individual");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const user = apiClient.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        } else if (apiClient.getToken()) {
          const me = await apiClient.getMe();
          if (me?.user) setCurrentUser(me.user);
        }

        const usg = await apiClient.getUsage();
        setUsage(usg);
      } catch (err) {
        // Guest mode
      }
    }
    loadInitial();
  }, []);

  const handleSelectPlan = (plan: PlanType) => {
    setCurrentPlan(plan);
    if (usage) {
      if (plan === "edu_pro") {
        setUsage({
          ...usage,
          dailyWordCap: 150000,
          dailySuggestionCap: 1500,
          activePapersCap: 40,
        });
      } else if (plan === "individual") {
        setUsage({
          ...usage,
          dailyWordCap: 30000,
          dailySuggestionCap: 300,
          activePapersCap: 3,
        });
      }
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        usage={usage}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleTheme}
      />

      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        {currentUser && (
          <EditorSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
          <PricingModal
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlan}
          />
        </div>
      </main>
    </div>
  );
}