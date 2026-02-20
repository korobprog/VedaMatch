import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDonate = jest.fn();
const mockSetCooldown = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../services/multimediaService', () => ({
  multimediaService: {
    getRadioStations: jest.fn().mockResolvedValue([]),
    getTVChannels: jest.fn().mockResolvedValue([]),
    getTracks: jest.fn().mockResolvedValue({ tracks: [] }),
  },
}));

jest.mock('../../../services/multimediaSupportService', () => ({
  multimediaSupportService: {
    getSupportConfig: jest.fn().mockResolvedValue({
      enabled: true,
      projectId: 42,
      defaultAmount: 20,
      cooldownHours: 24,
    }),
    getPromptCooldown: jest.fn().mockResolvedValue(0),
    setPromptCooldown: (...args: any[]) => mockSetCooldown(...args),
    resetInteractions: jest.fn().mockResolvedValue(undefined),
    donateToMultimedia: (...args: any[]) => mockDonate(...args),
  },
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    isDarkMode: false,
    vTheme: {
      typography: { subHeader: { fontFamily: 'System' } },
      shadows: { soft: {} },
    },
  }),
}));

jest.mock('../../../context/UserContext', () => ({
  useUser: () => ({
    user: { ID: 99, role: 'user' },
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

jest.mock('../../../components/portal/god-mode/GodModeStatusBanner', () => ({
  GodModeStatusBanner: () => null,
}));

describe('MultimediaHub support prompt', () => {
  it('shows prompt and can trigger donate flow', async () => {
    const { getByText } = render(React.createElement(require('../../../screens/multimedia/MultimediaHubScreen').MultimediaHubScreen));

    await waitFor(() => {
      expect(getByText('Поддержать Sattva Media')).toBeTruthy();
    });

    fireEvent.press(getByText('Поддержать'));
    await waitFor(() => {
      expect(mockDonate).toHaveBeenCalled();
      expect(mockSetCooldown).toHaveBeenCalledWith(99);
    });
  });
});

