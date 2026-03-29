"use client";

import { useSession } from "@/components/session-context";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { dictionary, language, setLanguage } = useSession();

  return (
    <select
      aria-label={dictionary.languageLabel}
      className={["dashboard-select", className].filter(Boolean).join(" ")}
      onChange={(event) => setLanguage(event.target.value)}
      value={language}
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
      <option value="hi">HI</option>
    </select>
  );
}
