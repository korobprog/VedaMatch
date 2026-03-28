export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "vm_web_theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function normalizeThemePreference(input?: string | null): ThemePreference {
  const value = String(input || "").trim().toLowerCase();
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function resolveSystemTheme(prefersDark: boolean): ResolvedTheme {
  return prefersDark ? "dark" : "light";
}

export function resolveThemePreference(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return preference === "system" ? resolveSystemTheme(prefersDark) : preference;
}

export function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return resolveSystemTheme(window.matchMedia(THEME_MEDIA_QUERY).matches);
}

export function applyDocumentTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function getThemeInitScript() {
  return `(() => {
    try {
      const storageKey = "${THEME_STORAGE_KEY}";
      const mediaQuery = "${THEME_MEDIA_QUERY}";
      const stored = window.localStorage.getItem(storageKey);
      const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
      const resolved = preference === "system"
        ? (window.matchMedia(mediaQuery).matches ? "dark" : "light")
        : preference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    } catch {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();`;
}
