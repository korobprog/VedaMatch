import Config from 'react-native-config';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
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
  clientId: string;
  codeVerifier: string;
  platform: VKAuthPlatform;
  redirectUri: string;
};

const VK_OAUTH_CALLBACK = 'https://oauth.vk.com/blank.html';
const VK_MOBILE_CALLBACK_FALLBACK = 'https://api.vedamatch.ru/auth/vk/callback';
const VK_ID_TOKEN_ENDPOINT = 'https://id.vk.com/oauth2/auth';
const VK_ANDROID_CLIENT_ID_FALLBACK = '54474353';
const VK_IOS_CLIENT_ID_FALLBACK = '54474354';
const VK_LEGACY_MOBILE_CALLBACK = 'vedamatch://auth/vk/callback';
const TELEGRAM_MOBILE_CALLBACK = 'vedamatch://auth/telegram/callback';
const TELEGRAM_UNIVERSAL_CALLBACK = 'https://api.vedamatch.ru/auth/telegram/callback';

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

/* eslint-disable no-bitwise, no-div-regex */
const rightRotate = (value: number, amount: number): number => (
  (value >>> amount) | (value << (32 - amount))
);

const sha256Base64Url = (value: string): string => {
  const words: number[] = [];
  const asciiBitLength = value.length * 8;
  const hash = [
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ];
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 0; i < value.length; i += 1) {
    words[i >> 2] |= value.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let i = 0; i < words.length; i += 16) {
    const schedule = words.slice(i, i + 16);
    let [a, b, c, d, e, f, g, h] = hash;

    for (let j = 0; j < 64; j += 1) {
      if (j >= 16) {
        const s0 = rightRotate(schedule[j - 15], 7) ^ rightRotate(schedule[j - 15], 18) ^ (schedule[j - 15] >>> 3);
        const s1 = rightRotate(schedule[j - 2], 17) ^ rightRotate(schedule[j - 2], 19) ^ (schedule[j - 2] >>> 10);
        schedule[j] = (((schedule[j - 16] + s0) | 0) + ((schedule[j - 7] + s1) | 0)) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + s1) | 0) + ch) | 0) + ((constants[j] + schedule[j]) | 0)) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  const digestBytes = hash.flatMap((word) => [
    (word >>> 24) & 0xff,
    (word >>> 16) & 0xff,
    (word >>> 8) & 0xff,
    word & 0xff,
  ]);

  return Buffer.from(digestBytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const generateCodeVerifier = (): string => {
  const parts: string[] = [];
  while (parts.join('').length < 64) {
    parts.push(Math.random().toString(36).slice(2));
  }
  return parts.join('').slice(0, 64);
};
/* eslint-enable no-bitwise, no-div-regex */

const buildVKAuthorizeUrl = (state: string, platform: VKAuthPlatform): string => {
  const isAndroid = platform === 'android';
  const clientId = isAndroid ? getVKNativeClientId('android') : getVKMobileClientId();
  const scope = readConfigString((Config as any).VK_SCOPE) || 'email';
  const redirectUri = isAndroid ? getVKAndroidRedirectUri() : getVKMobileRedirectUri();

  if (!clientId) {
    throw new Error('VK_CONFIG_MISSING');
  }

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    display: 'mobile',
    scope,
    v: '5.199',
    state,
  });

  if (isAndroid) {
    const codeVerifier = generateCodeVerifier();
    vkPkceSessions.set(state, {
      clientId,
      codeVerifier,
      platform,
      redirectUri,
    });
    query.set('code_challenge', sha256Base64Url(codeVerifier));
    query.set('code_challenge_method', 'S256');
  }

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

const exchangeVKAndroidCode = async ({
  clientId,
  code,
  codeVerifier,
  deviceId,
  redirectUri,
}: {
  clientId: string;
  code: string;
  codeVerifier: string;
  deviceId: string;
  redirectUri: string;
}): Promise<{ accessToken: string; email?: string }> => {
  const response = await fetch(VK_ID_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      device_id: deviceId,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
  });

  const payload = await response.json().catch(() => ({}));
  const accessToken = readConfigString(payload?.access_token);
  const email = readConfigString(payload?.email);

  if (!response.ok || !accessToken) {
    const description = readConfigString(payload?.error_description) || readConfigString(payload?.error);
    throw new Error(description ? `VK_TOKEN_EXCHANGE_FAILED:${description}` : 'VK_TOKEN_EXCHANGE_FAILED');
  }

  return {
    accessToken,
    email: email || undefined,
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

  const user = response?.data?.user as Record<string, any> | undefined;
  if (!user) {
    throw new Error('GOOGLE_LOGIN_RESPONSE_INVALID');
  }

  return {
    user,
    authPayload: response.data,
  };
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
  const callbackData = extractVKCallbackPayload(callbackUrl, state);
  const platform = resolveVKCallbackPlatform(callbackUrl);
  const isAndroidNativeCallback = callbackUrl.startsWith(getVKAndroidRedirectUri());
  const clientId = isAndroidNativeCallback ? getVKNativeClientId('android') : getVKMobileClientId();

  if (isAndroidNativeCallback && callbackData.code) {
    const pkceSession = vkPkceSessions.get(state);
    if (!pkceSession) {
      throw new Error('VK_PKCE_SESSION_MISSING');
    }
    if (!callbackData.deviceId) {
      throw new Error('VK_DEVICE_ID_MISSING');
    }

    const exchanged = await exchangeVKAndroidCode({
      clientId: pkceSession.clientId,
      code: callbackData.code,
      codeVerifier: pkceSession.codeVerifier,
      deviceId: callbackData.deviceId,
      redirectUri: pkceSession.redirectUri,
    });
    callbackData.accessToken = exchanged.accessToken;
    callbackData.code = undefined;
    if (!callbackData.email && exchanged.email) {
      callbackData.email = exchanged.email;
    }
    vkPkceSessions.delete(state);
  }

  const deviceId = await DeviceInfo.getUniqueId();
  const payload: Record<string, any> = {
    deviceId,
    platform,
    clientId,
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

  const response = await apiClient.post(
    '/auth/vk/login',
    {
      ...payload,
    },
    {
      ...({ __skipAuthSession: true } as any),
    },
  );

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
  const response = await apiClient.post(
    '/auth/telegram/mobile/exchange',
    {
      state,
      deviceId,
    },
    {
      ...({ __skipAuthSession: true } as any),
    },
  );

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
