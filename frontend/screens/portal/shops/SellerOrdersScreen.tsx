import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Image, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../../services/marketService';
import { Order, OrderStatus } from '../../../types/market';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; tone: 'accent' | 'success' | 'warning' | 'danger'; emoji: string }> = {
    new: { label: 'New', tone: 'accent', emoji: '🆕' },
    confirmed: { label: 'Confirmed', tone: 'accent', emoji: '✅' },
    paid: { label: 'Paid', tone: 'success', emoji: '💰' },
    shipped: { label: 'Shipped', tone: 'warning', emoji: '📦' },
    delivered: { label: 'Delivered', tone: 'success', emoji: '🎉' },
    completed: { label: 'Completed', tone: 'success', emoji: '✨' },
    cancelled: { label: 'Cancelled', tone: 'danger', emoji: '❌' },
    dispute: { label: 'Dispute', tone: 'danger', emoji: '⚠️' },
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    new: ['confirmed', 'cancelled'],
    confirmed: ['paid', 'cancelled'],
    paid: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
    dispute: ['cancelled'],
};

export const SellerOrdersScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);

    const [orders, setOrders] = useState<Order[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

    useFocusEffect(
        useCallback(() => {
            loadOrders(1, true);
        }, [selectedStatus])
    );

    const loadOrders = async (pageNum: number, reset: boolean = false) => {
        try {
            if (reset) setLoading(true);

            const result = await marketService.getSellerOrders(
                pageNum,
                20,
                selectedStatus || undefined
            );

            if (reset) {
                setOrders(result.orders || []);
            } else {
                setOrders(prev => [...prev, ...(result.orders || [])]);
            }

            setPage(result.page);
            setTotalPages(result.totalPages);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders(1, true);
    };

    const onLoadMore = () => {
        if (loadingMore || page >= totalPages) return;
        setLoadingMore(true);
        loadOrders(page + 1, false);
    };

    const handleStatusFilter = (status: OrderStatus | '') => {
        setSelectedStatus(status);
    };

    const handleContactBuyer = async (order: Order) => {
        try {
            const result = await marketService.contactBuyer(order.ID);
            // Navigate to messages with the buyer
            navigation.navigate('Chat', { userId: result.buyerId, name: result.buyerName });
        } catch (error) {
            console.error('Error contacting buyer:', error);
            Alert.alert('Error', 'Failed to open chat');
        }
    };

    const handleUpdateStatus = (order: Order) => {
        const availableTransitions = STATUS_TRANSITIONS[order.status];

        if (availableTransitions.length === 0) {
            Alert.alert('Info', 'No status changes available for this order');
            return;
        }

        const options = availableTransitions.map(status => ({
            text: `${ORDER_STATUS_CONFIG[status].emoji} ${ORDER_STATUS_CONFIG[status].label}`,
            onPress: () => confirmStatusUpdate(order, status),
        }));

        Alert.alert(
            'Update Order Status',
            `Current: ${ORDER_STATUS_CONFIG[order.status].label}`,
            [...options, { text: 'Cancel', style: 'cancel' }]
        );
    };

    const confirmStatusUpdate = async (order: Order, newStatus: OrderStatus) => {
        setUpdatingOrder(order.ID);
        try {
            await marketService.updateOrderStatus(order.ID, newStatus);

            // Update local state
            setOrders(prev => prev.map(o =>
                o.ID === order.ID ? { ...o, status: newStatus } : o
            ));

            Alert.alert('Success', `Order status updated to ${ORDER_STATUS_CONFIG[newStatus].label}`);
        } catch (error: any) {
            console.error('Error updating status:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to update order status');
        } finally {
            setUpdatingOrder(null);
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const statusConfig = ORDER_STATUS_CONFIG[item.status];
        const isUpdating = updatingOrder === item.ID;
        const canUpdate = STATUS_TRANSITIONS[item.status].length > 0;
        const statusColor = statusConfig.tone === 'success'
            ? colors.success
            : statusConfig.tone === 'warning'
                ? colors.warning
                : statusConfig.tone === 'danger'
                    ? colors.danger
                    : colors.accent;

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderNumber}>
                            #{item.orderNumber}
                        </Text>
                        <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                            {formatDate(item.CreatedAt)}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.accentSoft }]}>
                        <Text style={{ fontSize: 12 }}>{statusConfig.emoji}</Text>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                {/* Buyer info */}
                {item.buyerInfo && (
                    <View style={styles.buyerRow}>
                        <View style={styles.buyerAvatar}>
                            {item.buyerInfo.avatarUrl ? (
                                <Image source={{ uri: getMediaUrl(item.buyerInfo.avatarUrl) || '' }} style={styles.avatarImage} />
                            ) : (
                                <Text style={{ fontSize: 14 }}>👤</Text>
                            )}
                        </View>
                        <View style={styles.buyerInfo}>
                            <Text style={styles.buyerName}>
                                {item.buyerName || item.buyerInfo.spiritualName || item.buyerInfo.karmicName}
                            </Text>
                            {item.buyerPhone && (
                                <Text style={[styles.buyerContact, { color: colors.textSecondary }]}>
                                    📞 {item.buyerPhone}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Delivery info */}
                <View style={styles.deliveryRow}>
                    <Text style={{ fontSize: 14 }}>{item.deliveryType === 'delivery' ? '🚚' : '🏪'}</Text>
                    <Text style={styles.deliveryText}>
                        {item.deliveryType === 'delivery' ? item.deliveryAddress : 'Pickup'}
                    </Text>
                </View>

                {/* Order total */}
                <View style={styles.totalRow}>
                    <Text style={[styles.itemsCount, { color: colors.textSecondary }]}>
                        {item.itemsCount} item{item.itemsCount > 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.orderTotal, { color: colors.accent }]}>
                        {item.total.toLocaleString()} {item.currency}
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                        onPress={() => handleContactBuyer(item)}
                    >
                        <Text style={styles.actionBtnText}>💬 Contact</Text>
                    </TouchableOpacity>

                    {canUpdate && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.secondaryActionBtn]}
                            onPress={() => handleUpdateStatus(item)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator size="small" color={colors.accent} />
                            ) : (
                                <Text style={[styles.actionBtnText, styles.secondaryActionBtnText]}>
                                    ✏️ Update
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderHeader = () => (
        <View style={styles.filterSection}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                    { id: '', label: 'All', emoji: '📋' },
                    { id: 'new', label: 'New', emoji: '🆕' },
                    { id: 'confirmed', label: 'Confirmed', emoji: '✅' },
                    { id: 'shipped', label: 'Shipped', emoji: '📦' },
                    { id: 'completed', label: 'Completed', emoji: '✨' },
                ]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            { backgroundColor: selectedStatus === item.id ? colors.accent : colors.surfaceElevated }
                        ]}
                        onPress={() => handleStatusFilter(item.id as OrderStatus | '')}
                    >
                        <Text style={{ marginRight: 4 }}>{item.emoji}</Text>
                        <Text style={[
                            styles.filterLabel,
                            { color: selectedStatus === item.id ? colors.textPrimary : colors.textPrimary }
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.filterList}
            />
        </View>
    );

    if (loading) {
        return (
            <ProtectedScreen>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </ProtectedScreen>
        );
    }

    return (
        <ProtectedScreen>
            <View style={styles.screen}>
                <FlatList
                    data={orders}
                    renderItem={renderOrder}
                    keyExtractor={(item) => item.ID.toString()}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📦</Text>
                            <Text style={styles.emptyTitle}>
                                No Orders Yet
                            </Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Orders from buyers will appear here
                            </Text>
                        </View>
                    }
                    ListFooterComponent={loadingMore ? (
                        <View style={styles.loadingFooter}>
                            <ActivityIndicator size="small" color={colors.accent} />
                        </View>
                    ) : null}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        </ProtectedScreen>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    filterSection: {
        marginBottom: 12,
    },
    filterList: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 20,
    },
    orderCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        backgroundColor: colors.surface,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderNumber: {
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    orderDate: {
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    buyerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    buyerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: colors.accentSoft,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    buyerInfo: {
        marginLeft: 10,
    },
    buyerName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    buyerContact: {
        fontSize: 12,
        marginTop: 2,
    },
    deliveryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    deliveryText: {
        marginLeft: 8,
        fontSize: 13,
        flex: 1,
        color: colors.textSecondary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    itemsCount: {
        fontSize: 13,
    },
    orderTotal: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionBtnText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    secondaryActionBtn: {
        backgroundColor: colors.surfaceElevated,
    },
    secondaryActionBtnText: {
        color: colors.textPrimary,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: colors.textPrimary,
    },
    emptyText: {
        fontSize: 15,
    },
    loadingFooter: {
        padding: 16,
        alignItems: 'center',
    },
});
