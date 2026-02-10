import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ScrollView,
    Alert,
    Platform,
    ImageBackground,
    Image,
    Animated,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import {
    Users,
    MessageCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    Megaphone,
    Book,
    GraduationCap,
    Newspaper,
    User,
    Bell,
    Menu,
    LayoutGrid,
    List,
    Settings,
    MessageSquare,
    Coffee,
    Utensils,
    Map,
    Gift,
    HelpCircle,
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
import { useChat } from '../../context/ChatContext';
import { CallHistoryScreen } from '../calls/CallHistoryScreen';
import { PortalLayoutProvider, usePortalLayout } from '../../context/PortalLayoutContext';
import { PortalGrid } from '../../components/portal';
import { BalancePill } from '../../components/wallet/BalancePill';
import { RoleInfoModal } from '../../components/roles/RoleInfoModal';
import { GodModeFiltersPanel } from '../../components/portal/god-mode/GodModeFiltersPanel';

// Assistant avatar images
import peacockAssistant from '../../assets/peacockAssistant.png';
import krishnaAssistant from '../../assets/krishnaAssistant.png';
import nanoBanano from '../../assets/nano_banano.png';


const { width } = Dimensions.get('window');

type ServiceTab = 'contacts' | 'chat' | 'dating' | 'cafe' | 'shops' | 'ads' | 'news' | 'calls' | 'multimedia' | 'video_circles' | 'knowledge_base' | 'library' | 'education' | 'map' | 'travel' | 'services';

// Inner component that uses portal layout context
const PortalContent: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user, roleDescriptor, godModeFilters, activeMathId, setActiveMath } = useUser();
    const { vTheme, isDarkMode, setIsMenuOpen, portalBackground, portalBackgroundType, activeWallpaper, isSlideshowEnabled, assistantType } = useSettings();
    const { handleNewChat } = useChat();

    // Animations for assistant button
    const shimmerAnim = useRef(new Animated.Value(-60)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Shimmer loop
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 60,
                duration: 2500,
                useNativeDriver: true,
            })
        ).start();

        // Ripple/Wave loop
        Animated.loop(
            Animated.timing(rippleAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const assistantImage = assistantType === 'feather2' ? nanoBanano : (assistantType === 'feather' ? peacockAssistant : krishnaAssistant);
    const [activeTab, setActiveTab] = useState<ServiceTab | null>(route.params?.initialTab || null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showRoleInfo, setShowRoleInfo] = useState(false);

    // Determine effective background values
    const effectiveBg = isSlideshowEnabled ? activeWallpaper : portalBackground;
    const effectiveBgType = isSlideshowEnabled ? 'image' : portalBackgroundType;

    const isImageBackground = effectiveBgType === 'image' && Boolean(effectiveBg);
    const isGradientBackground = effectiveBgType === 'gradient' && Boolean(effectiveBg);

    // Cross-fade animation for slideshow (double-buffer approach)
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const [displayedBg, setDisplayedBg] = useState(effectiveBg);
    const [nextBg, setNextBg] = useState<string | null>(null);
    const isTransitioning = useRef(false);

    useEffect(() => {
        if (!isSlideshowEnabled || effectiveBg === displayedBg || isTransitioning.current) return;

        // Preload image before starting transition
        const startTransition = () => {
            isTransitioning.current = true;
            setNextBg(effectiveBg);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }).start(() => {
                // First update displayed bg (bottom layer now shows new image)
                setDisplayedBg(effectiveBg);
                // Wait one frame before removing top layer to avoid flash
                requestAnimationFrame(() => {
                    setNextBg(null);
                    fadeAnim.setValue(1);
                    isTransitioning.current = false;
                });
            });
        };

        if (effectiveBg && effectiveBg.startsWith('http')) {
            Image.prefetch(effectiveBg)
                .then(() => startTransition())
                .catch(() => startTransition());
        } else {
            startTransition();
        }
    }, [effectiveBg, isSlideshowEnabled]);

    // When slideshow disabled, update immediately without animation
    useEffect(() => {
        if (!isSlideshowEnabled) {
            isTransitioning.current = false;
            setDisplayedBg(effectiveBg);
            setNextBg(null);
            fadeAnim.setValue(1);
        }
    }, [isSlideshowEnabled, effectiveBg]);

    const backgroundImageSource = useMemo(() => {
        if (!isImageBackground || !displayedBg) return undefined;
        return { uri: displayedBg, cache: 'force-cache' as const };
    }, [isImageBackground, displayedBg]);
    const nextBgSource = useMemo(() => {
        if (!nextBg) return undefined;
        return { uri: nextBg, cache: 'force-cache' as const };
    }, [nextBg]);
    const gradientColors = useMemo(() => {
        if (!isGradientBackground || !effectiveBg) return undefined;
        return effectiveBg.split('|').filter(Boolean);
    }, [isGradientBackground, effectiveBg]);

    const renderWithBackground = useCallback((children: React.ReactNode) => {
        if (isImageBackground && backgroundImageSource) {
            return (
                <View style={styles.container}>
                    <ImageBackground
                        source={backgroundImageSource}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        fadeDuration={0}
                    />
                    {nextBgSource && (
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                            <ImageBackground
                                source={nextBgSource}
                                style={StyleSheet.absoluteFill}
                                resizeMode="cover"
                                fadeDuration={0}
                            />
                        </Animated.View>
                    )}
                    <View style={styles.imageOverlay}>
                        {children}
                    </View>
                </View>
            );
        }

        if (isGradientBackground && gradientColors && gradientColors.length > 0) {
            return (
                <LinearGradient
                    colors={gradientColors}
                    style={styles.container}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {children}
                </LinearGradient>
            );
        }

        return (
            <View style={[styles.container, { backgroundColor: effectiveBg || vTheme.colors.background }]}>
                {children}
            </View>
        );
    }, [isImageBackground, backgroundImageSource, nextBgSource, fadeAnim, isGradientBackground, gradientColors, effectiveBg, vTheme.colors.background]);

    useEffect(() => {
        if (route.params?.initialTab === 'map') {
            navigation.navigate('MapGeoapify');
            // Reset params to prevent infinite loop or re-triggering
            navigation.setParams({ initialTab: null });
        } else if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route.params?.initialTab]);

    useEffect(() => {
        if (route.params?.resetToGridAt) {
            setActiveTab(null);
            navigation.setParams({ initialTab: undefined, resetToGridAt: undefined });
        }
    }, [route.params?.resetToGridAt, navigation]);

    const handleServicePress = useCallback((serviceId: string) => {
        if (serviceId === 'settings') {
            navigation.navigate('AppSettings');
            return;
        }
        if (serviceId === 'history') {
            setIsMenuOpen(true);
            return;
        }
        if (serviceId === 'map') {
            navigation.navigate('MapGeoapify');
            return;
        }
        if (serviceId === 'services') {
            navigation.navigate('ServicesHome');
            return;
        }
        if (serviceId === 'video_circles') {
            navigation.navigate('VideoCirclesScreen');
            return;
        }
        if (serviceId === 'seva') {
            navigation.navigate('SevaHub');
            return;
        }

        const isSeeker = (user?.role || 'user') === 'user';
        const seekerAllowedWithoutProfile = ['contacts', 'chat', 'calls', 'cafe', 'shops', 'services', 'map', 'news', 'library', 'education', 'multimedia', 'video_circles'];
        const canUseWithoutCompleteProfile = isSeeker && seekerAllowedWithoutProfile.includes(serviceId);

        if (!user?.isProfileComplete && !canUseWithoutCompleteProfile) {
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
        setActiveTab(serviceId as ServiceTab);
    }, [user, navigation]);

    const renderContent = () => {
        const backToGrid = () => setActiveTab(null);
        switch (activeTab) {
            case 'contacts': return <ContactsScreen />;
            case 'chat': return <PortalChatScreen />;
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
            default: return null;
        }
    };

    // Show grid view if no active tab
    if (!activeTab) {
        return renderWithBackground(
            <>
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
                                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                        borderColor: 'rgba(255, 255, 255, 0.4)',
                                    },
                                ]}
                            >
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType="light"
                                    blurAmount={12}
                                    reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                />
                                <Gift size={18} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('VideoCirclesScreen')}
                                activeOpacity={0.9}
                                style={[
                                    styles.headerCircularButton,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                        borderColor: 'rgba(255, 255, 255, 0.4)',
                                    },
                                ]}
                            >
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType="light"
                                    blurAmount={12}
                                    reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                                />
                                <Film size={16} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <BalancePill size="small" lightMode={effectiveBgType === 'image'} />
                        </View>
                    </View>

                    <View style={styles.logoContainer}>
                        {/* Assistant Button with Internal Shimmer */}
                        <View style={styles.logoRow}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    handleNewChat();
                                    navigation.navigate('Chat');
                                }}
                                style={styles.assistantHeaderButton}
                            >
                                <LinearGradient
                                    colors={[
                                        'rgba(255,255,255,0.4)',
                                        'rgba(255,230,150,0.3)',
                                        'rgba(255,255,255,0.4)',
                                    ]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />

                                <Animated.View style={[
                                    styles.assistantShimmer,
                                    {
                                        width: 100,
                                        transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [-60, 60], outputRange: [-100, 100] }) }]
                                    }
                                ]}>
                                    <LinearGradient
                                        colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>

                                <Image
                                    source={assistantImage}
                                    style={styles.assistantHeaderIcon}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>

                            <Text style={styles.headerBrandText}>
                                VEDAMATCH
                            </Text>
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
                                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                    borderColor: 'rgba(255, 255, 255, 0.4)',
                                },
                            ]}
                        >
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                            <MessageSquare size={18} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={[
                                styles.headerCircularButton,
                                {
                                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                    borderColor: 'rgba(255, 255, 255, 0.4)',
                                },
                            ]}
                        >
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                            <Settings size={18} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.headerCircularButton,
                                {
                                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                    borderColor: 'rgba(255, 255, 255, 0.4)',
                                },
                            ]}
                        >
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                            <Bell size={18} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        {roleDescriptor && (
                            <TouchableOpacity
                                onPress={() => setShowRoleInfo(true)}
                                style={[
                                    styles.headerCircularButton,
                                    {
                                        borderColor: '#ffffff',
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    }
                                ]}
                            >
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType="light"
                                    blurAmount={8}
                                />
                                <View style={[
                                    styles.roleStatusDot,
                                    { backgroundColor: roleDescriptor.highlightColor }
                                ]} />
                                {(() => {
                                    const role = roleDescriptor.role;
                                    const size = 14;
                                    const color = "#ffffff";

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

                    <PortalGrid
                        onServicePress={handleServicePress}
                        roleHighlights={roleDescriptor?.heroServices || []}
                        godModeEnabled={!!user?.godModeEnabled}
                        activeMathLabel={godModeFilters.find((f) => f.mathId === activeMathId)?.mathName}
                    />
                </View>

                {/* Hint text */}
                <View style={styles.hintContainer}>
                    <Text style={[styles.hintText, { color: effectiveBgType === 'color' && effectiveBg === '#ffffff' ? vTheme.colors.textSecondary : '#ffffff' }]}>
                        Удерживайте для редактирования
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
            </>
        );
    }

    // Show service content with back button
    return renderWithBackground(
        <>
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
                                    onPress={() => setActiveTab(null)}
                                    style={{
                                        flex: 1,
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: 20,
                                        overflow: 'hidden',
                                        backgroundColor: effectiveBgType === 'image' ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
                                        borderColor: effectiveBgType === 'image' ? 'rgba(255,255,255,0.4)' : 'transparent',
                                        borderWidth: effectiveBgType === 'image' ? 1.5 : 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    {effectiveBgType === 'image' && (
                                        <BlurView
                                            style={StyleSheet.absoluteFill}
                                            blurType={isDarkMode ? "dark" : "light"}
                                            blurAmount={10}
                                            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                                        />
                                    )}
                                    <View style={{
                                        backgroundColor: 'transparent',
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: (effectiveBgType === 'image') ? 0.5 : 0,
                                        shadowRadius: 2,
                                        elevation: (effectiveBgType === 'image') ? 5 : 0,
                                    }}>
                                        <List
                                            size={22}
                                            color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.primary}
                                            strokeWidth={2.5}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('InviteFriends')}
                                style={styles.iconButton}
                            >
                                <Gift size={22} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <BalancePill size="small" lightMode={effectiveBgType === 'image'} />
                        </View>
                    </View>

                    <View style={styles.logoContainer}>
                        {/* Logo hidden in rooms as per user request */}
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => {
                                setIsMenuOpen(true);
                            }}
                            style={styles.iconButton}
                        >
                            <MessageSquare size={22} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={styles.iconButton}
                        >
                            <Settings size={22} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell size={22} color={effectiveBgType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Content Area */}
            <View style={styles.content}>
                {renderContent()}
            </View>
        </>
    );
};

// Main export with provider
export const PortalMainScreen: React.FC<any> = ({ navigation, route }) => {
    return (
        <PortalContent navigation={navigation} route={route} />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
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
    logoContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 0, // Ensure it's interactive but centered
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: Platform.OS === 'ios' ? 7 : 12, // Precisely match side icons vertical center
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
    assistantHeaderButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.6)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
    },
    assistantHeaderIcon: {
        width: 24,
        height: 24,
    },
    assistantShimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 60,
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
    roleStatusDot: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
        opacity: 0.9,
    },
    hintContainer: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 12,
        opacity: 0.6,
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
