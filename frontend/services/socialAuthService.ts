import Config from 'react-native-config';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import * as forge from 'node-forge';
import apiClient from '../lib/apiClient';
import { APP_ENV } from '../config/api.config';

let googleConfigured = false;

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (options: Record<string, any>) => void;
    hasPlayServices?: (options?: Record<string, any>) => Promise<boolean>;
    signIn: () => Promise<
      | { idToken?: string | null; user?: any }
      | { type?: string; data?: { idToken?: string | null; user?: any } | null }
    >;
    signOut?: () => Promise<void>;
  };
};

const loadGoogleModule = async (): Promise<GoogleSigninModule | null> => {
  try {
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    // Fall back to a dynamic require for environments where the module can be optional.
  }

  try {
    // eslint-disable-next-line no-new-func
    const req = Function('m', 'return require(m)') as (name: string) => GoogleSigninModule;
    return req('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
};

const readConfigString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  return trimmed;
};

const buildGoogleConfig = (): Record<string, any> => {
  const webClientId = readConfigString((Config as any).GOOGLE_WEB_CLIENT_ID);
  const iosClientId = readConfigString((Config as any).GOOGLE_IOS_CLIENT_ID);
  const offlineAccess = APP_ENV === 'production';

  const options: Record<string, any> = {
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    offlineAccess,
    forceCodeForRefreshToken: false,
  };

  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
};

const extractGoogleSignInPayload = (
  result: Awaited<ReturnType<GoogleSigninModule['GoogleSignin']['signIn']>>,
): { idToken?: string | null; user?: any } => {
  if (!result || typeof result !== 'object') {
    return {};
  }

  const maybeTyped = result as {
    type?: string;
    data?: { idToken?: string | null; user?: any } | null;
    idToken?: string | null;
    user?: any;
  };

  if (maybeTyped.type === 'cancelled') {
    throw new Error('GOOGLE_SIGNIN_CANCELLED');
  }

  if (maybeTyped.data && typeof maybeTyped.data === 'object') {
    return {
      idToken: maybeTyped.data.idToken ?? null,
      user: maybeTyped.data.user,
    };
  }

  return {
    idToken: maybeTyped.idToken ?? null,
    user: maybeTyped.user,
  };
};

const ensureGoogleConfigured = async (): Promise<GoogleSigninModule> => {
  const module = await loadGoogleModule();
  if (!module || !module.GoogleSignin) {
    throw new Error('GOOGLE_SDK_NOT_AVAILABLE');
  }

  if (!googleConfigured) {
    module.GoogleSignin.configure(buildGoogleConfig());
    googleConfigured = true;
  }
  return module;
};

type SocialLoginResult = {
  user: Record<string, any>;
  authPayload: Record<string, any>;
};

export type LinkedAuthProvider = 'google' | 'vk' | 'telegram';

export type LinkedProviderStatus = {
  provider: LinkedAuthProvider;
  linked: boolean;
  label?: string;
  linkedAt?: string;
};

export type LinkedAuthProvidersResponse = {
  providers: LinkedProviderStatus[];
  hasPassword: boolean;
  methodCount: number;
  canUnlinkAny: boolean;
};

type VKAuthSession = {
  authorizeUrl: string;
  state: string;
  presentation: 'external' | 'modal';
};

type TelegramAuthSession = {
  state: string;
  launchUrl: string;
  expiresAt?: string;
};

type VKPkceSession = {
  codeVerifier: string;
};

const VK_OAUTH_CALLBACK = 'https://oauth.vk.com/blank.html';
const VK_MOBILE_CALLBACK_FALLBACK = 'https://api.vedamatch.ru/auth/vk/callback';
const VK_ANDROID_CLIENT_ID_FALLBACK = '54474353';
const VK_IOS_CLIENT_ID_FALLBACK = '54474354';
const VK_LEGACY_MOBILE_CALLBACK = 'vedamatch://auth/vk/callback';
const TELEGRAM_MOBILE_CALLBACK = 'vedamatch://auth/telegram/callback';
const TELEGRAM_UNIVERSAL_CALLBACK = 'https://api.vedamatch.ru/auth/telegram/callback';
const TELEGRAM_MOBILE_EXCHANGE_RETRY_DELAY_MS = 400;
const TELEGRAM_MOBILE_EXCHANGE_MAX_ATTEMPTS = 6;

type VKAuthPlatform = 'android' | 'ios';
const vkPkceSessions = new Map<string, VKPkceSession>();

const generateState = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const resolveVKAuthPlatform = (platform: string | undefined): VKAuthPlatform => (
  platform === 'ios' ? 'ios' : 'android'
);

const getCurrentVKAuthPlatform = (): VKAuthPlatform => resolveVKAuthPlatform(Platform.OS);

const getVKNativeClientId = (platform: VKAuthPlatform): string => {
  const platformSpecific = platform === 'ios'
    ? readConfigString((Config as any).VK_IOS_CLIENT_ID)
    : readConfigString((Config as any).VK_ANDROID_CLIENT_ID);

  if (platformSpecific) return platformSpecific;

  const legacyClientId = readConfigString((Config as any).VK_CLIENT_ID);
  if (legacyClientId) return legacyClientId;

  return platform === 'ios' ? VK_IOS_CLIENT_ID_FALLBACK : VK_ANDROID_CLIENT_ID_FALLBACK;
};

const getVKMobileClientId = (): string => (
  readConfigString((Config as any).VK_CLIENT_ID)
  || readConfigString((Config as any).VK_IOS_CLIENT_ID)
  || VK_IOS_CLIENT_ID_FALLBACK
);

const getVKAndroidRedirectUri = (): string => (
  `vk${getVKNativeClientId('android')}://vk.ru/blank.html`
);

const getVKIOSRedirectUri = (): string => (
  `vk${getVKNativeClientId('ios')}://vk.ru/blank.html`
);

const getVKMobileRedirectUri = (): string => (
  readConfigString((Config as any).VK_REDIRECT_URI) || VK_MOBILE_CALLBACK_FALLBACK
);

const resolveVKCallbackPrefixes = (): string[] => (
  Array.from(new Set([
    VK_OAUTH_CALLBACK,
    getVKAndroidRedirectUri(),
    getVKIOSRedirectUri(),
    VK_LEGACY_MOBILE_CALLBACK,
    getVKMobileRedirectUri(),
    VK_MOBILE_CALLBACK_FALLBACK,
  ]))
);

const sha256Base64Url = (value: string): string => {
  const digestBytes = forge.md.sha256.create().update(value, 'utf8').digest().getBytes();

  return Buffer.from(digestBytes, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/g, '');
};

const generateCodeVerifier = (): string => {
  const parts: string[] = [];
  while (parts.join('').length < 64) {
    parts.push(Math.random().toString(36).slice(2));
  }
  return parts.join('').slice(0, 64);
};

const encodeQueryComponent = (value: string): string => encodeURIComponent(value);

const decodeQueryComponent = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

const buildQueryString = (entries: Array<[string, string]>): string => (
  entries
    .map(([key, value]) => `${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`)
    .join('&')
);

const buildVKAuthorizeUrl = (state: string, platform: VKAuthPlatform): string => {
  const isAndroid = platform === 'android';
  const clientId = isAndroid ? getVKNativeClientId('android') : getVKMobileClientId();
  const scope = readConfigString((Config as any).VK_SCOPE) || 'email';
  const redirectUri = isAndroid ? getVKAndroidRedirectUri() : getVKMobileRedirectUri();
  const authorizeBaseUrl = isAndroid ? 'https://id.vk.com/authorize' : 'https://oauth.vk.com/authorize';

  if (!clientId) {
    throw new Error('VK_CONFIG_MISSING');
  }

  const queryEntries: Array<[string, string]> = [
    ['client_id', clientId],
    ['redirect_uri', redirectUri],
    ['response_type', 'code'],
    ['display', 'mobile'],
    ['scope', scope],
    ['v', '5.199'],
    ['state', state],
  ];

  if (isAndroid) {
    const codeVerifier = generateCodeVerifier();
    vkPkceSessions.set(state, {
      codeVerifier,
    });
    queryEntries.push(['code_challenge', sha256Base64Url(codeVerifier)]);
    queryEntries.push(['code_challenge_method', 'S256']);
  }

  return `${authorizeBaseUrl}?${buildQueryString(queryEntries)}`;
};

const parseQueryParam = (url: string, key: string): string => {
  const lowerKey = key.toLowerCase();
  const queryPart = url.split('?')[1] || '';
  const hashPart = url.split('#')[1] || '';
  const merged = [queryPart, hashPart].filter(Boolean).join('&');

  for (const pair of merged.split('&')) {
    if (!pair) {
      continue;
    }

    const [rawKey, ...rawValueParts] = pair.split('=');
    if (decodeQueryComponent(rawKey).toLowerCase() !== lowerKey) {
      continue;
    }

    return decodeQueryComponent(rawValueParts.join('='));
  }

  return '';
};

const isVKCallbackUrl = (url: string): boolean => (
  resolveVKCallbackPrefixes().some((prefix) => url.startsWith(prefix))
);

const resolveVKCallbackPlatform = (url: string): VKAuthPlatform => {
  if (url.startsWith(getVKAndroidRedirectUri())) {
    return 'android';
  }

  if (url.startsWith(getVKIOSRedirectUri())) {
    return 'ios';
  }

  if (
    url.startsWith(getVKMobileRedirectUri())
    || url.startsWith(VK_MOBILE_CALLBACK_FALLBACK)
    || url.startsWith(VK_OAUTH_CALLBACK)
    || url.startsWith(VK_LEGACY_MOBILE_CALLBACK)
  ) {
    return getCurrentVKAuthPlatform();
  }

  return getCurrentVKAuthPlatform();
};

const resolveTelegramCallbackPrefixes = (): string[] => (
  [TELEGRAM_MOBILE_CALLBACK, TELEGRAM_UNIVERSAL_CALLBACK]
);

const isTelegramCallbackUrl = (url: string): boolean => (
  resolveTelegramCallbackPrefixes().some((prefix) => url.startsWith(prefix))
);

const sleep = (ms: number): Promise<void> => (
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  })
);

