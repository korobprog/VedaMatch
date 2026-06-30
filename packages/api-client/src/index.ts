import type {
  AuthSession,
  AuthTokens,
  ChatConversationFilter,
  ChatConversationsResponse,
  ChapterInfo,
  DatingCandidate,
  DatingCandidatesQuery,
  DatingChatRequest,
  DatingChatRequestsResponse,
  DatingPresentationResponse,
  DatingProfile,
  DatingUnlockResponse,
  Language,
  LoginResponse,
  NewsItem,
  NewsListResponse,
  P2PMessage,
  PaginatedContactsResponse,
  PaginatedMessagesResponse,
  RootDomain,
  ScriptureBook,
  ScriptureVerse,
  ServiceListResponse,
  SocialAuthConfigResponse,
  SupportConfig,
  SupportConversation,
  SupportMessage,
  TransactionListResponse,
  UserMedia,
  WalletResponse,
  YatraListResponse,
} from "@vedamatch/domain-types";
import { normalizeLanguage } from "@vedamatch/i18n";

export type VedamatchSurface = "portal" | "social" | "union" | "panel" | "lkm" | "vedabase" | "motivation" | "local" | "unknown";
export type VedamatchSubdomain = "admin" | "social" | "union" | "panel" | "lkm" | "vedabase" | "motivation" | "api";
export type ContactsQueryOptions = {
  tab?: "all" | "friends" | "blocked";
  q?: string;
  limit?: number;
  cursor?: number;
};

export type DatingChatRequestsQuery = {
  direction?: "incoming" | "outgoing" | "all";
  status?: "pending" | "accepted" | "rejected" | "canceled" | "all";
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const AUTH_STORAGE_KEYS = {
  accessToken: "vm_access_token",
  refreshToken: "vm_refresh_token",
  accessTokenExpiresAt: "vm_access_expires_at",
  refreshTokenExpiresAt: "vm_refresh_expires_at",
  sessionId: "vm_session_id",
  user: "vm_user",
  language: "vm_language",
} as const;
const SHARED_SESSION_COOKIE = "vm_shared_session";
const SHARED_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type SharedSessionCookiePayload = AuthSession;

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().trim().replace(/:\d+$/, "");
}

export function resolveVedamatchRootDomain(hostname: string): RootDomain | null {
  const normalized = normalizeHostname(hostname);
  if (normalized === "vedamatch.ru" || normalized.endsWith(".vedamatch.ru")) {
    return "vedamatch.ru";
  }
  if (normalized === "vedamatch.com" || normalized.endsWith(".vedamatch.com")) {
    return "vedamatch.com";
  }
  return null;
}

export function resolveVedamatchSurface(hostname: string): VedamatchSurface {
  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    return "local";
  }
  if (normalized === "admin.vedamatch.ru" || normalized === "admin.vedamatch.com") {
    return "portal";
  }
  if (normalized === "social.vedamatch.ru" || normalized === "social.vedamatch.com") {
    return "social";
  }
  if (normalized === "union.vedamatch.ru" || normalized === "union.vedamatch.com") {
    return "union";
  }
  if (normalized === "panel.vedamatch.ru" || normalized === "panel.vedamatch.com") {
    return "panel";
  }
  if (normalized === "lkm.vedamatch.ru" || normalized === "lkm.vedamatch.com") {
    return "lkm";
  }
  if (normalized === "vedabase.vedamatch.ru" || normalized === "vedabase.vedamatch.com") {
    return "vedabase";
  }
  if (normalized === "motivation.vedamatch.ru" || normalized === "motivation.vedamatch.com") {
    return "motivation";
  }
  return "unknown";
}

export function buildVedamatchOrigin(hostname: string, subdomain: VedamatchSubdomain): string {
  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    const port = subdomain === "api" ? "8000" : subdomain === "lkm" ? "3006" : subdomain === "union" ? "3007" : subdomain === "vedabase" ? "3008" : subdomain === "motivation" ? "3009" : "3010";
    return `http://${normalized}:${port}`;
  }

  const rootDomain = resolveVedamatchRootDomain(normalized);
  if (!rootDomain) {
    return "";
  }

  return `https://${subdomain}.${rootDomain}`;
}

