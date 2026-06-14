import type {
  AuthSession,
  AuthTokens,
  ChatConversationFilter,
  ChatConversationsResponse,
  ChapterInfo,
  DatingApproval,
  DatingApprovalStatus,
  DatingApprovalsResponse,
  DatingCandidate,
  DatingCandidateFilters,
  DatingCompatibilityResult,
  DatingFavorite,
  DatingIsFavoritedResult,
  DatingLikesCountResult,
  DatingMeetingInvite,
  DatingMeetingInviteStatus,
  DatingProfile,
  DatingPublicationState,
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

export type VedamatchSurface = "portal" | "social" | "panel" | "lkm" | "local" | "unknown";
export type VedamatchSubdomain = "admin" | "social" | "panel" | "lkm" | "api";
export type DatingPresentationMode = "family" | "business" | "friendship" | "seva";
export type DatingPresentationModeStats = {
  profiles?: Array<{
    avatarUrl?: string;
    skills?: string;
  }> | null;
  totalCount?: number;
  totalMale?: number;
  totalFemale?: number;
};
export type DatingPresentationResponse = Partial<Record<DatingPresentationMode, DatingPresentationModeStats>>;
export type ContactsQueryOptions = {
  tab?: "all" | "friends" | "blocked";
  q?: string;
  limit?: number;
  cursor?: number;
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
  if (
    normalized === "social.vedamatch.ru" ||
    normalized === "social.vedamatch.com" ||
    normalized === "union.vedamatch.ru" ||
    normalized === "union.vedamatch.com"
  ) {
    return "social";
  }
  if (normalized === "panel.vedamatch.ru" || normalized === "panel.vedamatch.com") {
    return "panel";
  }
  if (normalized === "lkm.vedamatch.ru" || normalized === "lkm.vedamatch.com") {
    return "lkm";
  }
  return "unknown";
}

export function buildVedamatchOrigin(hostname: string, subdomain: VedamatchSubdomain): string {
  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    const port = subdomain === "api" ? "8000" : subdomain === "lkm" ? "3006" : "3010";
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
  const configuredBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    return "http://localhost:8000/api";
  }
  if (normalized.endsWith(".vedamatch.com") || normalized === "vedamatch.com") {
    return "https://api.vedamatch.com/api";
  }
  return "https://api.vedamatch.ru/api";
}

function normalizeApiBaseUrl(value: string | null | undefined): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "").replace(/\/api$/, "/api");
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
    return null;
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
}

