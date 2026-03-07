import apiClient from '../../lib/apiClient';
import {
  createTelegramAuthSession,
  createVKAuthSession,
  finalizeTelegramSignIn,
  finalizeVKSignIn,
  signInWithGoogle,
} from '../../services/socialAuthService';

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn().mockResolvedValue(true);
const mockSignIn = jest.fn();
const mockGetUniqueId = jest.fn().mockResolvedValue('device-id');

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
  post: jest.fn(),
}));

describe('socialAuthService', () => {
  beforeEach(() => {
    mockConfigure.mockReset();
    mockHasPlayServices.mockReset();
    mockHasPlayServices.mockResolvedValue(true);
    mockSignIn.mockReset();
    mockGetUniqueId.mockReset();
    mockGetUniqueId.mockResolvedValue('device-id');
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

  it('builds Android VK auth session with external token flow via native callback', () => {
    const session = createVKAuthSession('android');
    const url = new URL(session.authorizeUrl);

    expect(url.origin + url.pathname).toBe('https://oauth.vk.com/authorize');
    expect(url.searchParams.get('client_id')).toBe('54474353');
    expect(url.searchParams.get('redirect_uri')).toBe('vk54474353://vk.ru/blank.html');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('display')).toBe('mobile');
    expect(url.searchParams.get('scope')).toBe('email');
    expect(url.searchParams.get('state')).toBe(session.state);
    expect(session.presentation).toBe('external');
  });

  it('builds iOS VK auth session with code flow and universal link callback', () => {
    const session = createVKAuthSession('ios');
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

  it('finalizes Android VK login from app deep link callback and posts access_token to backend', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        user: { ID: 8, email: 'vk@example.com' },
        accessToken: 'vk-session-token',
      },
    });

    const result = await finalizeVKSignIn(
      'vk54474353://vk.ru/blank.html?access_token=vk-access-token&state=vk-state&email=vk%40example.com',
      'vk-state',
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/vk/login',
      {
        accessToken: 'vk-access-token',
        clientId: '54474353',
        email: 'vk@example.com',
        deviceId: 'device-id',
        platform: 'android',
      },
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

  it('surfaces detailed VK OAuth errors from callback URL', async () => {
    await expect(finalizeVKSignIn(
      'vk54474353://vk.ru/blank.html?error=invalid_request&error_description=Security%20error&state=vk-state',
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
});