export function buildVedamatchUrl(hostname: string, subdomain: VedamatchSubdomain, pathname: string, search = ""): string {
  const origin = buildVedamatchOrigin(hostname, subdomain);
  if (!origin) {
    return `${pathname}${search}`;
  }
  return `${origin}${pathname}${search}`;
}

export function resolveApiBaseUrlForHostname(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    return "http://localhost:8000/api";
  }
  if (normalized.endsWith(".vedamatch.com") || normalized === "vedamatch.com") {
    return "https://api.vedamatch.com/api";
  }
  return "https://api.vedamatch.ru/api";
}

function normalizeTokens(payload: LoginResponse | AuthTokens | null | undefined): AuthTokens | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const legacyToken = "token" in payload ? payload.token : undefined;
  const accessToken = String(payload.accessToken || legacyToken || "").trim();
  if (!accessToken) {
    return null;
  }

  const sessionIdValue = payload.sessionId;
  const sessionId = typeof sessionIdValue === "number" && Number.isFinite(sessionIdValue) ? sessionIdValue : undefined;

  return {
    accessToken,
    refreshToken: payload.refreshToken ? String(payload.refreshToken) : undefined,
    accessTokenExpiresAt: payload.accessTokenExpiresAt ? String(payload.accessTokenExpiresAt) : undefined,
    refreshTokenExpiresAt: payload.refreshTokenExpiresAt ? String(payload.refreshTokenExpiresAt) : undefined,
    sessionId,
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function resolveSharedSessionCookieDomain(hostname: string): string | null {
  const rootDomain = resolveVedamatchRootDomain(hostname);
  return rootDomain ? `.${rootDomain}` : null;
}

function encodeSharedSessionCookie(session: AuthSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

function decodeSharedSessionCookie(value: string | null | undefined): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as SharedSessionCookiePayload | null;
    const tokens = normalizeTokens(parsed);
    if (!tokens) {
      return null;
    }

    return {
      ...tokens,
      user: parsed?.user || null,
    };
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix));

  return match ? match.slice(prefix.length) : null;
}

function clearSharedSessionCookie(): void {
  if (!isBrowser()) {
    return;
  }

  const domain = resolveSharedSessionCookieDomain(window.location.hostname);
  const domainSuffix = domain ? `; Domain=${domain}` : "";
  document.cookie = `${SHARED_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${domainSuffix}`;
}

