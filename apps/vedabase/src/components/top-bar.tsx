"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { buildVedamatchUrl } from "@vedamatch/api-client";
import { useSession } from "@/components/session-context";
import { t } from "@/lib/copy";

export function TopBar() {
  const { session, language, resolvedTheme, setLanguage, setThemePreference, logout, ready } = useSession();
  const router = useRouter();

  // Resolved from the real hostname after mount to avoid SSR/client hydration mismatch.
  const [unionUrl, setUnionUrl] = useState("");
  useEffect(() => {
    setUnionUrl(buildVedamatchUrl(window.location.hostname, "union", "/"));
  }, []);

  return (
    <header className="vb-topbar">
      <Link href="/" className="vb-brand">
        <BookOpen size={22} color="var(--vb-gold)" />
        Vedabase
      </Link>

      <div className="vb-topbar-actions">
        {unionUrl && (
          <a className="vb-btn vb-btn-ghost" href={unionUrl}>
            {t(language, "Знакомства", "Union")}
          </a>
        )}
        <button
          className="vb-btn vb-btn-icon"
          aria-label={t(language, "Сменить тему", "Toggle theme")}
          onClick={() => setThemePreference(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="vb-btn vb-btn-icon"
          aria-label={t(language, "Сменить язык", "Switch language")}
          onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
        >
          {language === "ru" ? "EN" : "RU"}
        </button>

        {ready && session ? (
          <button className="vb-btn" onClick={() => logout()}>
            <LogOut size={16} />
            {t(language, "Выйти", "Sign out")}
          </button>
        ) : (
          <button className="vb-btn vb-btn-primary" onClick={() => router.push("/login")}>
            <LogIn size={16} />
            {t(language, "Войти", "Sign in")}
          </button>
        )}
      </div>
    </header>
  );
}