const isTelegramMobileAuthNotReadyError = (error: unknown): boolean => {
  const responseError = readConfigString((error as any)?.response?.data?.error);
  const responseErrorCode = readConfigString((error as any)?.response?.data?.errorCode);
  const message = readConfigString((error as any)?.message);

  return (
    responseErrorCode === 'TELEGRAM_MOBILE_AUTH_NOT_READY'
    || responseError === 'Telegram mobile auth is not ready yet'
    || message === 'Telegram mobile auth is not ready yet'
  );
};

const extractVKCallbackPayload = (
  url: string,
  state: string,
): { accessToken?: string; code?: string; deviceId?: string; email: string } => {
  if (!isVKCallbackUrl(url)) {
    throw new Error('VK_CALLBACK_URL_INVALID');
  }

  const incomingState = parseQueryParam(url, 'state');
  if (incomingState && incomingState !== state) {
    throw new Error('VK_AUTH_STATE_MISMATCH');
  }

  const error = parseQueryParam(url, 'error');
  if (error) {
    const description = parseQueryParam(url, 'error_description');
    throw new Error(description ? `VK_AUTH_ERROR:${error}:${description}` : `VK_AUTH_ERROR:${error}`);
  }

  const accessToken = readConfigString(parseQueryParam(url, 'access_token'));
  const code = readConfigString(parseQueryParam(url, 'code'));
  const deviceId = readConfigString(parseQueryParam(url, 'device_id'));
  const email = readConfigString(parseQueryParam(url, 'email'));

  if (!accessToken && !code) {
    throw new Error('VK_ACCESS_TOKEN_OR_CODE_MISSING');
  }

  return {
    accessToken: accessToken || undefined,
    code: code || undefined,
    deviceId: deviceId || undefined,
    email,
  };
};

