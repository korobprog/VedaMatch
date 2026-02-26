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

import { ContactsScreen } from './contacts/ContactsScreen';
import { PortalChatScreen } from './chat/PortalChatScreen';
import { MarketHomeScreen } from './shops/MarketHomeScreen';
import { AdsScreen } from './ads/AdsScreen';
import { NewsScreen } from './news/NewsScreen';
import { DatingScreen } from './dating/DatingScreen';
import { LibraryHomeScreen } from '../library/LibraryHomeScreen';
import { EducationHomeScreen } from './education/EducationHomeScreen';
import { CafeListScreen } from './cafe';
import { MultimediaHubScreen } from '../multimedia/MultimediaHubScreen';
import { TravelHomeScreen } from './travel';
import { ServicesHomeScreen } from './services';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';
import { CallHistoryScreen } from '../calls/CallHistoryScreen';
import { BellButton } from '../../components/portal/BellButton';
import { NotificationPanel } from '../../components/portal/NotificationPanel';
import { PortalGrid } from '../../components/portal';
import { PortalBackgroundLayer, deriveEffectivePortalBackground } from '../../components/portal/PortalBackgroundLayer';
import { PortalLkmCircleButton } from '../../components/wallet/PortalLkmCircleButton';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
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
    useTranslation();
    const { handleNewChat } = useChat();
    const { user, roleDescriptor, godModeFilters, activeMathId, setActiveMath } = useUser();
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
    const seekerTravelLocked = (user?.role || 'user') === 'user' && !user?.godModeEnabled && !user?.isProfileComplete;
    const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
    const widgetNavLockRef = useRef(false);
    const widgetNavUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!user?.ID) {
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
            refreshSupportUnread();
        }, [refreshSupportUnread])
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
    const useLightHeaderIcons = isDarkMode && effectiveBgType === 'image';
    const failedWallpaperSetRef = useRef<Set<string>>(new Set());
    const giftAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!androidVisualPolicy.allowGiftPulse || !isAppActive || activeTab !== null) {
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
    }, [giftAnim, androidVisualPolicy.allowGiftPulse, isAppActive, activeTab]);

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
        if (screen === 'PathTrackerHome') {
            navigation.navigate('PathTrackerHome');
            return;
        }
        if (screen === 'ChannelsHub') {
            navigation.navigate('ChannelsHub');
            return;
        }
        if (screen === 'VideoCirclesScreen') {
            navigation.navigate('VideoCirclesScreen');
            return;
        }
        if (screen === 'SevaHub') {
            navigation.navigate('SevaHub');
        }
    }, [navigation]);

    useEffect(() => {
        const launch = resolvePortalInitialTabLaunch(route.params?.initialTab);
        if (!launch) {
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
    }, [route.params?.initialTab, navigation, navigateResolvedScreen, setIsMenuOpen, handleNewChat]);

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
    }, [user, navigation, setIsMenuOpen, handleNewChat, navigateResolvedScreen]);

    const renderContent = () => {
        const backToGrid = backFromActiveService;
        switch (activeTab) {
            case 'contacts': return <ContactsScreen />;
            case 'chat': return <PortalChatScreen />;
            case 'rooms': return <PortalChatScreen />;
            case 'calls': return <CallHistoryScreen />;
            case 'dating': return <DatingScreen onBack={backToGrid} />;
            case 'cafe': return <CafeListScreen onBack={backToGrid} />;
            case 'shops': return <MarketHomeScreen onBack={backToGrid} />;
            case 'ads': return <AdsScreen />;
            case 'library': return <LibraryHomeScreen />;
            case 'education': return <EducationHomeScreen />;
            case 'news': return <NewsScreen />;
            case 'multimedia': return <MultimediaHubScreen onBack={backToGrid} />;
            case 'travel': return <TravelHomeScreen />;
            case 'services': return <ServicesHomeScreen onBack={backToGrid} />;
            default:
                return (
                    <View style={styles.fallbackContent}>
                        <Text style={styles.fallbackTitle}>Раздел временно недоступен</Text>
                        <TouchableOpacity style={styles.fallbackButton} onPress={backToGrid}>
                            <Text style={styles.fallbackButtonText}>Вернуться на портал</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    // Show grid view if no active tab
    if (!activeTab) {
        return (
            <PortalBackgroundLayer
                portalBackgroundType={layerBackgroundType}
                portalBackground={layerBackground}
                activeWallpaper={layerActiveWallpaper}
                isSlideshowEnabled={layerSlideshowEnabled}
                fallbackColor={vTheme.colors.background}
                isAppActive={isAppActive}
                allowCrossfade={androidVisualPolicy.allowCrossfade}
                crossfadeDurationMs={androidVisualPolicy.crossfadeDurationMs}
                pauseTransitions={activeTab !== null}
                overlayColor={layerOverlayColor}
                onBackgroundLoadError={useClassicWallpaper ? handleWallpaperLoadError : undefined}
            >
                <ScreenScaffold
                    variant="portal"
                    enableAura={!useClassicWallpaper}
                    transparentBackground={useClassicWallpaper}
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
                                    {
                                        backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                        borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                                    },
                                ]}
                            >
                                {portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur && (
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
                            <TouchableOpacity
                                onPress={() => navigation.navigate('VideoCirclesScreen')}
                                activeOpacity={0.9}
                                style={[
                                    styles.headerCircularButton,
                                    {
                                        backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                        borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                                    },
                                ]}
                            >
                                {portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur && (
                                    <BlurView
                                        style={StyleSheet.absoluteFill}
                                        blurType="light"
                                        blurAmount={headerBlurAmount}
                                        reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                    />
                                )}
                                <Film size={16} color={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => openWidgetSelection('portal_header')}
                                activeOpacity={0.9}
                                style={[
                                    styles.headerCircularButton,
                                    {
                                        backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                        borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                                    },
                                ]}
                            >
                                {portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur && (
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
                                backgroundColor={portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)'}
                                borderColor={portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)'}
                                textColor={portalIconStyle === 'vedamatch' ? '#FFDF00' : useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary}
                                showBlur={portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur}
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
                                {
                                    backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                    borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                                },
                            ]}
                        >
                            {portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur && (
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
                                {
                                    backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                    borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                                },
                            ]}
                        >
                            {portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur && (
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
                                {
                                    backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                    borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                                },
                            ]}
                        >
                            {portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur && (
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
                                    {
                                        borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : (useLightHeaderIcons ? '#ffffff' : 'rgba(255, 153, 51, 0.42)'),
                                        backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.2)',
                                    }
                                ]}
                            >
                                {portalIconStyle !== 'vedamatch' && androidVisualPolicy.enableBlur && (
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

                    {user?.godModeEnabled && (
                        <GodModeFiltersPanel
                            filters={godModeFilters}
                            activeMathId={activeMathId || undefined}
                            onSelectMath={(mathId) => setActiveMath(mathId)}
                        />
                    )}
                    {seekerTravelLocked && (
                        <View style={styles.lockedServiceHint}>
                            <Text style={styles.lockedServiceHintTitle}>Ятра откроется после завершения профиля</Text>
                            <Text style={styles.lockedServiceHintBody}>Завершите регистрацию, чтобы увидеть сервис в основной сетке портала.</Text>
                        </View>
                    )}

                    <PortalGrid
                        onServicePress={handleServicePress}
                        roleHighlights={roleDescriptor?.heroServices || []}
                        godModeEnabled={!!user?.godModeEnabled}
                        activeMathLabel={godModeFilters.find((f) => f.mathId === activeMathId)?.mathName}
                        serviceBadges={{ support: supportUnreadCount }}
                    />
                </View>

                {/* Hint text */}
                <View style={styles.pageIndicatorContainer}>
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
                        Портал · свайп влево для виджетов
                    </Text>
                </View>

                <RoleInfoModal
                    visible={showRoleInfo}
                    title={roleDescriptor?.title || 'Роль'}
                    servicesHint={roleDescriptor?.servicesHint || []}
                    role={roleDescriptor?.role}
                    onClose={() => setShowRoleInfo(false)}
                    onEditRole={() => {
                        setShowRoleInfo(false);
                        navigation.navigate('EditProfile');
                    }}
                />
                <NotificationPanel />
                </View>
                </GestureDetector>
                </ScreenScaffold>
            </PortalBackgroundLayer>
        );
    }

    // Show service content with back button
    return (
        <PortalBackgroundLayer
            portalBackgroundType={layerBackgroundType}
            portalBackground={layerBackground}
            activeWallpaper={layerActiveWallpaper}
            isSlideshowEnabled={layerSlideshowEnabled}
            fallbackColor={vTheme.colors.background}
            isAppActive={isAppActive}
            allowCrossfade={androidVisualPolicy.allowCrossfade}
            crossfadeDurationMs={androidVisualPolicy.crossfadeDurationMs}
            pauseTransitions={activeTab !== null}
            overlayColor={layerOverlayColor}
            onBackgroundLoadError={useClassicWallpaper ? handleWallpaperLoadError : undefined}
        >
            <ScreenScaffold
                variant="portal"
                enableAura={!useClassicWallpaper}
                transparentBackground={useClassicWallpaper}
            >
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header with back - Hidden if service manages its own header (like Dating) */}
            {(activeTab !== 'dating' && activeTab !== 'cafe' && activeTab !== 'services' && activeTab !== 'shops' && activeTab !== 'multimedia') && (
                <View style={[styles.header, { backgroundColor: 'transparent' }]}>
                    <View style={styles.headerLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[
                                styles.avatarButton,
                                {
                                    backgroundColor: 'transparent',
                                    ...Platform.select({
                                        ios: {
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                        },
                                        android: {
                                            elevation: 8,
                                        }
                                    })
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
                                        backgroundColor: useLightHeaderIcons ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
                                        borderColor: useLightHeaderIcons ? 'rgba(255,255,255,0.4)' : 'rgba(255, 153, 51, 0.28)',
                                        borderWidth: 1.2,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    {useLightHeaderIcons && androidVisualPolicy.enableBlur && (
                                        <BlurView
                                            style={StyleSheet.absoluteFill}
                                            blurType={isDarkMode ? "dark" : "light"}
                                            blurAmount={backButtonBlurAmount}
                                            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                                        />
                                    )}
                                    <View style={{
                                        backgroundColor: 'transparent',
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: (useLightHeaderIcons) ? 0.5 : 0,
                                        shadowRadius: 2,
                                        elevation: (useLightHeaderIcons) ? 5 : 0,
                                    }}>
                                        <List
                                            size={22}
                                            color={useLightHeaderIcons ? '#ffffff' : vTheme.colors.text}
                                            strokeWidth={2.5}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('InviteFriends')}
                                style={styles.iconButton}
                            >
                                <Gift size={22} color={useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <PortalLkmCircleButton
                                onPress={() => navigation.navigate('Wallet')}
                                size={32}
                                borderWidth={1.5}
                                backgroundColor={useLightHeaderIcons ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary}
                                borderColor={useLightHeaderIcons ? 'rgba(255,255,255,0.4)' : 'rgba(255, 153, 51, 0.28)'}
                                textColor={useLightHeaderIcons ? '#ffffff' : vTheme.colors.primary}
                                showBlur={useLightHeaderIcons && androidVisualPolicy.enableBlur}
                                blurAmount={backButtonBlurAmount}
                            />
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => {
                                setIsMenuOpen(true);
                            }}
                            style={styles.iconButton}
                        >
                            <MessageSquare size={22} color={useLightHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={styles.iconButton}
                        >
                            <Settings size={22} color={useLightHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <BellButton
                            size={22}
                            color={useLightHeaderIcons ? '#ffffff' : vTheme.colors.textSecondary}
                        />
                    </View>
                </View>
            )}

            {/* Content Area */}
            <View style={styles.content}>
                {renderContent()}
            </View>
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
    gridContent: {
        flex: 1,
    },
    gridRoot: {
        flex: 1,
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
    roleStatusDot: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
        opacity: 0.9,
    },
    pageIndicatorContainer: {
        position: 'absolute',
        bottom: 116,
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
