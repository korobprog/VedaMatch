import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    ScrollView,
    Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../components/chat/ChatConstants';
import { ContactsScreen } from './contacts/ContactsScreen';
import { PortalChatScreen } from './chat/PortalChatScreen';
import { ShopsScreen } from './shops/ShopsScreen';
import { AdsScreen } from './ads/AdsScreen';
import { NewsScreen } from './news/NewsScreen';
import { DatingScreen } from './dating/DatingScreen';
import { KnowledgeBaseScreen } from './knowledge_base/KnowledgeBaseScreen';
import { useUser } from '../../context/UserContext';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

export const PortalMainScreen: React.FC<any> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const [activeTab, setActiveTab] = useState<'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'knowledge_base'>(route.params?.initialTab || 'contacts');

    const scrollViewRef = useRef<ScrollView>(null);
    // itemWidth moved below for consistency

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

    // Static tabs
    const displayTabs = tabs;
    const itemWidth = 80; // Reduced width for closer icons

    const handleScroll = (event: any) => {
        // No circular logic needed for static tabs
    };

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

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header with Back button */}
            <View style={{
                backgroundColor: theme.header,
                borderBottomColor: theme.borderColor,
                borderBottomWidth: 1,
                height: 50,
            }}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Chat')}
                        style={styles.backButton}
                    >
                        <Text style={[styles.backText, { color: theme.text }]}>← {t('chat.history')}</Text>
                    </TouchableOpacity>

                    {/* AI Assistant Button */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Chat')}
                        style={styles.aiButton}
                    >
                        <Text style={styles.aiButtonText}>🙏 AI</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Horizontal Menu Tabs - Static layout */}
            <View style={[styles.tabBarControl, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                {/* Left indicators */}
                <View style={[styles.arrowContainer, { left: 0 }]} pointerEvents="none">
                    <Text style={[styles.arrow, { color: theme.accent, opacity: 0.6 }]}>‹</Text>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBarScroll}
                    scrollEventThrottle={16}
                >
                    {displayTabs.map((tab) => (
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
                                                onPress: () => navigation.navigate('Registration', { isDarkMode, phase: 'profile' })
                                            }
                                        ]
                                    );
                                    return;
                                }
                                setActiveTab(tab.id as any);
                            }}
                            style={[
                                styles.tabItem,
                                { width: itemWidth },
                                activeTab === tab.id && { borderBottomColor: theme.accent, borderBottomWidth: 2 }
                            ]}
                        >
                            <Text style={{ fontSize: 24, marginBottom: 2 }}>{tab.icon}</Text>
                            <Text
                                style={[
                                    styles.tabLabel,
                                    { color: activeTab === tab.id ? theme.accent : theme.subText }
                                ]}
                                numberOfLines={1}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Right indicator */}
                <View style={[styles.arrowContainer, { right: 0 }]} pointerEvents="none">
                    <Text style={[styles.arrow, { color: theme.accent, opacity: 0.6 }]}>›</Text>
                </View>
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {renderContent()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    aiButton: {
        backgroundColor: '#FF9933',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#FF9933',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    aiButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tabBarControl: {
        borderBottomWidth: 1,
        height: 70,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabBarScroll: {
        paddingHorizontal: 0,
        alignItems: 'center',
    },
    arrowContainer: {
        position: 'absolute',
        zIndex: 10,
        width: 30,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.01)', // Almost invisible but catches nothing thanks to pointerEvents none
    },
    arrow: {
        fontSize: 30,
        fontWeight: '300',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginHorizontal: 0,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
        marginTop: 4,
    },
    content: {
        flex: 1,
    }
});
