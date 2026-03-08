import apiClient from '../../lib/apiClient';
import {
  createTelegramLinkSession,
  createTelegramAuthSession,
  createVKAuthSession,
  finalizeTelegramLink,
  finalizeVKLink,
  finalizeTelegramSignIn,
  finalizeVKSignIn,
  getLinkedAuthProviders,
  linkGoogleAccount,
  signInWithGoogle,
  unlinkAuthProvider,
} from '../../services/socialAuthService';

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn().mockResolvedValue(true);
const mockSignIn = jest.fn();
const mockGetUniqueId = jest.fn().mockResolvedValue('device-id');
const mockFetch = jest.fn();

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn().mockResolvedValue(null),
    openURL: jest.fn(),
  },
}));

jest.mock('react-native-config', () => ({
  GOOGLE_WEB_CLIENT_ID: 'google-web-client-id',
  GOOGLE_IOS_CLIENT_ID: 'google-ios-client-id',
  VK_CLIENT_ID: '54474354',
  VK_ANDROID_CLIENT_ID: '54474353',
  VK_IOS_CLIENT_ID: '54474354',
  VK_REDIRECT_URI: 'https://api.vedamatch.ru/auth/vk/callback',
  VK_SCOPE: 'email',
}));

jest.mock('../../config/api.config', () => ({
  APP_ENV: 'production',
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: (...args: any[]) => mockGetUniqueId(...args),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args: any[]) => mockConfigure(...args),
    hasPlayServices: (...args: any[]) => mockHasPlayServices(...args),
    signIn: (...args: any[]) => mockSignIn(...args),
  },
}));

jest.mock('../../lib/apiClient', () => ({
  get: jest.fn(),
  delete: jest.fn(),
  post: jest.fn(),
}));

