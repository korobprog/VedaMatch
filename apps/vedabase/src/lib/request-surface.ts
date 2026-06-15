import { cookies, headers } from "next/headers";
import { normalizeHostname, resolveVedamatchSurface, type VedamatchSurface } from "@vedamatch/api-client";
import { getDictionary, normalizeLanguage, resolveLanguageFromHost } from "@vedamatch/i18n";
import type { Language } from "@vedamatch/domain-types";
import { LANGUAGE_COOKIE_KEY } from "@/lib/language-preference";

export type RequestSurfaceContext = {
  host: string;
  surface: VedamatchSurface;
  language: Language;
};

export async function getRequestSurface(): Promise<RequestSurfaceContext> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const hostHeader = headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost";
  const host = normalizeHostname(hostHeader);
  const resolvedSurface = resolveVedamatchSurface(host);
  // This app only ever serves the vedabase surface; local/unknown hosts default to it.
  const surface: VedamatchSurface =
    resolvedSurface === "local" || resolvedSurface === "unknown" ? "vedabase" : resolvedSurface;
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const language = cookieLanguage ? normalizeLanguage(cookieLanguage) : resolveLanguageFromHost(host);

  return { host, surface, language };
}

export async function getRequestDictionary() {
  const { language } = await getRequestSurface();
  return getDictionary(language);
}
