/**
 * IncomingBookingsScreen - Экран "Входящие записи" (для специалиста)
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    ArrowLeft,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    MessageCircle,
    User,
    Video,
    Sparkles,
    LayoutGrid,
} from 'lucide-react-native';
import {
    ServiceBooking,
    getIncomingBookings,
    confirmBooking,
    cancelBooking,
    completeBooking,
    markNoShow,
    STATUS_LABELS,
    STATUS_COLORS,
    formatDuration,
} from '../../../services/bookingService';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';

const { width } = Dimensions.get('window');

type FilterTab = 'pending' | 'confirmed' | 'all';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: 'Ожидают' },
    { key: 'confirmed', label: 'Подтверждённые' },
    { key: 'all', label: 'Все' },
];

export default function IncomingBookingsScreen() {
    const navigation = useNavigation<any>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);

    const [bookings, setBookings] = useState<ServiceBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('pending');
    const [processingId, setProcessingId] = useState<number | null>(null);
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const actionLocksRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            actionLocksRef.current.clear();
        };
    }, []);

    const loadBookings = useCallback(async (isRefresh = false) => {
        const requestId = ++latestLoadRequestRef.current;
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const filters: any = { limit: 100 };
            if (activeFilter === 'pending') {
                filters.status = 'pending';
            } else if (activeFilter === 'confirmed') {
                filters.status = 'confirmed';
            }

            const response = await getIncomingBookings(filters);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            setBookings(response.bookings || []);
        } catch (error) {
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.log('[IncomingBookings] Failed to load:', error);
            setBookings([]);
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [activeFilter]);

    useFocusEffect(
        useCallback(() => {
            loadBookings();
        }, [loadBookings])
    );

    const handleRefresh = () => {
        if (refreshing || loading) {
            return;
        }
        void loadBookings(true);
    };

    const handleConfirm = async (booking: ServiceBooking) => {
        if (actionLocksRef.current.has(booking.id)) {
            return;
        }
        actionLocksRef.current.add(booking.id);
        setProcessingId(booking.id);
        try {
            await confirmBooking(booking.id);
            if (isMountedRef.current) {
                Alert.alert('Готово', 'Запись подтверждена');
            }
            await loadBookings(true);
        } catch (error: any) {
            if (isMountedRef.current) {
                Alert.alert('Ошибка', error.message || 'Не удалось подтвердить');
            }
        } finally {
            actionLocksRef.current.delete(booking.id);
            if (isMountedRef.current) {
                setProcessingId(null);
            }
        }
    };

    const handleReject = async (booking: ServiceBooking) => {
        Alert.alert(
            'Отклонить запись?',
            'Клиенту будет возвращена оплата. Вы уверены?',
            [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Да, отклонить',
                    style: 'destructive',
                    onPress: async () => {
                        if (actionLocksRef.current.has(booking.id)) {
                            return;
                        }
                        actionLocksRef.current.add(booking.id);
                        setProcessingId(booking.id);
                        try {
                            await cancelBooking(booking.id, { reason: 'Отклонено специалистом' });
                            if (isMountedRef.current) {
                                Alert.alert('Готово', 'Запись отклонена');
                            }
                            await loadBookings(true);
                        } catch (error: any) {
                            if (isMountedRef.current) {
                                Alert.alert('Ошибка', error.message || 'Не удалось отклонить');
                            }
                        } finally {
                            actionLocksRef.current.delete(booking.id);
                            if (isMountedRef.current) {
                                setProcessingId(null);
                            }
                        }
                    },
                },
            ]
        );
    };

    const handleComplete = async (booking: ServiceBooking) => {
        if (actionLocksRef.current.has(booking.id)) {
            return;
        }
        actionLocksRef.current.add(booking.id);
        setProcessingId(booking.id);
        try {
            await completeBooking(booking.id);
            if (isMountedRef.current) {
                Alert.alert('Готово', 'Запись завершена');
            }
            await loadBookings(true);
        } catch (error: any) {
            if (isMountedRef.current) {
                Alert.alert('Ошибка', error.message || 'Не удалось завершить');
            }
        } finally {
            actionLocksRef.current.delete(booking.id);
            if (isMountedRef.current) {
                setProcessingId(null);
            }
        }
    };

    const handleNoShow = async (booking: ServiceBooking) => {
        Alert.alert(
            'Клиент не явился?',
            'Отметить запись как неявку?',
            [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Да, неявка',
                    onPress: async () => {
                        if (actionLocksRef.current.has(booking.id)) {
                            return;
                        }
                        actionLocksRef.current.add(booking.id);
                        setProcessingId(booking.id);
                        try {
                            await markNoShow(booking.id);
                            if (isMountedRef.current) {
                                Alert.alert('Готово', 'Отмечено как неявка');
                            }
                            await loadBookings(true);
                        } catch (error: any) {
                            if (isMountedRef.current) {
                                Alert.alert('Ошибка', error.message || 'Не удалось отметить');
                            }
                        } finally {
                            actionLocksRef.current.delete(booking.id);
                            if (isMountedRef.current) {
                                setProcessingId(null);
                            }
                        }
                    },
                },
            ]
        );
    };

    const handleOpenChat = (booking: ServiceBooking) => {
        if (booking.chatRoomId) {
            navigation.navigate('RoomChat', { roomId: booking.chatRoomId.toString() });
        } else if (booking.clientId) {
            navigation.navigate('Chat', { userId: booking.clientId });
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isPast = (booking: ServiceBooking) => {
        return new Date(booking.endAt) < new Date();
    };

    const isStartingSoon = (booking: ServiceBooking) => {
        const now = new Date();
        const start = new Date(booking.scheduledAt);
        const diff = start.getTime() - now.getTime();
        return diff > 0 && diff <= 60 * 60 * 1000;
    };

    const renderBookingCard = (booking: ServiceBooking) => {
        const statusColor = STATUS_COLORS[booking.status] || colors.accent;
        const isProcessing = processingId === booking.id;
        const soon = isStartingSoon(booking);
        const past = isPast(booking);

        return (
            <View key={booking.id} style={[styles.bookingCard, soon && styles.bookingCardSoon]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {STATUS_LABELS[booking.status]}
                        </Text>
                    </View>
                    {soon && (
                        <View style={[styles.soonBadge, { backgroundColor: colors.accentSoft }]}>
                            <Sparkles size={10} color={colors.accent} />
                            <Text style={[styles.soonText, { color: colors.accent }]}>Срочно</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.moreButton} onPress={() => handleOpenChat(booking)}>
                        <MessageCircle size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                    <Text style={[styles.serviceName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {booking.service?.title || 'Услуга'}
                    </Text>

                    <View style={[styles.clientRow, { backgroundColor: colors.surface }]}>
                        <View style={styles.avatarContainer}>
                            {booking.client?.avatar ? (
                                <Image source={{ uri: booking.client.avatar }} style={styles.clientAvatar} />
                            ) : (
                                <View style={[styles.clientAvatarPlaceholder, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
                                    <User size={16} color={colors.accent} />
                                </View>
                            )}
                            <View style={[styles.onlineStatus, { backgroundColor: colors.success, borderColor: colors.background }]} />
                        </View>
                        <View style={styles.clientInfo}>
                            <Text style={[styles.clientName, { color: colors.textPrimary }]}>
                                {booking.client?.karmicName || 'Клиент'}
                            </Text>
                            <Text style={[styles.clientMeta, { color: colors.textSecondary }]}>
                                {booking.client?.spiritualName || 'Духовное имя не указано'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.infoRow, { backgroundColor: colors.surface }]}>
                    <View style={styles.infoItem}>
                        <Calendar size={14} color={colors.accent} />
                        <Text style={[styles.infoText, { color: colors.textPrimary }]}>{formatDate(booking.scheduledAt)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Clock size={14} color={colors.accent} />
                        <Text style={[styles.infoText, { color: colors.textPrimary }]}>{formatTime(booking.scheduledAt)}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                        <Text style={[styles.price, { color: colors.accent }]}>{booking.pricePaid} ₵</Text>
                    </View>
                </View>

                <View style={styles.tariffRow}>
                    <Text style={[styles.tariffText, { color: colors.textSecondary }]}>
                        {booking.tariff?.name || 'Тариф'} • {formatDuration(booking.durationMinutes)}
                    </Text>
                </View>

                {booking.clientNote && (
                    <View style={[styles.noteSection, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
                        <Text style={[styles.noteLabel, { color: colors.accent }]}>Заметка клиента:</Text>
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>{booking.clientNote}</Text>
                    </View>
                )}

                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.chatButton} onPress={() => handleOpenChat(booking)}>
                        <MessageCircle size={20} color={colors.accent} />
                    </TouchableOpacity>

                    {booking.status === 'pending' && (
                        <>
                            <TouchableOpacity
                                style={[styles.confirmButton, { backgroundColor: colors.accent }, isProcessing && { opacity: 0.5 }]}
                                onPress={() => handleConfirm(booking)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color={colors.background} />
                                ) : (
                                    <>
                                        <CheckCircle size={18} color={colors.background} />
                                        <Text style={[styles.confirmButtonText, { color: colors.background }]}>Принять</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.rejectButton, { borderColor: colors.danger, backgroundColor: colors.accentSoft }]}
                                onPress={() => handleReject(booking)}
                                disabled={isProcessing}
                            >
                                <XCircle size={18} color={colors.danger} />
                            </TouchableOpacity>
                        </>
                    )}

                    {booking.status === 'confirmed' && !past && (
                        <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.surfaceElevated }]} onPress={() => handleOpenChat(booking)}>
                            <Video size={18} color={colors.background} />
                            <Text style={[styles.startButtonText, { color: colors.background }]}>Начать сессию</Text>
                        </TouchableOpacity>
                    )}

                    {booking.status === 'confirmed' && past && (
                        <>
                            <TouchableOpacity
                                style={[styles.confirmButton, { backgroundColor: colors.accent }, isProcessing && { opacity: 0.5 }]}
                                onPress={() => handleComplete(booking)}
                                disabled={isProcessing}
                            >
                                <CheckCircle size={18} color={colors.background} />
                                <Text style={[styles.confirmButtonText, { color: colors.background }]}>Завершить</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.rejectButton, { borderColor: colors.danger, backgroundColor: colors.accentSoft }]}
                                onPress={() => handleNoShow(booking)}
                                disabled={isProcessing}
                            >
                                <XCircle size={18} color={colors.danger} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <LayoutGrid size={48} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {activeFilter === 'pending' ? 'Ожидание пусто' : activeFilter === 'confirmed' ? 'Нет планов' : 'Тишина'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Здесь появятся новые запросы от ваших последователей.
            </Text>
        </View>
    );

    return (
        <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Входящие записи</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Управление вашим расписанием</Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
                        <Text style={[styles.countText, { color: colors.accent }]}>{bookings.length}</Text>
                    </View>
                </View>

                <View style={styles.filterContainer}>
                    {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab.key;
                        const iconColor = isActive ? colors.background : colors.textSecondary;

                        return (
                            <TouchableOpacity
                                key={tab.key}
                                activeOpacity={0.8}
                                style={[styles.filterTab, isActive && { ...styles.filterTabActive, backgroundColor: colors.accent, borderColor: colors.accent }]}
                                onPress={() => setActiveFilter(tab.key)}
                            >
                                {tab.key === 'pending' && <Clock size={20} color={iconColor} strokeWidth={2.5} />}
                                {tab.key === 'confirmed' && <CheckCircle size={20} color={iconColor} strokeWidth={2.5} />}
                                {tab.key === 'all' && <LayoutGrid size={20} color={iconColor} strokeWidth={2.5} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
                        }
                    >
                        {bookings.length === 0 ? renderEmptyState() : bookings.map(renderBookingCard)}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { color: 'rgba(255,255,255,1)', fontSize: 18, fontFamily: 'Cinzel-Bold' },
    headerSubtitle: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '600', marginTop: 2 },
    countBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    countText: { color: 'white', fontSize: 13, fontWeight: '800' },
    filterContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
    filterTab: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    filterTabActive: { backgroundColor: 'white', borderColor: 'white' },
    filterText: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    filterTextActive: { color: 'rgba(0,0,0,1)' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1 },
    contentContainer: { padding: 20 },
    bookingCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 28,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    bookingCardSoon: { borderColor: 'rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.03)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
    soonBadge: {
        marginLeft: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    soonText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    moreButton: {
        marginLeft: 'auto',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: { marginBottom: 20 },
    serviceName: { color: 'rgba(255,255,255,1)', fontSize: 18, fontWeight: '800', marginBottom: 16 },
    clientRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 14, borderRadius: 20 },
    avatarContainer: { position: 'relative' },
    clientAvatar: { width: 48, height: 48, borderRadius: 16 },
    clientAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    onlineStatus: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'transparent' },
    clientInfo: { flex: 1 },
    clientName: { color: 'rgba(255,255,255,1)', fontSize: 16, fontWeight: '700' },
    clientMeta: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, marginTop: 2 },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        padding: 16,
        borderRadius: 20,
        marginBottom: 20,
        gap: 16,
    },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { color: 'rgba(255,255,255,1)', fontSize: 14, fontWeight: '700' },
    priceContainer: { marginLeft: 'auto' },
    price: { color: 'white', fontSize: 18, fontWeight: '900' },
    tariffRow: { marginBottom: 20, paddingHorizontal: 4 },
    tariffText: { color: 'rgba(255, 255, 255, 0.3)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    noteSection: {
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        padding: 16,
        borderRadius: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    noteLabel: { color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
    noteText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, lineHeight: 22 },
    actionsGrid: { flexDirection: 'row', gap: 12 },
    chatButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    confirmButton: { flex: 1, flexDirection: 'row', height: 52, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', gap: 10 },
    confirmButtonText: { color: 'rgba(0,0,0,1)', fontSize: 15, fontWeight: '800' },
    rejectButton: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(244, 67, 54, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244, 67, 54, 0.2)' },
    startButton: { flex: 1, flexDirection: 'row', height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,1)', justifyContent: 'center', alignItems: 'center', gap: 10 },
    startButtonText: { color: 'rgba(0,0,0,1)', fontSize: 15, fontWeight: '800' },
    emptyContainer: { paddingTop: 80, alignItems: 'center' },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    emptyTitle: { color: 'rgba(255,255,255,1)', fontSize: 24, fontFamily: 'Cinzel-Bold', marginBottom: 16, textAlign: 'center' },
    emptySubtitle: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 40, paddingHorizontal: 20 },
});
