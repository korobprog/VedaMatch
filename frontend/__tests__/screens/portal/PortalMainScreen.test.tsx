import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockHandleNewChat = jest.fn();
const mockSetIsMenuOpen = jest.fn();
const mockGetUnreadCount = jest.fn().mockResolvedValue({ unreadCount: 0 });
let latestOnServicePress: ((serviceId: string) => void) | null = null;

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-native-community/blur', () => ({ BlurView: 'BlurView' }));
jest.mock('@react-navigation/native', () => ({
    useFocusEffect: () => undefined,
}));

jest.mock('../../../components/portal/PortalBackgroundLayer', () => ({
    PortalBackgroundLayer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    deriveEffectivePortalBackground: (portalBackgroundType: string, portalBackground: string, activeWallpaper: string, isSlideshowEnabled: boolean) => ({
        effectiveBackground: isSlideshowEnabled ? activeWallpaper : portalBackground,
        effectiveBackgroundType: isSlideshowEnabled ? 'image' : portalBackgroundType,
    }),
}));

jest.mock('../../../context/UserContext', () => ({
    useUser: () => ({
        user: { isProfileComplete: true, godModeEnabled: true, role: 'user' },
        roleDescriptor: {
            title: 'Преданный',
            description: 'Сева и община',
            highlightColor: '#F97316',
            heroServices: ['seva', 'travel'],
            servicesHint: [{ serviceId: 'seva', title: 'Сева' }],
            role: 'yogi',
        },
        godModeFilters: [{ mathId: 'gauranga', mathName: 'Gauranga Math', filters: ['kirtan'] }],
        activeMathId: 'gauranga',
        setActiveMath: jest.fn(),
    }),
}));

jest.mock('../../../context/SettingsContext', () => ({
    useSettings: () => ({
        vTheme: {
            colors: {
                text: '#111111',
                textSecondary: '#777777',
                background: '#ffffff',
                backgroundSecondary: '#f5f5f5',
                primary: '#111111',
                divider: '#e5e7eb',
            },
        },
        isDarkMode: false,
        setIsMenuOpen: mockSetIsMenuOpen,
        portalBackground: '',
        portalBackgroundType: 'color',
        activeWallpaper: '',
        isSlideshowEnabled: false,
        removeWallpaperSlide: jest.fn(),
        wallpaperSlides: [],
        setPortalBackground: jest.fn(),
        portalIconStyle: 'glass',
        performanceMode: 'high_quality',
        runtimePerformanceState: null,
        reportRuntimeStress: jest.fn(),
    }),
}));

jest.mock('../../../context/ChatContext', () => ({
    useChat: () => ({
        handleNewChat: mockHandleNewChat,
    }),
}));

jest.mock('../../../components/portal', () => {
    const ReactNative = require('react-native');
    return {
        PortalGrid: ({ onServicePress }: { onServicePress: (serviceId: string) => void }) => {
            latestOnServicePress = onServicePress;
            return <ReactNative.View />;
        },
    };
});

jest.mock('../../../components/wallet/PortalLkmCircleButton', () => ({
    PortalLkmCircleButton: () => null,
}));

jest.mock('../../../components/portal/BellButton', () => ({
    BellButton: () => null,
}));

jest.mock('../../../components/portal/NotificationPanel', () => ({
    NotificationPanel: () => null,
}));

jest.mock('../../../services/supportService', () => ({
    supportService: {
        getUnreadCount: () => mockGetUnreadCount(),
    },
}));

jest.mock('../../../screens/portal/contacts/ContactsScreen', () => ({ ContactsScreen: () => null }));
jest.mock('../../../screens/portal/chat/PortalChatScreen', () => ({ PortalChatScreen: () => null }));
jest.mock('../../../screens/portal/shops/MarketHomeScreen', () => ({ MarketHomeScreen: () => null }));
jest.mock('../../../screens/portal/ads/AdsScreen', () => ({ AdsScreen: () => null }));
jest.mock('../../../screens/portal/news/NewsScreen', () => ({ NewsScreen: () => null }));
jest.mock('../../../screens/portal/dating/DatingScreen', () => ({ DatingScreen: ({ onBack }: { onBack: () => void }) => null }));
jest.mock('../../../screens/library/LibraryHomeScreen', () => ({ LibraryHomeScreen: () => null }));
jest.mock('../../../screens/portal/education/EducationHomeScreen', () => ({ EducationHomeScreen: () => null }));
jest.mock('../../../screens/portal/cafe', () => ({ CafeListScreen: ({ onBack }: { onBack: () => void }) => null }));
jest.mock('../../../screens/multimedia/MultimediaHubScreen', () => ({ MultimediaHubScreen: ({ onBack }: { onBack: () => void }) => null }));
jest.mock('../../../screens/portal/travel', () => ({ TravelHomeScreen: () => null }));
jest.mock('../../../screens/portal/services', () => {
    const ReactNative = require('react-native');
    return {
        ServicesHomeScreen: ({ onBack }: { onBack: () => void }) => (
            <ReactNative.TouchableOpacity testID="services-back" onPress={onBack}>
                <ReactNative.Text>SERVICES_HOME</ReactNative.Text>
            </ReactNative.TouchableOpacity>
        ),
    };
});
jest.mock('../../../screens/calls/CallHistoryScreen', () => ({ CallHistoryScreen: () => null }));

const { PortalMainScreen } = require('../../../screens/portal/PortalMainScreen');

const createNavigation = () => ({
    navigate: jest.fn(),
    setParams: jest.fn(),
    canGoBack: jest.fn(() => true),
    goBack: jest.fn(),
});

describe('PortalMainScreen', () => {
    beforeEach(() => {
        latestOnServicePress = null;
        mockHandleNewChat.mockClear();
        mockSetIsMenuOpen.mockClear();
        mockGetUnreadCount.mockClear();
    });

    it('shows god mode filters panel when god mode is enabled', () => {
        const navigation = createNavigation();
        const { getByText } = render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        expect(getByText('PRO')).toBeTruthy();
        expect(getByText('Gauranga Math')).toBeTruthy();
    });

    it('opens chat assistant for services shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('services');
        });

        expect(mockHandleNewChat).toHaveBeenCalledTimes(1);
        expect(navigation.navigate).toHaveBeenCalledWith('Chat');
    });

    it('opens services catalog tab for services_catalog shortcut', () => {
        const navigation = createNavigation();
        const screen = render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('services_catalog');
        });

        expect(screen.getByText('SERVICES_HOME')).toBeTruthy();
    });

    it('returns to widgets on back when service was opened from widget dock', () => {
        const navigation = createNavigation();
        const screen = render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: { returnToWidget: true } }}
            />,
        );

        act(() => {
            latestOnServicePress?.('services_catalog');
        });

        fireEvent.press(screen.getByTestId('services-back'));
        expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });
});
