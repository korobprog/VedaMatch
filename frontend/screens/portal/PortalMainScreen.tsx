import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    Image,
    ImageBackground,
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
import { PortalLayoutProvider, usePortalLayout } from '../../context/PortalLayoutContext';
import { PortalGrid } from '../../components/portal';
import { BalancePill } from '../../components/wallet/BalancePill';
import { RoleInfoModal } from '../../components/roles/RoleInfoModal';
import { GodModeFiltersPanel } from '../../components/portal/god-mode/GodModeFiltersPanel';


const { width } = Dimensions.get('window');

type ServiceTab = 'contacts' | 'chat' | 'dating' | 'cafe' | 'shops' | 'ads' | 'news' | 'calls' | 'multimedia' | 'knowledge_base' | 'library' | 'education' | 'map' | 'travel' | 'services';

// Inner component that uses portal layout context
const PortalContent: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user, roleDescriptor, godModeFilters, activeMathId, setActiveMath } = useUser();
    const { vTheme, isDarkMode, setIsMenuOpen, setIsPortalOpen, portalBackground, portalBackgroundType } = useSettings();
    const [activeTab, setActiveTab] = useState<ServiceTab | null>(route.params?.initialTab || null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showRoleInfo, setShowRoleInfo] = useState(false);

    // Background wrapper as inner function
    const BackgroundWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        if (portalBackgroundType === 'image' && portalBackground) {
            return (
                <ImageBackground
                    key="bg-image"
                    source={{ uri: portalBackground }}
                    style={styles.container}
                    resizeMode="cover"
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
                        {children}
                    </View>
                </ImageBackground>
            );
        }

        if (portalBackgroundType === 'gradient' && portalBackground) {
            const colors = portalBackground.split('|');
            return (
                <LinearGradient
                    key="bg-gradient"
                    colors={colors}
                    style={styles.container}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {children}
                </LinearGradient>
            );
        }

        return (
            <View
                key="bg-color"
                style={[styles.container, { backgroundColor: portalBackground || vTheme.colors.background }]}
            >
                {children}
            </View>
        );
    };

    useEffect(() => {
        if (route.params?.initialTab === 'map') {
            navigation.navigate('MapGeoapify');
            // Reset params to prevent infinite loop or re-triggering
            navigation.setParams({ initialTab: null });
        } else if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route.params?.initialTab]);

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
        if (serviceId === 'seva') {
            navigation.navigate('SevaHub');
            return;
        }

        if (!user?.isProfileComplete) {
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
            case 'shops': return <MarketHomeScreen />;
            case 'ads': return <AdsScreen />;
            case 'library': return <LibraryHomeScreen />;
            case 'education': return <EducationHomeScreen />;
            case 'news': return <NewsScreen />;
            case 'multimedia': return <MultimediaHubScreen />;
            case 'travel': return <TravelHomeScreen />;
            case 'services': return <ServicesHomeScreen onBack={backToGrid} />;
            default: return null;
        }
    };

    // Show grid view if no active tab
    if (!activeTab) {
        return (
            <BackgroundWrapper>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

                {/* Header */}
                <View style={[styles.header, { backgroundColor: 'transparent' }]}>
                    <View style={styles.headerLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('InviteFriends')}
                                style={styles.iconButton}
                            >
                                <Gift size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <BalancePill size="small" lightMode={portalBackgroundType === 'image'} />
                        </View>
                    </View>

                    <View style={styles.logoContainer}>
                        <TouchableOpacity onPress={() => setActiveTab(null)} activeOpacity={0.7}>
                            <Image
                                source={require('../../assets/logo_tilak.png')}
                                style={[
                                    styles.logoImage,
                                    (portalBackgroundType === 'image')
                                        ? { tintColor: '#ffffff' }
                                        : (isDarkMode && { tintColor: vTheme.colors.primary })
                                ]}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerRight}>
                        {roleDescriptor && (
                            <TouchableOpacity
                                onPress={() => setShowRoleInfo(true)}
                                style={[styles.roleStatusButton, { marginRight: 4 }]}
                            >
                                <View style={[
                                    styles.roleStatusDot,
                                    { backgroundColor: roleDescriptor.highlightColor }
                                ]} />
                                {(() => {
                                    const role = roleDescriptor.role;
                                    const size = 12;
                                    const color = "#ffffff";

                                    if (role === 'in_goodness') return <Leaf size={size} color={color} />;
                                    if (role === 'yogi') return <Infinity size={size} color={color} />;
                                    if (role === 'devotee') return <Heart size={size} color={color} />;
                                    return <Compass size={size} color={color} />;
                                })()}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                setIsMenuOpen(true);
                            }}
                            style={styles.iconButton}
                        >
                            <MessageSquare size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={styles.iconButton}
                        >
                            <Settings size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
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
                    <Text style={[styles.hintText, { color: portalBackgroundType === 'color' && portalBackground === '#ffffff' ? vTheme.colors.textSecondary : '#ffffff' }]}>
                        Удерживайте для редактирования
                    </Text>
                </View>

                <RoleInfoModal
                    visible={showRoleInfo}
                    title={roleDescriptor?.title || 'Роль'}
                    servicesHint={roleDescriptor?.servicesHint || []}
                    onClose={() => setShowRoleInfo(false)}
                    onEditRole={() => {
                        setShowRoleInfo(false);
                        navigation.navigate('EditProfile');
                    }}
                />
            </BackgroundWrapper>
        );
    }

    // Show service content with back button
    return (
        <BackgroundWrapper>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header with back - Hidden if service manages its own header (like Dating) */}
            {(activeTab !== 'dating' && activeTab !== 'cafe' && activeTab !== 'services') && (
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
                                        backgroundColor: (portalBackgroundType === 'image' || isDarkMode) ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
                                        borderColor: (portalBackgroundType === 'image' || isDarkMode) ? 'rgba(255,255,255,0.4)' : 'transparent',
                                        borderWidth: (portalBackgroundType === 'image' || isDarkMode) ? 1.5 : 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    {(portalBackgroundType === 'image' || isDarkMode) && (
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
                                        shadowOpacity: (portalBackgroundType === 'image') ? 0.5 : 0,
                                        shadowRadius: 2,
                                        elevation: (portalBackgroundType === 'image') ? 5 : 0,
                                    }}>
                                        <List
                                            size={22}
                                            color={(portalBackgroundType === 'image' || isDarkMode) ? '#ffffff' : vTheme.colors.primary}
                                            strokeWidth={2.5}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('InviteFriends')}
                                style={styles.iconButton}
                            >
                                <Gift size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.primary} />
                            </TouchableOpacity>
                            <BalancePill size="small" lightMode={portalBackgroundType === 'image'} />
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
                            <MessageSquare size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={styles.iconButton}
                        >
                            <Settings size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell size={22} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Content Area */}
            <View style={styles.content}>
                {renderContent()}
            </View>
        </BackgroundWrapper>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 15 : 20,
        paddingBottom: 8,
        zIndex: 10,
    },
    logoImage: {
        width: 120,
        height: 40,
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    logoContainer: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
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
    logoWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleStatusButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    roleStatusDot: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12,
        opacity: 0.9,
    },
    roleStatusIcon: {
        // center it
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
});
