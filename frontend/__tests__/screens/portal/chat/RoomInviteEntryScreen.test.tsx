import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';
import { RoomInviteEntryScreen } from '../../../../screens/portal/chat/RoomInviteEntryScreen';

const mockPost = jest.fn();
const mockUseUser = jest.fn();

jest.mock('../../../../lib/apiClient', () => ({
  __esModule: true,
  default: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
  }),
}));

describe('RoomInviteEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores token and redirects to Login when user is not authenticated', async () => {
    mockUseUser.mockReturnValue({ isLoggedIn: false });
    const navigation = {
      replace: jest.fn(),
      reset: jest.fn(),
    } as any;
    const route = {
      params: { token: 'join-token' },
    } as any;

    render(<RoomInviteEntryScreen navigation={navigation} route={route} />);

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('pending_room_invite_token', 'join-token');
      expect(navigation.replace).toHaveBeenCalledWith('Login');
    });
  });

  it('joins by token and navigates to RoomChat when authenticated', async () => {
    mockUseUser.mockReturnValue({ isLoggedIn: true });
    mockPost.mockResolvedValueOnce({
      data: {
        roomId: 12,
        roomName: 'Bhakti room',
      },
    });

    const navigation = {
      replace: jest.fn(),
      reset: jest.fn(),
    } as any;
    const route = {
      params: { token: 'join-token' },
    } as any;

    render(<RoomInviteEntryScreen navigation={navigation} route={route} />);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/rooms/join-by-token', { token: 'join-token' });
    });

    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: 'RoomsHome' },
        { name: 'RoomChat', params: { roomId: 12, roomName: 'Bhakti room' } },
      ],
    });
  });
});
