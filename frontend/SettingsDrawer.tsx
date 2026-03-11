// SettingsDrawer - Left-side drawer for settings and chat history
import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Pressable,
    FlatList,
    Alert,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Extrapolate,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    Plus,
    MessageSquare,
    Trash2,
    Square,
    CheckSquare,
    Edit3,
    X,
} from 'lucide-react-native';
import { useSettings } from './context/SettingsContext';
import { useUser } from './context/UserContext';
import { useChat } from './context/ChatContext';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { useRoleTheme } from './hooks/useRoleTheme';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

interface SettingsDrawerProps {
    isVisible: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    currentModel: string;
    onSelectModel: (model: { id: string; provider: string }) => void;
    onNavigateToSettings: () => void;
    onNavigateToRegistration: () => void;
    onNavigateToChat: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = (props) => {
    const {
        isVisible,
        onClose,
        onNavigateToChat,
    } = props;
    const {
        fetchModels,
        isDarkMode: isPortalDarkMode,
    } = useSettings();
    const { user } = useUser();
    const { history, loadChat, deleteChat, deleteChats, handleNewChat, currentChatId } = useChat();
    const { t } = useTranslation();
    const { colors: roleColors, roleTheme } = useRoleTheme(user?.role, isPortalDarkMode);
    const historyColors = React.useMemo(() => ({
        background: '#F2EFE6',
        card: 'rgba(255,252,246,0.92)',
        border: 'rgba(139,115,85,0.16)',
        textPrimary: '#1B2432',
        textSecondary: '#6C7A90',
        textMuted: '#8A94A6',
        iconSurface: 'rgba(176, 149, 113, 0.10)',
        actionSurface: 'rgba(15,23,42,0.04)',
        cardShadow: '#6C5A43',
        cardGlow: 'rgba(255,255,255,0.7)',
        newChatText: '#1A2230',
    }), []);

    const [isEditMode, setIsEditMode] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

    const drawerProgress = useSharedValue(0);

    useEffect(() => {
        if (isVisible) {
            drawerProgress.value = withTiming(1, { duration: 300 });
            fetchModels();
        } else {
            drawerProgress.value = withTiming(0, { duration: 300 });
        }
    }, [drawerProgress, fetchModels, isVisible]);

    const handleClose = () => {
        setIsEditMode(false);
        setSelectedIds([]);
        drawerProgress.value = withTiming(0, { duration: 300 });
        onClose();
    };

    const drawerAnimatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            drawerProgress.value,
            [0, 1],
            [DRAWER_WIDTH, 0],
            Extrapolate.CLAMP
        );
        return {
            transform: [{ translateX }],
        };
    });

    const backdropAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: drawerProgress.value,
        };
    });

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationX > 0) {
                drawerProgress.value = interpolate(
                    event.translationX,
                    [0, DRAWER_WIDTH],
                    [1, 0],
                    Extrapolate.CLAMP
                );
            }
        })
        .onEnd((event) => {
            if (event.translationX > 100 || event.velocityX > 500) {
                runOnJS(handleClose)();
            } else {
                drawerProgress.value = withTiming(1, { duration: 200 });
            }
        });

    return (
        <Modal transparent visible={isVisible} onRequestClose={handleClose} animationType="none">
            <GestureHandlerRootView style={styles.container}>
                {/* Overlay with Gradient */}
                <Animated.View style={[styles.overlay, backdropAnimatedStyle]}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    >
                        <Pressable style={styles.overlayTouch} onPress={handleClose} />
                    </LinearGradient>
                </Animated.View>

                {/* Drawer */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.drawer,
                            { width: DRAWER_WIDTH },
                            drawerAnimatedStyle,
                        ]}
                    >
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: historyColors.background }]} />

                        {/* Header / Tab Replacement */}
                        <View style={[styles.tabBar, { borderBottomColor: roleColors.border }]}>
                            <View style={styles.tabHeaderContent}>
                                <View style={styles.tabTitleWrap}>
                                    <Text style={[styles.tabText, { color: historyColors.textPrimary }]}>
                                        {t('chat.history')}
                                    </Text>
                                    <View style={[styles.tabAccentLine, { backgroundColor: roleColors.accent }]} />
                                </View>

                                {history.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (isEditMode) {
                                                setIsEditMode(false);
                                                setSelectedIds([]);
                                            } else {
                                                setIsEditMode(true);
                                            }
                                        }}
                                        style={[styles.headerActionBtn, { backgroundColor: historyColors.actionSurface }]}
                                    >
                                        {isEditMode ? (
                                            <X size={20} color={historyColors.textPrimary} />
                                        ) : (
                                            <Edit3 size={20} color={historyColors.textPrimary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                            <View style={styles.historyContainer}>
                                {/* New Chat Button */}
                                <TouchableOpacity
                                    onPress={() => {
                                        handleNewChat();
                                        handleClose();
                                        onNavigateToChat();
                                    }}
                                    activeOpacity={0.9}
                                    style={styles.newChatButtonWrap}
                                >
                                    <LinearGradient
                                        colors={['#F4D8A8', '#E9BC74', '#D99A4E']}
                                        start={{ x: 0, y: 0.2 }}
                                        end={{ x: 1, y: 0.8 }}
                                        style={styles.newChatButton}
                                    >
                                        <View style={styles.newChatButtonIconWrap}>
                                            <Plus size={16} color={historyColors.newChatText} style={styles.newChatButtonIcon} strokeWidth={3} />
                                        </View>
                                        <Text style={[styles.newChatButtonText, { color: historyColors.newChatText }]}>{t('chat.newChatBtn')}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Bulk Actions Bar */}
                                {isEditMode && history.length > 0 && (
                                    <View style={styles.bulkActionsContainer}>
                                        <TouchableOpacity
                                            style={styles.bulkActionItem}
                                            onPress={() => {
                                                if (selectedIds.length === history.length) {
                                                    setSelectedIds([]);
                                                } else {
                                                    setSelectedIds(history.map(h => h.id));
                                                }
                                            }}
                                        >
                                            {selectedIds.length === history.length ? (
                                                <CheckSquare size={20} color={roleColors.accent} />
                                            ) : (
                                                <Square
                                                    size={20}
                                                    color={historyColors.textSecondary}
                                                />
                                            )}
                                            <Text style={[
                                                styles.bulkActionText,
                                                { color: historyColors.textPrimary }
                                            ]}>
                                                {selectedIds.length === history.length ? t('common.deselectAll', 'Deselect all') : t('common.selectAll', 'Select all')}
                                            </Text>
                                        </TouchableOpacity>

                                        {selectedIds.length > 0 && (
                                            <TouchableOpacity
                                                style={[styles.bulkDeleteBtn, { backgroundColor: roleColors.danger + '22' }]}
                                                onPress={() => {
                                                    Alert.alert(
                                                        t('common.confirm'),
                                                        `${t('chat.deleteMultipleConfirm', 'Delete selected chats?')} (${selectedIds.length})`,
                                                        [
                                                            { text: t('common.cancel'), style: 'cancel' },
                                                            {
                                                                text: t('common.delete'),
                                                                style: 'destructive',
                                                                onPress: async () => {
                                                                    await deleteChats(selectedIds);
                                                                    setIsEditMode(false);
                                                                    setSelectedIds([]);
                                                                }
                                                            },
                                                        ]
                                                    );
                                                }}
                                            >
                                                <Trash2 size={18} color={roleColors.danger} />
                                                <Text style={[styles.bulkDeleteText, { color: roleColors.danger }]}>
                                                    {t('common.delete', 'Delete')} ({selectedIds.length})
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                {/* Chat History */}
                                <FlatList
                                    data={history}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <View
                                            style={[
                                                styles.historyItem,
                                                {
                                                    backgroundColor: historyColors.card,
                                                    borderColor: currentChatId === item.id ? 'rgba(217,154,78,0.38)' : historyColors.border,
                                                    shadowColor: currentChatId === item.id ? '#B88242' : historyColors.cardShadow,
                                                },
                                            ]}
                                        >
                                            <View style={[styles.historyItemGlow, { backgroundColor: historyColors.cardGlow }]} />
                                            {isEditMode && (
                                                <TouchableOpacity
                                                    style={styles.checkboxContainer}
                                                    onPress={() => {
                                                        setSelectedIds(prev =>
                                                            prev.includes(item.id)
                                                                ? prev.filter(id => id !== item.id)
                                                                : [...prev, item.id]
                                                        );
                                                    }}
                                                >
                                                    {selectedIds.includes(item.id) ? (
                                                        <CheckSquare size={22} color={roleColors.accent} />
                                                    ) : (
                                                        <Square size={22} color={roleColors.textSecondary} />
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={styles.historyItemMain}
                                                onPress={() => {
                                                    if (isEditMode) {
                                                        setSelectedIds(prev =>
                                                            prev.includes(item.id)
                                                                ? prev.filter(id => id !== item.id)
                                                                : [...prev, item.id]
                                                        );
                                                    } else {
                                                        loadChat(item.id);
                                                        handleClose();
                                                        onNavigateToChat();
                                                    }
                                                }}
                                            >
                                                <View style={[styles.historyIcon, { backgroundColor: historyColors.iconSurface }]}>
                                                    <MessageSquare size={18} color={currentChatId === item.id ? '#B56D23' : roleColors.accent} />
                                                </View>
                                                <View style={styles.historyTextWrap}>
                                                    <Text
                                                        style={[
                                                            styles.historyItemTitle,
                                                            currentChatId === item.id ? styles.historyItemTitleActive : styles.historyItemTitleInactive,
                                                            { color: historyColors.textPrimary },
                                                        ]}
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {item.title}
                                                    </Text>
                                                    <Text style={[styles.historyItemDate, { color: currentChatId === item.id ? historyColors.textSecondary : historyColors.textMuted }]}>
                                                        {new Date(item.timestamp).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                            {!isEditMode && (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Alert.alert(t('common.confirm'), t('chat.deleteConfirm'), [
                                                            { text: t('common.cancel'), style: 'cancel' },
                                                            { text: t('common.delete'), style: 'destructive', onPress: () => deleteChat(item.id) },
                                                        ]);
                                                    }}
                                                    style={[styles.deleteBtn, { backgroundColor: 'rgba(255,255,255,0.62)', borderColor: 'rgba(239,68,68,0.16)' }]}
                                                >
                                                    <Trash2 size={16} color={roleColors.danger} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.emptyContainer}>
                                            <MessageSquare size={34} color={historyColors.textSecondary} />
                                            <Text style={[styles.emptyText, { color: historyColors.textSecondary }]}>{t('chat.noHistory')}</Text>
                                        </View>
                                    }
                                />
                            </View>
                        </View>

                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'row' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    overlayTouch: { flex: 1 },
    drawer: {
        height: '100%',
        backgroundColor: '#F2EFE6',
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: -6, height: 0 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
        elevation: 16,
    },
    tabBar: {
        minHeight: 76,
        justifyContent: 'flex-end',
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'ios' ? 44 : 18,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    tabTitleWrap: { alignItems: 'center' },
    tabText: {
        fontSize: 24,
        fontWeight: '800',
        textShadowColor: 'rgba(0, 0, 0, 0.18)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    tabAccentLine: { marginTop: 8, width: 82, height: 3, borderRadius: 999 },
    content: { flex: 1 },
    historyContainer: { flex: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
    newChatButtonWrap: {
        alignSelf: 'flex-start',
        marginBottom: 14,
        borderRadius: 18,
        shadowColor: '#A66C27',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 5,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    newChatButtonText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
    newChatButtonIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.28)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.32)',
    },
    newChatButtonIcon: { marginRight: 0 },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 13,
        minHeight: 66,
        borderWidth: 1,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 4,
    },
    historyItemGlow: {
        position: 'absolute',
        left: 14,
        right: 14,
        top: 0,
        height: 1,
        opacity: 0.9,
    },
    historyItemMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    historyTextWrap: { flex: 1 },
    historyIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(176, 149, 113, 0.10)',
    },
    historyItemTitle: { fontSize: 17, marginBottom: 2, letterSpacing: -0.2 },
    historyItemTitleActive: { fontWeight: '800' },
    historyItemTitleInactive: { fontWeight: '700' },
    historyItemDate: { fontSize: 13, fontWeight: '500' },
    deleteBtn: {
        padding: 8,
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { opacity: 0.8, marginTop: 10 },
    menuContainer: { flex: 1, padding: 16 },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    menuItemText: { fontSize: 16, fontWeight: '500' },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    profileSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    userInfo: { marginLeft: 14, flex: 1 },
    userName: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
    userStatus: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
    footerButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, flex: 1, marginRight: 12 },
    footerButtonText: { fontSize: 16, fontWeight: '700' },
    settingsIconBtn: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
    tabHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    headerActionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(139,115,85,0.08)',
        shadowColor: '#6C5A43',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    checkboxContainer: {
        paddingRight: 10,
        justifyContent: 'center',
    },
    bulkActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    bulkActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    bulkActionText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.18)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    bulkDeleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    bulkDeleteText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '700',
    },
});
