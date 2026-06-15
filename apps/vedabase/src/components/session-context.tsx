"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearBrowserSession, createBrowserClient, getBrowserSession, saveBrowserSession } from "@vedamatch/api-client";
import { getDictionary, normalizeLanguage, type Dictionary } from "@vedamatch/i18n";
import type { AuthSession, Language } from "@vedamatch/domain-types";
import { LANGUAGE_COOKIE_KEY, LANGUAGE_STORAGE_KEY } from "@/lib/language-preference";
import {
  applyDocumentTheme,
  normalizeThemePreference,
  readSystemTheme,
  resolveThemePreference,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type SessionContextValue = {
  ready: boolean;
  session: AuthSession | null;
  language: Language;
  dictionary: Dictionary;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setSession: (session: AuthSession | null) => void;
  setLanguage: (language: string) => void;
  setThemePreference: (theme: ThemePreference) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function writeLanguagePreference(language: Language) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function SessionProvider({
  children,
  initialLanguage = "ru",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [ready, setReady] = useState(false);
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const nextSession = getBrowserSession();
    const storedLanguage = typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
    const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "ru";
    const storedTheme = typeof window !== "undefined" ? window.localStorage.getItem(THEME_STORAGE_KEY) : null;
    const nextThemePreference = normalizeThemePreference(storedTheme);
    const nextResolvedTheme = resolveThemePreference(nextThemePreference, readSystemTheme() === "dark");

    setSessionState(nextSession);
    const nextLanguage = normalizeLanguage(storedLanguage || initialLanguage || browserLanguage);
    setLanguageState(nextLanguage);
    writeLanguagePreference(nextLanguage);
    setThemePreferenceState(nextThemePreference);
    setResolvedTheme(nextResolvedTheme);
    applyDocumentTheme(nextResolvedTheme);
    setReady(true);
  }, [initialLanguage]);

  useEffect(() => {
    if (typeof window === "undefined" || themePreference !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      const nextTheme = event.matches ? "dark" : "light";
      setResolvedTheme(nextTheme);
      applyDocumentTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themePreference]);

  const value = useMemo<SessionContextValue>(() => ({
    ready,
    session,
    language,
    dictionary: getDictionary(language),
    themePreference,
    resolvedTheme,
    setSession: (nextSession) => {
      saveBrowserSession(nextSession);
      setSessionState(nextSession);
    },
    setLanguage: (nextLanguage) => {
      const normalized = normalizeLanguage(nextLanguage);
      setLanguageState(normalized);
      writeLanguagePreference(normalized);
    },
    setThemePreference: (nextThemePreference) => {
      const normalized = normalizeThemePreference(nextThemePreference);
      const nextResolvedTheme = resolveThemePreference(normalized, readSystemTheme() === "dark");

      setThemePreferenceState(normalized);
      setResolvedTheme(nextResolvedTheme);
      applyDocumentTheme(nextResolvedTheme);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
      }
    },
    logout: async () => {
      try {
        await createBrowserClient().logout();
      } catch {
        clearBrowserSession();
      } finally {
        setSessionState(null);
      }
    },
  }), [language, ready, resolvedTheme, session, themePreference]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }
  return context;
}
