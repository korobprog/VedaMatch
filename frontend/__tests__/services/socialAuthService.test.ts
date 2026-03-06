import apiClient from '../../lib/apiClient';
import { signInWithGoogle } from '../../services/socialAuthService';

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn().mockResolvedValue(true);
const mockSignIn = jest.fn();
const mockGetUniqueId = jest.fn().mockResolvedValue('device-id');

jest.mock('react-native', () => ({
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn().mockResolvedValue(null),
    openURL: jest.fn(),
  },
}));

jest.mock('react-native-config', () => ({
  GOOGLE_WEB_CLIENT_ID: 'google-web-client-id',
  GOOGLE_IOS_CLIENT_ID: 'google-ios-client-id',
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
});
