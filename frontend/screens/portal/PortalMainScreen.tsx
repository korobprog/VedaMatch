import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    Platform,
    Animated,
    AppState,
    BackHandler,
    Image,
    ActivityIndicator,
    InteractionManager,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
    List,
    Settings,
    MessageSquare,
    Gift,
    LayoutGrid,
    Compass,
    Leaf,
    Infinity,
    Heart,
    Film,
} from 'lucide-react-native';

import { PortalChatScreen } from './chat/PortalChatScreen';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { BellButton } from '../../components/portal/BellButton';
import { NotificationPanel } from '../../components/portal/NotificationPanel';
import { PortalGrid } from '../../components/portal';
import { PortalBackgroundLayer, deriveEffectivePortalBackground } from '../../components/portal/PortalBackgroundLayer';
import { PortalLkmCircleButton } from '../../components/wallet/PortalLkmCircleButton';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { SplashScreen } from '../../components/ui/SplashScreen';
import { RoleInfoModal } from '../../components/roles/RoleInfoModal';
import { GodModeFiltersPanel } from '../../components/portal/god-mode/GodModeFiltersPanel';
import { RootStackParamList } from '../../types/navigation';
import { supportService } from '../../services/supportService';
import { getAndroidVisualPolicy, getBlurAmountForPolicy } from '../../utils/androidVisualPolicy';
import { useChat } from '../../context/ChatContext';
import {
    EMBEDDED_PORTAL_TABS,
    EmbeddedPortalTab,
    resolvePortalInitialTabLaunch,
    resolveServiceLaunch,
} from './serviceLaunchResolver';


type ServiceTab = EmbeddedPortalTab;
type PortalMainProps = NativeStackScreenProps<RootStackParamList, 'Portal'>;
type WidgetSelectionSource = Exclude<NonNullable<RootStackParamList['WidgetSelection']>['source'], undefined>;
const SWIPE_MIN_DISTANCE_PX = 70;
const SWIPE_MIN_VELOCITY_PX = 650;
const SWIPE_MAX_VERTICAL_DELTA_PX = 48;

