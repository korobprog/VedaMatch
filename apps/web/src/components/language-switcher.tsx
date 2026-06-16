"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context";

export function LanguageSwitcher({ className, refreshOnChange = false }: { className?: string; refreshOnChange?: boolean }) {
  const router = useRouter();
  const { dictionary, language, setLanguage } = useSession();

  return (
    <select
      aria-label={dictionary.languageLabel}
      className={["dashboard-select", className].filter(Boolean).join(" ")}
      onChange={(event) => {
        setLanguage(event.target.value);
        if (refreshOnChange) {
          router.refresh();
        }
      }}
      value={language}
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
      <option value="hi">HI</option>
    </select>
  );
}
