import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { InviteFriendModal } from '../../../../screens/portal/chat/InviteFriendModal';

const mockAuthorizedFetch = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../context/SettingsContext', () => ({
  useSettings: () => ({
    isDarkMode: false,
    vTheme: {
      colors: {
        background: '#fff',
        text: '#111',
        textSecondary: '#777',
        primary: '#f97316',
        accent: '#ef4444',
        backgroundSecondary: '#f4f4f5',
        divider: '#e4e4e7',
      },
    },
  }),
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => ({
    user: { ID: 77 },
  }),
}));

jest.mock('../../../../services/authSessionService', () => ({
  authorizedFetch: (...args: any[]) => mockAuthorizedFetch(...args),
}));

jest.mock('../../../../components/ui/KeyboardAwareContainer', () => ({
  KeyboardAwareContainer: ({ children }: { children: React.ReactNode }) => children,
}));

const jsonResponse = (body: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

describe('InviteFriendModal invite-link copy flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('requests invite-link endpoint and copies returned deep link', async () => {
    mockAuthorizedFetch.mockResolvedValue(jsonResponse([]));
    mockAuthorizedFetch
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ inviteLink: 'vedamatch://rooms/join/test-token' }));

    const screen = render(
      <InviteFriendModal
        visible
        onClose={jest.fn()}
        roomId={42}
      />,
    );

    fireEvent.press(screen.getByTestId('invite-link-button'));

    await waitFor(() => {
      expect(mockAuthorizedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/42/invite-link'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(Clipboard.setString).toHaveBeenCalledWith('vedamatch://rooms/join/test-token');
  });
});