// Inner component that uses portal layout context
const PortalContent: React.FC<PortalMainProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { handleNewChat } = useChat();
    const {
        user,
        roleDescriptor,
        godModeFilters,
        activeMathId,
        setActiveMath,
        shouldShowPortalBootLoader,
        completePortalBootLoader,
    } = useUser();
    const { isServiceVisible, getServiceMaintenanceMessage, isLoading: isPortalLayoutLoading } = usePortalLayout();
    const {
        vTheme,
        isDarkMode,
        screenVisualStyle,
        setIsMenuOpen,
        portalBackground,
        portalBackgroundType,
        activeWallpaper,
        isSlideshowEnabled,
        removeWallpaperSlide,
        wallpaperSlides,
        setPortalBackground,
        portalIconStyle,
        performanceMode,
        runtimePerformanceState,
        reportRuntimeStress,
    } = useSettings();
    const androidVisualPolicy = useMemo(
        () => getAndroidVisualPolicy(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const headerBlurAmount = getBlurAmountForPolicy(androidVisualPolicy, 12);
    const roleBlurAmount = getBlurAmountForPolicy(androidVisualPolicy, 8);
    const backButtonBlurAmount = getBlurAmountForPolicy(androidVisualPolicy, 10);
    const initialLaunch = resolvePortalInitialTabLaunch(route.params?.initialTab);
    const initialServiceTab = initialLaunch?.kind === 'open_portal_tab'
        ? initialLaunch.tab
        : null;
    const [activeTab, setActiveTab] = useState<ServiceTab | null>(initialServiceTab);
    const [showRoleInfo, setShowRoleInfo] = useState(false);
    const [supportUnreadCount, setSupportUnreadCount] = useState(0);
    const [isPortalBootOverlayVisible, setIsPortalBootOverlayVisible] = useState(false);
    const [isPortalBackgroundReady, setIsPortalBackgroundReady] = useState(true);
    const [isPortalFirstLayoutReady, setIsPortalFirstLayoutReady] = useState(false);
    const [isPortalGridMounted, setIsPortalGridMounted] = useState(Platform.OS !== 'android');
    const [isPortalStartupSettled, setIsPortalStartupSettled] = useState(Platform.OS !== 'android');
    const seekerTravelLocked = (user?.role || 'user') === 'user' && !user?.godModeEnabled && !user?.isProfileComplete;
    const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
    const widgetNavLockRef = useRef(false);
    const widgetNavUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const portalBootFinishRequestedRef = useRef(false);

    const showServiceUnavailableAlert = useCallback((serviceId: string) => {
        const maintenanceMessage = getServiceMaintenanceMessage(serviceId);
        Alert.alert(
            'Service temporarily unavailable',
            maintenanceMessage || 'This service is currently hidden for your account.',
        );
    }, [getServiceMaintenanceMessage]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            setIsAppActive(nextState === 'active');
        });
        return () => subscription.remove();
    }, []);

    const releaseWidgetNavigationLock = useCallback(() => {
        widgetNavLockRef.current = false;
        if (widgetNavUnlockTimerRef.current) {
            clearTimeout(widgetNavUnlockTimerRef.current);
            widgetNavUnlockTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            releaseWidgetNavigationLock();
        };
    }, [releaseWidgetNavigationLock]);

    const openWidgetSelection = useCallback((source: WidgetSelectionSource = 'portal_header') => {
        if (widgetNavLockRef.current) {
            return;
        }
        widgetNavLockRef.current = true;
        console.log(`[portal_widgets_open] source=${source}`);
        requestAnimationFrame(() => {
            navigation.navigate('WidgetSelection', { source });
        });
        widgetNavUnlockTimerRef.current = setTimeout(() => {
            releaseWidgetNavigationLock();
        }, 450);
    }, [navigation, releaseWidgetNavigationLock]);

    const portalSwipeGesture = useMemo(
        () => Gesture.Pan()
            .runOnJS(true)
            .maxPointers(1)
            .activeOffsetX([-16, 16])
            .failOffsetY([-32, 32])
            .onEnd((event) => {
                if (activeTab !== null) {
                    return;
                }
                const isHorizontalSwipe =
                    event.translationX <= -SWIPE_MIN_DISTANCE_PX ||
                    event.velocityX <= -SWIPE_MIN_VELOCITY_PX;
                const isMostlyHorizontal = Math.abs(event.translationY) <= SWIPE_MAX_VERTICAL_DELTA_PX;
                if (isHorizontalSwipe && isMostlyHorizontal) {
                    openWidgetSelection('portal_swipe');
                }
            }),
        [activeTab, openWidgetSelection],
    );

    const refreshSupportUnread = useCallback(async () => {
        if (!user?.ID || user.ID === 999999) {
            setSupportUnreadCount(0);
            return;
        }
        try {
            const payload = await supportService.getUnreadCount();
            setSupportUnreadCount(payload?.unreadCount || 0);
        } catch (error) {
            console.warn('[Portal] failed to load support unread count:', error);
            setSupportUnreadCount(0);
        }
    }, [user?.ID]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS === 'android' && activeTab === null && !isPortalStartupSettled) {
                return undefined;
            }
            refreshSupportUnread();
            return undefined;
        }, [activeTab, isPortalStartupSettled, refreshSupportUnread])
    );

    const { effectiveBackgroundType: effectiveBgType } = useMemo(
        () => deriveEffectivePortalBackground(portalBackgroundType, portalBackground, activeWallpaper, isSlideshowEnabled),
        [portalBackgroundType, portalBackground, activeWallpaper, isSlideshowEnabled],
    );
    const useClassicWallpaper = screenVisualStyle === 'classic';
    const layerBackgroundType = useClassicWallpaper ? portalBackgroundType : 'color';
    const layerBackground = useClassicWallpaper ? portalBackground : vTheme.colors.background;
    const layerActiveWallpaper = useClassicWallpaper ? activeWallpaper : '';
    const layerSlideshowEnabled = useClassicWallpaper ? isSlideshowEnabled : false;
    const layerOverlayColor = useClassicWallpaper ? 'rgba(0,0,0,0.25)' : 'transparent';
    const shouldUsePortalStartupReducedChrome = Platform.OS === 'android'
        && activeTab === null
        && !isPortalStartupSettled;
    const isAndroidReducedHeaderChrome = Platform.OS === 'android' && !androidVisualPolicy.enableBlur;
    const useLightHeaderIcons = isDarkMode && effectiveBgType === 'image' && !shouldUsePortalStartupReducedChrome;
    const useSolidServiceLayer = false;
    const serviceLayerBackgroundType = useSolidServiceLayer ? 'color' : layerBackgroundType;
    const serviceLayerBackground = useSolidServiceLayer ? vTheme.colors.background : layerBackground;
    const serviceLayerActiveWallpaper = useSolidServiceLayer ? '' : layerActiveWallpaper;
    const serviceLayerSlideshowEnabled = useSolidServiceLayer ? false : layerSlideshowEnabled;
    const serviceLayerOverlayColor = useSolidServiceLayer ? 'transparent' : layerOverlayColor;
    const useLightServiceHeaderIcons = useSolidServiceLayer ? false : useLightHeaderIcons;
    const shouldUseSolidServiceHeader = activeTab === 'chat';
    const serviceHeaderBackgroundColor = shouldUseSolidServiceHeader ? vTheme.colors.background : 'transparent';
    const serviceHeaderBorderColor = shouldUseSolidServiceHeader ? vTheme.colors.divider : 'transparent';
    const failedWallpaperSetRef = useRef<Set<string>>(new Set());
    const giftAnim = useRef(new Animated.Value(1)).current;
    const headerCircleSurfaceColor = portalIconStyle === 'vedamatch'
        ? '#121212'
        : isAndroidReducedHeaderChrome
            ? (useLightHeaderIcons ? 'rgba(255,255,255,0.14)' : 'rgba(250,247,240,0.92)')
            : 'rgba(255, 255, 255, 0.25)';
    const headerCircleBorderColor = portalIconStyle === 'vedamatch'
        ? '#D4AF37'
        : isAndroidReducedHeaderChrome
            ? (useLightHeaderIcons ? 'rgba(255,255,255,0.24)' : 'rgba(255, 153, 51, 0.22)')
            : 'rgba(255, 255, 255, 0.4)';
    const { effectiveBackground: portalBootBackground, effectiveBackgroundType: portalBootBackgroundType } = useMemo(
        () => deriveEffectivePortalBackground(layerBackgroundType, layerBackground, layerActiveWallpaper, layerSlideshowEnabled),
        [layerBackgroundType, layerBackground, layerActiveWallpaper, layerSlideshowEnabled],
    );

    const handlePortalFirstLayoutReady = useCallback(() => {
        setIsPortalFirstLayoutReady(true);
    }, []);

    const finishPortalBootOverlay = useCallback(() => {
        if (portalBootFinishRequestedRef.current) {
            return;
        }
        portalBootFinishRequestedRef.current = true;
        setIsPortalBootOverlayVisible(false);
        completePortalBootLoader();
    }, [completePortalBootLoader]);

    useEffect(() => {
        portalBootFinishRequestedRef.current = false;
        if (!shouldShowPortalBootLoader) {
            setIsPortalBootOverlayVisible(false);
            setIsPortalBackgroundReady(true);
            setIsPortalFirstLayoutReady(false);
            return;
        }

        if (Platform.OS === 'android') {
            setIsPortalGridMounted(false);
            setIsPortalStartupSettled(false);
        }
        setIsPortalBootOverlayVisible(true);
        setIsPortalFirstLayoutReady(false);
    }, [shouldShowPortalBootLoader, user?.ID]);

    useEffect(() => {
        if (Platform.OS !== 'android') {
            setIsPortalGridMounted(true);
            return;
        }

        if (!user?.ID) {
            setIsPortalGridMounted(false);
            return;
        }

        if (activeTab !== null || isPortalGridMounted) {
            return;
        }

        if (shouldShowPortalBootLoader || isPortalBootOverlayVisible || isPortalLayoutLoading) {
            return;
        }

        let cancelled = false;
        const interactionTask = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                if (!cancelled) {
                    setIsPortalGridMounted(true);
                }
            });
        });

        return () => {
            cancelled = true;
            interactionTask.cancel();
        };
    }, [
        activeTab,
        isPortalBootOverlayVisible,
        isPortalGridMounted,
        isPortalLayoutLoading,
        shouldShowPortalBootLoader,
        user?.ID,
    ]);

    useEffect(() => {
        if (Platform.OS !== 'android') {
            setIsPortalStartupSettled(true);
            return;
        }

        if (!user?.ID) {
            setIsPortalStartupSettled(false);
            return;
        }

        if (
            activeTab !== null
            || shouldShowPortalBootLoader
            || isPortalBootOverlayVisible
            || !isPortalGridMounted
            || isPortalLayoutLoading
            || isPortalStartupSettled
        ) {
            return;
        }

        let cancelled = false;
        const interactionTask = InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
                if (!cancelled) {
                    setIsPortalStartupSettled(true);
                }
            }, 350);
        });

        return () => {
            cancelled = true;
            interactionTask.cancel();
        };
    }, [
        activeTab,
        isPortalBootOverlayVisible,
        isPortalGridMounted,
        isPortalLayoutLoading,
        isPortalStartupSettled,
        shouldShowPortalBootLoader,
        user?.ID,
    ]);

    useEffect(() => {
        if (!shouldShowPortalBootLoader) {
            setIsPortalBackgroundReady(true);
            return;
        }

        const isRemoteBackground = (
            portalBootBackgroundType === 'image'
            && Boolean(portalBootBackground)
            && /^https?:\/\//i.test(portalBootBackground)
        );

        if (!isRemoteBackground) {
            setIsPortalBackgroundReady(true);
            return;
        }

        let cancelled = false;
        setIsPortalBackgroundReady(false);

        Image.prefetch(portalBootBackground)
            .catch(() => undefined)
            .finally(() => {
                if (!cancelled) {
                    setIsPortalBackgroundReady(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [portalBootBackground, portalBootBackgroundType, shouldShowPortalBootLoader]);

    useEffect(() => {
        if (!shouldShowPortalBootLoader || !isPortalBootOverlayVisible) {
            return;
        }

        const timeout = setTimeout(() => {
            finishPortalBootOverlay();
        }, 2000);

        return () => {
            clearTimeout(timeout);
        };
    }, [finishPortalBootOverlay, isPortalBootOverlayVisible, shouldShowPortalBootLoader]);

    useEffect(() => {
        if (!shouldShowPortalBootLoader || !isPortalBootOverlayVisible) {
            return;
        }
        if (isPortalLayoutLoading || !isPortalBackgroundReady || !isPortalFirstLayoutReady) {
            return;
        }

        let cancelled = false;
        requestAnimationFrame(() => {
            if (!cancelled) {
                finishPortalBootOverlay();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        finishPortalBootOverlay,
        isPortalBackgroundReady,
        isPortalBootOverlayVisible,
        isPortalFirstLayoutReady,
        isPortalLayoutLoading,
        shouldShowPortalBootLoader,
    ]);

    useEffect(() => {
        if (!androidVisualPolicy.allowGiftPulse || !isAppActive || activeTab !== null || !isPortalStartupSettled) {
            giftAnim.setValue(1);
            return;
        }
        const startGiftPulse = () => {
            Animated.sequence([
                Animated.timing(giftAnim, {
                    toValue: 1.25,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(giftAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.delay(7000),
            ]).start(() => startGiftPulse());
        };

        startGiftPulse();
        return () => giftAnim.stopAnimation();
    }, [giftAnim, androidVisualPolicy.allowGiftPulse, isAppActive, activeTab, isPortalStartupSettled]);

    useEffect(() => {
        if (Platform.OS !== 'android' || performanceMode !== 'adaptive' || !isAppActive || activeTab !== null) return;
        let lastTick = Date.now();
        let lagBursts = 0;
        const interval = setInterval(() => {
            const now = Date.now();
            const drift = now - lastTick - 1000;
            lastTick = now;
            if (drift > 240) {
                lagBursts += 1;
            } else {
                lagBursts = Math.max(0, lagBursts - 1);
            }
            if (lagBursts >= 2) {
                reportRuntimeStress('render');
                lagBursts = 0;
            }
        }, 1200);
        return () => clearInterval(interval);
    }, [performanceMode, reportRuntimeStress, isAppActive, activeTab]);

    const handleWallpaperLoadError = useCallback((failedUri?: string | null) => {
        if (!failedUri) return;
        if (failedWallpaperSetRef.current.has(failedUri)) return;
        failedWallpaperSetRef.current.add(failedUri);

        if (wallpaperSlides.includes(failedUri)) {
            removeWallpaperSlide(failedUri).catch((error) => {
                console.warn('[Portal] failed to remove broken wallpaper slide:', error);
            });
            return;
        }

        if (!isSlideshowEnabled && failedUri === portalBackground && wallpaperSlides[0]) {
            setPortalBackground(wallpaperSlides[0], 'image').catch((error) => {
                console.warn('[Portal] failed to apply fallback wallpaper:', error);
            });
        }
    }, [wallpaperSlides, removeWallpaperSlide, isSlideshowEnabled, portalBackground, setPortalBackground]);

    const navigateResolvedScreen = useCallback((screen: keyof RootStackParamList) => {
        if (screen === 'AppSettings') {
            navigation.navigate('AppSettings');
            return;
        }
        if (screen === 'SupportHome') {
            navigation.navigate('SupportHome', { entryPoint: 'portal' });
            return;
        }
        if (screen === 'MapGeoapify') {
            navigation.navigate('MapGeoapify');
            return;
        }
        if (screen === 'DhamaHome') {
            navigation.navigate('DhamaHome');
            return;
        }
        if (screen === 'ContactsHome') {
            navigation.navigate('ContactsHome');
            return;
        }
        if (screen === 'CallsHome') {
            navigation.navigate('CallsHome');
            return;
        }
        if (screen === 'RoomsHome') {
            navigation.navigate('RoomsHome');
            return;
        }
        if (screen === 'ServicesHome') {
            navigation.navigate('ServicesHome');
            return;
        }
        if (screen === 'MultimediaHub') {
            navigation.navigate('MultimediaHub');
            return;
        }
        if (screen === 'MarketHome') {
            navigation.navigate('MarketHome');
            return;
        }
        if (screen === 'DatingHome') {
            navigation.navigate('DatingHome');
            return;
        }
        if (screen === 'CafeHome') {
            navigation.navigate('CafeHome');
            return;
        }
        if (screen === 'NewsHome') {
            navigation.navigate('NewsHome');
            return;
        }
        if (screen === 'LibraryHome') {
            navigation.navigate('LibraryHome');
            return;
        }
        if (screen === 'EducationHome') {
            navigation.navigate('EducationHome');
            return;
        }
        if (screen === 'TravelHome') {
            navigation.navigate('TravelHome');
            return;
        }
        if (screen === 'Ads') {
            navigation.navigate('Ads');
            return;
        }
        if (screen === 'PathTrackerHome') {
            navigation.navigate('PathTrackerHome');
            return;
        }
        if (screen === 'ChannelsHub') {
            navigation.navigate('ChannelsHub');
            return;
        }
        if (screen === 'SadhuSangaHub') {
            navigation.navigate('SadhuSangaHub');
            return;
        }
        if (screen === 'VideoCirclesScreen') {
            navigation.navigate('VideoCirclesScreen');
            return;
        }
        if (screen === 'SevaHub') {
            navigation.navigate('SevaHub');
            return;
        }
        if (screen === 'ConnectHome') {
            navigation.navigate('ConnectHome');
        }
    }, [navigation]);

    useEffect(() => {
        const launch = resolvePortalInitialTabLaunch(route.params?.initialTab);
        if (!launch) {
            return;
        }

        if (route.params?.initialTab && !isServiceVisible(route.params.initialTab)) {
            showServiceUnavailableAlert(route.params.initialTab);
            navigation.setParams({ initialTab: undefined });
            return;
        }

        if (launch.kind === 'open_portal_tab') {
            setActiveTab(launch.tab);
        } else if (launch.kind === 'navigate') {
            navigateResolvedScreen(launch.screen);
        } else if (launch.kind === 'assistant_chat') {
            handleNewChat();
            navigation.navigate('Chat');
        } else if (launch.kind === 'open_menu') {
            setIsMenuOpen(true);
        }
        navigation.setParams({ initialTab: undefined });
    }, [route.params?.initialTab, navigation, navigateResolvedScreen, setIsMenuOpen, handleNewChat, isServiceVisible, showServiceUnavailableAlert]);

    useEffect(() => {
        if (route.params?.resetToGridAt) {
            setActiveTab(null);
            navigation.setParams({ initialTab: undefined, resetToGridAt: undefined });
        }
    }, [route.params?.resetToGridAt, navigation]);

    const backFromActiveService = useCallback(() => {
        if (route.params?.returnToWidget) {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('WidgetSelection', { source: 'widget_dock_return' });
            }
            return;
        }
        setActiveTab(null);
    }, [navigation, route.params?.returnToWidget]);

    useFocusEffect(
        useCallback(() => {
            if (!activeTab) {
                return undefined;
            }
            const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
                backFromActiveService();
                return true;
            });
            return () => subscription.remove();
        }, [activeTab, backFromActiveService]),
    );

    const handleServicePress = useCallback((serviceId: string) => {
        if (!isServiceVisible(serviceId)) {
            showServiceUnavailableAlert(serviceId);
            return;
        }
        const launch = resolveServiceLaunch(serviceId);

        if (launch.kind === 'assistant_chat') {
            handleNewChat();
            navigation.navigate('Chat');
            return;
        }

        if (launch.kind === 'open_menu') {
            setIsMenuOpen(true);
            return;
        }

        if (launch.kind === 'navigate') {
            navigateResolvedScreen(launch.screen);
            return;
        }

        if (launch.kind !== 'open_portal_tab') {
            return;
        }

        const isSeeker = (user?.role || 'user') === 'user';
        const seekerAllowedWithoutProfile = [
            'path_tracker',
            'contacts',
            'chat',
            'calls',
            'cafe',
            'shops',
            'services',
            'services_catalog',
            'connect',
            'support',
            'map',
            'news',
            'library',
            'education',
            'multimedia',
            'video_circles',
            'channels',
        ];
        const canUseWithoutCompleteProfile = isSeeker && seekerAllowedWithoutProfile.includes(serviceId);

        if (!user?.godModeEnabled && !user?.isProfileComplete && !canUseWithoutCompleteProfile) {
            Alert.alert(
                'Profile Incomplete',
                'Please complete your registration to access this service.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Complete Profile',
                        onPress: () => navigation.navigate('Registration', { isDarkMode: false, phase: 'profile' })
                    }
                ]
            );
            return;
        }
        if (EMBEDDED_PORTAL_TABS.has(launch.tab)) {
            setActiveTab(launch.tab);
        }
    }, [user, navigation, setIsMenuOpen, handleNewChat, navigateResolvedScreen, isServiceVisible, showServiceUnavailableAlert]);

    const handleLinkedCallContactPress = useCallback(() => {
        setIsMenuOpen(true);
    }, [setIsMenuOpen]);

    const LinkedCallContactIcon = MessageSquare;

    const renderContent = () => {
        const backToGrid = backFromActiveService;
        switch (activeTab) {
            case 'chat': return <PortalChatScreen />;
            default:
                return (
                    <View style={styles.fallbackContent}>
                        <Text style={styles.fallbackTitle}>Section is temporarily unavailable</Text>
                        <TouchableOpacity style={styles.fallbackButton} onPress={backToGrid}>
                            <Text style={styles.fallbackButtonText}>Back to portal</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    const renderPortalBootOverlay = () => {
        if (!isPortalBootOverlayVisible) {
            return null;
        }
        return (
            <View pointerEvents="auto" style={styles.portalBootOverlay}>
                <SplashScreen />
            </View>
        );
    };

    const shouldUsePortalStartupFastPath = Platform.OS === 'android'
        && activeTab === null
        && (!isPortalGridMounted || isPortalBootOverlayVisible || shouldShowPortalBootLoader);
    const shouldUsePortalStartupPlainChrome = Platform.OS === 'android'
        && activeTab === null
        && !shouldUsePortalStartupFastPath
        && !isPortalStartupSettled;
    const gridLayerBackgroundType = shouldUsePortalStartupPlainChrome ? 'color' : layerBackgroundType;
    const gridLayerBackground = shouldUsePortalStartupPlainChrome ? vTheme.colors.background : layerBackground;
    const gridLayerActiveWallpaper = shouldUsePortalStartupPlainChrome ? '' : layerActiveWallpaper;
    const gridLayerSlideshowEnabled = shouldUsePortalStartupPlainChrome ? false : layerSlideshowEnabled;
    const gridLayerOverlayColor = shouldUsePortalStartupPlainChrome ? 'transparent' : layerOverlayColor;
    const shouldRenderPortalHeaderBlur = portalIconStyle !== 'vedamatch'
        && androidVisualPolicy.enableBlur
        && !shouldUsePortalStartupPlainChrome;

    // Show grid view if no active tab
    if (!activeTab) {
        if (shouldUsePortalStartupFastPath) {
            return (
                <PortalBackgroundLayer
                    portalBackgroundType="color"
                    portalBackground={vTheme.colors.background}
                    activeWallpaper=""
                    isSlideshowEnabled={false}
                    fallbackColor={vTheme.colors.background}
                    isAppActive={isAppActive}
                    allowCrossfade={false}
                    crossfadeDurationMs={androidVisualPolicy.crossfadeDurationMs}
                    pauseTransitions={false}
                    overlayColor="transparent"
                >
                    <ScreenScaffold
                        variant="portal"
                        enableAura={false}
                        transparentBackground={false}
                        headerStyle={{ backgroundColor: 'transparent', borderBottomColor: 'transparent' }}
                    >
                        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
                        <View style={styles.portalStartupShell} onLayout={handlePortalFirstLayoutReady}>
                            <ActivityIndicator size="large" color={vTheme.colors.primary} />
                        </View>
                        {renderPortalBootOverlay()}
                    </ScreenScaffold>
                </PortalBackgroundLayer>
            );
        }

        return (
            <PortalBackgroundLayer
                portalBackgroundType={gridLayerBackgroundType}
                portalBackground={gridLayerBackground}
                activeWallpaper={gridLayerActiveWallpaper}
                isSlideshowEnabled={gridLayerSlideshowEnabled}
                fallbackColor={vTheme.colors.background}
                isAppActive={isAppActive}
                allowCrossfade={androidVisualPolicy.allowCrossfade}
                crossfadeDurationMs={androidVisualPolicy.crossfadeDurationMs}
                pauseTransitions={activeTab !== null}
                overlayColor={gridLayerOverlayColor}
                onBackgroundLoadError={
                    useClassicWallpaper && !shouldUsePortalStartupPlainChrome
                        ? handleWallpaperLoadError
                        : undefined
                }
            >
                <ScreenScaffold
                    variant="portal"
                    enableAura={!useClassicWallpaper && !shouldUsePortalStartupPlainChrome}
                    transparentBackground={useClassicWallpaper && !shouldUsePortalStartupPlainChrome}
                    headerStyle={{ backgroundColor: 'transparent', borderBottomColor: 'transparent' }}
                >
                <GestureDetector gesture={portalSwipeGesture}>
                <View style={styles.gridRoot}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

                {/* Header */}
                <View style={[styles.header, { backgroundColor: 'transparent' }]}>
                    <View style={styles.headerLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('InviteFriends')}
                                style={[
                                    styles.headerCircularButton,
                                    isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
                                    {
                                        backgroundColor: headerCircleSurfaceColor,
                                        borderColor: headerCircleBorderColor,
                                    },
                                ]}
                            >
                                {shouldRenderPortalHeaderBlur && (
                                    <BlurView
                                        style={StyleSheet.absoluteFill}
                                        blurType="light"
                                        blurAmount={headerBlurAmount}
                                        reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                    />
                                )}
                                <Animated.View style={{ transform: [{ scale: giftAnim }] }}>
                                    <Gift size={18} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                                </Animated.View>
                            </TouchableOpacity>
                            {isServiceVisible('video_circles') && (
                            <TouchableOpacity
                                onPress={() => handleServicePress('video_circles')}
                                activeOpacity={0.9}
                                style={[
                                    styles.headerCircularButton,
                                    isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
                                    {
                                        backgroundColor: headerCircleSurfaceColor,
                                        borderColor: headerCircleBorderColor,
                                    },
                                ]}
                            >
                                {shouldRenderPortalHeaderBlur && (
                                    <BlurView
                                        style={StyleSheet.absoluteFill}
                                        blurType="light"
                                        blurAmount={headerBlurAmount}
                                        reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                    />
                                )}
                                <Film size={16} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => openWidgetSelection('portal_header')}
                                activeOpacity={0.9}
                                style={[
                                    styles.headerCircularButton,
                                    isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
                                    {
                                        backgroundColor: headerCircleSurfaceColor,
                                        borderColor: headerCircleBorderColor,
                                    },
                                ]}
                            >
                                {shouldRenderPortalHeaderBlur && (
                                    <BlurView
                                        style={StyleSheet.absoluteFill}
                                        blurType="light"
                                        blurAmount={headerBlurAmount}
                                        reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                    />
                                )}
                                <LayoutGrid size={16} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <PortalLkmCircleButton
                                onPress={() => navigation.navigate('Wallet')}
                                size={32}
                                borderWidth={1.5}
                                backgroundColor={headerCircleSurfaceColor}
                                borderColor={headerCircleBorderColor}
                                textColor={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary}
                                showBlur={shouldRenderPortalHeaderBlur}
                                blurAmount={headerBlurAmount}
                            />
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => {
                                setIsMenuOpen(true);
                            }}
                            style={[
                                styles.headerCircularButton,
                                isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
                                {
                                    backgroundColor: headerCircleSurfaceColor,
                                    borderColor: headerCircleBorderColor,
                                },
                            ]}
                        >
                            {shouldRenderPortalHeaderBlur && (
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType="light"
                                    blurAmount={headerBlurAmount}
                                    reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                />
                            )}
                            <MessageSquare size={18} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={[
                                styles.headerCircularButton,
                                isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
                                {
                                    backgroundColor: headerCircleSurfaceColor,
                                    borderColor: headerCircleBorderColor,
                                },
                            ]}
                        >
                            {shouldRenderPortalHeaderBlur && (
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType="light"
                                    blurAmount={headerBlurAmount}
                                    reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                />
                            )}
                            <Settings size={18} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View
                            style={[
                                styles.headerCircularButton,
                                isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
                                {
                                    backgroundColor: headerCircleSurfaceColor,
                                    borderColor: headerCircleBorderColor,
                                },
                            ]}
                        >
                            {shouldRenderPortalHeaderBlur && (
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType="light"
                                    blurAmount={headerBlurAmount}
                                    reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                />
                            )}
                            <BellButton
                                size={18}
                                color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary}
                                circularStyle
                            />
                        </View>
                        {roleDescriptor && (
                            <TouchableOpacity
                                onPress={() => setShowRoleInfo(true)}
                                style={[
                                styles.headerCircularButton,
                                isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
                                {
                                    borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : (useLightHeaderIcons ? '#ffffff' : 'rgba(255, 153, 51, 0.42)'),
                                    backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : (isAndroidReducedHeaderChrome ? (useLightHeaderIcons ? 'rgba(255,255,255,0.14)' : 'rgba(250,247,240,0.92)') : 'rgba(255, 255, 255, 0.2)'),
                                }
                            ]}
                            >
                                {shouldRenderPortalHeaderBlur && (
                                    <BlurView
                                        style={StyleSheet.absoluteFill}
                                        blurType="light"
                                        blurAmount={roleBlurAmount}
                                    />
                                )}
                                {portalIconStyle !== 'vedamatch' && (
                                    <View style={[
                                        styles.roleStatusDot,
                                        { backgroundColor: roleDescriptor.highlightColor }
                                    ]} />
                                )}
                                {(() => {
                                    const role = roleDescriptor.role;
                                    const size = portalIconStyle === 'vedamatch' ? 18 : 14;
                                    const color = portalIconStyle === 'vedamatch' ? '#FFDF00' : (useLightHeaderIcons ? "#ffffff" : vTheme.colors.textSecondary);

                                    if (role === 'in_goodness') return <Leaf size={size} color={color} />;
                                    if (role === 'yogi') return <Infinity size={size} color={color} />;
                                    if (role === 'devotee') return <Heart size={size} color={color} />;
                                    return <Compass size={size} color={color} />;
                                })()}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Grid View */}
                <View style={[styles.gridContent, { backgroundColor: 'transparent' }]}>

                    {user?.godModeEnabled && !shouldUsePortalStartupPlainChrome && (
                        <GodModeFiltersPanel
                            filters={godModeFilters}
                            activeMathId={activeMathId || undefined}
                            onSelectMath={(mathId) => setActiveMath(mathId)}
                        />
                    )}
                    {seekerTravelLocked && !shouldUsePortalStartupPlainChrome && (
                        <View style={styles.lockedServiceHint}>
                            <Text style={styles.lockedServiceHintTitle}>
                                {t('portal.seekerTravelLocked.title', { defaultValue: 'Yatra will unlock after profile completion' })}
                            </Text>
                            <Text style={styles.lockedServiceHintBody}>
                                {t('portal.seekerTravelLocked.subtitle', {
                                    defaultValue: 'Complete registration to see this service in the main portal grid.',
                                })}
                            </Text>
                            <TouchableOpacity
                                style={styles.lockedServiceHintAction}
                                onPress={() => navigation.navigate('EditProfile')}
                                activeOpacity={0.88}
                            >
                                <Text style={styles.lockedServiceHintActionText}>
                                    {t('portal.seekerTravelLocked.action', {
                                        defaultValue: 'Перейти в профиль',
                                    })}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!shouldUsePortalStartupPlainChrome && (
                    <View pointerEvents="none" style={styles.pageIndicatorContainer}>
                        <View style={styles.pageIndicatorDots}>
                            <View style={[styles.pageIndicatorDot, { backgroundColor: vTheme.colors.primary }]} />
                            <View
                                style={[
                                    styles.pageIndicatorDot,
                                    {
                                        backgroundColor: effectiveBgType === 'image' && isDarkMode
                                            ? 'rgba(255,255,255,0.45)'
                                            : 'rgba(15,23,42,0.28)',
                                    },
                                ]}
                            />
                        </View>
                        <Text
                            style={[
                                styles.pageIndicatorText,
                                {
                                    color: effectiveBgType === 'image' && isDarkMode
                                        ? '#FFFFFF'
                                        : vTheme.colors.textSecondary,
                                },
                            ]}
                        >
                            {t('portal.headerHint', { defaultValue: 'Portal · swipe left for widgets' })}
                        </Text>
                    </View>
                    )}

                    <PortalGrid
                        onServicePress={handleServicePress}
                        roleHighlights={roleDescriptor?.heroServices || []}
                        godModeEnabled={!!user?.godModeEnabled}
                        activeMathLabel={godModeFilters.find((f) => f.mathId === activeMathId)?.mathName}
                        serviceBadges={{ support: supportUnreadCount }}
                        onInitialLayoutReady={handlePortalFirstLayoutReady}
                    />
                </View>

                <RoleInfoModal
                    visible={showRoleInfo}
                    title={roleDescriptor?.title || t('portal.roleFallbackTitle', { defaultValue: 'Role' })}
                    servicesHint={roleDescriptor?.servicesHint || []}
                    role={roleDescriptor?.role}
                    onClose={() => setShowRoleInfo(false)}
                    onEditRole={() => {
                        setShowRoleInfo(false);
                        navigation.navigate('EditProfile');
                    }}
                />
                {!shouldUsePortalStartupPlainChrome && <NotificationPanel />}
                {renderPortalBootOverlay()}
                </View>
                </GestureDetector>
                </ScreenScaffold>
            </PortalBackgroundLayer>
        );
    }

    // Show service content with back button
    return (
        <PortalBackgroundLayer
            portalBackgroundType={serviceLayerBackgroundType}
            portalBackground={serviceLayerBackground}
            activeWallpaper={serviceLayerActiveWallpaper}
            isSlideshowEnabled={serviceLayerSlideshowEnabled}
            fallbackColor={vTheme.colors.background}
            isAppActive={isAppActive}
            allowCrossfade={androidVisualPolicy.allowCrossfade}
            crossfadeDurationMs={androidVisualPolicy.crossfadeDurationMs}
            pauseTransitions={activeTab !== null}
            overlayColor={serviceLayerOverlayColor}
            onBackgroundLoadError={useClassicWallpaper ? handleWallpaperLoadError : undefined}
        >
            <ScreenScaffold
                variant="portal"
                enableAura={!useClassicWallpaper}
                transparentBackground={useClassicWallpaper}
                headerStyle={{
                    backgroundColor: serviceHeaderBackgroundColor,
                    borderBottomColor: serviceHeaderBorderColor,
                }}
            >
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header with back - Hidden if service manages its own header */}
            {(activeTab !== 'services') && (
                <View style={[styles.header, { backgroundColor: serviceHeaderBackgroundColor }]}>
                    <View style={styles.headerLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[
                                styles.avatarButton,
                                {
                                    backgroundColor: 'transparent',
                                }
                            ]}>
                                <TouchableOpacity
                                    onPress={backFromActiveService}
                                    style={{
                                        flex: 1,
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: 20,
                                        overflow: 'hidden',
                                        backgroundColor: useLightServiceHeaderIcons ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
                                        borderColor: useLightServiceHeaderIcons ? 'rgba(255,255,255,0.4)' : 'rgba(255, 153, 51, 0.28)',
                                        borderWidth: 1.2,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 8,
                                            },
                                            android: {
                                                elevation: 8,
                                            },
                                        }),
                                    }}
                                >
                                    {useLightServiceHeaderIcons && androidVisualPolicy.enableBlur && (
                                        <BlurView
                                            style={StyleSheet.absoluteFill}
                                            blurType={isDarkMode ? "dark" : "light"}
                                            blurAmount={backButtonBlurAmount}
                                            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                                        />
                                    )}
                                    <View style={{
                                        backgroundColor: 'transparent',
                                    }}>
                                        <List
                                            size={22}
                                            color={useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.text}
                                            strokeWidth={2.5}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('InviteFriends')}
                                style={styles.iconButton}
                            >
                                <Gift size={22} color={useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <PortalLkmCircleButton
                                onPress={() => navigation.navigate('Wallet')}
                                size={32}
                                borderWidth={1.5}
                                backgroundColor={useLightServiceHeaderIcons ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary}
                                borderColor={useLightServiceHeaderIcons ? 'rgba(255,255,255,0.4)' : 'rgba(255, 153, 51, 0.28)'}
                                textColor={useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.primary}
                                showBlur={useLightServiceHeaderIcons && androidVisualPolicy.enableBlur}
                                blurAmount={backButtonBlurAmount}
                            />
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={handleLinkedCallContactPress} style={styles.iconButton}>
                            <LinkedCallContactIcon size={22} color={useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={styles.iconButton}
                        >
                            <Settings size={22} color={useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <BellButton
                            size={22}
                            color={useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary}
                        />
                    </View>
                </View>
            )}

            {/* Content Area */}
            <View style={styles.content} onLayout={handlePortalFirstLayoutReady}>
                {renderContent()}
            </View>
            <NotificationPanel />
            {renderPortalBootOverlay()}
            </ScreenScaffold>
        </PortalBackgroundLayer>
    );
};

// Main export with provider
export const PortalMainScreen: React.FC<PortalMainProps> = ({ navigation, route }) => {
    return (
        <PortalContent navigation={navigation} route={route} />
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 15 : 20,
        paddingBottom: 8,
        zIndex: 10,
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    headerCircularButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    headerCircularButtonReduced: {
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 1,
    },
    headerRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
    },
    avatarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButton: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    portalBootOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    },
    gridContent: {
        flex: 1,
    },
    gridRoot: {
        flex: 1,
    },
    portalStartupShell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F3EA',
    },
    roleDescriptorCard: {
        marginHorizontal: 12,
        marginBottom: 10,
        marginTop: 6,
        borderWidth: 1,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        padding: 10,
    },
    roleDescriptorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    roleDescriptorTitle: {
        fontWeight: '700',
        fontSize: 14,
    },
    roleDescriptorDescription: {
        fontSize: 12,
        color: '#374151',
    },
    lockedServiceHint: {
        marginHorizontal: 14,
        marginTop: 6,
        marginBottom: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
        backgroundColor: 'rgba(20,29,44,0.38)',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    lockedServiceHintTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    lockedServiceHintBody: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 12,
        lineHeight: 16,
    },
    lockedServiceHintAction: {
        alignSelf: 'flex-start',
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.34)',
    },
    lockedServiceHintActionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    roleStatusDot: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
        opacity: 0.9,
    },
    pageIndicatorContainer: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    pageIndicatorDots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    pageIndicatorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pageIndicatorText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    fallbackContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    fallbackTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 14,
    },
    fallbackButton: {
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    fallbackButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    headerBrandText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 2,
        textShadowColor: '#8B0000',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
    },
});
