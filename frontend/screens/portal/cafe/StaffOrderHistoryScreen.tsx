import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, Filter } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { CafeOrder } from '../../../types/cafe';

type RouteParams = {
    StaffOrderHistory: {
        cafeId: number;
        cafeName: string;
    };
};

type FilterType = 'all' | 'completed' | 'cancelled';

const StaffOrderHistoryScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'StaffOrderHistory'>>();
    const { t } = useTranslation();
    const { cafeId, cafeName } = route.params;

    const [orders, setOrders] = useState<CafeOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');

    useEffect(() => {
        loadOrders();
    }, [cafeId, filter]);

    const loadOrders = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            // In a real app, this would call cafeService.getOrderHistory(cafeId, filter)
            // For now, we'll use an empty array as placeholder
            const data: CafeOrder[] = [];
            setOrders(data);
        } catch (error) {
            console.error('Error loading order history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadOrders(true);
    };

    const getFilteredOrders = () => {
        if (filter === 'all') return orders;
        return orders.filter(order => {
            if (filter === 'completed') return order.status === 'completed';
            if (filter === 'cancelled') return order.status === 'cancelled';
            return true;
        });
    };

    const getTotalRevenue = () => {
        return getFilteredOrders()
            .filter(o => o.status === 'completed')
            .reduce((sum, order) => sum + (order.total || 0), 0);
    };

    const renderFilterButton = (filterType: FilterType, label: string) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                filter === filterType && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(filterType)}
        >
            <Text
                style={[
                    styles.filterButtonText,
                    filter === filterType && styles.filterButtonTextActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderOrderCard = (order: CafeOrder) => {
        const orderDate = new Date(order.createdAt);
        const isCompleted = order.status === 'completed';

        return (
            <View
                key={order.id}
                style={[
                    styles.orderCard,
                    !isCompleted && styles.orderCardCancelled,
                ]}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                        <Text style={styles.orderDate}>
                            {orderDate.toLocaleDateString('ru-RU')} {orderDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <View style={styles.orderStatus}>
                        <Text style={[
                            styles.statusBadge,
                            isCompleted ? styles.statusCompleted : styles.statusCancelled
                        ]}>
                            {isCompleted ? t('cafe.staff.history.filters.completed') : t('cafe.staff.history.filters.cancelled')}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderDetails}>
                    <Text style={styles.orderType}>
                        {t(`cafe.form.${order.orderType === 'dine_in' ? 'dineIn' : order.orderType}`)}
                        {order.tableInfo && ` • ${t('cafe.detail.tableInfo', { tableNumber: order.tableInfo.number })}`}
                    </Text>
                </View>

                <View style={styles.orderItems}>
                    {order.items?.slice(0, 2).map((item, index) => (
                        <Text key={index} style={styles.orderItem} numberOfLines={1}>
                            {item.quantity}× {item.dishName}
                        </Text>
                    ))}
                    {order.items && order.items.length > 2 && (
                        <Text style={styles.moreItems}>
                            +{order.items.length - 2} {t('cafe.staff.board.more')}
                        </Text>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.orderTotal}>{order.total} ₽</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>{t('cafe.staff.history.loading')}</Text>
            </View>
        );
    }

    const filteredOrders = getFilteredOrders();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{cafeName}</Text>
                    <Text style={styles.headerSubtitle}>{t('cafe.staff.history.title')}</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            {/* Stats bar */}
            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{filteredOrders.length}</Text>
                    <Text style={styles.statLabel}>{t('cafe.staff.history.stats.count')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{getTotalRevenue()} ₽</Text>
                    <Text style={styles.statLabel}>{t('cafe.staff.history.stats.revenue')}</Text>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterBar}>
                {renderFilterButton('all', t('cafe.staff.history.filters.all'))}
                {renderFilterButton('completed', t('cafe.staff.history.filters.completed'))}
                {renderFilterButton('cancelled', t('cafe.staff.history.filters.cancelled'))}
            </View>

            {/* Orders list */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {filteredOrders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Calendar size={64} color="#8E8E93" />
                        <Text style={styles.emptyTitle}>{t('cafe.staff.history.empty')}</Text>
                        <Text style={styles.emptyDesc}>{t('cafe.staff.history.emptyDesc')}</Text>
                    </View>
                ) : (
                    filteredOrders.map(renderOrderCard)
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 48,
        backgroundColor: '#1C1C1E',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    headerSubtitle: {
        color: '#8E8E93',
        fontSize: 12,
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E',
        padding: 16,
        marginHorizontal: 12,
        marginTop: 12,
        borderRadius: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#8E8E93',
        fontSize: 11,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#2C2C2E',
        marginVertical: 4,
    },
    filterBar: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#1C1C1E',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#FF6B00',
    },
    filterButtonText: {
        color: '#8E8E93',
        fontSize: 14,
        fontWeight: '600',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
    },
    orderCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#34C759',
    },
    orderCardCancelled: {
        borderLeftColor: '#FF3B30',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    orderNumber: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    orderDate: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
    },
    orderStatus: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusCompleted: {
        backgroundColor: '#34C75933',
        color: '#34C759',
    },
    statusCancelled: {
        backgroundColor: '#FF3B3033',
        color: '#FF3B30',
    },
    orderDetails: {
        marginBottom: 8,
    },
    orderType: {
        color: '#8E8E93',
        fontSize: 12,
    },
    orderItems: {
        marginBottom: 8,
    },
    orderItem: {
        color: '#FFFFFF',
        fontSize: 13,
        marginBottom: 2,
    },
    moreItems: {
        color: '#8E8E93',
        fontSize: 11,
        fontStyle: 'italic',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
    },
    orderTotal: {
        color: '#FF6B00',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptyDesc: {
        color: '#8E8E93',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});

export default StaffOrderHistoryScreen;
