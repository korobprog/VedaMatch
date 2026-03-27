"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearBrowserSession, createBrowserClient, getBrowserSession, saveBrowserSession } from "@vedamatch/api-client";
import { getDictionary, normalizeLanguage, type Dictionary } from "@vedamatch/i18n";
import type { AuthSession, Language } from "@vedamatch/domain-types";

type SessionContextValue = {
  ready: boolean;
  session: AuthSession | null;
  language: Language;
  dictionary: Dictionary;
  setSession: (session: AuthSession | null) => void;
  setLanguage: (language: string) => void;
  logout: () => Promise<void>;
};

const LANGUAGE_STORAGE_KEY = "vm_web_language";
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const nextSession = getBrowserSession();
    const storedLanguage = typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
    const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "en";

    setSessionState(nextSession);
    setLanguageState(normalizeLanguage(storedLanguage || browserLanguage));
    setReady(true);
  }, []);

  const value = useMemo<SessionContextValue>(() => ({
    ready,
    session,
    language,
    dictionary: getDictionary(language),
    setSession: (nextSession) => {
      saveBrowserSession(nextSession);
      setSessionState(nextSession);
    },
    setLanguage: (nextLanguage) => {
      const normalized = normalizeLanguage(nextLanguage);
      setLanguageState(normalized);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
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
  }), [language, ready, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }
  return context;
}
