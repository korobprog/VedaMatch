import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ScrollView,
    Image,
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
import { KnowledgeBaseScreen } from './knowledge_base/KnowledgeBaseScreen';
import { useUser } from '../../context/UserContext';
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';

const { width } = Dimensions.get('window');

export const PortalMainScreen: React.FC<any> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'knowledge_base'>(route.params?.initialTab || 'contacts');



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
        { id: 'news', label: t('settings.tabs.news'), icon: '📰' },
        { id: 'knowledge_base', label: t('settings.tabs.knowledge_base'), icon: '📖' },
    ];

    // Split tabs for Left and Right of AI button
    const leftTabs = tabs.slice(0, 3);
    const rightTabs = tabs.slice(3);

    const renderContent = () => {
        switch (activeTab) {
            case 'contacts': return <ContactsScreen />;
            case 'chat': return <PortalChatScreen />;
            case 'dating': return <DatingScreen />;
            case 'shops': return <ShopsScreen />;
            case 'ads': return <AdsScreen />;
            case 'news': return <NewsScreen />;
            case 'knowledge_base': return <KnowledgeBaseScreen />;
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
                    <View style={styles.navRow}>
                        {/* Left Tabs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sideScroll} contentContainerStyle={styles.sideScrollContent}>
                            {leftTabs.map(tab => <TabButton key={tab.id} tab={tab} />)}
                        </ScrollView>

                        {/* Spacer for AI Button */}
                        <View style={styles.centerSpacer} />

                        {/* Right Tabs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sideScroll} contentContainerStyle={styles.sideScrollContent}>
                            {rightTabs.map(tab => <TabButton key={tab.id} tab={tab} />)}
                        </ScrollView>
                    </View>
                </View>

                {/* AI Button (Floating Above) */}
                <View style={styles.aiButtonContainer}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('Chat')}
                        style={styles.aiButtonTouchable}
                    >
                        <Image
                            source={require('../../assets/ai.png')}
                            style={styles.aiButtonImage}
                        />
                    </TouchableOpacity>
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
        backgroundColor: 'transparent',
        borderRadius: 35,
        overflow: 'hidden',
    },
    navRow: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sideScroll: {
        flex: 1,
    },
    sideScrollContent: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    centerSpacer: {
        width: 70, // Space for AI button
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: '100%',
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    activeIconContainer: {
        // backgroundColor: 'rgba(214, 125, 62, 0.1)',
    },
    tabIcon: {
        fontSize: 24,
        opacity: 0.5,
        color: ModernVedicTheme.colors.textSecondary,
    },
    activeTabIcon: {
        opacity: 1,
        fontSize: 26,
        color: ModernVedicTheme.colors.primary,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: ModernVedicTheme.colors.primary,
        marginTop: 4,
    },
    aiButtonContainer: {
        position: 'absolute',
        bottom: 25, // Extends above the bar
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        ...ModernVedicTheme.shadows.glow,
    },
    aiButtonTouchable: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
        overflow: 'hidden',
    },
    aiButtonImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});
