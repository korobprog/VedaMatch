import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PortalChatScreen } from '../../../../screens/portal/chat/PortalChatScreen';

const mockNavigate = jest.fn();
const mockAuthorizedFetch = jest.fn();
const originalConsoleError = console.error;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru' },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: (...args: any[]) => mockNavigate(...args),
  }),
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => ({ user: { ID: 7 } }),
}));

jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({ isDarkMode: false, vTheme: { colors: { textSecondary: '#64748b' } }, portalBackgroundType: 'default' }),
}));

jest.mock('../../../../hooks/useRoleTheme', () => ({
  useRoleTheme: () => ({
    colors: {
      background: '#f8fafc',
      surfaceElevated: '#ffffff',
      border: '#dbe0e8',
      accentSoft: '#fff0e5',
      accent: '#ff7a1a',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
    },
  }),
}));

jest.mock('../../../../hooks/usePressFeedback', () => ({
  usePressFeedback: () => jest.fn(),
}));

jest.mock('../../../../components/ProtectedScreen', () => ({
  ProtectedScreen: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../../services/authSessionService', () => ({
  authorizedFetch: (...args: any[]) => mockAuthorizedFetch(...args),
}));

jest.mock('../../../../screens/portal/chat/CreateRoomModal', () => ({
  CreateRoomModal: () => null,
}));

jest.mock('../../../../screens/portal/chat/InviteFriendModal', () => ({
  InviteFriendModal: () => null,
}));

jest.mock('../../../../screens/portal/chat/EditRoomImageModal', () => ({
  EditRoomImageModal: () => null,
}));

const roomsPayload = [
  { ID: 1, name: 'My Private', description: '', isPublic: false, isMember: true, canJoin: false, CreatedAt: '2026-02-19T10:00:00Z' },
  { ID: 2, name: 'Open Bhakti', description: '', isPublic: true, isMember: false, canJoin: true, CreatedAt: '2026-02-19T10:00:00Z' },
];

describe('PortalChatScreen', () => {
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
    mockAuthorizedFetch.mockImplementation((url: string) => {
      if (String(url).includes('/rooms/2/join')) {
        return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) });
      }
      return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue(roomsPayload) });
    });
  });

  it('filters rooms by tab', async () => {
    const screen = render(<PortalChatScreen />);

    await waitFor(() => {
      expect(screen.getByText('My Private')).toBeTruthy();
    });
    expect(screen.queryByText('Open Bhakti')).toBeNull();

    fireEvent.press(screen.getByTestId('rooms-tab-open'));

    await waitFor(() => {
      expect(screen.getByText('Open Bhakti')).toBeTruthy();
    });
    expect(screen.queryByText('My Private')).toBeNull();
  });

  it('passes listenerMode to RoomChat after open-room pre-join', async () => {
    const screen = render(<PortalChatScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('rooms-tab-open')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('rooms-tab-open'));

    await waitFor(() => {
      expect(screen.getByText('Open Bhakti')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Open Bhakti'));
    fireEvent(screen.getByTestId('open-room-listener-switch'), 'valueChange', true);
    fireEvent.press(screen.getByText('chat.joinRoom'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('RoomChat', expect.objectContaining({
        roomId: 2,
        roomName: 'Open Bhakti',
        listenerMode: true,
      }));
    });
  });
});
