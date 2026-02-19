import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';
import { RoomInviteEntryScreen } from '../../../../screens/portal/chat/RoomInviteEntryScreen';

const mockAuthorizedFetch = jest.fn();
const mockUseUser = jest.fn();

jest.mock('../../../../services/authSessionService', () => ({
  authorizedFetch: (...args: any[]) => mockAuthorizedFetch(...args),
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

const jsonResponse = (body: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

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
    mockAuthorizedFetch.mockResolvedValueOnce(jsonResponse({
      roomId: 12,
      roomName: 'Bhakti room',
    }));

    const navigation = {
      replace: jest.fn(),
      reset: jest.fn(),
    } as any;
    const route = {
      params: { token: 'join-token' },
    } as any;

    render(<RoomInviteEntryScreen navigation={navigation} route={route} />);

    await waitFor(() => {
      expect(mockAuthorizedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/join-by-token'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'join-token' }),
        }),
      );
    });

    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: 'Portal', params: { initialTab: 'rooms' } },
        { name: 'RoomChat', params: { roomId: 12, roomName: 'Bhakti room' } },
      ],
    });
  });
});
