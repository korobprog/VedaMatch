import Link from "next/link";
import { MOTIVATION_LANGUAGES } from "@/lib/api";

export function LangSwitch({ current, basePath = "/" }: { current: string; basePath?: string }) {
  return (
    <nav className="lang-switch" aria-label="Language">
      {MOTIVATION_LANGUAGES.map((lang) => (
        <Link
          key={lang.code}
          href={`${basePath}?lang=${lang.code}`}
          className={lang.code === current ? "active" : ""}
        >
          {lang.label}
        </Link>
      ))}
    </nav>
  );
}
