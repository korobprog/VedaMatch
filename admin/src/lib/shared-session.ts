'use client';

import { resolveVedamatchRootDomain } from '@/lib/vedamatch-hosts';

const ADMIN_AUTH_STORAGE_KEY = 'admin_data';
const SHARED_SESSION_COOKIE = 'vm_shared_session';
const SHARED_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type PortalAuthPayload = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  sessionId?: number | string;
  user?: Record<string, unknown>;
};

export type AdminSessionData = Record<string, unknown> & {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  sessionId?: number;
};

type SharedSessionUser = {
  ID?: number;
  id?: number;
  email?: string;
  karmicName?: string;
  spiritualName?: string;
  nickname?: string;
  avatarUrl?: string;
  role?: string;
  identity?: string;
  city?: string;
  country?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function normalizeToken(payload: PortalAuthPayload | null | undefined): string {
  return String(payload?.accessToken || payload?.token || '').trim();
}

function normalizeSessionId(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function resolveSharedSessionCookieDomain(hostname: string): string | null {
  const rootDomain = resolveVedamatchRootDomain(hostname);
  return rootDomain ? `.${rootDomain}` : null;
}

function readOptionalString(source: Record<string, unknown>, key: keyof SharedSessionUser): string | undefined {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readOptionalNumber(source: Record<string, unknown>, key: 'ID' | 'id'): number | undefined {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function buildCompactSessionUser(user: Record<string, unknown>): SharedSessionUser | null {
  const compactUser: SharedSessionUser = {
    ID: readOptionalNumber(user, 'ID'),
    id: readOptionalNumber(user, 'id'),
    email: readOptionalString(user, 'email'),
    karmicName: readOptionalString(user, 'karmicName'),
    spiritualName: readOptionalString(user, 'spiritualName'),
    nickname: readOptionalString(user, 'nickname'),
    avatarUrl: readOptionalString(user, 'avatarUrl'),
    role: readOptionalString(user, 'role'),
    identity: readOptionalString(user, 'identity'),
    city: readOptionalString(user, 'city'),
    country: readOptionalString(user, 'country'),
  };

  return Object.values(compactUser).some((value) => value !== undefined) ? compactUser : null;
}

function writeSharedSessionCookie(session: Record<string, unknown> | null): void {
  if (!isBrowser()) {
    return;
  }

  const domain = resolveSharedSessionCookieDomain(window.location.hostname);
  const domainSuffix = domain ? `; Domain=${domain}` : '';

  if (!session || !String(session.accessToken || '').trim()) {
    document.cookie = `${SHARED_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${domainSuffix}`;
    return;
  }

  const secureSuffix = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SHARED_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; Path=/; Max-Age=${SHARED_SESSION_TTL_SECONDS}; SameSite=Lax${domainSuffix}${secureSuffix}`;
}

function buildSharedSessionPayload(data: AdminSessionData | null): Record<string, unknown> | null {
  if (!data) {
    return null;
  }

  const {
    token,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    sessionId,
    ...user
  } = data;

  const normalizedAccessToken = String(accessToken || token || '').trim();
  if (!normalizedAccessToken) {
    return null;
  }

  return {
    accessToken: normalizedAccessToken,
    refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
    accessTokenExpiresAt: typeof accessTokenExpiresAt === 'string' ? accessTokenExpiresAt : undefined,
    refreshTokenExpiresAt: typeof refreshTokenExpiresAt === 'string' ? refreshTokenExpiresAt : undefined,
    sessionId: normalizeSessionId(sessionId as number | string | undefined),
    user: buildCompactSessionUser(user),
  };
}

export function readAdminSessionData(): AdminSessionData | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const token = String(parsed.accessToken || parsed.token || '').trim();
    if (!token) {
      return null;
    }

    return {
      ...parsed,
      token,
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : token,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : undefined,
      accessTokenExpiresAt: typeof parsed.accessTokenExpiresAt === 'string' ? parsed.accessTokenExpiresAt : undefined,
      refreshTokenExpiresAt: typeof parsed.refreshTokenExpiresAt === 'string' ? parsed.refreshTokenExpiresAt : undefined,
      sessionId: normalizeSessionId(parsed.sessionId as number | string | undefined),
    };
  } catch {
    return null;
  }
}

function saveAdminSessionData(data: AdminSessionData | null): AdminSessionData | null {
  if (!isBrowser()) {
    return data;
  }

  if (!data) {
    clearPortalAuthData();
    return null;
  }

  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(data));
  writeSharedSessionCookie(buildSharedSessionPayload(data));
  return data;
}

export function persistAdminAuthPayload(payload: PortalAuthPayload): AdminSessionData | null {
  const token = normalizeToken(payload);
  if (!token) {
    return null;
  }

  const user = payload.user || {};
  return saveAdminSessionData({
    ...user,
    token,
    accessToken: token,
    refreshToken: typeof payload.refreshToken === 'string' ? payload.refreshToken : undefined,
    accessTokenExpiresAt: typeof payload.accessTokenExpiresAt === 'string' ? payload.accessTokenExpiresAt : undefined,
    refreshTokenExpiresAt: typeof payload.refreshTokenExpiresAt === 'string' ? payload.refreshTokenExpiresAt : undefined,
    sessionId: normalizeSessionId(payload.sessionId),
  });
}

export function mergeAdminUserData(userPatch: Record<string, unknown>): AdminSessionData | null {
  const current = readAdminSessionData();
  if (!current) {
    return null;
  }

  return saveAdminSessionData({
    ...current,
    ...userPatch,
    token: current.token,
    accessToken: current.accessToken || current.token,
    refreshToken: current.refreshToken,
    accessTokenExpiresAt: current.accessTokenExpiresAt,
    refreshTokenExpiresAt: current.refreshTokenExpiresAt,
    sessionId: current.sessionId,
  });
}

export function syncSharedSessionFromAdminStorage(): AdminSessionData | null {
  const current = readAdminSessionData();
  if (!current) {
    writeSharedSessionCookie(null);
    return null;
  }

  writeSharedSessionCookie(buildSharedSessionPayload(current));
  return current;
}

export function clearPortalAuthData(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem('token');
  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  writeSharedSessionCookie(null);
}
