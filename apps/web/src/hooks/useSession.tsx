"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UsageSummary, User } from "@edux/schema";
import { apiClient } from "../services/api/apiClient";
import { Dialect, guessDialect } from "../lib/dialect";

import type { WritingMode, CitationStyle } from "@edux/schema";
export type { WritingMode, CitationStyle };

export interface Preferences {
  dialect: Dialect;
  writingMode: WritingMode;
  citationStyle: CitationStyle;
  fontFamily: string;
  /** Grammar and clarity checks in the review panel. */
  grammarChecks: boolean;
  /** Set once the first-run guide has been finished or skipped. */
  onboarded: boolean;
}

export type ChecklistStep = "uploaded" | "scored" | "rewrote" | "exported";
export type Checklist = Record<ChecklistStep, boolean>;

const PREFS_KEY = "edux_prefs_v2";
const CHECKLIST_KEY = "edux_checklist_v1";

// The first render must match the server's, so the browser's locale is applied after mount.
const defaultPrefs = (): Preferences => ({
  dialect: "en-GB",
  writingMode: "academic",
  citationStyle: "APA 7",
  fontFamily: "Newsreader",
  grammarChecks: true,
  onboarded: false,
});

const emptyChecklist: Checklist = { uploaded: false, scored: false, rewrote: false, exported: false };

interface SessionValue {
  /** True once the first check for a signed-in user has finished. */
  ready: boolean;
  user: User | null;
  usage: UsageSummary | null;
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  checklist: Checklist;
  completeStep: (step: ChecklistStep) => void;
  refreshUsage: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Opens the shared sign-in dialog. */
  openAuth: (mode?: "login" | "register") => void;
  /** Opens the shared upload dialog. */
  openUpload: () => void;
  /** Called by the auth dialog after a successful sign-in. */
  setUser: (user: User | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage can be unavailable in private windows
  }
}

export const SessionProvider: React.FC<{
  children: React.ReactNode;
  onOpenAuth: (mode?: "login" | "register") => void;
  onOpenUpload: () => void;
}> = ({ children, onOpenAuth, onOpenUpload }) => {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [prefs, setPrefsState] = useState<Preferences>(defaultPrefs);
  const [checklist, setChecklist] = useState<Checklist>(emptyChecklist);

  // Load saved preferences and progress once, in the browser.
  useEffect(() => {
    const saved = readJson<Partial<Preferences>>(PREFS_KEY);
    if (saved) setPrefsState({ ...defaultPrefs(), ...saved });
    else setPrefsState((prev) => ({ ...prev, dialect: guessDialect() }));
    const steps = readJson<Checklist>(CHECKLIST_KEY);
    if (steps) setChecklist({ ...emptyChecklist, ...steps });
  }, []);

  const refreshUsage = useCallback(async () => {
    if (!apiClient.getToken()) return;
    try {
      setUsage(await apiClient.getUsage());
    } catch {
      // usage is a nicety; keep the last value
    }
  }, []);

  // One check for the signed-in user and their usage, shared by every page.
  useEffect(() => {
    let live = true;
    (async () => {
      const cached = apiClient.getCurrentUser();
      if (cached && live) setUser(cached);
      if (apiClient.getToken()) {
        const me = await apiClient.getMe();
        if (!live) return;
        if (me?.user) {
          setUser(me.user);
          if (me.usage) setUsage(me.usage);
        } else if (!cached) {
          setUser(null);
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      writeJson(PREFS_KEY, next);
      return next;
    });
  }, []);

  const completeStep = useCallback((step: ChecklistStep) => {
    setChecklist((prev) => {
      if (prev[step]) return prev;
      const next = { ...prev, [step]: true };
      writeJson(CHECKLIST_KEY, next);
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
    setUsage(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      user,
      usage,
      prefs,
      setPrefs,
      checklist,
      completeStep,
      refreshUsage,
      signOut,
      openAuth: onOpenAuth,
      openUpload: onOpenUpload,
      setUser: (u) => {
        setUser(u);
        if (u) void refreshUsage();
      },
    }),
    [ready, user, usage, prefs, setPrefs, checklist, completeStep, refreshUsage, signOut, onOpenAuth, onOpenUpload]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
