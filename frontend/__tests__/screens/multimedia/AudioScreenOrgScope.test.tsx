import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
let mockUser: any = null;

const mockMultimediaService = {
  getCategories: jest.fn().mockResolvedValue([]),
  getTracks: jest.fn().mockResolvedValue({ tracks: [], total: 0, page: 1, totalPages: 1 }),
  getFavorites: jest.fn().mockResolvedValue({ tracks: [] }),
  addToFavorites: jest.fn(),
  removeFromFavorites: jest.fn(),
  getPlaylists: jest.fn().mockResolvedValue({ playlists: [] }),
  addTrackToPlaylist: jest.fn(),
  formatDuration: jest.fn().mockReturnValue('0:00'),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('../../../services/multimediaService', () => ({
  multimediaService: mockMultimediaService,
}));

jest.mock('../../../services/multimediaSupportService', () => ({
  multimediaSupportService: {
    getSupportConfig: jest.fn().mockResolvedValue({ enabled: false, projectId: 0, defaultAmount: 20, cooldownHours: 24 }),
    getPromptCooldown: jest.fn().mockResolvedValue(0),
    incrementInteractions: jest.fn().mockResolvedValue(0),
    setPromptCooldown: jest.fn().mockResolvedValue(undefined),
    donateToMultimedia: jest.fn().mockResolvedValue(undefined),
    resetInteractions: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    isDarkMode: false,
    vTheme: {
      shadows: { soft: {} },
      typography: { subHeader: { fontFamily: 'System' } },
    },
  }),
}));

jest.mock('../../../context/UserContext', () => ({
  useUser: () => ({
    user: mockUser,
  }),
}));

jest.mock('../../../hooks/useRoleTheme', () => ({
  useRoleTheme: () => ({
    colors: {
      textPrimary: '#111',
      textSecondary: '#666',
      accent: '#2563eb',
      accentSoft: '#dbeafe',
      warning: '#f59e0b',
      success: '#22c55e',
      danger: '#ef4444',
      border: '#d1d5db',
      surface: '#f8fafc',
      surfaceElevated: '#fff',
      background: '#fff',
      overlay: 'rgba(0,0,0,0.35)',
    },
  }),
}));

describe('AudioScreen org scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides org chips for non-PRO and shows limited scope message', async () => {
    mockUser = { ID: 7, role: 'user', currentPlan: 'free', madh: 'gaudiya' };

    const Screen = require('../../../screens/multimedia/AudioScreen').AudioScreen;
    const { queryByText, getByText } = render(<Screen />);

    await waitFor(() => {
      expect(getByText('Режим доступа: ваша организация и общий контент.')).toBeTruthy();
    });

    expect(queryByText('Все Традиции')).toBeNull();
    expect(queryByText('ISKCON')).toBeNull();
  });

  it('shows org chips for PRO viewer', async () => {
    mockUser = { ID: 8, role: 'user', currentPlan: 'pro_monthly', madh: 'gaudiya' };

    const Screen = require('../../../screens/multimedia/AudioScreen').AudioScreen;
    const { getByText } = render(<Screen />);

    await waitFor(() => {
      expect(getByText('Все Традиции')).toBeTruthy();
      expect(getByText('ISKCON')).toBeTruthy();
    });
  });

  it('shows CTA when non-PRO has no madh', async () => {
    mockUser = { ID: 9, role: 'user', currentPlan: 'free', madh: '' };

    const Screen = require('../../../screens/multimedia/AudioScreen').AudioScreen;
    const { getByText } = render(<Screen />);

    await waitFor(() => {
      expect(getByText('Доступен общий контент. Добавьте организацию в профиль или включите PRO для полного каталога.')).toBeTruthy();
    });

    expect(getByText('Профиль')).toBeTruthy();
    expect(getByText('PRO')).toBeTruthy();
  });
});
