import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CreateRoomModal } from '../../../../screens/portal/chat/CreateRoomModal';

const mockAuthorizedFetch = jest.fn();
const originalConsoleError = console.error;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru' },
  }),
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => ({ user: { ID: 11 } }),
}));

jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({ isDarkMode: false, vTheme: { colors: { textSecondary: '#64748b' } }, portalBackgroundType: 'default' }),
}));

jest.mock('../../../../hooks/useRoleTheme', () => ({
  useRoleTheme: () => ({
    colors: {
      surfaceElevated: '#fff',
      border: '#dbe0e8',
      surface: '#fff',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      accent: '#ff7a1a',
    },
  }),
}));

jest.mock('../../../../hooks/usePressFeedback', () => ({
  usePressFeedback: () => jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn().mockResolvedValue({ didCancel: true }),
}));

jest.mock('react-native-date-picker', () => 'DatePicker');

jest.mock('../../../../services/authSessionService', () => ({
  authorizedFetch: (...args: any[]) => mockAuthorizedFetch(...args),
}));

jest.mock('../../../../components/ui/KeyboardAwareContainer', () => ({
  KeyboardAwareContainer: ({ children }: { children: React.ReactNode }) => children,
}));

describe('CreateRoomModal', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      const firstArg = String(args[0] ?? '');
      if (firstArg.includes('not wrapped in act')) {
        return;
      }
      originalConsoleError(...(args as Parameters<typeof console.error>));
    });
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
  });

  it('sends isPublic=false when public switch is turned off', async () => {
    mockAuthorizedFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ ID: 101 }),
    });

    const onClose = jest.fn();
    const onRoomCreated = jest.fn();
    const screen = render(
      <CreateRoomModal visible onClose={onClose} onRoomCreated={onRoomCreated} />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('chat.roomName'), 'Test room');
    fireEvent(screen.getByTestId('create-room-public-switch'), 'valueChange', false);
    fireEvent.press(screen.getByTestId('create-room-submit-button'));

    await waitFor(() => {
      expect(mockAuthorizedFetch).toHaveBeenCalled();
    });

    const requestBody = JSON.parse(mockAuthorizedFetch.mock.calls[0][1].body);
    expect(requestBody.isPublic).toBe(false);
  });
});
