import React from 'react';
import { Alert, AppState, FlatList } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';

type MockNetInfoState = {
  type: string;
  isConnected: boolean | null;
};

let netInfoListener: ((state: MockNetInfoState) => void) | null = null;
const mockNetInfoFetch = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const dict: Record<string, string> = {
        'videoCircles.title': 'Video Circles',
        'videoCircles.myCircles': 'Мои',
        'videoCircles.tariffs': 'Продвижение',
        'videoCircles.publishInBackground': 'Публикуем видео в фоне...',
        'videoCircles.profileMathaRequired': 'Нужен матх из профиля',
      };
      if (options?.defaultValue) {
        return options.defaultValue;
      }
      return dict[key] ?? key;
    },
  }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetVideoCircles = jest.fn();
const mockGetVideoTariffs = jest.fn();
const mockBoostCircle = jest.fn();
const mockUploadAndCreateCircle = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock(
  '@react-native-community/netinfo',
  () => ({
    __esModule: true,
    default: {
      fetch: (...args: any[]) => mockNetInfoFetch(...args),
      addEventListener: (listener: (state: MockNetInfoState) => void) => {
        netInfoListener = listener;
        return () => {
          netInfoListener = null;
        };
      },
    },
  }),
  { virtual: true }
);

jest.mock('react-native-video', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return ({ testID, onProgress, onEnd, onError }: any) => (
    <View
      testID={testID || 'mock-video'}
      onProgress={onProgress}
      onEnd={onEnd}
      onError={onError}
    />
  );
});

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({ isDarkMode: false }),
}));

jest.mock('../../../context/UserContext', () => ({
  useUser: () => ({ user: { role: 'admin', ID: 1, madh: 'gaudiya', city: 'Moscow' } }),
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
    },
  }),
}));

jest.mock('../../../services/videoCirclesService', () => ({
  videoCirclesService: {
    getVideoCircles: (...args: any[]) => mockGetVideoCircles(...args),
    getVideoTariffs: (...args: any[]) => mockGetVideoTariffs(...args),
    boostCircle: (...args: any[]) => mockBoostCircle(...args),
    interact: jest.fn().mockResolvedValue({}),
    uploadAndCreateCircle: (...args: any[]) => mockUploadAndCreateCircle(...args),
  },
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const { VideoCirclesScreen } = require('../../../screens/multimedia/VideoCirclesScreen');

beforeAll(() => {
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    get: () => 'active',
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() } as any));
});

const emitNetworkState = (type: string, isConnected = true) => {
  if (!netInfoListener) {
    return;
  }
  act(() => {
    netInfoListener?.({ type, isConnected });
  });
};

const circlesFixture = [
  {
    id: 101,
    authorId: 7,
    mediaUrl: 'https://cdn.example.com/circle.mp4',
    thumbnailUrl: 'https://cdn.example.com/circle.jpg',
    city: 'Moscow',
    matha: 'gaudiya',
    category: 'kirtan',
    status: 'active',
    durationSec: 60,
    expiresAt: '2026-02-09T18:00:00Z',
    remainingSec: 120,
    premiumBoostActive: false,
    likeCount: 0,
    commentCount: 0,
    chatCount: 0,
    createdAt: '2026-02-09T17:00:00Z',
  },
  {
    id: 102,
    authorId: 8,
    mediaUrl: 'https://cdn.example.com/circle2.mp4',
    thumbnailUrl: 'https://cdn.example.com/circle2.jpg',
    city: 'SPB',
    matha: 'gaudiya',
    category: 'lecture',
    status: 'active',
    durationSec: 60,
    expiresAt: '2026-02-09T18:00:00Z',
    remainingSec: 120,
    premiumBoostActive: false,
    likeCount: 2,
    commentCount: 1,
    chatCount: 3,
    createdAt: '2026-02-09T17:00:00Z',
  },
];

const emitViewableItems = (
  screen: ReturnType<typeof render>,
  items: Array<{ item: (typeof circlesFixture)[number]; index: number }>
) => {
  const list = screen.UNSAFE_getByType(FlatList);
  act(() => {
    list.props.onViewableItemsChanged({
      viewableItems: items.map(({ item, index }) => ({
        item,
        key: String(item.id),
        index,
        isViewable: true,
      })),
      changed: [],
    });
  });
};

