import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGetCollection = jest.fn();

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

jest.mock('../../../services/dhamaService', () => ({
  dhamaService: {
    getCollection: (...args: any[]) => mockGetCollection(...args),
  },
}));

const { DhamaCollectionDetailScreen } = require('../../../screens/dhama/DhamaCollectionDetailScreen');

const createNavigation = () => ({
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
});

describe('DhamaCollectionDetailScreen', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('opens collection places, map, and lead place routes', async () => {
    mockGetCollection.mockResolvedValueOnce({
      id: 3,
      slug: 'navadvipa-dhama',
      title: 'Navadvipa Dhama',
      description: 'Nine islands',
      places: [
        {
          id: 11,
          slug: 'mayapur',
          title: 'Mayapur',
          city: 'Mayapur',
          state: 'West Bengal',
          isFeatured: true,
        },
      ],
    });
    const navigation = createNavigation();
    const screen = render(
      <DhamaCollectionDetailScreen navigation={navigation} route={{ key: 'DhamaCollectionDetail', name: 'DhamaCollectionDetail', params: { slug: 'navadvipa-dhama' } }} />,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Navadvipa Dhama').length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByText('dhama.showCollectionPlaces'));
    fireEvent.press(screen.getByText('dhama.openCollectionMap'));
    fireEvent.press(screen.getAllByText('Mayapur')[0]);

    expect(navigation.navigate).toHaveBeenCalledWith('DhamaHome', {
      collectionSlug: 'navadvipa-dhama',
      collectionTitle: 'Navadvipa Dhama',
    });
    expect(navigation.navigate).toHaveBeenCalledWith('DhamaMap', { collectionSlug: 'navadvipa-dhama' });
    expect(navigation.navigate).toHaveBeenCalledWith('HolyPlaceDetail', { slug: 'mayapur' });
  });

  it('retries collection loading after error', async () => {
    mockGetCollection
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        id: 5,
        slug: 'braj-mandal',
        title: 'Braj Mandal',
        description: 'Braj route',
        places: [],
      });
    const navigation = createNavigation();
    const screen = render(
      <DhamaCollectionDetailScreen navigation={navigation} route={{ key: 'DhamaCollectionDetail', name: 'DhamaCollectionDetail', params: { slug: 'braj-mandal' } }} />,
    );

    await waitFor(() => {
      expect(screen.getByText('dhama.collectionErrorTitle')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('common.retry'));

    await waitFor(() => {
      expect(screen.getAllByText('Braj Mandal').length).toBeGreaterThan(0);
    });
    expect(mockGetCollection).toHaveBeenCalledTimes(2);
  });
});
