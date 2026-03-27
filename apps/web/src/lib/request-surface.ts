import { headers } from "next/headers";
import { normalizeHostname, resolveVedamatchSurface, type VedamatchSurface } from "@vedamatch/api-client";
import { getDictionary, resolveLanguageFromHost } from "@vedamatch/i18n";
import type { Language } from "@vedamatch/domain-types";

export type RequestSurfaceContext = {
  host: string;
  surface: VedamatchSurface;
  isSocial: boolean;
  language: Language;
};

export async function getRequestSurface(): Promise<RequestSurfaceContext> {
  const headerStore = await headers();
  const hostHeader = headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost";
  const host = normalizeHostname(hostHeader);
  const surface = resolveVedamatchSurface(host);
  const language = resolveLanguageFromHost(host);

  return {
    host,
    surface,
    isSocial: surface === "social",
    language,
  };
}

export async function getRequestDictionary() {
  const { language } = await getRequestSurface();
  return getDictionary(language);
}
