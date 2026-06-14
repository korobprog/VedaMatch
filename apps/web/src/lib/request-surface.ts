import { cookies, headers } from "next/headers";
import { normalizeHostname, resolveVedamatchSurface, type VedamatchSurface } from "@vedamatch/api-client";
import { getDictionary, normalizeLanguage, resolveLanguageFromHost } from "@vedamatch/i18n";
import type { Language } from "@vedamatch/domain-types";
import { LANGUAGE_COOKIE_KEY } from "@/lib/language-preference";

export type RequestSurfaceContext = {
  host: string;
  origin: string;
  surface: VedamatchSurface;
  isSocial: boolean;
  isUnion: boolean;
  language: Language;
};

function buildRequestOrigin(hostHeader: string, host: string, protoHeader: string | null) {
  const normalizedProto = protoHeader === "http" || protoHeader === "https" ? protoHeader : null;
  const isLocalHost = hostHeader.startsWith("localhost") || hostHeader.startsWith("127.0.0.1");
  const forwardedProto = isLocalHost ? normalizedProto ?? "http" : "https";
  const originHost = hostHeader || host;
  return `${forwardedProto}://${originHost}`;
}

export async function getRequestSurface(): Promise<RequestSurfaceContext> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const hostHeader = headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost";
  const host = normalizeHostname(hostHeader);
  const origin = buildRequestOrigin(hostHeader, host, headerStore.get("x-forwarded-proto"));
  const surface = resolveVedamatchSurface(host);
  const isUnion = surface === "local" || host === "union.vedamatch.ru" || host === "union.vedamatch.com";
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const fallbackLanguage = surface === "local" ? "ru" : resolveLanguageFromHost(host);
  const language = cookieLanguage ? normalizeLanguage(cookieLanguage) : fallbackLanguage;

  return {
    host,
    origin,
    surface,
    isSocial: surface === "social",
    isUnion,
    language,
  };
}

export async function getRequestDictionary() {
  const { language } = await getRequestSurface();
  return getDictionary(language);
}
