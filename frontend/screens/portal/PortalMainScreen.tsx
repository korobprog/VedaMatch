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
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
} from 'lucide-react-native';

import { ContactsScreen } from './contacts/ContactsScreen';
import { PortalChatScreen } from './chat/PortalChatScreen';
import { MarketHomeScreen } from './shops/MarketHomeScreen';
import { AdsScreen } from './ads/AdsScreen';
import { NewsScreen } from './news/NewsScreen';
import { DatingScreen } from './dating/DatingScreen';
import { LibraryHomeScreen } from '../library/LibraryHomeScreen';
import { EducationHomeScreen } from './education/EducationHomeScreen';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';
import { CallHistoryScreen } from '../calls/CallHistoryScreen';
import { PortalLayoutProvider, usePortalLayout } from '../../context/PortalLayoutContext';
import { PortalGrid } from '../../components/portal';

const { width } = Dimensions.get('window');

type ServiceTab = 'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'calls' | 'knowledge_base' | 'library' | 'education';

// Inner component that uses portal layout context
const PortalContent: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { vTheme, isDarkMode, setIsMenuOpen, setIsPortalOpen, setDefaultMenuTab } = useSettings();
    const [activeTab, setActiveTab] = useState<ServiceTab | null>(route.params?.initialTab || null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route.params?.initialTab]);

    const handleServicePress = useCallback((serviceId: string) => {
        if (serviceId === 'settings') {
            navigation.navigate('AppSettings');
            return;
        }
        if (serviceId === 'history') {
            setDefaultMenuTab('history');
            setIsMenuOpen(true);
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
        switch (activeTab) {
            case 'contacts': return <ContactsScreen />;
            case 'chat': return <PortalChatScreen />;
            case 'calls': return <CallHistoryScreen />;
            case 'dating': return <DatingScreen />;
            case 'shops': return <MarketHomeScreen />;
            case 'ads': return <AdsScreen />;
            case 'library': return <LibraryHomeScreen />;
            case 'education': return <EducationHomeScreen />;
            case 'news': return <NewsScreen />;
            default: return null;
        }
    };

    // Show grid view if no active tab
    if (!activeTab) {
        return (
            <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={vTheme.colors.background} />

                {/* Header */}
                <View style={[styles.header, { backgroundColor: vTheme.colors.background }]}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            onPress={() => setIsPortalOpen(true)}
                            style={[styles.avatarButton, { backgroundColor: vTheme.colors.backgroundSecondary, ...vTheme.shadows.soft }]}
                        >
                            <Menu size={22} color={vTheme.colors.primary} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.logoContainer}>
                        <TouchableOpacity onPress={() => setActiveTab(null)} activeOpacity={0.7}>
                            <Image
                                source={require('../../assets/logo_tilak.png')}
                                style={[styles.logoImage, isDarkMode && { tintColor: vTheme.colors.primary }]}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => {
                                setDefaultMenuTab('history');
                                setIsMenuOpen(true);
                            }}
                            style={styles.iconButton}
                        >
                            <MessageSquare size={22} color={vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('AppSettings')}
                            style={styles.iconButton}
                        >
                            <Settings size={22} color={vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell size={22} color={vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Grid View */}
                <View style={styles.gridContent}>
                    <PortalGrid onServicePress={handleServicePress} />
                </View>

                {/* Hint text */}
                <View style={styles.hintContainer}>
                    <Text style={[styles.hintText, { color: vTheme.colors.textSecondary }]}>
                        Удерживайте для редактирования
                    </Text>
                </View>
            </View>
        );
    }

    // Show service content with back button
    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={vTheme.colors.background} />

            {/* Header with back */}
            <View style={[styles.header, { backgroundColor: vTheme.colors.background }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => setIsPortalOpen(true)}
                        style={[styles.avatarButton, { backgroundColor: vTheme.colors.backgroundSecondary, ...vTheme.shadows.soft }]}
                    >
                        <Menu size={22} color={vTheme.colors.primary} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                <View style={styles.logoContainer}>
                    <TouchableOpacity onPress={() => setActiveTab(null)} activeOpacity={0.7}>
                        <Image
                            source={require('../../assets/logo_tilak.png')}
                            style={[styles.logoImage, isDarkMode && { tintColor: vTheme.colors.primary }]}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={() => {
                            setDefaultMenuTab('history');
                            setIsMenuOpen(true);
                        }}
                        style={styles.iconButton}
                    >
                        <MessageSquare size={22} color={vTheme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AppSettings')}
                        style={styles.iconButton}
                    >
                        <Settings size={22} color={vTheme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Bell size={22} color={vTheme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {renderContent()}
            </View>
        </View>
    );
};

// Main export with provider
export const PortalMainScreen: React.FC<any> = ({ navigation, route }) => {
    return (
        <PortalLayoutProvider>
            <PortalContent navigation={navigation} route={route} />
        </PortalLayoutProvider>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 12,
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
        paddingBottom: 60,
    },
    hintContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 12,
        opacity: 0.6,
    },
});