const parseTelegramCallbackState = (callbackUrl: string, expectedState?: string): string => {
  if (!isTelegramCallbackUrl(callbackUrl)) {
    throw new Error('TELEGRAM_CALLBACK_URL_INVALID');
  }

  const state = readConfigString(parseQueryParam(callbackUrl, 'state'));
  if (!state) {
    throw new Error('TELEGRAM_AUTH_STATE_MISSING');
  }

  if (readConfigString(expectedState) && state !== readConfigString(expectedState)) {
    throw new Error('TELEGRAM_AUTH_STATE_MISMATCH');
  }

  return state;
};

const performVKAuthMutation = async (
  endpoint: '/auth/vk/login' | '/auth/vk/link',
  callbackUrl: string,
  state: string,
  skipAuthSession: boolean,
): Promise<any> => {
  const callbackData = extractVKCallbackPayload(callbackUrl, state);
  const platform = resolveVKCallbackPlatform(callbackUrl);
  const isAndroidNativeCallback = callbackUrl.startsWith(getVKAndroidRedirectUri());
  const clientId = isAndroidNativeCallback ? getVKNativeClientId('android') : getVKMobileClientId();
  const deviceId = await DeviceInfo.getUniqueId();
  const payload: Record<string, any> = {
    deviceId,
    platform,
    clientId,
  };

  if (isAndroidNativeCallback && callbackData.code) {
    const pkceSession = vkPkceSessions.get(state);
    if (!pkceSession) {
      throw new Error('VK_PKCE_SESSION_MISSING');
    }
    if (!callbackData.deviceId) {
      throw new Error('VK_DEVICE_ID_MISSING');
    }

    payload.code = callbackData.code;
    payload.codeVerifier = pkceSession.codeVerifier;
    payload.vkDeviceId = callbackData.deviceId;
    payload.state = state;
    vkPkceSessions.delete(state);
  }

  if (callbackData.accessToken) {
    payload.accessToken = callbackData.accessToken;
  }

  if (callbackData.code && !isAndroidNativeCallback) {
    payload.code = callbackData.code;
  }

  if (callbackData.email) {
    payload.email = callbackData.email;
  }

  return apiClient.post(
    endpoint,
    payload,
    skipAuthSession ? {
      ...({ __skipAuthSession: true } as any),
    } : undefined,
  );
};

