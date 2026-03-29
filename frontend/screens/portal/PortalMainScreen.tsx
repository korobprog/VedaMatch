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
import PagerView, { PageScrollStateChangedNativeEvent, PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import ServicesHomeScreen from './services/ServicesHomeScreen';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { BellButton } from '../../components/portal/BellButton';
import { NotificationPanel } from '../../components/portal/NotificationPanel';
import { PortalGrid } from '../../components/portal';
import { PortalBackgroundLayer, deriveEffectivePortalBackground } from '../../components/portal/PortalBackgroundLayer';
import { PortalQuickAccessDock } from '../../components/portal/PortalQuickAccessDock';
import { PortalLkmCircleButton } from '../../components/wallet/PortalLkmCircleButton';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { SplashScreen } from '../../components/ui/SplashScreen';
import { RoleInfoModal } from '../../components/roles/RoleInfoModal';
import { GodModeFiltersPanel } from '../../components/portal/god-mode/GodModeFiltersPanel';
import { RootStackParamList } from '../../types/navigation';
import { supportService } from '../../services/supportService';
import { datingService } from '../../services/datingService';
import { getAndroidVisualPolicy, getBlurAmountForPolicy } from '../../utils/androidVisualPolicy';
import { useChat } from '../../context/ChatContext';
import { WidgetPageContent } from '../../components/portal/widgets/WidgetPageContent';
import { PortalWorkspacePage } from '../../components/portal/portalWorkspaceConstants';
import {
    EMBEDDED_PORTAL_TABS,
    EmbeddedPortalTab,
    resolvePortalInitialTabLaunch,
    resolveServiceLaunch,
} from './serviceLaunchResolver';


type ServiceTab = EmbeddedPortalTab;
type PortalMainProps = NativeStackScreenProps<RootStackParamList, 'Portal'>;
type WidgetSelectionSource = Exclude<NonNullable<RootStackParamList['WidgetSelection']>['source'], undefined>;
type WorkspaceSwitchSource = WidgetSelectionSource | 'widget_header' | 'route_param' | 'reset_to_grid' | 'legacy_return' | 'widget_swipe';

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
    const {
        isEditMode,
        isServiceVisible,
        getServiceMaintenanceMessage,
        isLoading: isPortalLayoutLoading,
    } = usePortalLayout();
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
    const initialWorkspacePage: PortalWorkspacePage = route.params?.initialPage === 'widgets' || route.params?.returnToWidget
        ? 'widgets'
        : 'portal';
    const [activeTab, setActiveTab] = useState<ServiceTab | null>(initialServiceTab);
    const [workspacePage, setWorkspacePage] = useState<PortalWorkspacePage>(initialWorkspacePage);
    const [showRoleInfo, setShowRoleInfo] = useState(false);
    const [supportUnreadCount, setSupportUnreadCount] = useState(0);
    const [unionApprovalCount, setUnionApprovalCount] = useState(0);
    const [isPortalBootOverlayVisible, setIsPortalBootOverlayVisible] = useState(false);
    const [isPortalBackgroundReady, setIsPortalBackgroundReady] = useState(true);
    const [isPortalFirstLayoutReady, setIsPortalFirstLayoutReady] = useState(false);
    const [isPortalGridMounted, setIsPortalGridMounted] = useState(Platform.OS !== 'android');
    const [isPortalStartupSettled, setIsPortalStartupSettled] = useState(Platform.OS !== 'android');
    const [isPortalDragging, setIsPortalDragging] = useState(false);
    const [isWidgetDragging, setIsWidgetDragging] = useState(false);
    const [isWidgetPickerOpen, setIsWidgetPickerOpen] = useState(false);
    const [isPortalOverlayOpen, setIsPortalOverlayOpen] = useState(false);
    const seekerTravelLocked = (user?.role || 'user') === 'user' && !user?.godModeEnabled && !user?.isProfileComplete;
    const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
    const portalBootFinishRequestedRef = useRef(false);
    const pagerRef = useRef<PagerView>(null);
    const workspacePageRef = useRef<PortalWorkspacePage>(initialWorkspacePage);
    const activeServiceReturnPageRef = useRef<PortalWorkspacePage>(initialWorkspacePage);
    const workspaceSwitchPerfRef = useRef<{
        targetPage: PortalWorkspacePage;
        source: string;
        startedAt: number;
        selectedLogged: boolean;
        readyLogged: boolean;
    } | null>(null);
    const portalPageReadyRef = useRef(false);
    const widgetPageReadyRef = useRef(false);

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

    const logWorkspacePerfEvent = useCallback((
        phase: 'switch_start' | 'page_selected' | 'page_ready',
        targetPage: PortalWorkspacePage,
        source: WorkspaceSwitchSource,
        startedAt?: number,
    ) => {
        const prefix = targetPage === 'widgets' ? 'portal_widgets' : 'widgets_portal';
        const suffix = phase === 'switch_start'
            ? 'switch_start'
            : phase === 'page_selected'
                ? 'page_selected'
                : 'page_ready';
        const elapsedMs = typeof startedAt === 'number' ? Math.max(0, Date.now() - startedAt) : 0;
        const elapsedPart = phase === 'switch_start' ? '' : ` elapsedMs=${elapsedMs}`;
        console.log(`[${prefix}_${suffix}] source=${source}${elapsedPart}`);
    }, []);

    const markWorkspacePageReady = useCallback((page: PortalWorkspacePage) => {
        if (page === 'portal') {
            portalPageReadyRef.current = true;
        } else {
            widgetPageReadyRef.current = true;
        }
        const perf = workspaceSwitchPerfRef.current;
        if (!perf || perf.targetPage !== page || !perf.selectedLogged || perf.readyLogged) {
            return;
        }
        perf.readyLogged = true;
        logWorkspacePerfEvent('page_ready', page, perf.source as WorkspaceSwitchSource, perf.startedAt);
        workspaceSwitchPerfRef.current = null;
    }, [logWorkspacePerfEvent]);

    const applyWorkspacePage = useCallback((targetPage: PortalWorkspacePage) => {
        workspacePageRef.current = targetPage;
        setWorkspacePage(targetPage);
    }, []);

    const switchWorkspacePage = useCallback((
        targetPage: PortalWorkspacePage,
        source: WorkspaceSwitchSource,
        animated: boolean = true,
    ) => {
        const currentPage = workspacePageRef.current;
        if (currentPage === targetPage) {
            applyWorkspacePage(targetPage);
            return;
        }

        const startedAt = Date.now();
        workspaceSwitchPerfRef.current = {
            targetPage,
            source,
            startedAt,
            selectedLogged: false,
            readyLogged: false,
        };
        logWorkspacePerfEvent('switch_start', targetPage, source, startedAt);
        applyWorkspacePage(targetPage);

        const pager = pagerRef.current;
        if (pager) {
            const pageIndex = targetPage === 'widgets' ? 1 : 0;
            if (animated) {
                pager.setPage(pageIndex);
            } else {
                pager.setPageWithoutAnimation(pageIndex);
            }
        }
    }, [applyWorkspacePage, logWorkspacePerfEvent]);

    const openWidgetPage = useCallback((source: WidgetSelectionSource = 'portal_header') => {
        switchWorkspacePage('widgets', source);
    }, [switchWorkspacePage]);

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

    const refreshUnionApprovalCount = useCallback(async () => {
        if (!user?.ID || user.ID === 999999) {
            setUnionApprovalCount(0);
            return;
        }
        try {
            const payload = await datingService.getIncomingApprovalRequests({ status: 'pending', countOnly: true });
            setUnionApprovalCount(Number(payload?.count) || 0);
        } catch (error) {
            console.warn('[Portal] failed to load union approvals count:', error);
            setUnionApprovalCount(0);
        }
    }, [user?.ID]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS === 'android' && activeTab === null && !isPortalStartupSettled) {
                return undefined;
            }
            refreshSupportUnread();
            refreshUnionApprovalCount();
            return undefined;
        }, [activeTab, isPortalStartupSettled, refreshSupportUnread, refreshUnionApprovalCount])
    );

    const { effectiveBackgroundType: effectiveBgType } = useMemo(
        () => deriveEffectivePortalBackground(portalBackgroundType, portalBackground, activeWallpaper, isSlideshowEnabled),
        [portalBackgroundType, portalBackground, activeWallpaper, isSlideshowEnabled],
    );
    const useClassicWallpaper = screenVisualStyle === 'classic';
    const nonClassicPortalBackgroundType = isDarkMode ? 'color' : 'gradient';
    const nonClassicPortalBackground = isDarkMode
        ? vTheme.colors.background
        : '#F5E7CA|#E7CF9D';
    const layerBackgroundType = useClassicWallpaper ? portalBackgroundType : nonClassicPortalBackgroundType;
    const layerBackground = useClassicWallpaper ? portalBackground : nonClassicPortalBackground;
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
    const shouldUseSolidServiceHeader = false;
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
    const giftAnimatedStyle = useMemo(() => ({ transform: [{ scale: giftAnim }] }), [giftAnim]);
    const serviceScaffoldHeaderStyle = useMemo(
        () => ({
            backgroundColor: serviceHeaderBackgroundColor,
            borderBottomColor: serviceHeaderBorderColor,
        }),
        [serviceHeaderBackgroundColor, serviceHeaderBorderColor],
    );
    const serviceHeaderStyle = useMemo(
        () => [styles.header, { backgroundColor: serviceHeaderBackgroundColor }],
        [serviceHeaderBackgroundColor],
    );
    const serviceBackButtonStyle = useMemo(
        () => [
            styles.serviceBackButton,
            {
                backgroundColor: useLightServiceHeaderIcons ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
                borderColor: useLightServiceHeaderIcons ? 'rgba(255,255,255,0.4)' : 'rgba(255, 153, 51, 0.28)',
            },
        ],
        [useLightServiceHeaderIcons, vTheme.colors.backgroundSecondary],
    );
    const serviceBackIconColor = useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.text;
    const serviceHeaderIconColor = useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary;
    const serviceHeaderAccentColor = useLightServiceHeaderIcons ? '#ffffff' : vTheme.colors.primary;
    const roleButtonStyle = useMemo(
        () => [
            styles.headerCircularButton,
            isAndroidReducedHeaderChrome && styles.headerCircularButtonReduced,
            {
                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : (useLightHeaderIcons ? '#ffffff' : 'rgba(255, 153, 51, 0.42)'),
                backgroundColor: portalIconStyle === 'vedamatch'
                    ? '#121212'
                    : (isAndroidReducedHeaderChrome
                        ? (useLightHeaderIcons ? 'rgba(255,255,255,0.14)' : 'rgba(250,247,240,0.92)')
                        : 'rgba(255, 255, 255, 0.2)'),
            },
        ],
        [isAndroidReducedHeaderChrome, portalIconStyle, useLightHeaderIcons],
    );
    const pageIndicatorTextStyle = useMemo(
        () => [
            styles.pageIndicatorText,
            {
                color: effectiveBgType === 'image' && isDarkMode
                    ? '#FFFFFF'
                    : vTheme.colors.textSecondary,
            },
        ],
        [effectiveBgType, isDarkMode, vTheme.colors.textSecondary],
    );
    const { effectiveBackground: portalBootBackground, effectiveBackgroundType: portalBootBackgroundType } = useMemo(
        () => deriveEffectivePortalBackground(layerBackgroundType, layerBackground, layerActiveWallpaper, layerSlideshowEnabled),
        [layerBackgroundType, layerBackground, layerActiveWallpaper, layerSlideshowEnabled],
    );

    const handlePortalFirstLayoutReady = useCallback(() => {
        portalPageReadyRef.current = true;
        setIsPortalFirstLayoutReady(true);
        markWorkspacePageReady('portal');
    }, [markWorkspacePageReady]);

    const handleWidgetPageReady = useCallback(() => {
        widgetPageReadyRef.current = true;
        markWorkspacePageReady('widgets');
    }, [markWorkspacePageReady]);

    const handleWorkspacePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
        const selectedPage: PortalWorkspacePage = event.nativeEvent.position === 1 ? 'widgets' : 'portal';
        workspacePageRef.current = selectedPage;
        setWorkspacePage(selectedPage);
        const perf = workspaceSwitchPerfRef.current;
        if (!perf || perf.targetPage !== selectedPage || perf.selectedLogged) {
            return;
        }
        perf.selectedLogged = true;
        logWorkspacePerfEvent('page_selected', selectedPage, perf.source as WorkspaceSwitchSource, perf.startedAt);
        if ((selectedPage === 'portal' ? portalPageReadyRef.current : widgetPageReadyRef.current) && !perf.readyLogged) {
            perf.readyLogged = true;
            logWorkspacePerfEvent('page_ready', selectedPage, perf.source as WorkspaceSwitchSource, perf.startedAt);
            workspaceSwitchPerfRef.current = null;
        }
    }, [logWorkspacePerfEvent]);

    const handleWorkspacePageScrollStateChanged = useCallback((event: PageScrollStateChangedNativeEvent) => {
        const scrollState = event.nativeEvent.pageScrollState;
        if (scrollState === 'dragging' && !workspaceSwitchPerfRef.current) {
            const currentPage = workspacePageRef.current;
            const targetPage: PortalWorkspacePage = currentPage === 'portal' ? 'widgets' : 'portal';
            const source: WorkspaceSwitchSource = currentPage === 'portal' ? 'portal_swipe' : 'widget_swipe';
            const startedAt = Date.now();
            workspaceSwitchPerfRef.current = {
                targetPage,
                source,
                startedAt,
                selectedLogged: false,
                readyLogged: false,
            };
            logWorkspacePerfEvent('switch_start', targetPage, source, startedAt);
            return;
        }

        if (scrollState === 'idle') {
            const perf = workspaceSwitchPerfRef.current;
            if (perf && !perf.selectedLogged) {
                workspaceSwitchPerfRef.current = null;
            }
        }
    }, [logWorkspacePerfEvent]);

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
        if (screen === 'EkadashiCalendar') {
            navigation.navigate('EkadashiCalendar');
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
            activeServiceReturnPageRef.current = workspacePageRef.current;
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
        const targetPage = route.params?.initialPage
            || (route.params?.returnToWidget ? 'widgets' : undefined);
        if (!targetPage) {
            return;
        }

        activeServiceReturnPageRef.current = targetPage;
        if (activeTab === null) {
            switchWorkspacePage(targetPage, route.params?.returnToWidget ? 'legacy_return' : 'route_param', false);
        } else {
            applyWorkspacePage(targetPage);
        }

        navigation.setParams({
            initialPage: undefined,
            returnToWidget: undefined,
        });
    }, [activeTab, applyWorkspacePage, navigation, route.params?.initialPage, route.params?.returnToWidget, switchWorkspacePage]);

    useEffect(() => {
        if (route.params?.resetToGridAt) {
            activeServiceReturnPageRef.current = 'portal';
            applyWorkspacePage('portal');
            setActiveTab(null);
            navigation.setParams({
                initialTab: undefined,
                initialPage: undefined,
                returnToWidget: undefined,
                resetToGridAt: undefined,
            });
        }
    }, [applyWorkspacePage, navigation, route.params?.resetToGridAt]);

    useEffect(() => {
        if (activeTab !== null) {
            return;
        }
        const pager = pagerRef.current;
        if (!pager) {
            return;
        }
        pager.setPageWithoutAnimation(workspacePageRef.current === 'widgets' ? 1 : 0);
    }, [activeTab]);

    const backFromActiveService = useCallback(() => {
        const returnPage = activeServiceReturnPageRef.current || 'portal';
        applyWorkspacePage(returnPage);
        setActiveTab(null);
    }, [applyWorkspacePage]);

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
            activeServiceReturnPageRef.current = workspacePageRef.current;
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
            case 'services':
                return <ServicesHomeScreen onBack={backToGrid} />;
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
    const workspaceSwipeEnabled = activeTab === null
        && !isEditMode
        && !isPortalDragging
        && !isWidgetDragging
        && !isWidgetPickerOpen
        && !isPortalOverlayOpen;
    const isAndroidWorkspaceGestureSwipe = Platform.OS === 'android';
    const pagerScrollEnabled = isAndroidWorkspaceGestureSwipe ? false : workspaceSwipeEnabled;
    const handleAndroidWorkspaceSwipeEnd = useCallback((translationX: number, velocityX: number) => {
        if (!workspaceSwipeEnabled) {
            return;
        }

        const currentPage = workspacePageRef.current;
        const horizontalDistance = Math.abs(translationX);
        const horizontalVelocity = Math.abs(velocityX);
        const passedDistance = horizontalDistance >= 24;
        const passedVelocity = horizontalVelocity >= 240;

        if (!passedDistance && !passedVelocity) {
            return;
        }

        if (currentPage === 'portal' && translationX < 0) {
            switchWorkspacePage('widgets', 'portal_swipe');
            return;
        }

        if (currentPage === 'widgets' && translationX > 0) {
            switchWorkspacePage('portal', 'widget_swipe');
        }
    }, [switchWorkspacePage, workspaceSwipeEnabled]);
    const workspaceSwipeGesture = useMemo(() => Gesture.Pan()
        .enabled(isAndroidWorkspaceGestureSwipe && workspaceSwipeEnabled)
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .minDistance(6)
        .runOnJS(true)
        .onEnd((event) => {
            handleAndroidWorkspaceSwipeEnd(event.translationX, event.velocityX);
        }), [
        handleAndroidWorkspaceSwipeEnd,
        isAndroidWorkspaceGestureSwipe,
        workspaceSwipeEnabled,
    ]);
    const workspaceHintText = workspacePage === 'widgets'
        ? t('portal.widgets.returnHint', { defaultValue: 'Widgets · swipe right to return to portal' })
        : t('portal.headerHint', { defaultValue: 'Portal · swipe left for widgets' });
    const secondaryPageIndicatorColor = effectiveBgType === 'image' && isDarkMode
        ? 'rgba(255,255,255,0.45)'
        : 'rgba(15,23,42,0.28)';
    const activeMathLabel = godModeFilters.find((filter) => filter.mathId === activeMathId)?.mathName;
    const workspaceOrgMathBadge = useMemo(() => {
        if (!user?.godModeEnabled || !activeMathLabel) {
            return undefined;
        }
        return t('portal.orgBadge', {
            name: activeMathLabel,
            defaultValue: `Org: ${activeMathLabel}`,
        });
    }, [activeMathLabel, t, user?.godModeEnabled]);

    const handleWorkspaceTogglePress = useCallback(() => {
        if (workspacePage === 'widgets') {
            switchWorkspacePage('portal', 'widget_header');
            return;
        }
        openWidgetPage('portal_header');
    }, [openWidgetPage, switchWorkspacePage, workspacePage]);

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
                        headerStyle={styles.transparentScaffoldHeader}
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
                    headerStyle={styles.transparentScaffoldHeader}
                >
                    <View style={styles.gridRoot}>
                        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

                        <View style={[styles.header, styles.transparentBackground]}>
                            <View style={styles.headerLeft}>
                                <View style={styles.headerButtonRow}>
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
                                        <Animated.View style={giftAnimatedStyle}>
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
                                        onPress={handleWorkspaceTogglePress}
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
                                        {workspacePage === 'widgets' ? (
                                            <List size={16} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                                        ) : (
                                            <LayoutGrid size={16} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                                        )}
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
                                        handleNewChat();
                                        navigation.navigate('Chat');
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
                                        style={roleButtonStyle}
                                    >
                                        {shouldRenderPortalHeaderBlur && (
                                            <BlurView
                                                style={StyleSheet.absoluteFill}
                                                blurType="light"
                                                blurAmount={roleBlurAmount}
                                            />
                                        )}
                                        {portalIconStyle !== 'vedamatch' && (
                                            <View style={[styles.roleStatusDot, { backgroundColor: roleDescriptor.highlightColor }]} />
                                        )}
                                        {(() => {
                                            const role = roleDescriptor.role;
                                            const size = portalIconStyle === 'vedamatch' ? 18 : 14;
                                            const color = portalIconStyle === 'vedamatch' ? '#FFDF00' : (useLightHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary);

                                            if (role === 'in_goodness') return <Leaf size={size} color={color} />;
                                            if (role === 'yogi') return <Infinity size={size} color={color} />;
                                            if (role === 'devotee') return <Heart size={size} color={color} />;
                                            return <Compass size={size} color={color} />;
                                        })()}
                                    </TouchableOpacity>
                                )}
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
                            </View>
                        </View>

                        <GestureDetector gesture={workspaceSwipeGesture}>
                            <View style={[styles.gridContent, styles.transparentBackground]}>
                                <PagerView
                                    ref={pagerRef}
                                    style={styles.workspacePager}
                                    initialPage={workspacePage === 'widgets' ? 1 : 0}
                                    scrollEnabled={pagerScrollEnabled}
                                    overScrollMode="never"
                                    offscreenPageLimit={1}
                                    onPageSelected={handleWorkspacePageSelected}
                                    onPageScrollStateChanged={handleWorkspacePageScrollStateChanged}
                                >
                                    <View key="portal" style={styles.workspacePage}>
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
                                        <PortalGrid
                                            onServicePress={handleServicePress}
                                            onOpenWidgets={() => openWidgetPage('edit_toolbar')}
                                            roleHighlights={roleDescriptor?.heroServices || []}
                                            godModeEnabled={!!user?.godModeEnabled}
                                            activeMathLabel={activeMathLabel}
                                            serviceBadges={{ support: supportUnreadCount, dating: unionApprovalCount }}
                                            onInitialLayoutReady={handlePortalFirstLayoutReady}
                                            hideQuickAccessDock
                                            onDraggingStateChange={setIsPortalDragging}
                                            onBlockingOverlayChange={setIsPortalOverlayOpen}
                                        />
                                    </View>
                                    <View key="widgets" style={styles.workspacePage}>
                                        <WidgetPageContent
                                            isPickerOpen={isWidgetPickerOpen}
                                            onSetPickerOpen={setIsWidgetPickerOpen}
                                            onDraggingChange={setIsWidgetDragging}
                                            onPageReady={handleWidgetPageReady}
                                        />
                                    </View>
                                </PagerView>
                            </View>
                        </GestureDetector>

                        {!shouldUsePortalStartupPlainChrome && (
                            <PortalQuickAccessDock
                                onServicePress={handleServicePress}
                                hidden={workspacePage === 'portal' && isEditMode}
                                forceReadOnly={workspacePage === 'widgets'}
                                roleHighlights={roleDescriptor?.heroServices || []}
                                serviceBadges={{ support: supportUnreadCount, dating: unionApprovalCount }}
                                orgMathBadge={workspaceOrgMathBadge}
                            />
                        )}

                        {!shouldUsePortalStartupPlainChrome && (
                            <View pointerEvents="none" style={styles.pageIndicatorContainer}>
                                <View style={styles.pageIndicatorDots}>
                                    <View
                                        style={[
                                            styles.pageIndicatorDot,
                                            { backgroundColor: workspacePage === 'portal' ? vTheme.colors.primary : secondaryPageIndicatorColor },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.pageIndicatorDot,
                                            { backgroundColor: workspacePage === 'widgets' ? vTheme.colors.primary : secondaryPageIndicatorColor },
                                        ]}
                                    />
                                </View>
                                <Text style={pageIndicatorTextStyle}>
                                    {workspaceHintText}
                                </Text>
                            </View>
                        )}

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
                headerStyle={serviceScaffoldHeaderStyle}
            >
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header with back - Hidden if service manages its own header */}
            {(activeTab !== 'services') && (
                <View style={serviceHeaderStyle}>
                    <View style={styles.headerLeft}>
                        <View style={styles.serviceHeaderLeftRow}>
                            <View style={[
                                styles.avatarButton,
                                styles.transparentBackground,
                            ]}>
                                <TouchableOpacity
                                    onPress={backFromActiveService}
                                    style={serviceBackButtonStyle}
                                >
                                    {useLightServiceHeaderIcons && androidVisualPolicy.enableBlur && (
                                        <BlurView
                                            style={StyleSheet.absoluteFill}
                                            blurType={isDarkMode ? "dark" : "light"}
                                            blurAmount={backButtonBlurAmount}
                                            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                                        />
                                    )}
                                    <View style={styles.transparentBackground}>
                                        <List
                                            size={22}
                                            color={serviceBackIconColor}
                                            strokeWidth={2.5}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('InviteFriends')}
                                style={styles.iconButton}
                            >
                                <Gift size={22} color={serviceHeaderAccentColor} />
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
                            <LinkedCallContactIcon size={22} color={serviceHeaderIconColor} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={styles.iconButton}
                        >
                            <Settings size={22} color={serviceHeaderIconColor} />
                        </TouchableOpacity>
                        <BellButton
                            size={22}
                            color={serviceHeaderIconColor}
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
    transparentScaffoldHeader: {
        backgroundColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    transparentBackground: {
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 15 : 20,
        paddingBottom: 8,
        zIndex: 10,
        elevation: 12,
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    headerButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    serviceHeaderLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
    serviceBackButton: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 20,
        overflow: 'hidden',
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
        zIndex: 0,
        elevation: 0,
    },
    gridRoot: {
        flex: 1,
    },
    workspacePager: {
        flex: 1,
        zIndex: 0,
        elevation: 0,
    },
    workspacePage: {
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
        zIndex: 16,
        elevation: 16,
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
