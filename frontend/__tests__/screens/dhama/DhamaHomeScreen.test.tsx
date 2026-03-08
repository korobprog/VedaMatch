import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGetPlaces = jest.fn();
const mockGetCollections = jest.fn();
const mockGetFilters = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('lucide-react-native', () => ({
  MapPinned: () => null,
  Search: () => null,
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    vTheme: {
      colors: {
        text: '#111111',
        textSecondary: '#666666',
        surface: '#faf7f2',
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
    getPlaces: (...args: any[]) => mockGetPlaces(...args),
    getCollections: (...args: any[]) => mockGetCollections(...args),
    getFilters: (...args: any[]) => mockGetFilters(...args),
  },
}));

const { DhamaHomeScreen } = require('../../../screens/dhama/DhamaHomeScreen');

const createNavigation = () => ({
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
});

describe('DhamaHomeScreen', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetPlaces.mockResolvedValue({
      places: [
        {
          id: 1,
          slug: 'vrindavan',
          title: 'Vrindavan',
          city: 'Vrindavan',
          state: 'Uttar Pradesh',
          shortDescription: 'Sacred place',
          isFeatured: true,
        },
      ],
    });
    mockGetCollections.mockResolvedValue({
      collections: [
        {
          id: 7,
          slug: 'braj-mandal',
          title: 'Braj Mandal',
          description: 'Braj route',
          placesCount: 2,
          isFeatured: true,
        },
      ],
    });
    mockGetFilters.mockResolvedValue({
      placeTypes: ['Temple town'],
      types: [],
      states: ['West Bengal'],
      cities: [],
      traditions: ['Gaudiya Vaishnava'],
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('opens collection detail from collection card', async () => {
    const navigation = createNavigation();
    const screen = render(
      <DhamaHomeScreen navigation={navigation} route={{ key: 'DhamaHome', name: 'DhamaHome', params: undefined }} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Braj Mandal')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Braj Mandal'));
    expect(navigation.navigate).toHaveBeenCalledWith('DhamaCollectionDetail', { slug: 'braj-mandal' });
  });

  it('reloads places with selected quick filter', async () => {
    const navigation = createNavigation();
    const screen = render(
      <DhamaHomeScreen navigation={navigation} route={{ key: 'DhamaHome', name: 'DhamaHome', params: undefined }} />,
    );

    await waitFor(() => {
      expect(screen.getByText('West Bengal')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('West Bengal'));

    await waitFor(() => {
      expect(mockGetPlaces).toHaveBeenLastCalledWith({
        search: '',
        collection: undefined,
        state: 'West Bengal',
        tradition: undefined,
        type: undefined,
        limit: 50,
      });
    });
  });
});
