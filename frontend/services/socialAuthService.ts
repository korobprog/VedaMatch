import Config from 'react-native-config';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
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

  if ('type' in result) {
    if (result.type === 'cancelled') {
      throw new Error('GOOGLE_SIGNIN_CANCELLED');
    }
    if (result.data && typeof result.data === 'object') {
      return result.data;
    }
    return {};
  }

  return result;
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

const VK_OAUTH_CALLBACK = 'https://oauth.vk.com/blank.html';
const VK_IOS_UNIVERSAL_CALLBACK_FALLBACK = 'https://api.vedamatch.ru/auth/vk/callback';
const VK_LEGACY_MOBILE_CALLBACK = 'vedamatch://auth/vk/callback';
const TELEGRAM_MOBILE_CALLBACK = 'vedamatch://auth/telegram/callback';
const TELEGRAM_UNIVERSAL_CALLBACK = 'https://api.vedamatch.ru/auth/telegram/callback';
type VKAuthPlatform = 'android' | 'ios';

const generateState = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const resolveVKAuthPlatform = (platform: string | undefined): VKAuthPlatform => (
  platform === 'ios' ? 'ios' : 'android'
);

const getVKIOSRedirectUri = (): string => (
  readConfigString((Config as any).VK_REDIRECT_URI) || VK_IOS_UNIVERSAL_CALLBACK_FALLBACK
);

const resolveVKCallbackPrefixes = (): string[] => (
  Array.from(new Set([
    VK_OAUTH_CALLBACK,
    VK_LEGACY_MOBILE_CALLBACK,
    getVKIOSRedirectUri(),
    VK_IOS_UNIVERSAL_CALLBACK_FALLBACK,
  ]))
);

const buildVKAuthorizeUrl = (state: string, platform: VKAuthPlatform): string => {
  const clientId = readConfigString((Config as any).VK_CLIENT_ID);
  const scope = readConfigString((Config as any).VK_SCOPE) || 'email';
  const redirectUri = platform === 'ios' ? getVKIOSRedirectUri() : VK_OAUTH_CALLBACK;
  const responseType = platform === 'ios' ? 'code' : 'token';

  if (!clientId) {
    throw new Error('VK_CONFIG_MISSING');
  }

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    display: 'mobile',
    scope,
    v: '5.199',
    state,
  });

  return `https://oauth.vk.com/authorize?${query.toString()}`;
};

const parseQueryParam = (url: string, key: string): string => {
  const lowerKey = key.toLowerCase();
  const queryPart = url.split('?')[1] || '';
  const hashPart = url.split('#')[1] || '';
  const merged = [queryPart, hashPart].filter(Boolean).join('&');
  const search = new URLSearchParams(merged);
  for (const [k, value] of search.entries()) {
    if (k.toLowerCase() === lowerKey) return value || '';
  }
  return '';
};

const isVKCallbackUrl = (url: string): boolean => (
  resolveVKCallbackPrefixes().some((prefix) => url.startsWith(prefix))
);

const resolveTelegramCallbackPrefixes = (): string[] => (
  [TELEGRAM_MOBILE_CALLBACK, TELEGRAM_UNIVERSAL_CALLBACK]
);

const isTelegramCallbackUrl = (url: string): boolean => (
  resolveTelegramCallbackPrefixes().some((prefix) => url.startsWith(prefix))
);

const extractVKCallbackPayload = (
  url: string,
  state: string,
): { accessToken?: string; code?: string; email: string } => {
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
  const email = readConfigString(parseQueryParam(url, 'email'));
  if (!accessToken && !code) {
    throw new Error('VK_ACCESS_TOKEN_OR_CODE_MISSING');
  }

  return {
    accessToken: accessToken || undefined,
    code: code || undefined,
    email,
  };
};

export const signInWithGoogle = async (): Promise<SocialLoginResult> => {
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

  const deviceId = await DeviceInfo.getUniqueId();
  const response = await apiClient.post('/auth/google/login', {
    idToken,
    deviceId,
  }, {
    ...({ __skipAuthSession: true } as any),
  });

  const user = response?.data?.user as Record<string, any> | undefined;
  if (!user) {
    throw new Error('GOOGLE_LOGIN_RESPONSE_INVALID');
  }

  return {
    user,
    authPayload: response.data,
  };
};

export const createVKAuthSession = (
  platform: VKAuthPlatform = resolveVKAuthPlatform(Platform.OS),
): VKAuthSession => {
  const state = generateState();
  return {
    state,
    authorizeUrl: buildVKAuthorizeUrl(state, platform),
    presentation: platform === 'ios' ? 'external' : 'modal',
  };
};

export const finalizeVKSignIn = async (
  callbackUrl: string,
  state: string,
): Promise<SocialLoginResult> => {
  const callbackData = extractVKCallbackPayload(callbackUrl, state);

  const deviceId = await DeviceInfo.getUniqueId();
  const payload: Record<string, any> = {
    deviceId,
  };
  if (callbackData.accessToken) {
    payload.accessToken = callbackData.accessToken;
  }
  if (callbackData.code) {
    payload.code = callbackData.code;
  }
  if (callbackData.email) {
    payload.email = callbackData.email;
  }
  const response = await apiClient.post('/auth/vk/login', {
    ...payload,
  }, {
    ...({ __skipAuthSession: true } as any),
  });

  const user = response?.data?.user as Record<string, any> | undefined;
  if (!user) {
    throw new Error('VK_LOGIN_RESPONSE_INVALID');
  }

  return {
    user,
    authPayload: response.data,
  };
};

export const isVKAuthCallbackUrl = isVKCallbackUrl;

export const createTelegramAuthSession = async (): Promise<TelegramAuthSession> => {
  const deviceId = await DeviceInfo.getUniqueId();
  const response = await apiClient.post('/auth/telegram/mobile/start', {
    deviceId,
  }, {
    ...({ __skipAuthSession: true } as any),
  });

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

export const finalizeTelegramSignIn = async (
  callbackUrl: string,
  expectedState?: string,
): Promise<SocialLoginResult> => {
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

  const deviceId = await DeviceInfo.getUniqueId();
  const response = await apiClient.post('/auth/telegram/mobile/exchange', {
    state,
    deviceId,
  }, {
    ...({ __skipAuthSession: true } as any),
  });

  const user = response?.data?.user as Record<string, any> | undefined;
  if (!user) {
    throw new Error('TELEGRAM_LOGIN_RESPONSE_INVALID');
  }

  return {
    user,
    authPayload: response.data,
  };
};

export const isTelegramAuthCallbackUrl = isTelegramCallbackUrl;
