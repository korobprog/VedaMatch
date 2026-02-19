import React from 'react';
import { Alert, Share } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
const mockInteract = jest.fn();

const routeState: { params: any } = {
  params: {
    video: {
      url: 'https://cdn.example.com/default.mp4',
      title: 'Default Video',
      artist: 'Author',
    },
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => routeState,
}));

jest.mock('react-native-video', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return ({ onLoad, testID = 'mock-video' }: any) => {
    ReactLocal.useEffect(() => {
      onLoad?.({});
    }, [onLoad]);
    return <View testID={testID} />;
  };
});

jest.mock('react-native-webview', () => ({
  WebView: ({ testID = 'mock-webview' }: any) => {
    const { View } = require('react-native');
    return <View testID={testID} />;
  },
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({ isDarkMode: false }),
}));

jest.mock('../../../context/UserContext', () => ({
  useUser: () => ({ user: { role: 'admin' } }),
}));

jest.mock('../../../hooks/useRoleTheme', () => ({
  useRoleTheme: () => ({
    colors: {
      textPrimary: '#111111',
      textSecondary: '#777777',
      accent: '#2563eb',
      background: '#ffffff',
      surface: '#f3f4f6',
      surfaceElevated: '#ffffff',
      border: '#d1d5db',
      warning: '#f59e0b',
      success: '#22c55e',
      danger: '#ef4444',
      accentSoft: '#dbeafe',
      overlay: 'rgba(0,0,0,0.35)',
    },
  }),
}));

jest.mock('../../../services/videoCirclesService', () => ({
  videoCirclesService: {
    interact: (...args: any[]) => mockInteract(...args),
  },
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const { VideoPlayerScreen } = require('../../../screens/multimedia/VideoPlayerScreen');

describe('VideoPlayerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
  });

  it('renders TikTok-style mode for video circles and handles comment/share', async () => {
    routeState.params = {
      source: 'video_circles',
      video: {
        url: 'https://cdn.example.com/circle.mp4',
        title: 'Circle Video',
      },
      circle: {
        id: 42,
        authorId: 7,
        mediaUrl: 'https://cdn.example.com/circle.mp4',
        matha: 'gaudiya',
        city: 'Moscow',
        category: 'kirtan',
        likeCount: 1,
        commentCount: 2,
        chatCount: 3,
      },
    };

    const screen = render(<VideoPlayerScreen />);

    expect(screen.getByTestId('video-player-circles-mode')).toBeTruthy();
    expect(screen.queryByTestId('video-player-default-mode')).toBeNull();

    fireEvent.press(screen.getByTestId('video-player-circles-comment-btn'));
    await waitFor(() => {
      expect(mockInteract).toHaveBeenCalledWith(42, 'comment', 'add');
    });

    fireEvent.press(screen.getByTestId('video-player-circles-share-btn'));
    await waitFor(() => {
      expect(Share.share).toHaveBeenCalled();
    });
  });

  it('keeps default player mode for non-circles source', async () => {
    routeState.params = {
      video: {
        url: 'https://cdn.example.com/default.mp4',
        title: 'Default Video',
        artist: 'Author',
      },
    };

    const { getByTestId, queryByTestId } = render(<VideoPlayerScreen />);

    await waitFor(() => {
      expect(getByTestId('video-player-default-mode')).toBeTruthy();
    });
    expect(queryByTestId('video-player-circles-mode')).toBeNull();
  });
});
