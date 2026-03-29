import { apiFetch, resolveApiBaseUrlForHostname } from "@vedamatch/api-client";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type MobileAppConfig = {
  iosUrl: string;
  androidUrl: string;
  iosVersion: string;
  androidVersion: string;
};

const MOBILE_APP_CONFIG_TIMEOUT_MS = 1500;
const EMPTY_CONFIG: MobileAppConfig = {
  iosUrl: "",
  androidUrl: "",
  iosVersion: "",
  androidVersion: "",
};

export async function getMobileAppConfig(hostname: string): Promise<MobileAppConfig> {
  const localVersions = await readLocalMobileVersions();
  const envFallback = readEnvMobileAppConfig();
  const baseUrl = resolveApiBaseUrlForHostname(hostname);
  if (!baseUrl) {
    return mergeMobileAppConfig(envFallback, localVersions);
  }

  try {
    const response = await apiFetch<Partial<MobileAppConfig>>(baseUrl, "/mobile-app/config", {
      cache: "no-store",
      signal: AbortSignal.timeout(MOBILE_APP_CONFIG_TIMEOUT_MS),
    });

    return mergeMobileAppConfig(
      {
        iosUrl: String(response.iosUrl || "").trim(),
        androidUrl: String(response.androidUrl || "").trim(),
        iosVersion: String(response.iosVersion || "").trim(),
        androidVersion: String(response.androidVersion || "").trim(),
      },
      localVersions,
      envFallback,
    );
  } catch {
    return mergeMobileAppConfig(envFallback, localVersions);
  }
}

function mergeMobileAppConfig(...configs: Partial<MobileAppConfig>[]): MobileAppConfig {
  return configs.reduce<MobileAppConfig>(
    (acc, config) => ({
      iosUrl: acc.iosUrl || String(config.iosUrl || "").trim(),
      androidUrl: acc.androidUrl || String(config.androidUrl || "").trim(),
      iosVersion: acc.iosVersion || String(config.iosVersion || "").trim(),
      androidVersion: acc.androidVersion || String(config.androidVersion || "").trim(),
    }),
    { ...EMPTY_CONFIG },
  );
}

function readEnvMobileAppConfig(): MobileAppConfig {
  return {
    iosUrl: readEnvValue("SUPPORT_DOWNLOAD_IOS_URL", "NEXT_PUBLIC_SUPPORT_DOWNLOAD_IOS_URL"),
    androidUrl: readEnvValue("SUPPORT_DOWNLOAD_ANDROID_URL", "NEXT_PUBLIC_SUPPORT_DOWNLOAD_ANDROID_URL"),
    iosVersion: "",
    androidVersion: "",
  };
}

function readEnvValue(...keys: string[]): string {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

async function readLocalMobileVersions(): Promise<Partial<MobileAppConfig>> {
  try {
    const [androidContent, iosContent] = await Promise.all([
      readRepoFile("frontend/android/app/build.gradle"),
      readRepoFile("frontend/ios/vedamatch.xcodeproj/project.pbxproj"),
    ]);

    return {
      androidVersion: parseAndroidAppVersion(androidContent),
      iosVersion: parseIOSAppVersion(iosContent),
    };
  } catch {
    return EMPTY_CONFIG;
  }
}

async function readRepoFile(relativePath: string): Promise<string> {
  const repoRoot = path.resolve(process.cwd(), "..");
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

function parseAndroidAppVersion(content: string): string {
  const versionName = extractLastMatch(content, /versionName\s+["']?([^"'\r\n]+)["']?/g);
  const versionCode = extractLastMatch(content, /versionCode\s+(\d+)/g);
  return formatVersionLabel(versionName, versionCode);
}

function parseIOSAppVersion(content: string): string {
  const marketingVersion = extractLastMatch(content, /MARKETING_VERSION = ([^;]+);/g);
  const projectVersion = extractLastMatch(content, /CURRENT_PROJECT_VERSION = ([^;]+);/g);
  return formatVersionLabel(marketingVersion, projectVersion);
}

function extractLastMatch(content: string, pattern: RegExp): string {
  const matches = Array.from(content.matchAll(pattern));
  for (let idx = matches.length - 1; idx >= 0; idx -= 1) {
    const value = String(matches[idx][1] || "").trim().replace(/^['"]|['"]$/g, "");
    if (value) {
      return value;
    }
  }
  return "";
}

function formatVersionLabel(version: string, build: string): string {
  const normalizedVersion = version.trim();
  const normalizedBuild = build.trim();

  if (normalizedVersion && normalizedBuild) {
    return `${normalizedVersion} (${normalizedBuild})`;
  }
  if (normalizedVersion) {
    return normalizedVersion;
  }
  if (normalizedBuild) {
    return normalizedBuild;
  }
  return "";
}