describe('VideoCirclesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ type: 'wifi', isConnected: true });
    (launchImageLibrary as unknown as jest.Mock).mockReset();
    (launchImageLibrary as unknown as jest.Mock).mockResolvedValue({
      assets: [
        {
          uri: 'file:///tmp/circle.mp4',
          fileName: 'circle.mp4',
          type: 'video/mp4',
          fileSize: 1024,
        },
      ],
    });

    mockGetVideoCircles.mockResolvedValue({
      circles: circlesFixture,
      total: circlesFixture.length,
      page: 1,
      limit: 30,
      totalPages: 1,
    });
    mockGetVideoTariffs.mockResolvedValue([
      {
        id: 3,
        code: 'premium_boost',
        priceLkm: 30,
        durationMinutes: 180,
        isActive: true,
        updatedAt: '2026-02-09T17:00:00Z',
      },
    ]);
    mockBoostCircle.mockResolvedValue({});
    mockUploadAndCreateCircle.mockResolvedValue(circlesFixture[0]);
  });

  it('renders circles and triggers boost + navigation actions', async () => {
    const { getAllByText, getByText } = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(getByText('Video Circles')).toBeTruthy();
    }, { timeout: 5000 });

    expect(getByText('Moscow')).toBeTruthy();
    expect(getAllByText('gaudiya').length).toBeGreaterThan(0);
    expect(getByText('kirtan')).toBeTruthy();
    expect(getAllByText('30 LKM').length).toBeGreaterThan(0);
    expect(getByText('Мои')).toBeTruthy();
    expect(getByText('Продвижение')).toBeTruthy();

    fireEvent.press(getByText('Мои'));
    expect(mockNavigate).toHaveBeenCalledWith('MyVideoCirclesScreen');

    fireEvent.press(getByText('Продвижение'));
    expect(mockNavigate).toHaveBeenCalledWith('VideoTariffsAdminScreen');

    fireEvent.press(getAllByText('30 LKM')[0]);
    await waitFor(() => {
      expect(mockBoostCircle).toHaveBeenCalledWith(101, 'premium');
    });
  });

  it('autoplays preview on Wi-Fi', async () => {
    const screen = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Video Circles')).toBeTruthy();
    });
    emitNetworkState('wifi', true);
    emitViewableItems(screen, [{ item: circlesFixture[0], index: 0 }]);

    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeTruthy();
    });
  });

  it('does not autoplay preview on cellular network', async () => {
    mockNetInfoFetch.mockResolvedValue({ type: 'cellular', isConnected: true });
    const screen = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Video Circles')).toBeTruthy();
    });
    emitNetworkState('cellular', true);

    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeNull();
    });
    expect(screen.getByTestId('video-circle-thumb-101')).toBeTruthy();
  });

  it('keeps only one preview playing based on visible card', async () => {
    const screen = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Video Circles')).toBeTruthy();
    });
    emitNetworkState('wifi', true);
    emitViewableItems(screen, [{ item: circlesFixture[0], index: 0 }]);
    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeTruthy();
    });
    expect(screen.queryByTestId('video-circle-preview-102')).toBeNull();

    emitViewableItems(screen, [{ item: circlesFixture[1], index: 1 }]);

    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-102')).toBeTruthy();
    });
  });

  it('stops preview after 3 seconds and returns to thumbnail', async () => {
    const screen = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Video Circles')).toBeTruthy();
    });
    emitNetworkState('wifi', true);
    emitViewableItems(screen, [{ item: circlesFixture[0], index: 0 }]);
    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeTruthy();
    });

    act(() => {
      fireEvent(screen.getByTestId('video-circle-preview-101'), 'onProgress', { currentTime: 3.1 });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeNull();
    });
    expect(screen.getByTestId('video-circle-thumb-101')).toBeTruthy();
  });

  it('falls back to thumbnail on preview error and blocks immediate retry', async () => {
    const screen = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Video Circles')).toBeTruthy();
    });
    emitNetworkState('wifi', true);
    emitViewableItems(screen, [{ item: circlesFixture[0], index: 0 }]);
    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeTruthy();
    });

    act(() => {
      fireEvent(screen.getByTestId('video-circle-preview-101'), 'onError', { error: { message: 'decode failed' } });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeNull();
    });
    expect(screen.getByTestId('video-circle-thumb-101')).toBeTruthy();

    emitViewableItems(screen, [{ item: circlesFixture[1], index: 1 }]);
    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-102')).toBeTruthy();
    });

    emitViewableItems(screen, [{ item: circlesFixture[0], index: 0 }]);
    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-preview-101')).toBeNull();
    });
  });

  it('closes publish modal immediately and keeps upload in background', async () => {
    const createdCircle = {
      id: 999,
      authorId: 1,
      mediaUrl: 'https://cdn.example.com/new-circle.mp4',
      thumbnailUrl: 'https://cdn.example.com/new-circle.jpg',
      city: 'Kyiv',
      matha: 'gaudiya',
      category: 'spiritual',
      status: 'active',
      durationSec: 60,
      expiresAt: '2026-02-09T18:00:00Z',
      remainingSec: 120,
      premiumBoostActive: false,
      likeCount: 0,
      commentCount: 0,
      chatCount: 0,
      createdAt: '2026-02-09T17:10:00Z',
    };

    let resolveUpload: ((value: any) => void) | null = null;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    mockUploadAndCreateCircle.mockReturnValueOnce(uploadPromise);
    mockGetVideoCircles
      .mockResolvedValueOnce({
        circles: circlesFixture,
        total: circlesFixture.length,
        page: 1,
        limit: 30,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        circles: [createdCircle, ...circlesFixture],
        total: circlesFixture.length + 1,
        page: 1,
        limit: 30,
        totalPages: 1,
      });

    (Alert.alert as jest.Mock).mockImplementationOnce((_title: string, _message: string, buttons: any[]) => {
      const galleryOption = Array.isArray(buttons)
        ? buttons.find((button) => button?.text === 'chat.customImage')
        : null;
      galleryOption?.onPress?.();
    });

    const screen = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Video Circles')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('video-circle-open-publish-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('video-circle-publish-modal')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('videoCircles.categories.spiritual'));
    fireEvent.press(screen.getByTestId('video-circle-publish-submit-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-publish-modal')).toBeNull();
    });
    expect(screen.getByTestId('video-circle-background-publish-indicator')).toBeTruthy();
    expect(mockUploadAndCreateCircle).toHaveBeenCalled();

    await act(async () => {
      resolveUpload?.(createdCircle);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('video-circle-background-publish-indicator')).toBeNull();
    });
    expect(mockGetVideoCircles.mock.calls.length).toBeGreaterThan(2);
  });

  it('opens full VideoPlayer on media tap', async () => {
    const screen = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(screen.getByText('Video Circles')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('video-circle-media-101'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'VideoPlayer',
      expect.objectContaining({
        source: 'video_circles',
        circle: expect.objectContaining({
          id: 101,
          mediaUrl: 'https://cdn.example.com/circle.mp4',
        }),
        video: expect.objectContaining({
          id: 101,
          url: 'https://cdn.example.com/circle.mp4',
        }),
      })
    );
  });
});
