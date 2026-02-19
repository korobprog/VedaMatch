import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RoomChatScreen } from '../../../../screens/portal/chat/RoomChatScreen';

const mockAuthorizedFetch = jest.fn();
const mockGetRoomMessagesHistory = jest.fn();
const mockSetOptions = jest.fn();
const mockAddListener = jest.fn(() => () => undefined);
const originalConsoleError = console.error;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru' },
  }),
}));

jest.mock('@react-native-community/blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, ...props }: any) => <View {...props}>{children}</View>;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({
    isDarkMode: false,
    assistantType: 'krishna',
  }),
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => ({
    user: { ID: 7, spiritualName: 'Tester', karmicName: 'Tester' },
  }),
}));

jest.mock('../../../../context/WebSocketContext', () => ({
  useWebSocket: () => ({
    addListener: mockAddListener,
  }),
}));

jest.mock('../../../../hooks/usePressFeedback', () => ({
  usePressFeedback: () => jest.fn(),
}));

jest.mock('../../../../services/authSessionService', () => ({
  authorizedFetch: (...args: any[]) => mockAuthorizedFetch(...args),
}));

jest.mock('../../../../services/messageService', () => ({
  messageService: {
    getRoomMessagesHistory: (...args: any[]) => mockGetRoomMessagesHistory(...args),
  },
}));

jest.mock('../../../../components/chat/RoomVideoBar', () => ({
  RoomVideoBar: () => null,
}));

jest.mock('../../../../components/ui/KeyboardAwareContainer', () => ({
  KeyboardAwareContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../../components/wallet/BalancePill', () => ({
  BalancePill: () => null,
}));

jest.mock('../../../../screens/portal/chat/InviteFriendModal', () => ({
  InviteFriendModal: () => null,
}));

jest.mock('../../../../screens/portal/chat/RoomSettingsModal', () => ({
  RoomSettingsModal: () => null,
}));

const jsonResponse = (body: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

const createNavigation = () => ({
  setOptions: mockSetOptions,
  goBack: jest.fn(),
  navigate: jest.fn(),
});

const baseRoute = {
  key: 'room-chat',
  name: 'RoomChat' as const,
  params: {
    roomId: 42,
    roomName: 'Кришна-комната',
    isYatraChat: false,
  },
};

const renderScreen = () => {
  const navigation = createNavigation();
  return render(
    <RoomChatScreen
      route={baseRoute as any}
      navigation={navigation as any}
    />,
  );
};

describe('RoomChatScreen design contract', () => {
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
    mockGetRoomMessagesHistory.mockResolvedValue({ items: [], hasMore: false, nextBeforeId: null });
  });

  it('renders key zones and exposes header background testID', async () => {
    mockAuthorizedFetch.mockResolvedValue(jsonResponse({
      id: 42,
      bookCode: 'bg',
      currentChapter: 1,
      currentVerse: 1,
      myRole: 'owner',
      showPurport: false,
      language: 'ru',
    }));

    (global as any).fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/chapters')) {
        return Promise.resolve(jsonResponse([{ canto: 1, chapter: 1 }]));
      }
      if (url.includes('/library/verses')) {
        return Promise.resolve(jsonResponse([{ id: '1', verse: '1', translation: 'verse' }]));
      }
      return Promise.resolve(jsonResponse([]));
    });

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('roomchat-reader-card')).toBeTruthy();
      expect(screen.getByTestId('roomchat-input-bar')).toBeTruthy();
      expect(screen.getByTestId('roomchat-send-button')).toBeTruthy();
    });

    const optionsWithBackground = mockSetOptions.mock.calls
      .map(([options]) => options)
      .reverse()
      .find((options: any) => typeof options?.headerBackground === 'function');

    expect(optionsWithBackground).toBeTruthy();
    const headerBackground = optionsWithBackground.headerBackground();
    expect(headerBackground.props.testID).toBe('roomchat-header');
  });

  it('shows compact header variant when room has no reader book', async () => {
    mockAuthorizedFetch.mockResolvedValue(jsonResponse({
      id: 42,
      bookCode: '',
      myRole: 'member',
      description: 'room description',
    }));

    (global as any).fetch = jest.fn().mockResolvedValue(jsonResponse([]));

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('roomchat-compact-header')).toBeTruthy();
    });
  });

  it('toggles send button state based on input text', async () => {
    mockAuthorizedFetch.mockResolvedValue(jsonResponse({
      id: 42,
      bookCode: '',
      myRole: 'member',
    }));

    (global as any).fetch = jest.fn().mockResolvedValue(jsonResponse([]));

    const screen = renderScreen();

    const sendButton = await waitFor(() => screen.getByTestId('roomchat-send-button'));
    expect(sendButton).toBeDisabled();

    fireEvent.changeText(screen.getByPlaceholderText('chat.placeholder'), 'test');

    await waitFor(() => {
      expect(screen.getByTestId('roomchat-send-button')).not.toBeDisabled();
    });
  });

  it('does not crash when chapters/verses responses are null', async () => {
    mockAuthorizedFetch.mockResolvedValue(jsonResponse({
      id: 42,
      bookCode: 'bg',
      currentChapter: 1,
      currentVerse: 1,
      myRole: 'owner',
      showPurport: true,
      language: 'ru',
    }));

    (global as any).fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/chapters')) {
        return Promise.resolve(jsonResponse(null));
      }
      if (url.includes('/library/verses')) {
        return Promise.resolve(jsonResponse(null));
      }
      return Promise.resolve(jsonResponse([]));
    });

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('roomchat-reader-card')).toBeTruthy();
      expect(screen.getByTestId('roomchat-input-bar')).toBeTruthy();
    });
  });
});
