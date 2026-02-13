import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetFeed = jest.fn();
const mockGetMyChannels = jest.fn();
const mockTrackPromotedAdClick = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('../../../../../context/SettingsContext', () => ({
  useSettings: () => ({ isDarkMode: false }),
}));

jest.mock('../../../../../context/UserContext', () => ({
  useUser: () => ({ user: { role: 'admin' } }),
}));

jest.mock('../../../../../hooks/useRoleTheme', () => ({
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
    roleTheme: {
      gradient: ['#ffffff', '#f3f4f6'],
    },
  }),
}));

jest.mock('../../../../../services/channelService', () => ({
  channelService: {
    getFeed: (...args: any[]) => mockGetFeed(...args),
    getMyChannels: (...args: any[]) => mockGetMyChannels(...args),
    trackPromotedAdClick: (...args: any[]) => mockTrackPromotedAdClick(...args),
  },
}));

const ChannelsHubScreen = require('../../../../../screens/portal/services/channels/ChannelsHubScreen').default;

const readFeedOrder = (nodes: ReturnType<typeof render>['UNSAFE_getAllByType']) => {
  return nodes(Text)
    .map(node => {
      const value = node.props.children;
      if (typeof value === 'string') {
        return value;
      }
      if (Array.isArray(value)) {
        return value.filter(item => typeof item === 'string').join('');
      }
      return '';
    })
    .filter(value => value.startsWith('POST-') || value.startsWith('AD-') || value.startsWith('TAIL-'));
};

const makePost = (id: number, content: string) => ({
  ID: id,
  channelId: 10,
  authorId: 1,
  type: 'text',
  content,
  mediaJson: '',
  ctaType: 'none',
  ctaPayloadJson: '',
  status: 'published',
  isPinned: false,
  CreatedAt: '2026-02-13T10:00:00Z',
  UpdatedAt: '2026-02-13T10:00:00Z',
  channel: {
    ID: 10,
    title: 'Канал',
  },
});

const makeAd = (id: number, title: string) => ({
  id,
  title,
  description: `description ${id}`,
  city: 'Moscow',
  currency: 'RUB',
  isFree: true,
  createdAt: '2026-02-13T10:00:00Z',
});

describe('ChannelsHubScreen feed interleaving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyChannels.mockResolvedValue({
      channels: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('interleaves promoted ads by promotedInsertEvery from backend', async () => {
    mockGetFeed.mockResolvedValue({
      posts: [
        makePost(1, 'POST-1'),
        makePost(2, 'POST-2'),
        makePost(3, 'POST-3'),
        makePost(4, 'POST-4'),
        makePost(5, 'POST-5'),
      ],
      promotedAds: [
        makeAd(101, 'AD-A'),
        makeAd(102, 'AD-B'),
      ],
      promotedInsertEvery: 2,
      total: 5,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const { getByText, UNSAFE_getAllByType } = render(<ChannelsHubScreen />);

    await waitFor(() => {
      expect(getByText('POST-1')).toBeTruthy();
      expect(getByText('POST-5')).toBeTruthy();
      expect(getByText('AD-A')).toBeTruthy();
      expect(getByText('AD-B')).toBeTruthy();
    });

    const order = readFeedOrder(UNSAFE_getAllByType);
    expect(order).toEqual([
      'POST-1',
      'POST-2',
      'AD-A',
      'POST-3',
      'POST-4',
      'AD-B',
      'POST-5',
    ]);
  });

  it('adds tail promoted ad when interval did not insert any', async () => {
    mockGetFeed.mockResolvedValue({
      posts: [makePost(1, 'TAIL-POST-1')],
      promotedAds: [makeAd(201, 'TAIL-AD-1'), makeAd(202, 'TAIL-AD-2')],
      promotedInsertEvery: 10,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const { getByText, queryByText, UNSAFE_getAllByType } = render(<ChannelsHubScreen />);

    await waitFor(() => {
      expect(getByText('TAIL-POST-1')).toBeTruthy();
      expect(getByText('TAIL-AD-1')).toBeTruthy();
    });

    expect(queryByText('TAIL-AD-2')).toBeNull();

    const order = readFeedOrder(UNSAFE_getAllByType);
    expect(order).toEqual(['TAIL-POST-1', 'TAIL-AD-1']);
  });
});
