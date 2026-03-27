import { headers } from "next/headers";
import { normalizeHostname, resolveVedamatchSurface, type VedamatchSurface } from "@vedamatch/api-client";

export type RequestSurfaceContext = {
  host: string;
  surface: VedamatchSurface;
  isSocial: boolean;
};

export async function getRequestSurface(): Promise<RequestSurfaceContext> {
  const headerStore = await headers();
  const hostHeader = headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost";
  const host = normalizeHostname(hostHeader);
  const surface = resolveVedamatchSurface(host);

  return {
    host,
    surface,
    isSocial: surface === "social",
  };
}
