import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Hand, MinusCircle, Clock, Grid3X3, UtensilsCrossed, ShoppingBag, Car } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import {
    CafeOrder,
    CafeOrderStatus,
    getOrderStatusLabel,
    getOrderStatusColor,
    getOrderTypeLabel,
    ActiveOrdersResponse,
    OrderStatsResponse,
} from '../../../types/cafe';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 3;

type RouteParams = {
    StaffOrderBoard: {
        cafeId: number;
        cafeName: string;
    };
};

const StaffOrderBoardScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'StaffOrderBoard'>>();
    const { t } = useTranslation();
    const { cafeId, cafeName } = route.params;

    const [activeOrders, setActiveOrders] = useState<ActiveOrdersResponse | null>(null);
    const [stats, setStats] = useState<OrderStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<CafeOrder | null>(null);

    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadData();

        // Poll for updates every 5 seconds
        pollInterval.current = setInterval(() => {
            loadData(true);
        }, 5000);

        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, [cafeId]);

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const [ordersData, statsData] = await Promise.all([
                cafeService.getActiveOrders(cafeId),
                cafeService.getOrderStats(cafeId),
            ]);

            setActiveOrders(ordersData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading orders:', error);
            if (!silent) {
                Alert.alert(t('common.error'), t('cafe.staff.board.refreshError'));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleStatusChange = async (order: CafeOrder, newStatus: CafeOrderStatus) => {
        try {
            await cafeService.updateOrderStatus(order.id, newStatus);
            loadData(true);
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.staff.board.statusUpdateError'));
        }
    };

    const getNextStatus = (currentStatus: CafeOrderStatus): CafeOrderStatus | null => {
        const statusFlow: Record<string, CafeOrderStatus> = {
            new: 'confirmed',
            confirmed: 'preparing',
            preparing: 'ready',
            ready: 'served',
            served: 'completed',
        };
        return statusFlow[currentStatus] || null;
    };

    const getNextStatusAction = (status: CafeOrderStatus): string => {
        const actions: Record<string, string> = {
            new: t('cafe.staff.board.actions.accept'),
            confirmed: t('cafe.staff.board.actions.start'),
            preparing: t('cafe.staff.board.actions.ready'),
            ready: t('cafe.staff.board.actions.served'),
            served: t('cafe.staff.board.actions.complete'),
        };
        return actions[status] || '';
    };

    const renderOrderTypeIcon = (orderType: string) => {
        if (orderType === 'dine_in') return <UtensilsCrossed size={14} color="#8E8E93" />;
        if (orderType === 'takeaway') return <ShoppingBag size={14} color="#8E8E93" />;
        return <Car size={14} color="#8E8E93" />;
    };

    const renderOrderCard = (order: CafeOrder) => {
        const nextStatus = getNextStatus(order.status);
        const timeSinceCreated = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);
        const isUrgent = timeSinceCreated > 15 && order.status !== 'completed';

        return (
            <TouchableOpacity
                key={order.id}
                style={[
                    styles.orderCard,
                    isUrgent && styles.orderCardUrgent,
                ]}
                onPress={() => setSelectedOrder(order)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Text style={styles.orderTime}>{timeSinceCreated} {t('common.min')}</Text>
                </View>

                <View style={styles.orderType}>
                    {renderOrderTypeIcon(order.orderType)}
                    <Text style={styles.orderTypeText}>
                        {t(`cafe.form.${order.orderType === 'dine_in' ? 'dineIn' : order.orderType}`)}
                        {order.tableInfo && ` • ${t('cafe.detail.tableInfo', { tableNumber: order.tableInfo.number })}`}
                    </Text>
                </View>

                <View style={styles.orderItems}>
                    {order.items?.slice(0, 3).map((item, index) => (
                        <Text key={index} style={styles.orderItem} numberOfLines={1}>
                            {item.quantity}× {item.dishName}
                        </Text>
                    ))}
                    {order.items && order.items.length > 3 && (
                        <Text style={styles.moreItems}>
                            +{order.items.length - 3} {t('cafe.staff.board.more')}
                        </Text>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.orderTotal}>{order.total} ₽</Text>
                    {nextStatus && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleStatusChange(order, nextStatus)}
                        >
                            <Text style={styles.actionButtonText}>
                                {getNextStatusAction(order.status)}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderColumn = (title: string, orders: CafeOrder[], color: string) => (
        <View style={styles.column}>
            <View style={[styles.columnHeader, { borderTopColor: color }]}>
                <Text style={styles.columnTitle}>{title}</Text>
                <View style={[styles.columnBadge, { backgroundColor: color }]}>
                    <Text style={styles.columnBadgeText}>{orders.length}</Text>
                </View>
            </View>
            <ScrollView
                style={styles.columnContent}
                showsVerticalScrollIndicator={false}
            >
                {orders.map(renderOrderCard)}
                {orders.length === 0 && (
                    <View style={styles.emptyColumn}>
                        <Text style={styles.emptyColumnText}>{t('cafe.staff.board.noOrders')}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>{t('cafe.staff.board.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{cafeName}</Text>
                    <Text style={styles.headerSubtitle}>{t('cafe.staff.board.title')}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('StaffWaiterCalls', { cafeId, cafeName })}>
                    <Hand size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Stats bar */}
            {stats && (
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.todayOrders}</Text>
                        <Text style={styles.statLabel}>{t('cafe.staff.board.orders')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.todayRevenue} ₽</Text>
                        <Text style={styles.statLabel}>{t('cafe.staff.board.revenue')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                        <Text style={styles.statLabel}>{t('cafe.staff.board.active')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={stats.avgPrepTime > 0 ? styles.statValue : { color: '#8E8E93' }}>
                            ~{stats.avgPrepTime} {t('common.min')}
                        </Text>
                        <Text style={styles.statLabel}>{t('cafe.staff.board.avgTime')}</Text>
                    </View>
                </View>
            )}

            {/* Order columns */}
            <ScrollView
                horizontal
                style={styles.columnsContainer}
                contentContainerStyle={styles.columnsContent}
                showsHorizontalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {activeOrders && (
                    <>
                        {renderColumn(t('cafe.staff.board.columns.new'), activeOrders.new, '#FF9500')}
                        {renderColumn(t('cafe.staff.board.columns.preparing'), activeOrders.preparing, '#5856D6')}
                        {renderColumn(t('cafe.staff.board.columns.ready'), activeOrders.ready, '#34C759')}
                    </>
                )}
            </ScrollView>

            {/* Quick action buttons */}
            <View style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.bottomButton}
                    onPress={() => navigation.navigate('StaffStopList', { cafeId, cafeName })}
                >
                    <MinusCircle size={20} color="#FF3B30" />
                    <Text style={styles.bottomButtonText}>{t('cafe.staff.board.stopList')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.bottomButton}
                    onPress={() => navigation.navigate('StaffOrderHistory', { cafeId, cafeName })}
                >
                    <Clock size={20} color="#8E8E93" />
                    <Text style={styles.bottomButtonText}>{t('cafe.staff.board.history')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.bottomButton}
                    onPress={() => navigation.navigate('StaffTableEditor', { cafeId, cafeName })}
                >
                    <Grid3X3 size={20} color="#007AFF" />
                    <Text style={styles.bottomButtonText}>{t('cafe.staff.board.tables')}</Text>
                </TouchableOpacity>
            </View>
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
        padding: 12,
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
        fontSize: 16,
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
    columnsContainer: {
        flex: 1,
        marginTop: 12,
    },
    columnsContent: {
        paddingHorizontal: 12,
    },
    column: {
        width: COLUMN_WIDTH,
        marginHorizontal: 4,
    },
    columnHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1C1E',
        padding: 12,
        borderRadius: 8,
        borderTopWidth: 3,
        marginBottom: 8,
    },
    columnTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    columnBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    columnBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    columnContent: {
        flex: 1,
    },
    orderCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    orderCardUrgent: {
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    orderNumber: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    orderTime: {
        color: '#8E8E93',
        fontSize: 12,
    },
    orderType: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderTypeText: {
        color: '#8E8E93',
        fontSize: 11,
        marginLeft: 4,
    },
    orderItems: {
        marginBottom: 8,
    },
    orderItem: {
        color: '#FFFFFF',
        fontSize: 12,
        marginBottom: 2,
    },
    moreItems: {
        color: '#8E8E93',
        fontSize: 11,
        fontStyle: 'italic',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderTotal: {
        color: '#FF6B00',
        fontSize: 13,
        fontWeight: 'bold',
    },
    actionButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    emptyColumn: {
        alignItems: 'center',
        padding: 20,
    },
    emptyColumnText: {
        color: '#8E8E93',
        fontSize: 12,
    },
    bottomActions: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E',
        padding: 12,
        paddingBottom: 32,
        gap: 12,
    },
    bottomButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#2C2C2E',
        padding: 12,
        borderRadius: 10,
    },
    bottomButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
    },
});

export default StaffOrderBoardScreen;
