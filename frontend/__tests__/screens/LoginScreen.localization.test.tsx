import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';

const mockLogin = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockVKSignIn = jest.fn();
const mockChangeLanguage = jest.fn();

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
  'auth.loginScreen.social.comingSoonTitle': 'Скоро будет доступно',
  'auth.loginScreen.social.vkHint': 'Вход через VK готовится к следующему релизу.',
  'auth.loginScreen.social.telegramHint': 'Telegram-вход для мобильного login экрана появится в следующем релизе.',
  'auth.loginScreen.createAccountPrefix': 'Впервые в VedaMatch?',
  'auth.loginScreen.createAccountCta': 'Создать аккаунт',
  'auth.loginScreen.supportPrompt': 'Не получается войти?',
  'auth.loginScreen.supportCta': 'Поддержка',
  'auth.devLogin': 'Быстрый вход (DEV)',
  'common.close': 'Закрыть',
  'common.error': 'Ошибка',
  'auth.loginScreen.errors.googleFailed': 'Не удалось выполнить вход через Google.',
  'auth.loginScreen.errors.vkFailed': 'Не удалось выполнить вход через VK.',
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
  signInWithVK: (...args: any[]) => mockVKSignIn(...args),
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
    mockLogin.mockReset();
    mockGoogleSignIn.mockReset();
    mockVKSignIn.mockReset();
    mockChangeLanguage.mockReset();
    navigation.navigate.mockReset();
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

  it('calls VK sign in handler and passes auth payload to login()', async () => {
    mockVKSignIn.mockResolvedValue({
      user: { ID: 8, email: 'vk@example.com' },
      authPayload: { accessToken: 'vk-token' },
    });

    const screen = render(<LoginScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('VK'));

    await waitFor(() => {
      expect(mockVKSignIn).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith(
        { ID: 8, email: 'vk@example.com' },
        { accessToken: 'vk-token' },
      );
    });
  });

  it('shows localized coming soon alert for Telegram button', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<LoginScreen navigation={navigation} route={route} />);

    fireEvent.press(screen.getByText('Telegram'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Скоро будет доступно',
      'Telegram-вход для мобильного login экрана появится в следующем релизе.',
      [{ text: 'Закрыть' }],
    );
  });
});
