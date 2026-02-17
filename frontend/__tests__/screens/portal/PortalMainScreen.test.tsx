import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-community/blur', () => ({ BlurView: 'BlurView' }));

jest.mock('../../../context/UserContext', () => ({
  useUser: () => ({
    user: { isProfileComplete: true, godModeEnabled: true },
    roleDescriptor: {
      title: 'Преданный',
      description: 'Сева и община',
      highlightColor: '#F97316',
      heroServices: ['seva', 'travel'],
      servicesHint: [{ serviceId: 'seva', title: 'Сева' }],
    },
    godModeFilters: [{ mathId: 'gauranga', mathName: 'Gauranga Math', filters: ['kirtan'] }],
    activeMathId: 'gauranga',
    setActiveMath: jest.fn(),
  }),
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    vTheme: { colors: { textSecondary: '#111', background: '#fff', primary: '#111' } },
    isDarkMode: false,
    setIsMenuOpen: jest.fn(),
    portalBackground: '',
    portalBackgroundType: 'color',
  }),
}));

jest.mock('../../../context/ChatContext', () => ({
  useChat: () => ({
    handleNewChat: jest.fn(),
  }),
}));

jest.mock('../../../components/portal', () => ({
  PortalGrid: () => null,
}));
jest.mock('../../../components/wallet/BalancePill', () => ({ BalancePill: () => null }));

jest.mock('../../../screens/portal/contacts/ContactsScreen', () => ({ ContactsScreen: () => null }));
jest.mock('../../../screens/portal/chat/PortalChatScreen', () => ({ PortalChatScreen: () => null }));
jest.mock('../../../screens/portal/shops/MarketHomeScreen', () => ({ MarketHomeScreen: () => null }));
jest.mock('../../../screens/portal/ads/AdsScreen', () => ({ AdsScreen: () => null }));
jest.mock('../../../screens/portal/news/NewsScreen', () => ({ NewsScreen: () => null }));
jest.mock('../../../screens/portal/dating/DatingScreen', () => ({ DatingScreen: () => null }));
jest.mock('../../../screens/library/LibraryHomeScreen', () => ({ LibraryHomeScreen: () => null }));
jest.mock('../../../screens/portal/education/EducationHomeScreen', () => ({ EducationHomeScreen: () => null }));
jest.mock('../../../screens/portal/cafe', () => ({ CafeListScreen: () => null }));
jest.mock('../../../screens/multimedia/MultimediaHubScreen', () => ({ MultimediaHubScreen: () => null }));
jest.mock('../../../screens/portal/travel', () => ({ TravelHomeScreen: () => null }));
jest.mock('../../../screens/portal/services', () => ({ ServicesHomeScreen: () => null }));
jest.mock('../../../screens/calls/CallHistoryScreen', () => ({ CallHistoryScreen: () => null }));

const { PortalMainScreen } = require('../../../screens/portal/PortalMainScreen');

describe('PortalMainScreen', () => {
  it('shows god mode filters panel when god mode is enabled', () => {
    const { getByText } = render(
      <PortalMainScreen
        navigation={{ navigate: jest.fn(), setParams: jest.fn() }}
        route={{ params: {} }}
      />
    );

    expect(getByText('PRO')).toBeTruthy();
    expect(getByText('Gauranga Math')).toBeTruthy();
  });
});
