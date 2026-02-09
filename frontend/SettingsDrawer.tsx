// SettingsDrawer - Left-side drawer for settings and chat history
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Pressable,
    FlatList,
    Image,
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
    User,
    LogIn,
    Settings,
} from 'lucide-react-native';
import { useSettings } from './context/SettingsContext';
import { useUser } from './context/UserContext';
import { useChat } from './context/ChatContext';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { getMediaUrl } from './utils/url';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.8;

interface SettingsDrawerProps {
    isVisible: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    currentModel: string;
    onSelectModel: (model: { id: string; provider: string }) => void;
    onNavigateToSettings: () => void;
    onNavigateToRegistration: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
    isVisible,
    onClose,
    isDarkMode,
    currentModel,
    onSelectModel,
    onNavigateToSettings,
    onNavigateToRegistration,
}) => {
    const { fetchModels, vTheme } = useSettings();
    const { user, isLoggedIn, roleDescriptor } = useUser();
    const { history, loadChat, deleteChat, handleNewChat, currentChatId } = useChat();
    const { t } = useTranslation();

    const drawerProgress = useSharedValue(0);

    useEffect(() => {
        if (isVisible) {
            drawerProgress.value = withTiming(1, { duration: 300 });
            fetchModels();
        } else {
            drawerProgress.value = withTiming(0, { duration: 300 });
        }
    }, [isVisible]);

    const handleClose = () => {
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
                            { backgroundColor: vTheme.colors.background, width: DRAWER_WIDTH },
                            drawerAnimatedStyle,
                        ]}
                    >
                        {/* Header / Tab Replacement */}
                        <View style={styles.tabBar}>
                            <View style={[styles.tab, { borderBottomColor: vTheme.colors.primary, borderBottomWidth: 3 }]}>
                                <Text style={[styles.tabText, { color: vTheme.colors.text }]}>
                                    {t('chat.history')}
                                </Text>
                            </View>
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                            <View style={styles.historyContainer}>
                                {/* New Chat Button */}
                                <TouchableOpacity
                                    style={[styles.newChatButton, { backgroundColor: vTheme.colors.primary }]}
                                    onPress={() => { handleNewChat(); handleClose(); }}
                                >
                                    <Plus size={20} color="#fff" style={{ marginRight: 10 }} strokeWidth={3} />
                                    <Text style={styles.newChatButtonText}>{t('chat.newChatBtn')}</Text>
                                </TouchableOpacity>

                                {/* Chat History */}
                                <FlatList
                                    data={history}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <View style={[styles.historyItem, { borderBottomColor: vTheme.colors.divider }]}>
                                            <TouchableOpacity
                                                style={styles.historyItemMain}
                                                onPress={() => { loadChat(item.id); handleClose(); }}
                                            >
                                                <View style={[styles.historyIcon, { backgroundColor: vTheme.colors.background }]}>
                                                    <MessageSquare size={20} color={vTheme.colors.primary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text
                                                        style={[styles.historyItemTitle, { color: vTheme.colors.text, fontWeight: currentChatId === item.id ? 'bold' : 'normal' }]}
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
                                                    Alert.alert(t('common.confirm'), t('chat.deleteConfirm'), [
                                                        { text: t('common.cancel'), style: 'cancel' },
                                                        { text: t('common.delete'), style: 'destructive', onPress: () => deleteChat(item.id) },
                                                    ]);
                                                }}
                                                style={styles.deleteBtn}
                                            >
                                                <Trash2 size={18} color="#FF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.emptyContainer}>
                                            <Text style={{ color: vTheme.colors.textSecondary, opacity: 0.5 }}>{t('chat.noHistory')}</Text>
                                        </View>
                                    }
                                />
                            </View>
                        </View>

                        {/* Footer */}
                        <View style={[styles.footer, { borderTopColor: vTheme.colors.divider, backgroundColor: vTheme.colors.backgroundSecondary }]}>
                            {isLoggedIn ? (
                                <View style={styles.profileSection}>
                                    <View style={[styles.avatarCircle, { backgroundColor: vTheme.colors.background, borderColor: vTheme.colors.divider }]}>
                                        {user?.avatar ? (
                                            <Image source={{ uri: getMediaUrl(user.avatar) || '' }} style={styles.avatarImage} />
                                        ) : (
                                            <User size={22} color={vTheme.colors.textSecondary} />
                                        )}
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={[styles.userName, { color: vTheme.colors.text }]} numberOfLines={1}>
                                            {user?.spiritualName || user?.karmicName}
                                        </Text>
                                        <Text style={[styles.userStatus, { color: vTheme.colors.textSecondary }]}>{t('auth.profile')}</Text>
                                        <Text style={[styles.userStatus, { color: vTheme.colors.textSecondary }]}>
                                            Роль: {roleDescriptor?.title || user?.role || 'user'}
                                        </Text>
                                        {user?.godModeEnabled ? (
                                            <Text style={[styles.userStatus, { color: vTheme.colors.textSecondary }]}>
                                                Режим бога: включён
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.footerButton, { backgroundColor: vTheme.colors.primary }]}
                                    onPress={() => { handleClose(); onNavigateToRegistration(); }}
                                >
                                    <LogIn size={20} color="#fff" style={{ marginRight: 10 }} />
                                    <Text style={styles.footerButtonText}>{t('auth.login')}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.settingsIconBtn, { backgroundColor: vTheme.colors.background, borderColor: vTheme.colors.divider, borderWidth: 1 }]}
                                onPress={() => { handleClose(); onNavigateToSettings(); }}
                            >
                                <Settings size={22} color={vTheme.colors.text} />
                            </TouchableOpacity>
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
        shadowColor: '#000',
        shadowOffset: { width: -10, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 30, // Softer edge
        elevation: 24,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
    tabText: { fontSize: 16, fontWeight: 'bold' },
    content: { flex: 1 },
    historyContainer: { flex: 1, padding: 16 },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    newChatButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    historyItemMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    historyIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    historyItemTitle: { fontSize: 16, marginBottom: 4 },
    historyItemDate: { fontSize: 12 },
    deleteBtn: { padding: 10 },
    emptyContainer: { padding: 40, alignItems: 'center' },
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
        padding: 16,
        borderTopWidth: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    profileSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
    },
    avatarImage: { width: '100%', height: '100%' },
    userInfo: { marginLeft: 12, flex: 1 },
    userName: { fontSize: 14, fontWeight: 'bold' },
    userStatus: { fontSize: 11 },
    footerButton: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, flex: 1, marginRight: 10 },
    footerButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    settingsIconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
