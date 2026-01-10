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
} from 'react-native';
import { useTranslation } from 'react-i18next';



import { ContactsScreen } from './contacts/ContactsScreen';
import { PortalChatScreen } from './chat/PortalChatScreen';
import { ShopsScreen } from './shops/ShopsScreen';
import { AdsScreen } from './ads/AdsScreen';
import { NewsScreen } from './news/NewsScreen';
import { DatingScreen } from './dating/DatingScreen';
import { LibraryHomeScreen } from '../library/LibraryHomeScreen';
import { useUser } from '../../context/UserContext';
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';

const { width } = Dimensions.get('window');

export const PortalMainScreen: React.FC<any> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'knowledge_base' | 'library'>(route.params?.initialTab || 'contacts');



    useEffect(() => {
        if (route.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route.params?.initialTab]);





    const tabs = [
        { id: 'contacts', label: t('settings.tabs.contacts'), icon: '👥' },
        { id: 'chat', label: t('settings.tabs.chat'), icon: '💬' },
        { id: 'dating', label: t('settings.tabs.dating'), icon: '💖' },
        { id: 'shops', label: t('settings.tabs.shops'), icon: '🛍️' },
        { id: 'ads', label: t('settings.tabs.ads'), icon: '📢' },
        { id: 'library', label: 'Библиотека', icon: '📚' },
        { id: 'news', label: t('settings.tabs.news'), icon: '📰' },
    ];


    const renderContent = () => {
        switch (activeTab) {
            case 'contacts': return <ContactsScreen />;
            case 'chat': return <PortalChatScreen />;
            case 'dating': return <DatingScreen />;
            case 'shops': return <ShopsScreen />;
            case 'ads': return <AdsScreen />;
            case 'library': return <LibraryHomeScreen />;
            case 'news': return <NewsScreen />;
            default: return <ContactsScreen />;
        }
    };

    const TabButton = ({ tab }: { tab: any }) => {
        const isActive = activeTab === tab.id;
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
                    <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>{tab.icon}</Text>
                </View>
                {isActive && <View style={styles.activeDot} />}
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
                        <Text style={{ fontSize: 20 }}>👤</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.headerTitle}>MAIN PORTAL</Text>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Text style={{ fontSize: 20 }}>🔔</Text>
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
    headerTitle: {
        fontFamily: ModernVedicTheme.typography.subHeader.fontFamily, // Cinzel
        fontSize: ModernVedicTheme.typography.subHeader.fontSize,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.primary,
        letterSpacing: 1.5,
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
        backgroundColor: 'rgba(214, 125, 62, 0.15)',
    },
    tabIcon: {
        fontSize: 26,
        opacity: 0.5,
        color: ModernVedicTheme.colors.textSecondary,
    },
    activeTabIcon: {
        opacity: 1,
        fontSize: 28,
        color: ModernVedicTheme.colors.primary,
    },
    activeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: ModernVedicTheme.colors.primary,
        marginTop: 2,
    },
});