export function clearBrowserSession(): void {
  clearStoredTokens();
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

export async function getDatingProfile(baseUrl: string, userId: number, accessToken: string): Promise<DatingProfile> {
  return apiFetch<DatingProfile>(baseUrl, `/dating/profile/${userId}`, {}, accessToken);
}

export async function updateDatingProfile(baseUrl: string, userId: number, payload: Record<string, unknown>, accessToken: string): Promise<DatingProfile> {
  return apiFetch<DatingProfile>(
    baseUrl,
    `/dating/profile/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export async function submitDatingProfile(baseUrl: string, userId: number, accessToken: string): Promise<unknown> {
  return apiFetch<unknown>(
    baseUrl,
    `/dating/profile/${userId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    accessToken,
  );
}

export async function getDatingPresentation(baseUrl: string): Promise<DatingPresentationResponse> {
  return apiFetch<DatingPresentationResponse>(baseUrl, "/dating/presentation");
}

export async function uploadUserPhoto(baseUrl: string, userId: number, formData: FormData, accessToken: string): Promise<UserMedia> {
  return apiFetch<UserMedia>(
    baseUrl,
    `/media/upload/${userId}`,
    {
      method: "POST",
      body: formData,
    },
    accessToken,
  );
}

export async function getUserPhotos(baseUrl: string, userId: number, accessToken: string): Promise<UserMedia[]> {
  return apiFetch<UserMedia[]>(baseUrl, `/media/${userId}`, {}, accessToken);
}

export async function setUserProfilePhoto(baseUrl: string, mediaId: number, accessToken: string): Promise<UserMedia> {
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

export async function deleteUserPhoto(baseUrl: string, mediaId: number, accessToken: string): Promise<unknown> {
  return apiFetch<unknown>(
    baseUrl,
    `/media/${mediaId}`,
    {
      method: "DELETE",
    },
    accessToken,
  );
}

export async function getDatingCandidates(
  baseUrl: string,
  filters: DatingCandidateFilters,
  accessToken: string,
): Promise<DatingCandidate[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return apiFetch<DatingCandidate[]>(baseUrl, `/dating/candidates${query ? `?${query}` : ""}`, {}, accessToken);
}

export async function getDatingCities(baseUrl: string, accessToken: string): Promise<string[]> {
  return apiFetch<string[]>(baseUrl, "/dating/cities", {}, accessToken);
}

export async function checkDatingCompatibility(
  baseUrl: string,
  userId: number,
  candidateId: number,
  accessToken: string,
): Promise<DatingCompatibilityResult> {
  return apiFetch<DatingCompatibilityResult>(
    baseUrl,
    `/dating/compatibility/${userId}/${candidateId}`,
    { method: "POST", body: JSON.stringify({}) },
    accessToken,
  );
}

export async function getDatingFavorites(baseUrl: string, userId: number, accessToken: string): Promise<DatingFavorite[]> {
  return apiFetch<DatingFavorite[]>(baseUrl, `/dating/favorites?userId=${userId}`, {}, accessToken);
}

export async function addDatingFavorite(
  baseUrl: string,
  payload: { candidateId: number; compatibilityScore?: string },
  accessToken: string,
): Promise<DatingFavorite> {
  return apiFetch<DatingFavorite>(
    baseUrl,
    "/dating/favorites",
    { method: "POST", body: JSON.stringify(payload) },
    accessToken,
  );
}

export async function removeDatingFavorite(baseUrl: string, favoriteId: number, accessToken: string): Promise<unknown> {
  return apiFetch<unknown>(baseUrl, `/dating/favorites/${favoriteId}`, { method: "DELETE" }, accessToken);
}

export async function getDatingLikesCount(baseUrl: string, userId: number, accessToken: string): Promise<DatingLikesCountResult> {
  return apiFetch<DatingLikesCountResult>(baseUrl, `/dating/likes/${userId}`, {}, accessToken);
}

export async function checkDatingIsFavorited(
  baseUrl: string,
  userId: number,
  candidateId: number,
  accessToken: string,
): Promise<DatingIsFavoritedResult> {
  return apiFetch<DatingIsFavoritedResult>(
    baseUrl,
    `/dating/is-favorited?userId=${userId}&candidateId=${candidateId}`,
    {},
    accessToken,
  );
}

export async function getWhoLikedMe(baseUrl: string, userId: number, accessToken: string): Promise<DatingProfile[]> {
  return apiFetch<DatingProfile[]>(baseUrl, `/dating/liked-me?userId=${userId}`, {}, accessToken);
}

export async function getDatingPublicationStatus(
  baseUrl: string,
  userId: number,
  accessToken: string,
): Promise<DatingPublicationState> {
  return apiFetch<DatingPublicationState>(baseUrl, `/dating/profile/${userId}/publication-status`, {}, accessToken);
}

export async function getDatingApprovals(baseUrl: string, userId: number, accessToken: string): Promise<DatingApprovalsResponse> {
  return apiFetch<DatingApprovalsResponse>(baseUrl, `/dating/profile/${userId}/approvals`, {}, accessToken);
}

export async function requestDatingApprovals(
  baseUrl: string,
  userId: number,
  approverIds: number[],
  accessToken: string,
): Promise<DatingApproval[]> {
  return apiFetch<DatingApproval[]>(
    baseUrl,
    `/dating/profile/${userId}/approvals/request`,
    { method: "POST", body: JSON.stringify({ approverIds }) },
    accessToken,
  );
}

export async function respondDatingApproval(
  baseUrl: string,
  userId: number,
  approvalId: number,
  status: DatingApprovalStatus,
  note: string,
  accessToken: string,
): Promise<unknown> {
  return apiFetch<unknown>(
    baseUrl,
    `/dating/profile/${userId}/approvals/${approvalId}/respond`,
    { method: "POST", body: JSON.stringify({ status, note }) },
    accessToken,
  );
}

export async function getIncomingApprovalRequests(
  baseUrl: string,
  accessToken: string,
  options: { status?: DatingApprovalStatus; countOnly?: boolean } = {},
): Promise<DatingApproval[] | { count: number }> {
  const params = new URLSearchParams();
  if (options.status) {
    params.set("status", options.status);
  }
  if (options.countOnly) {
    params.set("countOnly", "true");
  }
  const query = params.toString();
  return apiFetch<DatingApproval[] | { count: number }>(
    baseUrl,
    `/dating/approval-requests${query ? `?${query}` : ""}`,
    {},
    accessToken,
  );
}

export async function getMeetingInvites(baseUrl: string, accessToken: string): Promise<DatingMeetingInvite[]> {
  return apiFetch<DatingMeetingInvite[]>(baseUrl, "/dating/meeting-invites", {}, accessToken);
}

export async function createMeetingInvite(
  baseUrl: string,
  payload: { inviteeId: number; placeType: string; message: string },
  accessToken: string,
): Promise<DatingMeetingInvite> {
  return apiFetch<DatingMeetingInvite>(
    baseUrl,
    "/dating/meeting-invites",
    { method: "POST", body: JSON.stringify(payload) },
    accessToken,
  );
}

export async function respondMeetingInvite(
  baseUrl: string,
  inviteId: number,
  status: Exclude<DatingMeetingInviteStatus, "pending">,
  accessToken: string,
): Promise<DatingMeetingInvite> {
  return apiFetch<DatingMeetingInvite>(
    baseUrl,
    `/dating/meeting-invites/${inviteId}/respond`,
    { method: "POST", body: JSON.stringify({ status }) },
    accessToken,
  );
}

export function resolveMediaUrl(baseUrl: string, url = ""): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const origin = baseUrl.replace(/\/api\/?$/, "");
  return `${origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
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
  payload: { senderId: number; recipientId: number; content: string; type?: string },
): Promise<P2PMessage> {
  return apiFetch<P2PMessage>(
    baseUrl,
    "/messages",
    { method: "POST", body: JSON.stringify({ ...payload, type: payload.type || "text" }) },
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

  async getDatingProfile(userId: number): Promise<DatingProfile> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingProfile(this.baseUrl, userId, session.accessToken);
  }

  async updateDatingProfile(userId: number, payload: Record<string, unknown>): Promise<DatingProfile> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return updateDatingProfile(this.baseUrl, userId, payload, session.accessToken);
  }

  async submitDatingProfile(userId: number): Promise<unknown> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return submitDatingProfile(this.baseUrl, userId, session.accessToken);
  }

  async uploadUserPhoto(userId: number, formData: FormData): Promise<UserMedia> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return uploadUserPhoto(this.baseUrl, userId, formData, session.accessToken);
  }

  async getUserPhotos(userId: number): Promise<UserMedia[]> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getUserPhotos(this.baseUrl, userId, session.accessToken);
  }

  async setUserProfilePhoto(mediaId: number): Promise<UserMedia> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return setUserProfilePhoto(this.baseUrl, mediaId, session.accessToken);
  }

  async deleteUserPhoto(mediaId: number): Promise<unknown> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return deleteUserPhoto(this.baseUrl, mediaId, session.accessToken);
  }

  async getDatingCandidates(filters: DatingCandidateFilters): Promise<DatingCandidate[]> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingCandidates(this.baseUrl, filters, session.accessToken);
  }

  async getDatingCities(): Promise<string[]> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingCities(this.baseUrl, session.accessToken);
  }

  async checkDatingCompatibility(userId: number, candidateId: number): Promise<DatingCompatibilityResult> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return checkDatingCompatibility(this.baseUrl, userId, candidateId, session.accessToken);
  }

  async getDatingFavorites(userId: number): Promise<DatingFavorite[]> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingFavorites(this.baseUrl, userId, session.accessToken);
  }

  async addDatingFavorite(payload: { candidateId: number; compatibilityScore?: string }): Promise<DatingFavorite> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return addDatingFavorite(this.baseUrl, payload, session.accessToken);
  }

  async removeDatingFavorite(favoriteId: number): Promise<unknown> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return removeDatingFavorite(this.baseUrl, favoriteId, session.accessToken);
  }

  async getDatingLikesCount(userId: number): Promise<DatingLikesCountResult> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingLikesCount(this.baseUrl, userId, session.accessToken);
  }

  async checkDatingIsFavorited(userId: number, candidateId: number): Promise<DatingIsFavoritedResult> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return checkDatingIsFavorited(this.baseUrl, userId, candidateId, session.accessToken);
  }

  async getWhoLikedMe(userId: number): Promise<DatingProfile[]> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getWhoLikedMe(this.baseUrl, userId, session.accessToken);
  }

  async getDatingPublicationStatus(userId: number): Promise<DatingPublicationState> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingPublicationStatus(this.baseUrl, userId, session.accessToken);
  }

  async getDatingApprovals(userId: number): Promise<DatingApprovalsResponse> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getDatingApprovals(this.baseUrl, userId, session.accessToken);
  }

  async requestDatingApprovals(userId: number, approverIds: number[]): Promise<DatingApproval[]> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return requestDatingApprovals(this.baseUrl, userId, approverIds, session.accessToken);
  }

  async respondDatingApproval(
    userId: number,
    approvalId: number,
    status: DatingApprovalStatus,
    note = "",
  ): Promise<unknown> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return respondDatingApproval(this.baseUrl, userId, approvalId, status, note, session.accessToken);
  }

  async getIncomingApprovalRequests(
    options: { status?: DatingApprovalStatus; countOnly?: boolean } = {},
  ): Promise<DatingApproval[] | { count: number }> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getIncomingApprovalRequests(this.baseUrl, session.accessToken, options);
  }

  async getMeetingInvites(): Promise<DatingMeetingInvite[]> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return getMeetingInvites(this.baseUrl, session.accessToken);
  }

  async createMeetingInvite(payload: { inviteeId: number; placeType: string; message: string }): Promise<DatingMeetingInvite> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return createMeetingInvite(this.baseUrl, payload, session.accessToken);
  }

  async respondMeetingInvite(
    inviteId: number,
    status: Exclude<DatingMeetingInviteStatus, "pending">,
  ): Promise<DatingMeetingInvite> {
    const session = getBrowserSession();
    if (!session?.accessToken) {
      throw new Error("Unauthorized");
    }
    return respondMeetingInvite(this.baseUrl, inviteId, status, session.accessToken);
  }

  getMediaUrl(url = ""): string {
    return resolveMediaUrl(this.baseUrl, url);
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

  async sendMessage(recipientId: number, content: string) {
    const session = getBrowserSession();
    const senderId = session?.user?.ID || session?.user?.id;
    if (!session?.accessToken || !senderId) {
      throw new Error("Unauthorized");
    }
    return sendMessage(this.baseUrl, session.accessToken, {
      senderId,
      recipientId,
      content,
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

  async getServices() {
    const response = await getServices(this.baseUrl);
    return response.items || response.services || [];
  }

  async getYatras() {
    const response = await getYatras(this.baseUrl);
    return response.items || response.yatras || [];
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
