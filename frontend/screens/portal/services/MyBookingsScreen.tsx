/**
 * MyBookingsScreen - Экран "Мои записи" (для клиента)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, Filter } from 'lucide-react-native';
import {
    ServiceBooking,
    BookingStatus,
    getMyBookings,
    cancelBooking,
    BookingFilters,
} from '../../../services/bookingService';
import BookingCard from './components/BookingCard';

type FilterTab = 'all' | 'upcoming' | 'past' | 'cancelled';

const FILTER_TABS: { key: FilterTab; label: string; icon: any }[] = [
    { key: 'all', label: 'Все', icon: Calendar },
    { key: 'upcoming', label: 'Предстоящие', icon: Clock },
    { key: 'past', label: 'Прошедшие', icon: CheckCircle },
    { key: 'cancelled', label: 'Отменённые', icon: XCircle },
];

export default function MyBookingsScreen() {
    const navigation = useNavigation<any>();

    const [bookings, setBookings] = useState<ServiceBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [totalCount, setTotalCount] = useState(0);

    const loadBookings = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            // Build filters based on active tab
            const filters: BookingFilters = {
                limit: 50,
            };

            if (activeFilter === 'upcoming') {
                filters.status = 'confirmed';
                filters.dateFrom = new Date().toISOString().split('T')[0];
            } else if (activeFilter === 'past') {
                filters.status = 'completed';
            } else if (activeFilter === 'cancelled') {
                filters.status = 'cancelled';
            }

            const response = await getMyBookings(filters);

            // Additional client-side filtering for "upcoming" - include pending
            let filteredBookings = response.bookings;
            if (activeFilter === 'upcoming') {
                const now = new Date();
                filteredBookings = response.bookings.filter(b =>
                    (b.status === 'confirmed' || b.status === 'pending') &&
                    new Date(b.scheduledAt) >= now
                );
            } else if (activeFilter === 'past') {
                filteredBookings = response.bookings.filter(b =>
                    b.status === 'completed' ||
                    (b.status === 'confirmed' && new Date(b.endAt) < new Date())
                );
            }

            setBookings(filteredBookings);
            setTotalCount(response.total);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить записи');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    const handleRefresh = () => {
        loadBookings(true);
    };

    const handleCancelBooking = async (booking: ServiceBooking) => {
        Alert.alert(
            'Отменить запись?',
            `Вы уверены, что хотите отменить запись на "${booking.service?.title}"?`,
            [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Да, отменить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelBooking(booking.id, { reason: 'Отменено клиентом' });
                            Alert.alert('Готово', 'Запись отменена');
                            loadBookings(true);
                        } catch (error: any) {
                            Alert.alert('Ошибка', error.message || 'Не удалось отменить запись');
                        }
                    },
                },
            ]
        );
    };

    const handleOpenChat = (booking: ServiceBooking) => {
        if (booking.chatRoomId) {
            navigation.navigate('RoomChat', { roomId: booking.chatRoomId.toString() });
        }
    };

    const handleBookingPress = (booking: ServiceBooking) => {
        // Navigate to booking detail or service detail
        if (booking.serviceId) {
            navigation.navigate('ServiceDetail', { serviceId: booking.serviceId });
        }
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>
                {activeFilter === 'all'
                    ? 'У вас пока нет записей'
                    : activeFilter === 'upcoming'
                        ? 'Нет предстоящих записей'
                        : activeFilter === 'past'
                            ? 'Нет прошедших записей'
                            : 'Нет отменённых записей'
                }
            </Text>
            <Text style={styles.emptySubtitle}>
                Найдите интересный сервис и запишитесь
            </Text>
            <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('ServicesHome')}
            >
                <Text style={styles.browseButtonText}>Найти сервис</Text>
            </TouchableOpacity>
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
                    <Text style={styles.headerTitle}>Мои записи</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{totalCount}</Text>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScroll}
                    >
                        {FILTER_TABS.map((tab) => {
                            const isActive = activeFilter === tab.key;
                            const IconComponent = tab.icon;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[styles.filterTab, isActive && styles.filterTabActive]}
                                    onPress={() => setActiveFilter(tab.key)}
                                >
                                    <IconComponent
                                        size={16}
                                        color={isActive ? '#1a1a2e' : 'rgba(255,255,255,0.6)'}
                                    />
                                    <Text style={[
                                        styles.filterText,
                                        isActive && styles.filterTextActive
                                    ]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
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
                            bookings.map((booking) => (
                                <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                    onPress={() => handleBookingPress(booking)}
                                    onCancel={() => handleCancelBooking(booking)}
                                    onChat={() => handleOpenChat(booking)}
                                />
                            ))
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
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    filterScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
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
        marginBottom: 24,
    },
    browseButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    browseButtonText: {
        color: '#1a1a2e',
        fontSize: 14,
        fontWeight: '600',
    },
});
