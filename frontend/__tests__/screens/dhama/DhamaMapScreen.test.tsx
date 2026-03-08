import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

let mockWebViewProps: any;
const mockGetMapMarkers = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    vTheme: {
      colors: {
        text: '#111111',
        textSecondary: '#666666',
        surfaceElevated: '#ffffff',
        divider: '#dddddd',
        primary: '#f97316',
      },
    },
  }),
}));

jest.mock('../../../components/theme/ScreenScaffold', () => ({
  ScreenScaffold: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../screens/dhama/DhamaBackButton', () => ({
  DhamaBackButton: () => null,
}));

jest.mock('react-native-webview', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    WebView: ReactModule.forwardRef((props: any, _ref: any) => {
      mockWebViewProps = props;
      return ReactModule.createElement(View, { testID: 'mock-webview' });
    }),
  };
});

jest.mock('../../../services/dhamaService', () => ({
  dhamaService: {
    getMapMarkers: (...args: any[]) => mockGetMapMarkers(...args),
  },
}));

const { DhamaMapScreen } = require('../../../screens/dhama/DhamaMapScreen');

const createNavigation = () => ({
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
});

describe('DhamaMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockWebViewProps = undefined;
  });

  it('shows empty state when backend returns no markers', async () => {
    mockGetMapMarkers.mockResolvedValueOnce({ markers: [] });
    const navigation = createNavigation();

    const screen = render(
      <DhamaMapScreen navigation={navigation} route={{ key: 'DhamaMap', name: 'DhamaMap', params: undefined }} />,
    );

    await waitFor(() => {
      expect(screen.getByText('dhama.mapEmptyTitle')).toBeTruthy();
    });
    expect(mockGetMapMarkers).toHaveBeenCalledWith({ collection: undefined, limit: 200 });
  });

  it('navigates to holy place detail from marker card after map loads', async () => {
    mockGetMapMarkers.mockResolvedValueOnce({
      markers: [
        {
          id: 1,
          slug: 'vrindavan',
          title: 'Vrindavan',
          city: 'Vrindavan',
          state: 'Uttar Pradesh',
          latitude: 27.58,
          longitude: 77.7,
        },
      ],
    });
    const navigation = createNavigation();

    const screen = render(
      <DhamaMapScreen navigation={navigation} route={{ key: 'DhamaMap', name: 'DhamaMap', params: undefined }} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Vrindavan')).toBeTruthy();
    });

    act(() => {
      mockWebViewProps.onMessage({
        nativeEvent: { data: JSON.stringify({ type: 'mapReady', markersCount: 1 }) },
      });
    });

    fireEvent.press(screen.getByText('Vrindavan'));
    expect(navigation.navigate).toHaveBeenCalledWith('HolyPlaceDetail', { slug: 'vrindavan' });
  });

  it('falls back to retry state when map never becomes ready and retries cleanly', async () => {
    jest.useFakeTimers();
    mockGetMapMarkers
      .mockResolvedValueOnce({
        markers: [
          {
            id: 1,
            slug: 'mayapur',
            title: 'Mayapur',
            city: 'Mayapur',
            state: 'West Bengal',
            latitude: 23.42,
            longitude: 88.39,
          },
        ],
      })
      .mockResolvedValueOnce({ markers: [] });
    const navigation = createNavigation();

    const screen = render(
      <DhamaMapScreen navigation={navigation} route={{ key: 'DhamaMap', name: 'DhamaMap', params: undefined }} />,
    );

    await waitFor(() => {
      expect(mockGetMapMarkers).toHaveBeenCalledTimes(1);
    });

    act(() => {
      mockWebViewProps.onLoadStart?.();
    });

    await act(async () => {
      jest.advanceTimersByTime(9100);
    });

    expect(screen.getByText('dhama.mapErrorTitle')).toBeTruthy();

    fireEvent.press(screen.getByText('common.retry'));

    await waitFor(() => {
      expect(mockGetMapMarkers).toHaveBeenCalledTimes(2);
    });
  });
});