describe('socialAuthService', () => {
  beforeEach(() => {
    Object.defineProperty(require('react-native').Platform, 'OS', { value: 'android', configurable: true });
    jest.useRealTimers();
    mockConfigure.mockReset();
    mockHasPlayServices.mockReset();
    mockHasPlayServices.mockResolvedValue(true);
    mockSignIn.mockReset();
    mockGetUniqueId.mockReset();
    mockGetUniqueId.mockResolvedValue('device-id');
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
    (apiClient.get as jest.Mock).mockReset();
    (apiClient.delete as jest.Mock).mockReset();
    (apiClient.post as jest.Mock).mockReset();
  });

  it('reads Google idToken from the wrapped v15 signIn response', async () => {
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'google-id-token',
        user: { email: 'g@example.com' },
      },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 7, email: 'g@example.com' },
        accessToken: 'token',
      },
    });

    const result = await signInWithGoogle();

    expect(mockConfigure).toHaveBeenCalledWith({
      webClientId: 'google-web-client-id',
      iosClientId: 'google-ios-client-id',
      offlineAccess: true,
      forceCodeForRefreshToken: false,
    });
    expect(mockHasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/google/login',
      {
        idToken: 'google-id-token',
        deviceId: 'device-id',
      },
      expect.objectContaining({ __skipAuthSession: true }),
    );
    expect(result).toEqual({
      user: { ID: 7, email: 'g@example.com' },
      authPayload: {
        user: { ID: 7, email: 'g@example.com' },
        accessToken: 'token',
      },
    });
  });

  it('throws a dedicated error for cancelled Google sign-in', async () => {
    mockSignIn.mockResolvedValue({
      type: 'cancelled',
      data: null,
    });

    await expect(signInWithGoogle()).rejects.toThrow('GOOGLE_SIGNIN_CANCELLED');
  });

  it('links Google account using protected endpoint', async () => {
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'google-link-token',
        user: { email: 'g@example.com' },
      },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 7, googleEmail: 'g@example.com' },
        providers: { providers: [], hasPassword: true, methodCount: 2, canUnlinkAny: true },
      },
    });

    const result = await linkGoogleAccount();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/google/link', {
      idToken: 'google-link-token',
    });
    expect(result.user.googleEmail).toBe('g@example.com');
  });

  it('builds Android VK auth session with PKCE code flow via native callback', () => {
    const session = createVKAuthSession();
    const url = new URL(session.authorizeUrl);

    expect(url.origin + url.pathname).toBe('https://id.vk.com/authorize');
    expect(url.searchParams.get('client_id')).toBe('54474353');
    expect(url.searchParams.get('redirect_uri')).toBe('vk54474353://vk.ru/blank.html');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('display')).toBe('mobile');
    expect(url.searchParams.get('scope')).toBe('email');
    expect(url.searchParams.get('state')).toBe(session.state);
    expect(session.presentation).toBe('external');
  });

  it('builds Android VK auth session even when URLSearchParams.set is unavailable in runtime', () => {
    const originalURLSearchParams = global.URLSearchParams;
    (global as any).URLSearchParams = class BrokenURLSearchParams {
      set(): void {
        throw new Error('URLSearchParams.set is not implemented');
      }
    } as any;

    try {
      const session = createVKAuthSession();

      expect(session.authorizeUrl).toContain('https://id.vk.com/authorize?');
      expect(session.authorizeUrl).toContain('client_id=54474353');
      expect(session.authorizeUrl).toContain('redirect_uri=vk54474353%3A%2F%2Fvk.ru%2Fblank.html');
      expect(session.authorizeUrl).toContain('code_challenge_method=S256');
      expect(session.authorizeUrl).toContain(`state=${encodeURIComponent(session.state)}`);
    } finally {
      (global as any).URLSearchParams = originalURLSearchParams;
    }
  });

  it('builds iOS VK auth session with code flow and universal link callback', () => {
    Object.defineProperty(require('react-native').Platform, 'OS', { value: 'ios', configurable: true });
    const session = createVKAuthSession();
    const url = new URL(session.authorizeUrl);

    expect(url.origin + url.pathname).toBe('https://oauth.vk.com/authorize');
    expect(url.searchParams.get('client_id')).toBe('54474354');
    expect(url.searchParams.get('redirect_uri')).toBe('https://api.vedamatch.ru/auth/vk/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('display')).toBe('mobile');
    expect(url.searchParams.get('scope')).toBe('email');
    expect(url.searchParams.get('state')).toBe(session.state);
    expect(session.presentation).toBe('external');
  });

  it('finalizes Android VK login from native callback URL and lets backend exchange code with PKCE data', async () => {
    const session = createVKAuthSession();
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 8, email: 'vk@example.com' },
        accessToken: 'vk-session-token',
      },
    });

    const result = await finalizeVKSignIn(
      `vk54474353://vk.ru/blank.html?code=vk-auth-code&state=${session.state}&device_id=vk-device-id`,
      session.state,
    );

    expect(mockFetch).not.toHaveBeenCalled();

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/vk/login',
      expect.objectContaining({
        clientId: '54474353',
        code: 'vk-auth-code',
        codeVerifier: expect.any(String),
        deviceId: 'device-id',
        platform: 'android',
        state: session.state,
        vkDeviceId: 'vk-device-id',
      }),
      expect.objectContaining({ __skipAuthSession: true }),
    );
    expect(result).toEqual({
      user: { ID: 8, email: 'vk@example.com' },
      authPayload: {
        user: { ID: 8, email: 'vk@example.com' },
        accessToken: 'vk-session-token',
      },
    });
  });

  it('finalizes iOS VK login from universal link callback URL and posts code to backend', async () => {
    Object.defineProperty(require('react-native').Platform, 'OS', { value: 'ios', configurable: true });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 9, email: 'vk-ios@example.com' },
        accessToken: 'vk-ios-session-token',
      },
    });

    const result = await finalizeVKSignIn(
      'https://api.vedamatch.ru/auth/vk/callback?code=vk-auth-code&state=vk-state',
      'vk-state',
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/vk/login',
      {
        clientId: '54474354',
        code: 'vk-auth-code',
        deviceId: 'device-id',
        platform: 'ios',
      },
      expect.objectContaining({ __skipAuthSession: true }),
    );
    expect(result).toEqual({
      user: { ID: 9, email: 'vk-ios@example.com' },
      authPayload: {
        user: { ID: 9, email: 'vk-ios@example.com' },
        accessToken: 'vk-ios-session-token',
      },
    });
  });

  it('finalizes Android VK linking through protected endpoint', async () => {
    Object.defineProperty(require('react-native').Platform, 'OS', { value: 'android', configurable: true });
    const session = createVKAuthSession();
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 12, vkEmail: 'vk@example.com' },
        providers: { providers: [], hasPassword: true, methodCount: 2, canUnlinkAny: true },
      },
    });

    const result = await finalizeVKLink(
      `vk54474353://vk.ru/blank.html?code=vk-auth-code&state=${session.state}&device_id=vk-device-id`,
      session.state,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/vk/link',
      expect.objectContaining({
        clientId: '54474353',
        code: 'vk-auth-code',
        codeVerifier: expect.any(String),
        deviceId: 'device-id',
        platform: 'android',
        state: session.state,
        vkDeviceId: 'vk-device-id',
      }),
      undefined,
    );
    expect(result.user.vkEmail).toBe('vk@example.com');
  });

  it('surfaces detailed VK OAuth errors from callback URL', async () => {
    await expect(finalizeVKSignIn(
      'https://api.vedamatch.ru/auth/vk/callback?error=invalid_request&error_description=Security%20error&state=vk-state',
      'vk-state',
    )).rejects.toThrow('VK_AUTH_ERROR:invalid_request:Security error');
  });

  it('starts Telegram mobile auth session via backend and returns launch url', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        state: 'telegram-state',
        launchUrl: 'https://t.me/vedamatch_bot?startapp=vm_auth_telegram-state',
        expiresAt: '2026-03-07T08:00:00Z',
      },
    });

    const session = await createTelegramAuthSession();

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/telegram/mobile/start',
      { deviceId: 'device-id' },
      expect.objectContaining({ __skipAuthSession: true }),
    );
    expect(session).toEqual({
      state: 'telegram-state',
      launchUrl: 'https://t.me/vedamatch_bot?startapp=vm_auth_telegram-state',
      expiresAt: '2026-03-07T08:00:00Z',
    });
  });

  it('starts Telegram link session via protected endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        state: 'telegram-link-state',
        launchUrl: 'https://t.me/vedamatch_bot?startapp=vm_auth_telegram-link-state',
        expiresAt: '2026-03-07T08:00:00Z',
      },
    });

    const session = await createTelegramLinkSession();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/telegram/link/start', { deviceId: 'device-id' });
    expect(session.state).toBe('telegram-link-state');
  });

  it('finalizes Telegram auth from callback url and exchanges bridge state for auth payload', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 10, email: 'telegram@example.com' },
        accessToken: 'telegram-token',
        refreshToken: 'telegram-refresh',
      },
    });

    const result = await finalizeTelegramSignIn(
      'vedamatch://auth/telegram/callback?state=telegram-state',
      'telegram-state',
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/telegram/mobile/exchange',
      {
        state: 'telegram-state',
        deviceId: 'device-id',
      },
      expect.objectContaining({ __skipAuthSession: true }),
    );
    expect(result).toEqual({
      user: { ID: 10, email: 'telegram@example.com' },
      authPayload: {
        user: { ID: 10, email: 'telegram@example.com' },
        accessToken: 'telegram-token',
        refreshToken: 'telegram-refresh',
      },
    });
  });

  it('retries Telegram mobile exchange when backend is temporarily not ready', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((handler: any) => {
      handler();
      return 0 as any;
    }) as any);

    (apiClient.post as jest.Mock)
      .mockRejectedValueOnce({
        response: {
          data: {
            error: 'Telegram mobile auth is not ready yet',
            errorCode: 'TELEGRAM_MOBILE_AUTH_NOT_READY',
          },
        },
      })
      .mockRejectedValueOnce({
        response: {
          data: {
            error: 'Telegram mobile auth is not ready yet',
            errorCode: 'TELEGRAM_MOBILE_AUTH_NOT_READY',
          },
        },
      })
      .mockResolvedValue({
        data: {
          user: { ID: 11, email: 'telegram-retry@example.com' },
          accessToken: 'telegram-token',
          refreshToken: 'telegram-refresh',
        },
      });

    const result = await finalizeTelegramSignIn(
      'vedamatch://auth/telegram/callback?state=telegram-state',
      'telegram-state',
    );

    expect(apiClient.post).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      user: { ID: 11, email: 'telegram-retry@example.com' },
      authPayload: {
        user: { ID: 11, email: 'telegram-retry@example.com' },
        accessToken: 'telegram-token',
        refreshToken: 'telegram-refresh',
      },
    });

    setTimeoutSpy.mockRestore();
  });

  it('finalizes Telegram link from callback url via protected endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 13, telegramUsername: 'telegram_user' },
        providers: { providers: [], hasPassword: true, methodCount: 2, canUnlinkAny: true },
      },
    });

    const result = await finalizeTelegramLink(
      'vedamatch://auth/telegram/callback?state=telegram-link-state',
      'telegram-link-state',
    );

    expect(apiClient.post).toHaveBeenCalledWith('/auth/telegram/link', {
      state: 'telegram-link-state',
      deviceId: 'device-id',
    });
    expect(result.user.telegramUsername).toBe('telegram_user');
  });

  it('loads linked auth providers', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        providers: [{ provider: 'google', linked: true, label: 'g@example.com' }],
        hasPassword: true,
        methodCount: 2,
        canUnlinkAny: true,
      },
    });

    const result = await getLinkedAuthProviders();

    expect(apiClient.get).toHaveBeenCalledWith('/auth/providers');
    expect(result.providers[0].provider).toBe('google');
  });

  it('unlinks auth provider via protected endpoint', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 7 },
        providers: { providers: [], hasPassword: true, methodCount: 1, canUnlinkAny: false },
      },
    });

    const result = await unlinkAuthProvider('google');

    expect(apiClient.delete).toHaveBeenCalledWith('/auth/providers/google');
    expect(result.providers.methodCount).toBe(1);
  });
});
