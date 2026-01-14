import React, { useState, useRef, useEffect } from 'react';
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
    Bell
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
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';
import { CallHistoryScreen } from '../calls/CallHistoryScreen';

const { width } = Dimensions.get('window');

export const PortalMainScreen: React.FC<any> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'calls' | 'knowledge_base' | 'library' | 'education'>(route.params?.initialTab || 'contacts');

    useEffect(() => {
        if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route.params?.initialTab]);

    const tabs = [
        { id: 'contacts', label: t('settings.tabs.contacts'), icon: 'Users' },
        { id: 'chat', label: t('settings.tabs.chat'), icon: 'MessageCircle' },
        { id: 'calls', label: t('settings.tabs.calls') || 'Звонки', icon: 'Phone' },
        { id: 'dating', label: t('settings.tabs.dating'), icon: 'Sparkles' },
        { id: 'shops', label: t('settings.tabs.shops'), icon: 'ShoppingBag' },
        { id: 'ads', label: t('settings.tabs.ads'), icon: 'Megaphone' },
        { id: 'library', label: 'Библиотека', icon: 'Book' },
        { id: 'education', label: 'Обучение', icon: 'GraduationCap' },
        { id: 'news', label: t('settings.tabs.news'), icon: 'Newspaper' },
    ];


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
            default: return <ContactsScreen />;
        }
    };

    const TabButton = ({ tab }: { tab: any }) => {
        const isActive = activeTab === tab.id;

        const renderIcon = (iconName: string, active: boolean) => {
            const size = active ? 28 : 24;
            const color = active ? ModernVedicTheme.colors.primary : ModernVedicTheme.colors.text;
            const opacity = active ? 1 : 0.7;

            switch (iconName) {
                case 'Users': return <Users size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                case 'MessageCircle': return <MessageCircle size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                case 'Phone': return <Phone size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                case 'Sparkles': return <Sparkles size={size} color={color} style={{ opacity }} fill={active ? color : 'transparent'} strokeWidth={active ? 1.5 : 2} />;
                case 'ShoppingBag': return <ShoppingBag size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                case 'Megaphone': return <Megaphone size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                case 'Book': return <Book size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                case 'GraduationCap': return <GraduationCap size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                case 'Newspaper': return <Newspaper size={size} color={color} style={{ opacity }} strokeWidth={active ? 2.5 : 2} />;
                default: return <Users size={size} color={color} />;
            }
        };

        return (
            <TouchableOpacity
                key={tab.id}
                onPress={() => {
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
                    setActiveTab(tab.id as any);
                }}
                style={styles.tabItem}
            >
                <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                    {renderIcon(tab.icon, isActive)}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={ModernVedicTheme.colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {/* User Avatar Placeholder or Back */}
                    <TouchableOpacity
                        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Chat')}
                        style={styles.avatarButton}
                    >
                        <User size={20} color={ModernVedicTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <Image
                    source={require('../../assets/logo_tilak.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Bell size={22} color={ModernVedicTheme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {renderContent()}
            </View>

            {/* Floating Bottom Navigation */}
            <View style={styles.bottomNavContainer}>
                {/* Glassmorphic Background */}
                <View style={styles.glassBackground}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.sideScroll}
                        contentContainerStyle={styles.sideScrollContent}
                    >
                        {tabs.map(tab => <TabButton key={tab.id} tab={tab} />)}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ModernVedicTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 20,
        backgroundColor: ModernVedicTheme.colors.background,
        zIndex: 10,
    },
    logoImage: {
        width: 120,
        height: 40,
    },
    headerLeft: {
        width: 40,
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
    },
    avatarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: ModernVedicTheme.colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        ...ModernVedicTheme.shadows.soft,
    },
    iconButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        paddingBottom: 100, // Space for bottom nav
    },
    bottomNavContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        elevation: 20,
    },
    glassBackground: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: ModernVedicTheme.colors.glass,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.glassBorder,
        overflow: 'hidden',
        ...ModernVedicTheme.shadows.soft,
    },
    sideScroll: {
        flex: 1,
    },
    sideScrollContent: {
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
        height: '100%',
    },
    iconContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    activeIconContainer: {
        backgroundColor: 'rgba(214, 125, 62, 0.1)',
        borderWidth: 2,
        borderColor: ModernVedicTheme.colors.primary,
    },
    tabIcon: {
        fontSize: 26,
        opacity: 0.5,
        color: ModernVedicTheme.colors.textSecondary,
    },
});
