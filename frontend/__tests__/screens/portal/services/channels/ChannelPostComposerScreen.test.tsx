import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGetChannel = jest.fn();

let mockRouteParams: any = {
  channelId: 7,
  mode: 'create',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('../../../../../components/ui/KeyboardAwareContainer', () => ({
  KeyboardAwareContainer: ({ children }: any) => children,
}));

jest.mock('../../../../../context/SettingsContext', () => ({
  useSettings: () => ({ isDarkMode: false }),
}));

jest.mock('../../../../../context/UserContext', () => ({
  useUser: () => ({
    user: {
      ID: 1,
      role: 'admin',
      spiritualName: 'Test',
      karmicName: 'User',
      avatarUrl: '',
    },
  }),
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
    getChannel: (...args: any[]) => mockGetChannel(...args),
    listPosts: jest.fn().mockResolvedValue({ posts: [] }),
    createPost: jest.fn(),
    publishPost: jest.fn(),
    schedulePost: jest.fn(),
    updatePost: jest.fn(),
    uploadPostImage: jest.fn(),
  },
}));

jest.mock('../../../../../services/videoCirclesService', () => ({
  videoCirclesService: {
    getMyVideoCircles: jest.fn().mockResolvedValue({ circles: [] }),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const ChannelPostComposerScreen = require('../../../../../screens/portal/services/channels/ChannelPostComposerScreen').default;

const buildPost = (mediaJson: string) => ({
  ID: 55,
  channelId: 7,
  authorId: 1,
  type: 'media',
  content: 'existing post',
  mediaJson,
  ctaType: 'none',
  ctaPayloadJson: '',
  status: 'published',
  isPinned: false,
  CreatedAt: '2026-02-27T09:00:00Z',
  UpdatedAt: '2026-02-27T09:00:00Z',
});

describe('ChannelPostComposerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { channelId: 7, mode: 'create' };
    mockGetChannel.mockResolvedValue({
      channel: { ID: 7, isPublic: true },
    });
  });

  it('shows media limits in create mode', async () => {
    const { getByText } = render(<ChannelPostComposerScreen />);

    await waitFor(() => {
      expect(getByText('Фото 0/5')).toBeTruthy();
      expect(getByText('Кружки 0/10')).toBeTruthy();
      expect(getByText('Опубликовать')).toBeTruthy();
    });
  });

  it('opens in edit mode with save button', async () => {
    mockRouteParams = {
      channelId: 7,
      mode: 'edit',
      postId: 55,
      initialPost: buildPost(''),
    };

    const { getByText } = render(<ChannelPostComposerScreen />);

    await waitFor(() => {
      expect(getByText('Редактировать пост')).toBeTruthy();
      expect(getByText('Сохранить изменения')).toBeTruthy();
    });
  });

  it('handles invalid mediaJson in initial post without crash', async () => {
    mockRouteParams = {
      channelId: 7,
      mode: 'edit',
      postId: 55,
      initialPost: buildPost('not-a-json'),
    };

    const { getByText } = render(<ChannelPostComposerScreen />);

    await waitFor(() => {
      expect(getByText('Редактировать пост')).toBeTruthy();
      expect(getByText('Фото 0/5')).toBeTruthy();
    });
  });
});
