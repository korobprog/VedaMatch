"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSession } from "@/components/session-context";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: Array<{
  value: ThemePreference;
  icon: typeof Monitor;
}> = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

export function ThemeSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { dictionary, themePreference, setThemePreference } = useSession();

  const labels: Record<ThemePreference, string> = {
    system: dictionary.theme.system,
    light: dictionary.theme.light,
    dark: dictionary.theme.dark,
  };

  return (
    <div
      aria-label={dictionary.theme.label}
      className={["theme-switcher", compact ? "theme-switcher--compact" : "", className].filter(Boolean).join(" ")}
      data-value={themePreference}
      role="radiogroup"
    >
      <div aria-hidden="true" className="theme-switcher__indicator" />
      {OPTIONS.map(({ value, icon: Icon }) => (
        <button
          aria-checked={themePreference === value}
          aria-label={labels[value]}
          className={themePreference === value ? "theme-switcher__button is-active" : "theme-switcher__button"}
          key={value}
          onClick={() => setThemePreference(value)}
          role="radio"
          title={labels[value]}
          type="button"
        >
          <Icon aria-hidden="true" size={16} strokeWidth={2.1} />
          <span className="theme-switcher__label">{labels[value]}</span>
        </button>
      ))}
    </div>
  );
}
