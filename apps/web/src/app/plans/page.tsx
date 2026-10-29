"use client";

import React, { useState, useEffect } from "react";
import { PlanType, UsageSummary } from "@edux/schema";
import { apiClient } from "../../services/api/apiClient";
import { Navbar } from "../../components/navigation/Navbar";
import { EditorSidebar } from "../../components/editor/EditorSidebar";
import { PricingModal } from "../../components/pricing/PricingModal";

export default function PlansPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanType>("individual");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    async function loadUsage() {
      try {
        const usg = await apiClient.getUsage();
        setUsage(usg);
      } catch (err) {
        console.error("Usage fetch error:", err);
      }
    }
    loadUsage();
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
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        usage={usage}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <main className="flex-1 flex overflow-hidden relative">
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

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