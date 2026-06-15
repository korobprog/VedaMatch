// Per-user last-read position, stored server-side (shared DB). Best-effort: failures
// are swallowed so reading is never blocked by a flaky network.
import { apiFetch, getBrowserSession, resolveApiBaseUrlForHostname } from "@vedamatch/api-client";

export interface ReadingProgress {
  book_code: string;
  canto: number;
  chapter: number;
  verse: string;
  language: string;
}

function baseUrl(): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return resolveApiBaseUrlForHostname(host);
}

function accessToken(): string | null {
  return getBrowserSession()?.accessToken ?? null;
}

export const progressService = {
  async get(bookCode: string): Promise<ReadingProgress | null> {
    const token = accessToken();
    if (!token) return null;
    try {
      return await apiFetch<ReadingProgress | null>(
        baseUrl(),
        `/vedabase/progress?bookCode=${encodeURIComponent(bookCode)}`,
        {},
        token,
      );
    } catch {
      return null;
    }
  },

  async save(progress: ReadingProgress): Promise<void> {
    const token = accessToken();
    if (!token) return;
    try {
      await apiFetch(baseUrl(), "/vedabase/progress", {
        method: "PUT",
        body: JSON.stringify(progress),
      }, token);
    } catch {
      // best-effort, ignore
    }
  },
};
