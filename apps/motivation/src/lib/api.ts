import { headers } from "next/headers";
import { normalizeHostname, resolveApiBaseUrlForHostname } from "@vedamatch/api-client";

// Top-10 most spoken languages — must mirror MOTIVATION_LANGUAGES on the backend.
export const MOTIVATION_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "hi", label: "हिन्दी" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "bn", label: "বাংলা" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "id", label: "Indonesia" },
] as const;

export const RTL_LANGUAGES = new Set(["ar"]);

export async function resolveApiBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const hostHeader =
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost";
  return resolveApiBaseUrlForHostname(normalizeHostname(hostHeader));
}

export function normalizeLang(input?: string | string[] | null): string {
  const raw = Array.isArray(input) ? input[0] : input;
  const lang = (raw || "").toLowerCase().trim();
  if (MOTIVATION_LANGUAGES.some((l) => l.code === lang)) {
    return lang;
  }
  return "en";
}
