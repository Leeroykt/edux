"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Read saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("edux_theme") as ThemeMode | null;
      if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
        setThemeState(saved);
      } else {
        setThemeState("system");
      }
    } catch {
      setThemeState("system");
    }
  }, []);

  // Update DOM when theme or system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      let activeTheme: "light" | "dark" = "light";
      if (theme === "system") {
        activeTheme = mediaQuery.matches ? "dark" : "light";
      } else {
        activeTheme = theme;
      }

      setResolvedTheme(activeTheme);

      if (activeTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    const handleSystemChange = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem("edux_theme", mode);
    } catch {}
  };

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
