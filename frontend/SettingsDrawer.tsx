import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Modal,
    FlatList,
    Alert,
    Image,
    Platform,
    StatusBar
} from 'react-native';
import {
    Users,
    MessageCircle,
    Heart,
    ShoppingBag,
    Megaphone,
    Newspaper,
    Book,
    MessageSquare,
    Plus,
    Trash2,
    Settings,
    User as UserIcon,
    LogIn,
    ChevronRight,
    Sparkles
} from 'lucide-react-native';
import { useSettings } from './context/SettingsContext';
import { useUser } from './context/UserContext';
import { useChat } from './context/ChatContext';
import { getMediaUrl } from './utils/url';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

interface SettingsDrawerProps {
    isVisible: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    onSelectModel: (model: any) => void;
    currentModel: string;
    onNavigateToPortal: (tab?: 'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'knowledge_base' | 'library') => void;
    onNavigateToSettings: () => void;
    onNavigateToRegistration: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
    isVisible,
    onClose,
    isDarkMode,
    onSelectModel,
    currentModel,
    onNavigateToPortal,
    onNavigateToSettings,
    onNavigateToRegistration
}) => {
    const { fetchModels, defaultMenuTab, vTheme } = useSettings();
    const { user, isLoggedIn } = useUser();
    const { history, loadChat, deleteChat, handleNewChat, currentChatId } = useChat();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'portal' | 'history'>(defaultMenuTab);

    useEffect(() => {
        if (isVisible) {
            setActiveTab(defaultMenuTab);
        }
    }, [isVisible, defaultMenuTab]);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const theme = isDarkMode ? {
        background: '#1E1E1E',
        text: '#E0E0E0',
        border: '#333333',
        overlay: 'rgba(0,0,0,0.5)',
        sectionBg: '#2C2C2C',
        menuItemBg: '#2C2C2C'
    } : {
        background: '#FFFFFF',
        text: '#212121',
        border: '#E0E0E0',
        overlay: 'rgba(0,0,0,0.5)',
        sectionBg: '#F5F5F0',
        menuItemBg: '#F9F9F9'
    };

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
            fetchModels();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(overlayAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const renderPortalMenu = () => (
        <View style={styles.menuContainer}>
            {/* Contacts */}
            <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, ...vTheme.shadows.soft }]}
                onPress={() => onNavigateToPortal('contacts')}
            >
                <View style={styles.menuItemLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                        <Users size={22} color="#3B82F6" strokeWidth={2} />
                    </View>
                    <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>{t('settings.tabs.contacts')}</Text>
                </View>
                <ChevronRight size={18} color={vTheme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Portal Chat */}
            <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, ...vTheme.shadows.soft }]}
                onPress={() => onNavigateToPortal('chat')}
            >
                <View style={styles.menuItemLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(107, 114, 128, 0.1)' }]}>
                        <MessageCircle size={22} color={vTheme.colors.textSecondary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>{t('settings.tabs.chat')}</Text>
                </View>
                <ChevronRight size={18} color={vTheme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Dating */}
            <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, ...vTheme.shadows.soft }]}
                onPress={() => onNavigateToPortal('dating')}
            >
                <View style={styles.menuItemLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                        <Heart size={22} color="#EC4899" fill="#EC4899" strokeWidth={1} />
                    </View>
                    <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>{t('settings.tabs.dating')}</Text>
                </View>
                <ChevronRight size={18} color={vTheme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Shops */}
            <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, ...vTheme.shadows.soft }]}
                onPress={() => onNavigateToPortal('shops')}
            >
                <View style={styles.menuItemLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(214, 125, 62, 0.1)' }]}>
                        <ShoppingBag size={22} color={vTheme.colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>{t('settings.tabs.shops')}</Text>
                </View>
                <ChevronRight size={18} color={vTheme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Ads */}
            <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, ...vTheme.shadows.soft }]}
                onPress={() => onNavigateToPortal('ads')}
            >
                <View style={styles.menuItemLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        <Megaphone size={22} color="#EF4444" strokeWidth={2} />
                    </View>
                    <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>{t('settings.tabs.ads')}</Text>
                </View>
                <ChevronRight size={18} color={vTheme.colors.textSecondary} />
            </TouchableOpacity>

            {/* News */}
            <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, ...vTheme.shadows.soft }]}
                onPress={() => onNavigateToPortal('news')}
            >
                <View style={styles.menuItemLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(107, 114, 128, 0.1)' }]}>
                        <Newspaper size={22} color={vTheme.colors.textSecondary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>{t('settings.tabs.news')}</Text>
                </View>
                <ChevronRight size={18} color={vTheme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Library */}
            <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, ...vTheme.shadows.soft }]}
                onPress={() => onNavigateToPortal('library')}
            >
                <View style={styles.menuItemLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(67, 160, 71, 0.1)' }]}>
                        <Book size={22} color="#43A047" strokeWidth={2} />
                    </View>
                    <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>Библиотека</Text>
                </View>
                <ChevronRight size={18} color={vTheme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    const renderChatHistory = () => (
        <View style={styles.historyContainer}>
            <TouchableOpacity
                style={[styles.newChatButton, { backgroundColor: vTheme.colors.primary, borderColor: vTheme.colors.primary }]}
                onPress={() => {
                    handleNewChat();
                    handleClose();
                }}
            >
                <Plus size={20} color="#fff" style={{ marginRight: 10 }} strokeWidth={3} />
                <Text style={[styles.newChatButtonText, { color: '#fff' }]}>{t('chat.newChatBtn')}</Text>
            </TouchableOpacity>

            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[styles.historyItem, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity
                            style={styles.historyItemMain}
                            onPress={() => {
                                loadChat(item.id);
                                handleClose();
                            }}
                        >
                            <View style={[styles.historyIcon, { backgroundColor: vTheme.colors.background }]}>
                                <MessageSquare size={20} color={vTheme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[
                                        styles.historyItemTitle,
                                        { color: vTheme.colors.text, fontWeight: currentChatId === item.id ? 'bold' : 'normal' }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {item.title}
                                </Text>
                                <Text style={[styles.historyItemDate, { color: vTheme.colors.textSecondary }]}>
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert(
                                    t('common.confirm'),
                                    t('chat.deleteConfirm'),
                                    [
                                        { text: t('common.cancel'), style: 'cancel' },
                                        { text: t('common.delete'), style: 'destructive', onPress: () => deleteChat(item.id) }
                                    ]
                                );
                            }}
                            style={styles.deleteBtn}
                        >
                            <Trash2 size={18} color="#FF4444" />
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: theme.text, opacity: 0.5 }}>{t('chat.noHistory')}</Text>
                    </View>
                }
            />
        </View>
    );

    return (
        <Modal
            transparent
            visible={isVisible}
            onRequestClose={handleClose}
            animationType="none"
        >
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.overlay,
                        {
                            backgroundColor: theme.overlay,
                            opacity: overlayAnim
                        }
                    ]}
                >
                    <TouchableOpacity style={styles.overlayTouch} onPress={handleClose} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.drawer,
                        {
                            backgroundColor: vTheme.colors.background,
                            transform: [{ translateX: slideAnim }],
                            width: DRAWER_WIDTH
                        }
                    ]}
                >
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'history' && { borderBottomColor: vTheme.colors.primary, borderBottomWidth: 3 }]}
                            onPress={() => setActiveTab('history')}
                        >
                            <Text style={[styles.tabText, { color: vTheme.colors.text, opacity: activeTab === 'history' ? 1 : 0.5 }]}>
                                {t('chat.history')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'portal' && { borderBottomColor: vTheme.colors.primary, borderBottomWidth: 3 }]}
                            onPress={() => setActiveTab('portal')}
                        >
                            <Text style={[styles.tabText, { color: vTheme.colors.text, opacity: activeTab === 'portal' ? 1 : 0.5 }]}>
                                {t('settings.title')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {activeTab === 'history' ? renderChatHistory() : renderPortalMenu()}
                    </View>

                    {/* Footer Section */}
                    <View style={[styles.footer, { borderTopColor: vTheme.colors.divider, backgroundColor: vTheme.colors.backgroundSecondary }]}>
                        {isLoggedIn ? (
                            <View style={styles.profileSection}>
                                <View style={[styles.avatarCircle, { backgroundColor: vTheme.colors.background, borderColor: vTheme.colors.divider }]}>
                                    {user?.avatar ? (
                                        <Image source={{ uri: getMediaUrl(user.avatar) || '' }} style={styles.avatarImage} />
                                    ) : (
                                        <UserIcon size={22} color={vTheme.colors.textSecondary} />
                                    )}
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={[styles.userName, { color: vTheme.colors.text }]} numberOfLines={1}>
                                        {user?.spiritualName || user?.karmicName}
                                    </Text>
                                    <Text style={[styles.userStatus, { color: vTheme.colors.textSecondary }]}>
                                        {t('auth.profile')}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.footerButton, { backgroundColor: vTheme.colors.primary }]}
                                onPress={() => {
                                    handleClose();
                                    onNavigateToRegistration();
                                }}
                            >
                                <LogIn size={20} color="#fff" style={{ marginRight: 10 }} />
                                <Text style={[styles.footerButtonText, { color: '#fff' }]}>{t('auth.login')}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.settingsIconBtn, { backgroundColor: vTheme.colors.background, borderColor: vTheme.colors.divider, borderWidth: 1 }]}
                            onPress={() => {
                                handleClose();
                                onNavigateToSettings();
                            }}
                        >
                            <Settings size={22} color={vTheme.colors.text} />
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayTouch: {
        flex: 1,
    },
    drawer: {
        flex: 1,
        height: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 5,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    closeBtn: {
        fontSize: 24,
    },
    content: {
        flex: 1,
    },
    menuContainer: {
        flex: 1,
        padding: 16,
    },
    historyContainer: {
        flex: 1,
        padding: 16,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    newChatButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    historyItemMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    historyItemTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    historyItemDate: {
        fontSize: 12,
    },
    deleteBtn: {
        padding: 10,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    userInfo: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    userStatus: {
        fontSize: 11,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        flex: 1,
        marginRight: 10,
    },
    footerButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    settingsIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