function writeSharedSessionCookie(session: AuthSession | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!session?.accessToken) {
    clearSharedSessionCookie();
    return;
  }

  const domain = resolveSharedSessionCookieDomain(window.location.hostname);
  const domainSuffix = domain ? `; Domain=${domain}` : "";
  const secureSuffix = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SHARED_SESSION_COOKIE}=${encodeSharedSessionCookie(session)}; Path=/; Max-Age=${SHARED_SESSION_TTL_SECONDS}; SameSite=Lax${domainSuffix}${secureSuffix}`;
}

function restoreBrowserSessionFromSharedCookie(): AuthSession | null {
  const session = decodeSharedSessionCookie(readCookie(SHARED_SESSION_COOKIE));
  if (!session?.accessToken) {
    return null;
  }

  writeStoredTokens(session);
  if (session.user) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(session.user));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  }

  return session;
}

export function getAuthStorageKeys() {
  return AUTH_STORAGE_KEYS;
}

export function readStoredTokens(): AuthTokens | null {
  if (!isBrowser()) {
    return null;
  }

  const accessToken = window.localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)?.trim();
  if (!accessToken) {
    return null;
  }

  const refreshToken = window.localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken)?.trim() || undefined;
  const accessTokenExpiresAt = window.localStorage.getItem(AUTH_STORAGE_KEYS.accessTokenExpiresAt)?.trim() || undefined;
  const refreshTokenExpiresAt = window.localStorage.getItem(AUTH_STORAGE_KEYS.refreshTokenExpiresAt)?.trim() || undefined;
  const sessionIdRaw = window.localStorage.getItem(AUTH_STORAGE_KEYS.sessionId)?.trim() || "";
  const sessionId = Number.parseInt(sessionIdRaw, 10);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    sessionId: Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined,
  };
}

export function writeStoredTokens(payload: LoginResponse | AuthTokens): AuthTokens | null {
  if (!isBrowser()) {
    return normalizeTokens(payload);
  }

  const tokens = normalizeTokens(payload);
  if (!tokens) {
    return null;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, tokens.accessToken);
  if (tokens.refreshToken) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, tokens.refreshToken);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  }
  if (tokens.accessTokenExpiresAt) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.accessTokenExpiresAt, tokens.accessTokenExpiresAt);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.accessTokenExpiresAt);
  }
  if (tokens.refreshTokenExpiresAt) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshTokenExpiresAt, tokens.refreshTokenExpiresAt);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.refreshTokenExpiresAt);
  }
  if (tokens.sessionId) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.sessionId, String(tokens.sessionId));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.sessionId);
  }

  return tokens;
}

export function clearStoredTokens(): void {
  if (!isBrowser()) {
    return;
  }

  Object.values(AUTH_STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
}

export function getBrowserSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const tokens = readStoredTokens();
  const rawUser = window.localStorage.getItem(AUTH_STORAGE_KEYS.user);
  let user: AuthSession["user"] = null;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }

  if (!tokens) {
    return restoreBrowserSessionFromSharedCookie();
  }

  return {
    ...tokens,
    user,
  };
}

export function saveBrowserSession(session: AuthSession | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!session) {
    clearBrowserSession();
    return;
  }

  writeStoredTokens(session);
  if (session.user) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(session.user));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  }
  writeSharedSessionCookie(session);
}

export function clearBrowserSession(): void {
  clearStoredTokens();
  clearSharedSessionCookie();
}

export async function apiFetch<T>(baseUrl: string, path: string, init: RequestInit = {}, accessToken?: string | null): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      message = String(payload?.error || payload?.message || message);
    } catch {
      // noop
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function refreshAuthTokens(baseUrl: string, refreshToken?: string | null): Promise<AuthTokens | null> {
  if (!refreshToken) {
    return null;
  }

  const payload = await apiFetch<LoginResponse>(
    baseUrl,
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    undefined,
  );

  return writeStoredTokens(payload);
}

export async function logoutAuthSession(baseUrl: string, tokens: AuthTokens | null): Promise<void> {
  if (!tokens?.refreshToken && !tokens?.sessionId) {
    clearStoredTokens();
    return;
  }

  try {
    await apiFetch(
      baseUrl,
      "/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({
          refreshToken: tokens.refreshToken,
          sessionId: tokens.sessionId,
          deviceId: "web",
        }),
      },
      tokens.accessToken,
    );
  } finally {
    clearStoredTokens();
  }
}

export async function loginWithPassword(baseUrl: string, email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(
    baseUrl,
    "/login",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        deviceId: "web",
      }),
    },
    undefined,
  );
}

export async function registerWithPassword(baseUrl: string, email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(
    baseUrl,
    "/register",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        deviceId: "web",
        role: "devotee",
      }),
    },
    undefined,
  );
}

export async function updateProfile(baseUrl: string, payload: Record<string, unknown>, accessToken: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(
    baseUrl,
    "/update-profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export async function getSocialAuthConfig(baseUrl: string): Promise<SocialAuthConfigResponse> {
  return apiFetch<SocialAuthConfigResponse>(baseUrl, "/auth/social/config");
}

export async function getBooks(baseUrl: string): Promise<ScriptureBook[]> {
  return apiFetch<ScriptureBook[]>(baseUrl, "/library/books");
}

export async function getBookChapters(baseUrl: string, bookCode: string): Promise<ChapterInfo[]> {
  return apiFetch<ChapterInfo[]>(baseUrl, `/library/books/${bookCode}/chapters`);
}

export async function getVerses(baseUrl: string, bookCode: string, chapter: number, language?: string): Promise<ScriptureVerse[]> {
  const params = new URLSearchParams({
    bookCode,
    chapter: String(chapter),
  });
  if (language) {
    params.set("language", normalizeLanguage(language));
  }
  return apiFetch<ScriptureVerse[]>(baseUrl, `/library/verses?${params.toString()}`);
}

// getBookExport returns every verse of a book (optionally a single language) in one
// request — used to save a whole book for offline reading.
export async function getBookExport(baseUrl: string, bookCode: string, language?: string): Promise<ScriptureVerse[]> {
  const suffix = language ? `?language=${normalizeLanguage(language)}` : "";
  return apiFetch<ScriptureVerse[]>(baseUrl, `/library/books/${bookCode}/export${suffix}`);
}

export async function getNews(baseUrl: string, options: { page?: number; limit?: number; lang?: Language } = {}): Promise<NewsListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 12));
  params.set("lang", normalizeLanguage(options.lang));
  return apiFetch<NewsListResponse>(baseUrl, `/news?${params.toString()}`);
}

export async function getNewsItem(baseUrl: string, id: number, language?: string): Promise<NewsItem> {
  const params = new URLSearchParams();
  params.set("lang", normalizeLanguage(language));
  return apiFetch<NewsItem>(baseUrl, `/news/${id}?${params.toString()}`);
}

// ---- Motivation (motivation.vedamatch.ru) ----

export type MotivationPost = {
  id: number;
  theme: string;
  imageUrl: string;
  language: string;
  title: string;
  text: string;
  publishedAt: string | null;
};

export type MotivationPostsResponse = {
  posts: MotivationPost[];
  nextCursor: number | null;
};

export async function getMotivationPosts(
  baseUrl: string,
  options: { lang?: string; limit?: number; cursor?: number } = {},
): Promise<MotivationPostsResponse> {
  const params = new URLSearchParams();
  if (options.lang) params.set("lang", options.lang);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.cursor) params.set("cursor", String(options.cursor));
  const suffix = params.toString();
  return apiFetch<MotivationPostsResponse>(baseUrl, `/motivation/posts${suffix ? `?${suffix}` : ""}`);
}

export async function getMotivationPost(baseUrl: string, id: number, lang?: string): Promise<MotivationPost> {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  const suffix = params.toString();
  return apiFetch<MotivationPost>(baseUrl, `/motivation/posts/${id}${suffix ? `?${suffix}` : ""}`);
}

export async function getWallet(baseUrl: string, accessToken: string): Promise<WalletResponse> {
  return apiFetch<WalletResponse>(baseUrl, "/wallet", {}, accessToken);
}

export async function getWalletTransactions(baseUrl: string, accessToken: string): Promise<TransactionListResponse> {
  return apiFetch<TransactionListResponse>(baseUrl, "/wallet/transactions", {}, accessToken);
}

export async function getContacts(baseUrl: string, accessToken: string, options: ContactsQueryOptions = {}): Promise<PaginatedContactsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 24));
  params.set("tab", options.tab ?? "all");

  if (options.q) {
    params.set("q", options.q);
  }

  if (typeof options.cursor === "number" && Number.isFinite(options.cursor) && options.cursor > 0) {
    params.set("cursor", String(options.cursor));
  }

  return apiFetch<PaginatedContactsResponse>(baseUrl, `/contacts?${params.toString()}`, {}, accessToken);
}

export async function getConversations(baseUrl: string, accessToken: string, filter: ChatConversationFilter = "all"): Promise<ChatConversationsResponse> {
  return apiFetch<ChatConversationsResponse>(baseUrl, `/messages/conversations?limit=50&filter=${filter}`, {}, accessToken);
}

export async function getMessageHistory(baseUrl: string, accessToken: string, peerUserId: number): Promise<PaginatedMessagesResponse> {
  return apiFetch<PaginatedMessagesResponse>(baseUrl, `/messages/history?peerUserId=${peerUserId}&limit=30`, {}, accessToken);
}

export async function sendMessage(
  baseUrl: string,
  accessToken: string,
  payload: { senderId: number; recipientId: number; content: string; type?: string; unionChat?: boolean },
): Promise<P2PMessage> {
  return apiFetch<P2PMessage>(
    baseUrl,
    "/messages",
    {
      method: "POST",
      headers: payload.unionChat ? { "X-Union-Chat": "true" } : undefined,
      body: JSON.stringify({ ...payload, type: payload.type || "text", unionChat: undefined }),
    },
    accessToken,
  );
}

export async function getSupportConfig(baseUrl: string): Promise<SupportConfig> {
  return apiFetch<SupportConfig>(baseUrl, "/support/config");
}

export async function listSupportTickets(baseUrl: string, accessToken: string): Promise<{ tickets: SupportConversation[]; total: number; page: number; limit: number }> {
  return apiFetch(baseUrl, "/support/tickets?page=1&limit=20", {}, accessToken);
}

export async function getSupportTicketMessages(baseUrl: string, accessToken: string, conversationId: number): Promise<{ ticket: SupportConversation; messages: SupportMessage[]; unreadCount: number }> {
  return apiFetch(baseUrl, `/support/tickets/${conversationId}/messages`, {}, accessToken);
}

export async function getServices(baseUrl: string, accessToken?: string | null): Promise<ServiceListResponse> {
  return apiFetch<ServiceListResponse>(baseUrl, "/services", {}, accessToken);
}

export async function getYatras(baseUrl: string, accessToken?: string | null): Promise<YatraListResponse> {
  return apiFetch<YatraListResponse>(baseUrl, "/yatra", {}, accessToken);
}

function appendDefinedParams(params: URLSearchParams, values: Record<string, unknown>) {
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  });
}

export async function getDatingCandidates(baseUrl: string, accessToken: string, options: DatingCandidatesQuery = {}): Promise<DatingCandidate[]> {
  const params = new URLSearchParams();
  appendDefinedParams(params, {
    ...options,
    includeInsights: options.includeInsights ?? true,
  });
  return apiFetch<DatingCandidate[]>(baseUrl, `/dating/candidates?${params.toString()}`, {}, accessToken);
}

export async function getDatingPresentation(baseUrl: string): Promise<DatingPresentationResponse> {
  return apiFetch<DatingPresentationResponse>(baseUrl, "/dating/presentation", { cache: "no-store" });
}

export async function getDatingCities(baseUrl: string, accessToken: string): Promise<string[]> {
  return apiFetch<string[]>(baseUrl, "/dating/cities", {}, accessToken);
}

export async function getDatingProfile(baseUrl: string, accessToken: string, profileId: number): Promise<DatingProfile> {
  return apiFetch<DatingProfile>(baseUrl, `/dating/profile/${profileId}`, {}, accessToken);
}

export async function updateDatingProfile(baseUrl: string, accessToken: string, profileId: number, payload: Record<string, unknown>): Promise<DatingProfile> {
  return apiFetch<DatingProfile>(
    baseUrl,
    `/dating/profile/${profileId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export async function submitDatingProfile(baseUrl: string, accessToken: string, profileId: number): Promise<unknown> {
  return apiFetch(
    baseUrl,
    `/dating/profile/${profileId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    accessToken,
  );
}

export async function listUserMedia(baseUrl: string, accessToken: string, userId: number): Promise<UserMedia[]> {
  return apiFetch<UserMedia[]>(baseUrl, `/media/${userId}`, {}, accessToken);
}

export async function uploadUserPhoto(baseUrl: string, accessToken: string, userId: number, file: File): Promise<UserMedia> {
  const body = new FormData();
  body.set("photo", file);
  return apiFetch<UserMedia>(
    baseUrl,
    `/media/upload/${userId}`,
    {
      method: "POST",
      body,
    },
    accessToken,
  );
}

export async function setProfilePhoto(baseUrl: string, accessToken: string, mediaId: number): Promise<UserMedia> {
  return apiFetch<UserMedia>(
    baseUrl,
    `/media/${mediaId}/set-profile`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    accessToken,
  );
}

export async function deleteUserMedia(baseUrl: string, accessToken: string, mediaId: number): Promise<void> {
  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  const response = await fetch(`${baseUrl}/media/${mediaId}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      message = String(payload?.error || payload?.message || message);
    } catch {
      // noop
    }
    throw new Error(message);
  }
}

