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
import { BlurView } from '@react-native-community/blur';
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

const DRAWER_WIDTH = Dimensions.get('window').width * 0.58;

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
        card: 'rgba(255,255,255,0.92)',
        border: 'rgba(15,23,42,0.14)',
        textPrimary: '#1F2937',
        textSecondary: '#64748B',
        iconSurface: 'rgba(15,23,42,0.06)',
        actionSurface: 'rgba(15,23,42,0.08)',
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
                                >
                                    <LinearGradient
                                        colors={[roleTheme.accent, roleTheme.accentStrong]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.newChatButton}
                                    >
                                        <Plus size={18} color={historyColors.textPrimary} style={styles.newChatButtonIcon} strokeWidth={3} />
                                        <Text style={[styles.newChatButtonText, { color: historyColors.textPrimary }]}>{t('chat.newChatBtn')}</Text>
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
                                                    borderColor: currentChatId === item.id ? roleColors.accentSoft : historyColors.border,
                                                },
                                            ]}
                                        >
                                            <BlurView
                                                style={styles.historyItemBlur}
                                                blurType="light"
                                                blurAmount={10}
                                                reducedTransparencyFallbackColor={historyColors.card}
                                            />
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
                                                    <MessageSquare size={18} color={roleColors.accent} />
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
                                                    <Text style={[styles.historyItemDate, { color: historyColors.textSecondary }]}>
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
                                                    style={[styles.deleteBtn, { borderColor: roleColors.danger }]}
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
        flex: 1,
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
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 14,
    },
    newChatButtonText: { fontSize: 17, fontWeight: '800' },
    newChatButtonIcon: { marginRight: 8 },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        marginBottom: 8,
        paddingHorizontal: 8,
        minHeight: 62,
        overflow: 'hidden',
    },
    historyItemBlur: {
        ...StyleSheet.absoluteFillObject,
    },
    historyItemMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    historyTextWrap: { flex: 1 },
    historyIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    historyItemTitle: { fontSize: 15, marginBottom: 1 },
    historyItemTitleActive: { fontWeight: '700' },
    historyItemTitleInactive: { fontWeight: '600' },
    historyItemDate: { fontSize: 12 },
    deleteBtn: {
        padding: 8,
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
