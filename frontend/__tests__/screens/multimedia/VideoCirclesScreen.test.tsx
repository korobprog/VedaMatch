import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetVideoCircles = jest.fn();
const mockGetVideoTariffs = jest.fn();
const mockBoostCircle = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {},
  }),
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
    },
  }),
}));

jest.mock('../../../services/videoCirclesService', () => ({
  videoCirclesService: {
    getVideoCircles: (...args: any[]) => mockGetVideoCircles(...args),
    getVideoTariffs: (...args: any[]) => mockGetVideoTariffs(...args),
    boostCircle: (...args: any[]) => mockBoostCircle(...args),
    interact: jest.fn().mockResolvedValue({}),
    uploadAndCreateCircle: jest.fn().mockResolvedValue({}),
  },
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const { VideoCirclesScreen } = require('../../../screens/multimedia/VideoCirclesScreen');

describe('VideoCirclesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVideoCircles.mockResolvedValue({
      circles: [
        {
          id: 101,
          authorId: 7,
          mediaUrl: 'https://cdn.example.com/circle.mp4',
          thumbnailUrl: '',
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
      ],
      total: 1,
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
  });

  it('renders circles and triggers boost + navigation actions', async () => {
    const { getByText } = render(<VideoCirclesScreen />);

    await waitFor(() => {
      expect(getByText('Video Circles')).toBeTruthy();
    }, { timeout: 5000 });

    expect(getByText('Moscow')).toBeTruthy();
    expect(getByText('gaudiya')).toBeTruthy();
    expect(getByText('kirtan')).toBeTruthy();
    expect(getByText('Premium 30 LKM')).toBeTruthy();
    expect(getByText('Мои')).toBeTruthy();
    expect(getByText('Тарифы')).toBeTruthy();

    fireEvent.press(getByText('Мои'));
    expect(mockNavigate).toHaveBeenCalledWith('MyVideoCirclesScreen');

    fireEvent.press(getByText('Тарифы'));
    expect(mockNavigate).toHaveBeenCalledWith('VideoTariffsAdminScreen');

    fireEvent.press(getByText('Premium 30 LKM'));
    await waitFor(() => {
      expect(mockBoostCircle).toHaveBeenCalledWith(101, 'premium');
    });
  });
});
