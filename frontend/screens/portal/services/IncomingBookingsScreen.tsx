/**
 * IncomingBookingsScreen - Экран "Входящие записи" (для специалиста)
 */
import React, { useState, useCallback } from 'react';
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
    Phone,
    Video,
} from 'lucide-react-native';
import {
    ServiceBooking,
    BookingStatus,
    getIncomingBookings,
    confirmBooking,
    cancelBooking,
    completeBooking,
    markNoShow,
    STATUS_LABELS,
    STATUS_COLORS,
    formatDuration,
} from '../../../services/bookingService';

type FilterTab = 'pending' | 'confirmed' | 'all';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: 'Ожидают' },
    { key: 'confirmed', label: 'Подтверждённые' },
    { key: 'all', label: 'Все' },
];

export default function IncomingBookingsScreen() {
    const navigation = useNavigation<any>();

    const [bookings, setBookings] = useState<ServiceBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('pending');
    const [processingId, setProcessingId] = useState<number | null>(null);

    const loadBookings = useCallback(async (isRefresh = false) => {
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
            setBookings(response.bookings || []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить записи');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter]);

    // Reload on focus and filter change
    useFocusEffect(
        useCallback(() => {
            loadBookings();
        }, [loadBookings])
    );

    const handleRefresh = () => {
        loadBookings(true);
    };

    const handleConfirm = async (booking: ServiceBooking) => {
        setProcessingId(booking.id);
        try {
            await confirmBooking(booking.id);
            Alert.alert('Готово', 'Запись подтверждена');
            loadBookings(true);
        } catch (error: any) {
            Alert.alert('Ошибка', error.message || 'Не удалось подтвердить');
        } finally {
            setProcessingId(null);
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
                        setProcessingId(booking.id);
                        try {
                            await cancelBooking(booking.id, { reason: 'Отклонено специалистом' });
                            Alert.alert('Готово', 'Запись отклонена');
                            loadBookings(true);
                        } catch (error: any) {
                            Alert.alert('Ошибка', error.message || 'Не удалось отклонить');
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleComplete = async (booking: ServiceBooking) => {
        setProcessingId(booking.id);
        try {
            await completeBooking(booking.id);
            Alert.alert('Готово', 'Запись завершена');
            loadBookings(true);
        } catch (error: any) {
            Alert.alert('Ошибка', error.message || 'Не удалось завершить');
        } finally {
            setProcessingId(null);
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
                        setProcessingId(booking.id);
                        try {
                            await markNoShow(booking.id);
                            Alert.alert('Готово', 'Отмечено как неявка');
                            loadBookings(true);
                        } catch (error: any) {
                            Alert.alert('Ошибка', error.message || 'Не удалось отметить');
                        } finally {
                            setProcessingId(null);
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
            // Create or navigate to direct chat with client
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
        return diff > 0 && diff <= 60 * 60 * 1000; // Within 1 hour
    };

    const renderBookingCard = (booking: ServiceBooking) => {
        const statusColor = STATUS_COLORS[booking.status];
        const isProcessing = processingId === booking.id;
        const soon = isStartingSoon(booking);
        const past = isPast(booking);

        return (
            <View
                key={booking.id}
                style={[
                    styles.bookingCard,
                    soon && styles.bookingCardSoon,
                ]}
            >
                {/* Status & Time */}
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {STATUS_LABELS[booking.status]}
                        </Text>
                    </View>
                    {soon && (
                        <View style={styles.soonBadge}>
                            <Text style={styles.soonText}>Скоро!</Text>
                        </View>
                    )}
                </View>

                {/* Service & Client */}
                <View style={styles.mainInfo}>
                    <Text style={styles.serviceName} numberOfLines={1}>
                        {booking.service?.title || 'Сервис'}
                    </Text>

                    <View style={styles.clientRow}>
                        {booking.client?.avatar ? (
                            <Image source={{ uri: booking.client.avatar }} style={styles.clientAvatar} />
                        ) : (
                            <View style={styles.clientAvatarPlaceholder}>
                                <User size={14} color="rgba(255,255,255,0.5)" />
                            </View>
                        )}
                        <Text style={styles.clientName}>
                            {booking.client?.karmicName || 'Клиент'}
                        </Text>
                    </View>
                </View>

                {/* Date & Time */}
                <View style={styles.dateTimeRow}>
                    <View style={styles.dateBlock}>
                        <Calendar size={14} color="#FFD700" />
                        <Text style={styles.dateText}>{formatDate(booking.scheduledAt)}</Text>
                    </View>
                    <View style={styles.timeBlock}>
                        <Clock size={14} color="#FFD700" />
                        <Text style={styles.timeText}>
                            {formatTime(booking.scheduledAt)} - {formatTime(booking.endAt)}
                        </Text>
                    </View>
                </View>

                {/* Tariff & Price */}
                <View style={styles.priceRow}>
                    <Text style={styles.tariffName}>
                        {booking.tariff?.name} • {formatDuration(booking.durationMinutes)}
                    </Text>
                    <Text style={styles.price}>{booking.pricePaid} ₽</Text>
                </View>

                {/* Client Note */}
                {booking.clientNote && (
                    <View style={styles.noteSection}>
                        <Text style={styles.noteLabel}>Комментарий клиента:</Text>
                        <Text style={styles.noteText}>{booking.clientNote}</Text>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                    {/* Chat button always */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleOpenChat(booking)}
                    >
                        <MessageCircle size={18} color="#FFD700" />
                    </TouchableOpacity>

                    {booking.status === 'pending' && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionButtonPrimary, isProcessing && styles.actionButtonDisabled]}
                                onPress={() => handleConfirm(booking)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="#1a1a2e" />
                                ) : (
                                    <>
                                        <CheckCircle size={18} color="#1a1a2e" />
                                        <Text style={styles.actionButtonPrimaryText}>Подтвердить</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButtonDanger]}
                                onPress={() => handleReject(booking)}
                                disabled={isProcessing}
                            >
                                <XCircle size={18} color="#F44336" />
                            </TouchableOpacity>
                        </>
                    )}

                    {booking.status === 'confirmed' && !past && (
                        <TouchableOpacity
                            style={styles.actionButtonSecondary}
                            onPress={() => handleOpenChat(booking)}
                        >
                            <Video size={18} color="#4CAF50" />
                            <Text style={styles.actionButtonSecondaryText}>Начать</Text>
                        </TouchableOpacity>
                    )}

                    {booking.status === 'confirmed' && past && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionButtonPrimary, isProcessing && styles.actionButtonDisabled]}
                                onPress={() => handleComplete(booking)}
                                disabled={isProcessing}
                            >
                                <CheckCircle size={18} color="#1a1a2e" />
                                <Text style={styles.actionButtonPrimaryText}>Завершить</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButtonDanger}
                                onPress={() => handleNoShow(booking)}
                                disabled={isProcessing}
                            >
                                <XCircle size={18} color="#F44336" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
                {activeFilter === 'pending'
                    ? 'Нет ожидающих записей'
                    : activeFilter === 'confirmed'
                        ? 'Нет подтверждённых записей'
                        : 'Нет записей'
                }
            </Text>
            <Text style={styles.emptySubtitle}>
                Когда клиенты запишутся, записи появятся здесь
            </Text>
        </View>
    );

    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Входящие записи</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{bookings.length}</Text>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterContainer}>
                    {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.filterTab, isActive && styles.filterTabActive]}
                                onPress={() => setActiveFilter(tab.key)}
                            >
                                <Text style={[
                                    styles.filterText,
                                    isActive && styles.filterTextActive
                                ]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Content */}
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#FFD700" />
                    </View>
                ) : (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor="#FFD700"
                            />
                        }
                    >
                        {bookings.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            bookings.map(renderBookingCard)
                        )}
                        <View style={{ height: 32 }} />
                    </ScrollView>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 12,
    },
    countBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    filterTab: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
    },
    filterTabActive: {
        backgroundColor: '#FFD700',
    },
    filterText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#1a1a2e',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
    },
    bookingCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    bookingCardSoon: {
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.5)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    soonBadge: {
        marginLeft: 'auto',
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    soonText: {
        color: '#FFA500',
        fontSize: 11,
        fontWeight: '600',
    },
    mainInfo: {
        marginBottom: 12,
    },
    serviceName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    clientAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    clientAvatarPlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clientName: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 16,
    },
    dateBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    timeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    tariffName: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
    },
    price: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: '700',
    },
    noteSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    noteLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        marginBottom: 4,
    },
    noteText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontStyle: 'italic',
    },
    actionsRow: {
        flexDirection: 'row',
        marginTop: 14,
        gap: 8,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonPrimary: {
        flex: 1,
        flexDirection: 'row',
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    actionButtonPrimaryText: {
        color: '#1a1a2e',
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtonSecondary: {
        flex: 1,
        flexDirection: 'row',
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    actionButtonSecondaryText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtonDanger: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(244, 67, 54, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonDisabled: {
        opacity: 0.5,
    },
});
