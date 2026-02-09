import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import RegistrationScreen from '../../../screens/RegistrationScreen';
import { EditProfileScreen } from '../../../screens/settings/EditProfileScreen';

const mockFetchCountries = jest.fn();
const mockFetchCities = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-native-community/blur', () => ({ BlurView: 'BlurView' }));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-date-picker', () => 'DatePicker');
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn().mockResolvedValue('test-device-id'),
}));

jest.mock('../../../context/UserContext', () => ({
  useUser: () => ({
    user: { ID: 1, isProfileComplete: false },
    login: jest.fn(),
  }),
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    isDarkMode: false,
    portalBackground: '',
    portalBackgroundType: 'color',
  }),
}));

jest.mock('../../../hooks/useLocation', () => ({
  useLocation: () => ({
    countriesData: [],
    citiesData: [],
    loadingCountries: false,
    fetchCountries: mockFetchCountries,
    fetchCities: mockFetchCities,
    setCitiesData: jest.fn(),
    autoDetectLocation: jest.fn(),
  }),
}));

jest.mock('../../../services/mapService', () => ({
  mapService: {
    autocomplete: jest.fn().mockResolvedValue({ features: [] }),
  },
}));

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: [] }),
  put: jest.fn().mockResolvedValue({ data: { user: { ID: 1 } } }),
  post: jest.fn().mockResolvedValue({ data: { user: { ID: 1 }, token: 'token' } }),
}));

const flattenColor = (style: any): string | undefined => {
  return StyleSheet.flatten(style)?.color;
};

describe('Role theme integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('RegistrationScreen applies selected role accent in profile phase', async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => false),
      setParams: jest.fn(),
    };

    const route = {
      params: {
        isDarkMode: false,
        phase: 'profile',
      },
    };

    const { getByTestId, getByText } = render(
      <RegistrationScreen navigation={navigation as any} route={route as any} />
    );

    const skipTextBefore = getByText('Skip');
    expect(flattenColor(skipTextBefore.props.style)).toBe('#6B7280');

    fireEvent.press(getByTestId('role-card-devotee'));

    await waitFor(() => {
      const skipTextAfter = getByText('Skip');
      expect(flattenColor(skipTextAfter.props.style)).toBe('#F97316');
    });
  });

  it('EditProfileScreen applies selected role accent in header action', async () => {
    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
    };

    const route = { params: {} };

    const { getByTestId, getByText } = render(
      <EditProfileScreen navigation={navigation as any} route={route as any} />
    );

    await waitFor(() => {
      expect(getByText('common.save')).toBeTruthy();
    });

    const saveBefore = getByText('common.save');
    expect(flattenColor(saveBefore.props.style)).toBe('#6B7280');

    fireEvent.press(getByTestId('role-card-yogi'));

    await waitFor(() => {
      const saveAfter = getByText('common.save');
      expect(flattenColor(saveAfter.props.style)).toBe('#0EA5E9');
    });
  });
});
