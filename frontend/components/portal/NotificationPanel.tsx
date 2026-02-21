import React, { useCallback, useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Bell,
    BellOff,
    MessageCircle,
    Wallet,
    Users,
    Rss,
    MapPin,
    Video,
    Newspaper,
    CheckCheck,
    Trash2,
} from 'lucide-react-native';
import { useNotifications, type AppNotification } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingsContext';
import { notificationService } from '../../services/notificationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.72;

// ── Helpers ──────────────────────────────────────────────────────────────────

const relativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const min = Math.floor(diff / 60_000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин назад`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} ч назад`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} д назад`;
    return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const typeIcon = (type: string, color: string, size = 20) => {
    if (type === 'new_message' || type === 'room_message')
        return <MessageCircle size={size} color={color} />;
    if (type.startsWith('wallet_'))
        return <Wallet size={size} color={color} />;
    if (type.startsWith('referral_'))
        return <Users size={size} color={color} />;
    if (type === 'channel_news_personal')
        return <Rss size={size} color={color} />;
    if (type.startsWith('yatra_'))
        return <MapPin size={size} color={color} />;
    if (type === 'video_circle_publish_result')
        return <Video size={size} color={color} />;
    if (type === 'news')
        return <Newspaper size={size} color={color} />;
    return <Bell size={size} color={color} />;
};

const typeAccentColor = (type: string, isDark: boolean): string => {
    if (type === 'new_message' || type === 'room_message')
        return isDark ? '#5B9BD5' : '#007AFF';
    if (type.startsWith('wallet_'))
        return isDark ? '#48BB78' : '#34C759';
    if (type.startsWith('referral_'))
        return isDark ? '#ED8936' : '#FF9500';
    if (type.startsWith('yatra_'))
        return isDark ? '#9F7AEA' : '#AF52DE';
    if (type === 'video_circle_publish_result')
        return isDark ? '#FC8181' : '#FF3B30';
    if (type === 'news' || type === 'channel_news_personal')
        return isDark ? '#4FD1C5' : '#30B0C7';
    return isDark ? '#A0AEC0' : '#8E8E93';
};

// ── NotificationItem ────────────────────────────────────────────────────────

interface ItemProps {
    item: AppNotification;
    onPress: (item: AppNotification) => void;
    isDark: boolean;
}

const NotificationItem = React.memo(({ item, onPress, isDark }: ItemProps) => {
    const accent = typeAccentColor(item.type, isDark);
    const isUnread = !item.isRead;

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.6}
            style={[
                styles.item,
                {
                    backgroundColor: isUnread
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,122,255,0.04)')
                        : 'transparent',
                },
            ]}
        >
            <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
                {typeIcon(item.type, accent)}
            </View>
            <View style={styles.itemContent}>
                <View style={styles.itemTopRow}>
                    <Text
                        style={[
                            styles.itemTitle,
                            {
                                color: isDark ? '#F5F5F7' : '#1C1C1E',
                                fontWeight: isUnread ? '600' : '400',
                            },
                        ]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text style={[styles.itemTime, { color: isDark ? '#636366' : '#8E8E93' }]}>
                        {relativeTime(item.receivedAt)}
                    </Text>
                </View>
                {!!item.body && (
                    <Text
                        style={[
                            styles.itemBody,
                            { color: isDark ? '#98989D' : '#6C6C70' },
                        ]}
                        numberOfLines={2}
                    >
                        {item.body}
                    </Text>
                )}
            </View>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: '#007AFF' }]} />}
        </TouchableOpacity>
    );
});

// ── NotificationPanel ───────────────────────────────────────────────────────

export const NotificationPanel: React.FC = () => {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        isPanelVisible,
        setPanelVisible,
    } = useNotifications();
    const { isDarkMode } = useSettings();

    const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Slide up/down animation
    useEffect(() => {
        if (isPanelVisible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 28,
                    stiffness: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: PANEL_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isPanelVisible, slideAnim, backdropAnim]);

    // Swipe-down to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) {
                    slideAnim.setValue(gs.dy);
                }
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 80 || gs.vy > 0.5) {
                    close();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        damping: 28,
                        stiffness: 300,
                        useNativeDriver: true,
                    }).start();
                }
            },
        }),
    ).current;

    const close = useCallback(() => {
        setPanelVisible(false);
    }, [setPanelVisible]);

    const handleItemPress = useCallback(
        (item: AppNotification) => {
            markAsRead(item.id);
            setPanelVisible(false);
            setTimeout(() => {
                notificationService.handleNotificationAction(item.data);
            }, 300);
        },
        [markAsRead, setPanelVisible],
    );

    const renderItem = useCallback(
        ({ item }: { item: AppNotification }) => (
            <NotificationItem item={item} onPress={handleItemPress} isDark={isDarkMode} />
        ),
        [handleItemPress, isDarkMode],
    );

    const keyExtractor = useCallback((item: AppNotification) => item.id, []);

    // iOS-native colors
    const bg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const headerBorder = isDarkMode ? '#38383A' : '#E5E5EA';
    const textColor = isDarkMode ? '#F5F5F7' : '#1C1C1E';
    const secondaryText = isDarkMode ? '#98989D' : '#8E8E93';
    const separatorColor = isDarkMode ? '#38383A' : '#E5E5EA';

    return (
        <Modal
            visible={isPanelVisible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={close}
        >
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
                ]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={close} />
            </Animated.View>

            {/* Panel */}
            <Animated.View
                style={[
                    styles.panel,
                    {
                        backgroundColor: bg,
                        height: PANEL_HEIGHT,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Drag Handle */}
                <View {...panResponder.panHandlers} style={styles.handleArea}>
                    <View style={[styles.handle, { backgroundColor: isDarkMode ? '#48484A' : '#C7C7CC' }]} />
                </View>

                {/* Header — iOS style */}
                <View style={[styles.header, { borderBottomColor: headerBorder }]}>
                    <View style={styles.headerTitleRow}>
                        <Text style={[styles.headerTitle, { color: textColor }]}>
                            Уведомления
                        </Text>
                        {unreadCount > 0 && (
                            <View style={styles.headerBadge}>
                                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerActions}>
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                onPress={markAllAsRead}
                                style={styles.headerActionBtn}
                                activeOpacity={0.6}
                            >
                                <Text style={[styles.headerActionText, { color: '#007AFF' }]}>
                                    Прочитать все
                                </Text>
                            </TouchableOpacity>
                        )}
                        {notifications.length > 0 && (
                            <TouchableOpacity
                                onPress={clearAll}
                                style={styles.headerActionBtn}
                                activeOpacity={0.6}
                            >
                                <Text style={[styles.headerActionText, { color: '#FF3B30' }]}>
                                    Очистить
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Content */}
                {notifications.length === 0 ? (
                    <View style={styles.empty}>
                        <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7' }]}>
                            <BellOff size={36} color={secondaryText} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: textColor }]}>
                            Нет уведомлений
                        </Text>
                        <Text style={[styles.emptyBody, { color: secondaryText }]}>
                            Здесь будет история всех{'\n'}входящих уведомлений
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ItemSeparatorComponent={() => (
                            <View style={[styles.separator, { backgroundColor: separatorColor }]} />
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </Animated.View>
        </Modal>
    );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    panel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: { elevation: 24 },
        }),
    },
    handleArea: {
        paddingTop: 8,
        paddingBottom: 4,
        alignItems: 'center',
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    headerBadge: {
        backgroundColor: '#007AFF',
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    headerBadgeText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 20,
    },
    headerActionBtn: {
        paddingVertical: 2,
    },
    headerActionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    list: {
        paddingBottom: 40,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    itemContent: {
        flex: 1,
        gap: 2,
    },
    itemTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemTitle: {
        fontSize: 15,
        lineHeight: 20,
        flex: 1,
        marginRight: 8,
    },
    itemBody: {
        fontSize: 14,
        lineHeight: 19,
        marginTop: 2,
    },
    itemTime: {
        fontSize: 13,
        flexShrink: 0,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        flexShrink: 0,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 72,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
        paddingBottom: 60,
    },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    emptyBody: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
