import Config from 'react-native-config';
import DeviceInfo from 'react-native-device-info';
import { Linking } from 'react-native';
import apiClient from '../lib/apiClient';
import { APP_ENV } from '../config/api.config';

let googleConfigured = false;

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (options: Record<string, any>) => void;
    hasPlayServices?: (options?: Record<string, any>) => Promise<boolean>;
    signIn: () => Promise<{ idToken?: string | null; user?: any }>;
    signOut?: () => Promise<void>;
  };
};

const loadGoogleModule = async (): Promise<GoogleSigninModule | null> => {
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

const VK_MOBILE_CALLBACK = 'vedamatch://auth/vk/callback';

const generateState = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const buildVKAuthorizeUrl = (state: string): string => {
  const clientId = readConfigString((Config as any).VK_CLIENT_ID);
  const redirectUri = readConfigString((Config as any).VK_REDIRECT_URI);
  const scope = readConfigString((Config as any).VK_SCOPE) || 'email';

  if (!clientId || !redirectUri) {
    throw new Error('VK_CONFIG_MISSING');
  }

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
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

const waitForVKCallback = async (state: string): Promise<{ accessToken: string; email: string }> =>
  new Promise((resolve, reject) => {
    let completed = false;
    const timeout = setTimeout(() => {
      if (completed) return;
      completed = true;
      subscription.remove();
      reject(new Error('VK_AUTH_TIMEOUT'));
    }, 180000);

    const handleUrl = (url: string) => {
      if (completed) return;
      if (!url.startsWith(VK_MOBILE_CALLBACK)) return;

      const incomingState = parseQueryParam(url, 'state');
      if (incomingState && incomingState !== state) return;

      const error = parseQueryParam(url, 'error');
      if (error) {
        completed = true;
        clearTimeout(timeout);
        subscription.remove();
        reject(new Error(`VK_AUTH_ERROR:${error}`));
        return;
      }

      const accessToken = parseQueryParam(url, 'access_token');
      const email = parseQueryParam(url, 'email');
      if (!accessToken) {
        completed = true;
        clearTimeout(timeout);
        subscription.remove();
        reject(new Error('VK_ACCESS_TOKEN_MISSING'));
        return;
      }

      completed = true;
      clearTimeout(timeout);
      subscription.remove();
      resolve({ accessToken, email });
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
  });

export const signInWithGoogle = async (): Promise<SocialLoginResult> => {
  const module = await ensureGoogleConfigured();
  if (module.GoogleSignin.hasPlayServices) {
    await module.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = await module.GoogleSignin.signIn();
  const idToken = readConfigString(result?.idToken);
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

export const signInWithVK = async (): Promise<SocialLoginResult> => {
  const state = generateState();
  const vkAuthUrl = buildVKAuthorizeUrl(state);
  const callbackPromise = waitForVKCallback(state);

  await Linking.openURL(vkAuthUrl);
  const callbackData = await callbackPromise;

  const deviceId = await DeviceInfo.getUniqueId();
  const response = await apiClient.post('/auth/vk/login', {
    accessToken: callbackData.accessToken,
    email: callbackData.email || undefined,
    deviceId,
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