export const signInWithGoogle = async (): Promise<SocialLoginResult> => {
  console.log('[GoogleAuth] ensureGoogleConfigured:start');
  const module = await ensureGoogleConfigured();
  console.log('[GoogleAuth] ensureGoogleConfigured:done');

  if (module.GoogleSignin.hasPlayServices) {
    console.log('[GoogleAuth] hasPlayServices:start');
    await module.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    console.log('[GoogleAuth] hasPlayServices:done');
  }

  console.log('[GoogleAuth] sdkSignIn:start');
  const result = await module.GoogleSignin.signIn();
  console.log('[GoogleAuth] sdkSignIn:done');
  const payload = extractGoogleSignInPayload(result);
  const idToken = readConfigString(payload?.idToken);

  if (!idToken) {
    throw new Error('GOOGLE_ID_TOKEN_MISSING');
  }

  console.log('[GoogleAuth] backendLogin:start');
  const deviceId = await DeviceInfo.getUniqueId();
  const response = await apiClient.post(
    '/auth/google/login',
    {
      idToken,
      deviceId,
    },
    {
      ...({ __skipAuthSession: true } as any),
    },
  );
  console.log('[GoogleAuth] backendLogin:done');

  const user = response?.data?.user as Record<string, any> | undefined;
  if (!user) {
    throw new Error('GOOGLE_LOGIN_RESPONSE_INVALID');
  }

  return {
    user,
    authPayload: response.data,
  };
};