export async function unlockDatingProfile(baseUrl: string, accessToken: string, profileId: number): Promise<DatingUnlockResponse> {
  return apiFetch<DatingUnlockResponse>(
    baseUrl,
    `/dating/profile/${profileId}/unlock`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    accessToken,
  );
}

export async function createDatingChatRequest(baseUrl: string, accessToken: string, payload: { recipientId: number; message: string }): Promise<DatingChatRequest> {
  return apiFetch<DatingChatRequest>(
    baseUrl,
    "/dating/chat-requests",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export async function listDatingChatRequests(baseUrl: string, accessToken: string, options: DatingChatRequestsQuery = {}): Promise<DatingChatRequestsResponse> {
  const params = new URLSearchParams();
  appendDefinedParams(params, options);
  return apiFetch<DatingChatRequestsResponse>(baseUrl, `/dating/chat-requests?${params.toString()}`, {}, accessToken);
}

export async function respondDatingChatRequest(baseUrl: string, accessToken: string, requestId: number, action: "accept" | "reject" | "cancel"): Promise<DatingChatRequest> {
  return apiFetch<DatingChatRequest>(
    baseUrl,
    `/dating/chat-requests/${requestId}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    accessToken,
  );
}

function normalizeAuthSession(payload: LoginResponse | AuthTokens | null | undefined): AuthSession | null {
  const tokens = normalizeTokens(payload);
  if (!tokens) {
    return null;
  }

  const user = "user" in (payload || {}) ? ((payload as LoginResponse).user || null) : null;
  return {
    ...tokens,
    user,
  };
}

export class BrowserVedaClient {
  constructor(public readonly baseUrl: string) {}

  async login(payload: { email: string; password: string }): Promise<AuthSession> {
    const response = await loginWithPassword(this.baseUrl, payload.email, payload.password);
    const session = normalizeAuthSession(response);
    if (!session) {
      throw new Error("Login did not return a valid auth session.");
    }
    saveBrowserSession(session);
    return session;
  }

  async register(payload: { email: string; password: string }): Promise<AuthSession> {
    const response = await registerWithPassword(this.baseUrl, payload.email, payload.password);
    const session = normalizeAuthSession(response);
    if (!session) {
      throw new Error("Registration did not return a valid auth session.");
    }
    saveBrowserSession(session);
    return session;
  }

  async refresh(): Promise<AuthSession | null> {
    const session = getBrowserSession();
    const tokens = await refreshAuthTokens(this.baseUrl, session?.refreshToken);
    if (!tokens) {
      return null;
    }
    const nextSession: AuthSession = {
      ...session,
      ...tokens,
      user: session?.user || null,
    };
    saveBrowserSession(nextSession);
    return nextSession;
  }

  async logout(): Promise<void> {
    await logoutAuthSession(this.baseUrl, readStoredTokens());
    clearBrowserSession();
  }

  async updateProfile(payload: Record<string, unknown>): Promise<AuthSession> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }

    const response = await updateProfile(this.baseUrl, payload, session.accessToken);
    const nextSession: AuthSession = {
      ...(normalizeAuthSession(response) || session),
      user: response.user || session.user || null,
    };
    saveBrowserSession(nextSession);
    return nextSession;
  }

  async getContacts(options: ContactsQueryOptions = {}): Promise<PaginatedContactsResponse> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getContacts(this.baseUrl, session.accessToken, options);
  }

  async getConversations() {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    const response = await getConversations(this.baseUrl, session.accessToken);
    return response.items || [];
  }

  async getMessagesHistory(peerUserId: number) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getMessageHistory(this.baseUrl, session.accessToken, peerUserId);
  }

  async sendMessage(recipientId: number, content: string, options: { unionChat?: boolean } = {}) {
    const session = getBrowserSession();
    const senderId = session?.user?.ID || session?.user?.id;
    if (!session?.accessToken || !senderId) {
      throw new Error("Unauthorized");
    }
    return sendMessage(this.baseUrl, session.accessToken, {
      senderId,
      recipientId,
      content,
      unionChat: options.unionChat,
    });
  }

  async getNews() {
    return getNews(this.baseUrl);
  }

  async getNewsItem(id: number, language?: Language) {
    return getNewsItem(this.baseUrl, id, language);
  }

  async getBooks() {
    return getBooks(this.baseUrl);
  }

  async getBookChapters(bookCode: string) {
    return getBookChapters(this.baseUrl, bookCode);
  }

  async getVerses(bookCode: string, chapter: number, language?: Language) {
    return getVerses(this.baseUrl, bookCode, chapter, language);
  }

  async getBookExport(bookCode: string, language?: Language) {
    return getBookExport(this.baseUrl, bookCode, language);
  }

  async getServices() {
    const response = await getServices(this.baseUrl);
    return response.items || response.services || [];
  }

  async getYatras() {
    const response = await getYatras(this.baseUrl);
    return response.items || response.yatras || [];
  }

  async getWallet(): Promise<WalletResponse> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getWallet(this.baseUrl, session.accessToken);
  }

  async getDatingCandidates(options: DatingCandidatesQuery = {}) {
    const session = getBrowserSession();
    const userId = session?.user?.ID || session?.user?.id;
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingCandidates(this.baseUrl, session.accessToken, {
      userId,
      ...options,
    });
  }

  async getDatingPresentation() {
    return getDatingPresentation(this.baseUrl);
  }

  async getDatingCities() {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingCities(this.baseUrl, session.accessToken);
  }

  async getDatingProfile(profileId: number) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingProfile(this.baseUrl, session.accessToken, profileId);
  }

  async updateDatingProfile(profileId: number, payload: Record<string, unknown>) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return updateDatingProfile(this.baseUrl, session.accessToken, profileId, payload);
  }

  async submitDatingProfile(profileId: number) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return submitDatingProfile(this.baseUrl, session.accessToken, profileId);
  }

  async listUserMedia(userId: number) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return listUserMedia(this.baseUrl, session.accessToken, userId);
  }

  async uploadUserPhoto(userId: number, file: File) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return uploadUserPhoto(this.baseUrl, session.accessToken, userId, file);
  }

  async setProfilePhoto(mediaId: number) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return setProfilePhoto(this.baseUrl, session.accessToken, mediaId);
  }

  async deleteUserMedia(mediaId: number) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return deleteUserMedia(this.baseUrl, session.accessToken, mediaId);
  }

  async unlockDatingProfile(profileId: number) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return unlockDatingProfile(this.baseUrl, session.accessToken, profileId);
  }

  async createDatingChatRequest(payload: { recipientId: number; message: string }) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return createDatingChatRequest(this.baseUrl, session.accessToken, payload);
  }

  async listDatingChatRequests(options: DatingChatRequestsQuery = {}) {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return listDatingChatRequests(this.baseUrl, session.accessToken, options);
  }

  async respondDatingChatRequest(requestId: number, action: "accept" | "reject" | "cancel") {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return respondDatingChatRequest(this.baseUrl, session.accessToken, requestId, action);
  }

  async getSupportConfig() {
    return getSupportConfig(this.baseUrl);
  }

  async getSupportTickets() {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    const response = await listSupportTickets(this.baseUrl, session.accessToken);
    return response.tickets || [];
  }
}

export function createBrowserClient(hostname?: string): BrowserVedaClient {
  const targetHost = hostname || (isBrowser() ? window.location.hostname : "localhost");
  return new BrowserVedaClient(resolveApiBaseUrlForHostname(targetHost));
}
