import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    useColorScheme,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../components/chat/ChatConstants';
import { ContactsScreen } from './contacts/ContactsScreen';
import { PortalChatScreen } from './chat/PortalChatScreen';
import { ShopsScreen } from './shops/ShopsScreen';
import { AdsScreen } from './ads/AdsScreen';
import { NewsScreen } from './news/NewsScreen';
import { DatingScreen } from './dating/DatingScreen';

const { width } = Dimensions.get('window');

export const PortalMainScreen: React.FC<any> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const [activeTab, setActiveTab] = useState<'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news'>(route.params?.initialTab || 'contacts');

    React.useEffect(() => {
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
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'contacts': return <ContactsScreen />;
            case 'chat': return <PortalChatScreen />;
            case 'dating': return <DatingScreen />;
            case 'shops': return <ShopsScreen />;
            case 'ads': return <AdsScreen />;
            case 'news': return <NewsScreen />;
            default: return <ContactsScreen />;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header with Back button */}
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <StatusBar
                    translucent
                    backgroundColor="transparent"
                    barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                />
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: theme.text }]}>← {t('settings.title')}</Text>
                </TouchableOpacity>
            </View>

            {/* Horizontal Menu Tabs - Multi-tab layout */}
            <View style={[styles.tabBar, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id as any)}
                        style={[
                            styles.tabItem,
                            activeTab === tab.id && { borderBottomColor: theme.accent, borderBottomWidth: 2 }
                        ]}
                    >
                        <Text style={{ fontSize: 18, marginBottom: 2 }}>{tab.icon}</Text>
                        <Text
                            style={[
                                styles.tabLabel,
                                { color: activeTab === tab.id ? theme.accent : theme.subText }
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit={true}
                            minimumFontScale={0.7}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        height: 65,
        paddingHorizontal: 4,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    tabLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
    },
    content: {
        flex: 1,
    }
});
