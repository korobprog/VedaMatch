import React from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';

const mockLogin = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockCreateVKAuthSession = jest.fn();
const mockFinalizeVKSignIn = jest.fn();
const mockCreateTelegramAuthSession = jest.fn();
const mockFinalizeTelegramSignIn = jest.fn();
const mockChangeLanguage = jest.fn();
const vkUrlListeners: Array<(event: { url: string }) => void> = [];
let linkingOpenURLSpy: jest.SpyInstance;

let mockCurrentLanguage = 'ru';

const translations: Record<string, string> = {
  'auth.emailPlaceholder': 'Email адрес',
  'auth.passwordPlaceholder': 'Пароль',
  'auth.loginScreen.subtitle': 'Соединяй души • Находи свою пару',
  'auth.loginScreen.loginButton': 'Войти с Saffron',
  'auth.loginScreen.orContinueWith': 'или продолжить через',
  'auth.loginScreen.social.google': 'Google',
  'auth.loginScreen.social.vk': 'VK',
  'auth.loginScreen.social.telegram': 'Telegram',
  'auth.loginScreen.createAccountPrefix': 'Впервые в VedaMatch?',
  'auth.loginScreen.createAccountCta': 'Создать аккаунт',
  'auth.loginScreen.supportPrompt': 'Не получается войти?',
  'auth.loginScreen.supportCta': 'Поддержка',
  'auth.devLogin': 'Быстрый вход (DEV)',
  'common.close': 'Закрыть',
  'common.error': 'Ошибка',
  'common.loading': 'Загрузка...',
  'auth.loginScreen.errors.googleFailed': 'Не удалось выполнить вход через Google.',
  'auth.loginScreen.errors.vkFailed': 'Не удалось выполнить вход через VK.',
  'auth.loginScreen.errors.telegramFailed': 'Не удалось выполнить вход через Telegram. Откройте Mini App бота еще раз и повторите попытку.',
};

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('../../components/theme/ScreenScaffold', () => ({
  ScreenScaffold: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../components/ui/KeyboardAwareContainer', () => ({
  KeyboardAwareContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../context/UserContext', () => ({
  useUser: () => ({ login: mockLogin }),
}));
jest.mock('../../services/socialAuthService', () => ({
  signInWithGoogle: (...args: any[]) => mockGoogleSignIn(...args),
  createVKAuthSession: (...args: any[]) => mockCreateVKAuthSession(...args),
  finalizeVKSignIn: (...args: any[]) => mockFinalizeVKSignIn(...args),
  createTelegramAuthSession: (...args: any[]) => mockCreateTelegramAuthSession(...args),
  finalizeTelegramSignIn: (...args: any[]) => mockFinalizeTelegramSignIn(...args),
  isVKAuthCallbackUrl: (url: string) => (
    url.startsWith('https://oauth.vk.com/blank.html')
    || url.startsWith('vk54474353://vk.ru/blank.html')
    || url.startsWith('https://api.vedamatch.ru/auth/vk/callback')
    || url.startsWith('vedamatch://auth/vk/callback')
  ),
  isTelegramAuthCallbackUrl: (url: string) => (
    url.startsWith('vedamatch://auth/telegram/callback')
    || url.startsWith('https://api.vedamatch.ru/auth/telegram/callback')
  ),
}));
jest.mock('../../components/auth/VKAuthModal', () => ({
  VKAuthModal: ({ visible, onComplete }: any) => {
    if (!visible) {
      return null;
    }

    const ReactModule = require('react');
    const { Text: MockText, TouchableOpacity: MockTouchableOpacity } = require('react-native');

    return ReactModule.createElement(
      ReactModule.Fragment,
      null,
      ReactModule.createElement(MockText, null, 'VKAuthModal'),
      ReactModule.createElement(
        MockTouchableOpacity,
        { onPress: () => onComplete('https://oauth.vk.com/blank.html#access_token=vk-access-token&state=vk-state') },
        ReactModule.createElement(MockText, null, 'Complete VK'),
      ),
    );
  },
}));
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn().mockResolvedValue('device-id'),
}));
jest.mock('../../lib/apiClient', () => ({
  post: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: {
      language: mockCurrentLanguage,
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe('LoginScreen localization and social auth', () => {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  } as any;

  const route = { key: 'login', name: 'Login', params: undefined } as any;

  beforeEach(() => {
    mockCurrentLanguage = 'ru';
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    vkUrlListeners.splice(0, vkUrlListeners.length);
    mockLogin.mockReset();
    mockGoogleSignIn.mockReset();
    mockCreateVKAuthSession.mockReset();
    mockCreateVKAuthSession.mockReturnValue({
      authorizeUrl: 'https://oauth.vk.com/authorize?state=vk-state',
      state: 'vk-state',
      presentation: 'external',
    });
    mockFinalizeVKSignIn.mockReset();
    mockCreateTelegramAuthSession.mockReset();
    mockCreateTelegramAuthSession.mockResolvedValue({
      state: 'telegram-state',
      launchUrl: 'https://t.me/vedamatch_bot?startapp=vm_auth_telegram-state',
    });
    mockFinalizeTelegramSignIn.mockReset();
    mockChangeLanguage.mockReset();
    navigation.navigate.mockReset();
    linkingOpenURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type: string, handler: (event: { url: string }) => void) => {
      vkUrlListeners.push(handler);
      return {
        remove: jest.fn(() => {
          const index = vkUrlListeners.indexOf(handler);
          if (index >= 0) {
            vkUrlListeners.splice(index, 1);
          }
        }),
      } as any;
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls i18n.changeLanguage from global switch', async () => {
    const screen = render(<LoginScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('EN'));
    await waitFor(() => expect(mockChangeLanguage).toHaveBeenCalledWith('en'));
  });

  it('calls Google sign in handler and passes auth payload to login()', async () => {
    mockGoogleSignIn.mockResolvedValue({
      user: { ID: 7, email: 'g@example.com' },
      authPayload: { accessToken: 'token' },
    });

    const screen = render(<LoginScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('Google'));

    await waitFor(() => {
      expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith(
        { ID: 7, email: 'g@example.com' },
        { accessToken: 'token' },
      );
    });
  });

  it('opens Android VK auth in the external browser and completes login from native VK callback', async () => {
    mockFinalizeVKSignIn.mockResolvedValue({
      user: { ID: 8, email: 'vk@example.com' },
      authPayload: { accessToken: 'vk-token' },
    });

    const screen = render(<LoginScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('VK'));

    await waitFor(() => {
      expect(linkingOpenURLSpy).toHaveBeenCalledWith('https://oauth.vk.com/authorize?state=vk-state');
    });

    await act(async () => {
      vkUrlListeners.forEach((listener) => {
        listener({ url: 'vk54474353://vk.ru/blank.html?code=vk-auth-code&state=vk-state&device_id=vk-device-id' });
      });
    });

    await waitFor(() => {
      expect(mockCreateVKAuthSession).toHaveBeenCalledTimes(1);
      expect(mockFinalizeVKSignIn).toHaveBeenCalledWith(
        'vk54474353://vk.ru/blank.html?code=vk-auth-code&state=vk-state&device_id=vk-device-id',
        'vk-state',
      );
      expect(mockLogin).toHaveBeenCalledWith(
        { ID: 8, email: 'vk@example.com' },
        { accessToken: 'vk-token' },
      );
    });
  });

  it('starts Telegram auth, opens bot Mini App, and completes login from callback', async () => {
    mockFinalizeTelegramSignIn.mockResolvedValue({
      user: { ID: 10, email: 'telegram@example.com' },
      authPayload: { accessToken: 'telegram-token' },
    });

    const screen = render(<LoginScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('Telegram'));

    await waitFor(() => {
      expect(mockCreateTelegramAuthSession).toHaveBeenCalledTimes(1);
      expect(linkingOpenURLSpy).toHaveBeenCalledWith('https://t.me/vedamatch_bot?startapp=vm_auth_telegram-state');
    });

    await act(async () => {
      vkUrlListeners.forEach((listener) => {
        listener({ url: 'vedamatch://auth/telegram/callback?state=telegram-state' });
      });
    });

    await waitFor(() => {
      expect(mockFinalizeTelegramSignIn).toHaveBeenCalledWith(
        'vedamatch://auth/telegram/callback?state=telegram-state',
        'telegram-state',
      );
      expect(mockLogin).toHaveBeenCalledWith(
        { ID: 10, email: 'telegram@example.com' },
        { accessToken: 'telegram-token' },
      );
    });
  });

  it('opens iOS VK auth in the external browser and completes login from universal link callback', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockCreateVKAuthSession.mockReturnValue({
      authorizeUrl: 'https://oauth.vk.com/authorize?state=vk-state',
      state: 'vk-state',
      presentation: 'external',
    });
    mockFinalizeVKSignIn.mockResolvedValue({
      user: { ID: 9, email: 'vk-ios@example.com' },
      authPayload: { accessToken: 'vk-ios-token' },
    });

    const screen = render(<LoginScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('VK'));

    await waitFor(() => {
      expect(linkingOpenURLSpy).toHaveBeenCalledWith('https://oauth.vk.com/authorize?state=vk-state');
    });

    await act(async () => {
      vkUrlListeners.forEach((listener) => {
        listener({ url: 'https://api.vedamatch.ru/auth/vk/callback?code=vk-auth-code&state=vk-state' });
      });
    });

    await waitFor(() => {
      expect(mockFinalizeVKSignIn).toHaveBeenCalledWith(
        'https://api.vedamatch.ru/auth/vk/callback?code=vk-auth-code&state=vk-state',
        'vk-state',
      );
      expect(mockLogin).toHaveBeenCalledWith(
        { ID: 9, email: 'vk-ios@example.com' },
        { accessToken: 'vk-ios-token' },
      );
    });
  });
});
