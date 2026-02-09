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
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import {
    ServiceBooking,
    getMyBookings,
    cancelBooking,
    BookingFilters,
} from '../../../services/bookingService';
import BookingCard from './components/BookingCard';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

type FilterTab = 'all' | 'upcoming' | 'past' | 'cancelled';

const FILTER_TABS: { key: FilterTab; label: string; icon: any }[] = [
    { key: 'all', label: 'Все', icon: Calendar },
    { key: 'upcoming', label: 'Предстоящие', icon: Clock },
    { key: 'past', label: 'Прошедшие', icon: CheckCircle },
    { key: 'cancelled', label: 'Отменённые', icon: XCircle },
];

export default function MyBookingsScreen() {
    const navigation = useNavigation<any>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
            console.log('[MyBookings] Failed to load bookings (expected if none/unauthorized):', error);
            setBookings([]);
            setTotalCount(0);
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
        <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Fixed Premium Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Мои записи</Text>
                        <Text style={styles.headerSubtitle}>История ваших сессий</Text>
                    </View>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{totalCount}</Text>
                    </View>
                </View>

                {/* Glass Category Tabs */}
                <View style={styles.filterContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScroll}
                    >
                        {FILTER_TABS.map((tab) => {
                            const isActive = activeFilter === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    activeOpacity={0.8}
                                    style={[styles.filterTab, isActive && styles.filterTabActive]}
                                    onPress={() => setActiveFilter(tab.key)}
                                >
                                    <View style={styles.filterIconCircle}>
                                        <tab.icon size={14} color={isActive ? colors.textPrimary : colors.accent} />
                                    </View>
                                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Content Area */}
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
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={colors.accent}
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
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    countBadge: {
        backgroundColor: colors.accentSoft,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.accentSoft,
    },
    countText: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '800',
    },
    filterContainer: {
        marginTop: 8,
    },
    filterScroll: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingLeft: 8,
        paddingRight: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterTabActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    filterIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    filterText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
    },
    filterTextActive: {
        color: colors.textPrimary,
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
        padding: 20,
    },
    emptyContainer: {
        paddingTop: 80,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 24,
        opacity: 0.5,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 22,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    browseButton: {
        backgroundColor: colors.accent,
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 20,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    browseButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
});
