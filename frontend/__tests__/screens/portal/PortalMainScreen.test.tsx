import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockHandleNewChat = jest.fn();
const mockSetIsMenuOpen = jest.fn();
const mockSetEditMode = jest.fn();
const mockGetUnreadCount = jest.fn().mockResolvedValue({ unreadCount: 0 });
let latestOnServicePress: ((serviceId: string) => void) | null = null;
const mockUserState = {
    isProfileComplete: true,
    godModeEnabled: true,
    role: 'user',
};

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
        user: mockUserState,
        roleDescriptor: {
            title: 'Преданный',
            description: 'Сева и община',
            highlightColor: '#F97316',
            heroServices: ['seva', 'travel'],
            servicesHint: [{ serviceId: 'seva', title: 'Сева' }],
            role: 'yogi',
        },
        godModeFilters: [{ mathId: 'gauranga', mathName: 'Gauranga Org.', filters: ['kirtan'] }],
        activeMathId: 'gauranga',
        setActiveMath: jest.fn(),
        shouldShowPortalBootLoader: false,
        completePortalBootLoader: jest.fn(),
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

jest.mock('../../../context/PortalLayoutContext', () => ({
    usePortalLayout: () => ({
        layout: {
            quickAccess: [],
            pages: [{ items: [] }],
            widgetCanvas: { widgets: [], lastModified: 0 },
            iconSize: 'medium',
        },
        isEditMode: false,
        setEditMode: mockSetEditMode,
        isServiceVisible: () => true,
        getServiceMaintenanceMessage: () => '',
        isLoading: false,
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
        PortalGrid: ({
            onServicePress,
            onOpenWidgets,
        }: {
            onServicePress: (serviceId: string) => void;
            onOpenWidgets?: () => void;
        }) => {
            latestOnServicePress = onServicePress;
            return (
                <ReactNative.View testID="portal-grid">
                    <ReactNative.TouchableOpacity testID="open-widgets" onPress={() => onOpenWidgets?.()} />
                </ReactNative.View>
            );
        },
    };
});

jest.mock('../../../components/portal/PortalQuickAccessDock', () => ({
    PortalQuickAccessDock: () => null,
}));

jest.mock('../../../components/portal/widgets/WidgetPageContent', () => {
    const ReactLib = require('react');
    const ReactNative = require('react-native');
    return {
        WidgetPageContent: ({ onPageReady }: { onPageReady?: () => void }) => {
            ReactLib.useEffect(() => {
                onPageReady?.();
            }, [onPageReady]);
            return <ReactNative.View testID="widget-page-content" />;
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
jest.mock('../../../screens/portal/services/ServicesHomeScreen', () => () => null);
jest.mock('../../../screens/portal/shops/MarketHomeScreen', () => ({ MarketHomeScreen: () => null }));
jest.mock('../../../screens/portal/ads/AdsScreen', () => ({ AdsScreen: () => null }));
jest.mock('../../../screens/portal/news/NewsScreen', () => ({ NewsScreen: () => null }));
jest.mock('../../../screens/portal/dating/DatingScreen', () => ({ DatingScreen: ({ onBack: _onBack }: { onBack: () => void }) => null }));
jest.mock('../../../screens/library/LibraryHomeScreen', () => ({ LibraryHomeScreen: () => null }));
jest.mock('../../../screens/portal/education/EducationHomeScreen', () => ({ EducationHomeScreen: () => null }));
jest.mock('../../../screens/portal/cafe', () => ({ CafeListScreen: ({ onBack: _onBack }: { onBack: () => void }) => null }));
jest.mock('../../../screens/multimedia/MultimediaHubScreen', () => ({ MultimediaHubScreen: ({ onBack: _onBack }: { onBack: () => void }) => null }));
jest.mock('../../../screens/portal/travel', () => ({ TravelHomeScreen: () => null }));
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
        mockSetEditMode.mockClear();
        mockGetUnreadCount.mockClear();
        mockUserState.isProfileComplete = true;
        mockUserState.godModeEnabled = true;
        mockUserState.role = 'user';
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
        expect(getByText('Gauranga Org.')).toBeTruthy();
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

    it('opens chat assistant for chat shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('chat');
        });

        expect(mockHandleNewChat).toHaveBeenCalledTimes(1);
        expect(navigation.navigate).toHaveBeenCalledWith('Chat');
    });

    it('opens services home screen for services_catalog shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('services_catalog');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('ServicesHome');
    });

    it('opens calls home screen for calls shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('calls');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('CallsHome');
    });

    it('opens rooms home screen for rooms shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('rooms');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('RoomsHome');
    });

    it('opens multimedia hub screen for multimedia shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('multimedia');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('MultimediaHub');
    });

    it('opens market home screen for shops shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('shops');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('MarketHome');
    });

    it('opens dating home screen for dating shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('dating');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('DatingHome');
    });

    it('opens cafe home screen for cafe shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('cafe');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('CafeHome');
    });

    it('opens news home screen for news shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('news');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('NewsHome');
    });

    it('opens library home screen for library shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('library');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('LibraryHome');
    });

    it('opens education home screen for education shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('education');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('EducationHome');
    });

    it('opens travel home screen for travel shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('travel');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('TravelHome');
    });

    it('opens ads screen for ads shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('ads');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('Ads');
    });

    it('opens ekadashi calendar screen for calendar shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('ekadashi_calendar');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('EkadashiCalendar');
    });

    it('opens lila home screen for lila shortcut', () => {
        const navigation = createNavigation();
        render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        act(() => {
            latestOnServicePress?.('lila_battle_of_sages');
        });

        expect(navigation.navigate).toHaveBeenCalledWith('LilaBattleOfSagesHome');
    });

    it('shows profile completion CTA in locked service hint and opens EditProfile', () => {
        mockUserState.isProfileComplete = false;
        mockUserState.godModeEnabled = false;
        const navigation = createNavigation();
        const screen = render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        fireEvent.press(screen.getByText('portal.seekerTravelLocked.action'));

        expect(screen.getByText('portal.seekerTravelLocked.title')).toBeTruthy();
        expect(navigation.navigate).toHaveBeenCalledWith('EditProfile');
    });

    it('switches to widgets page inside the shared pager shell', () => {
        const navigation = createNavigation();
        const screen = render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: {} }}
            />,
        );

        expect(screen.queryByTestId('widget-page-content')).toBeNull();

        fireEvent.press(screen.getByTestId('open-widgets'));

        expect(screen.getByTestId('widget-page-content')).toBeTruthy();
    });

    it('opens shared workspace directly on widgets page from route params', () => {
        const navigation = createNavigation();
        const screen = render(
            <PortalMainScreen
                navigation={navigation}
                route={{ params: { initialPage: 'widgets' } }}
            />,
        );

        expect(screen.getByTestId('widget-page-content')).toBeTruthy();
        expect(navigation.setParams).toHaveBeenCalledWith({
            initialPage: undefined,
            returnToWidget: undefined,
        });
    });
});