export const linkGoogleAccount = async (): Promise<{ user: Record<string, any>; providers: LinkedAuthProvidersResponse }> => {
  const module = await ensureGoogleConfigured();

  if (module.GoogleSignin.hasPlayServices) {
    await module.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = await module.GoogleSignin.signIn();
  const payload = extractGoogleSignInPayload(result);
  const idToken = readConfigString(payload?.idToken);
  if (!idToken) {
    throw new Error('GOOGLE_ID_TOKEN_MISSING');
  }

  const response = await apiClient.post('/auth/google/link', { idToken });
  const user = response?.data?.user as Record<string, any> | undefined;
  const providers = response?.data?.providers as LinkedAuthProvidersResponse | undefined;
  if (!user || !providers) {
    throw new Error('GOOGLE_LINK_RESPONSE_INVALID');
  }

  return { user, providers };
};

export const createVKAuthSession = (): VKAuthSession => {
  const platform = getCurrentVKAuthPlatform();
  const state = generateState();
  const authorizeUrl = buildVKAuthorizeUrl(state, platform);

  return {
    state,
    authorizeUrl,
    presentation: 'external',
  };
};

export const finalizeVKSignIn = async (
  callbackUrl: string,
  state: string,
): Promise<SocialLoginResult> => {
  const response = await performVKAuthMutation('/auth/vk/login', callbackUrl, state, true);

  const user = response?.data?.user as Record<string, any> | undefined;
  if (!user) {
    throw new Error('VK_LOGIN_RESPONSE_INVALID');
  }

  return {
    user,
    authPayload: response.data,
  };
};

export const finalizeVKLink = async (
  callbackUrl: string,
  state: string,
): Promise<{ user: Record<string, any>; providers: LinkedAuthProvidersResponse }> => {
  const response = await performVKAuthMutation('/auth/vk/link', callbackUrl, state, false);
  const user = response?.data?.user as Record<string, any> | undefined;
  const providers = response?.data?.providers as LinkedAuthProvidersResponse | undefined;
  if (!user || !providers) {
    throw new Error('VK_LINK_RESPONSE_INVALID');
  }

  return { user, providers };
};

export const isVKAuthCallbackUrl = isVKCallbackUrl;

export const createTelegramAuthSession = async (): Promise<TelegramAuthSession> => {
  const deviceId = await DeviceInfo.getUniqueId();
  const response = await apiClient.post(
    '/auth/telegram/mobile/start',
    {
      deviceId,
    },
    {
      ...({ __skipAuthSession: true } as any),
    },
  );

  const state = readConfigString(response?.data?.state);
  const launchUrl = readConfigString(response?.data?.launchUrl);
  const expiresAt = readConfigString(response?.data?.expiresAt);

  if (!state || !launchUrl) {
    throw new Error('TELEGRAM_AUTH_START_RESPONSE_INVALID');
  }

  return {
    state,
    launchUrl,
    expiresAt: expiresAt || undefined,
  };
};

export const createTelegramLinkSession = async (): Promise<TelegramAuthSession> => {
  const deviceId = await DeviceInfo.getUniqueId();
  const response = await apiClient.post('/auth/telegram/link/start', { deviceId });
  const state = readConfigString(response?.data?.state);
  const launchUrl = readConfigString(response?.data?.launchUrl);
  const expiresAt = readConfigString(response?.data?.expiresAt);

  if (!state || !launchUrl) {
    throw new Error('TELEGRAM_LINK_START_RESPONSE_INVALID');
  }

  return {
    state,
    launchUrl,
    expiresAt: expiresAt || undefined,
  };
};

export const finalizeTelegramSignIn = async (
  callbackUrl: string,
  expectedState?: string,
): Promise<SocialLoginResult> => {
  const state = parseTelegramCallbackState(callbackUrl, expectedState);
  const deviceId = await DeviceInfo.getUniqueId();
  let response: any;

  for (let attempt = 0; attempt < TELEGRAM_MOBILE_EXCHANGE_MAX_ATTEMPTS; attempt += 1) {
    try {
      response = await apiClient.post(
        '/auth/telegram/mobile/exchange',
        {
          state,
          deviceId,
        },
        {
          ...({ __skipAuthSession: true } as any),
        },
      );
      break;
    } catch (error) {
      const isLastAttempt = attempt === TELEGRAM_MOBILE_EXCHANGE_MAX_ATTEMPTS - 1;
      if (!isTelegramMobileAuthNotReadyError(error) || isLastAttempt) {
        throw error;
      }
      await sleep(TELEGRAM_MOBILE_EXCHANGE_RETRY_DELAY_MS);
    }
  }

  const user = response?.data?.user as Record<string, any> | undefined;
  if (!user) {
    throw new Error('TELEGRAM_LOGIN_RESPONSE_INVALID');
  }

  return {
    user,
    authPayload: response.data,
  };
};

export const finalizeTelegramLink = async (
  callbackUrl: string,
  expectedState?: string,
): Promise<{ user: Record<string, any>; providers: LinkedAuthProvidersResponse }> => {
  const state = parseTelegramCallbackState(callbackUrl, expectedState);
  const deviceId = await DeviceInfo.getUniqueId();
  let response: any;

  for (let attempt = 0; attempt < TELEGRAM_MOBILE_EXCHANGE_MAX_ATTEMPTS; attempt += 1) {
    try {
      response = await apiClient.post('/auth/telegram/link', { state, deviceId });
      break;
    } catch (error) {
      const isLastAttempt = attempt === TELEGRAM_MOBILE_EXCHANGE_MAX_ATTEMPTS - 1;
      if (!isTelegramMobileAuthNotReadyError(error) || isLastAttempt) {
        throw error;
      }
      await sleep(TELEGRAM_MOBILE_EXCHANGE_RETRY_DELAY_MS);
    }
  }

  const user = response?.data?.user as Record<string, any> | undefined;
  const providers = response?.data?.providers as LinkedAuthProvidersResponse | undefined;
  if (!user || !providers) {
    throw new Error('TELEGRAM_LINK_RESPONSE_INVALID');
  }

  return { user, providers };
};

export const getLinkedAuthProviders = async (): Promise<LinkedAuthProvidersResponse> => {
  const response = await apiClient.get('/auth/providers');
  const data = response?.data as LinkedAuthProvidersResponse | undefined;
  if (!data || !Array.isArray(data.providers)) {
    throw new Error('LINKED_AUTH_PROVIDERS_RESPONSE_INVALID');
  }
  return data;
};

export const unlinkAuthProvider = async (
  provider: LinkedAuthProvider,
): Promise<{ user: Record<string, any>; providers: LinkedAuthProvidersResponse }> => {
  const response = await apiClient.delete(`/auth/providers/${provider}`);
  const user = response?.data?.user as Record<string, any> | undefined;
  const providers = response?.data?.providers as LinkedAuthProvidersResponse | undefined;
  if (!user || !providers) {
    throw new Error('UNLINK_AUTH_PROVIDER_RESPONSE_INVALID');
  }
  return { user, providers };
};

export const isTelegramAuthCallbackUrl = isTelegramCallbackUrl;
