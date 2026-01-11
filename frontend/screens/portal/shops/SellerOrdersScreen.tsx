import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, useColorScheme, Image, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { Order, OrderStatus } from '../../../types/market';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; emoji: string }> = {
    new: { label: 'New', color: '#2196F3', emoji: '🆕' },
    confirmed: { label: 'Confirmed', color: '#9C27B0', emoji: '✅' },
    paid: { label: 'Paid', color: '#4CAF50', emoji: '💰' },
    shipped: { label: 'Shipped', color: '#FF9800', emoji: '📦' },
    delivered: { label: 'Delivered', color: '#4CAF50', emoji: '🎉' },
    completed: { label: 'Completed', color: '#4CAF50', emoji: '✨' },
    cancelled: { label: 'Cancelled', color: '#f44336', emoji: '❌' },
    dispute: { label: 'Dispute', color: '#f44336', emoji: '⚠️' },
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

    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

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

        return (
            <View style={[styles.orderCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={[styles.orderNumber, { color: isDarkMode ? '#fff' : colors.text }]}>
                            #{item.orderNumber}
                        </Text>
                        <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                            {formatDate(item.CreatedAt)}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                        <Text style={{ fontSize: 12 }}>{statusConfig.emoji}</Text>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                {/* Buyer info */}
                {item.buyerInfo && (
                    <View style={styles.buyerRow}>
                        <View style={[styles.buyerAvatar, { backgroundColor: colors.primary + '20' }]}>
                            {item.buyerInfo.avatarUrl ? (
                                <Image source={{ uri: getMediaUrl(item.buyerInfo.avatarUrl) || '' }} style={styles.avatarImage} />
                            ) : (
                                <Text style={{ fontSize: 14 }}>👤</Text>
                            )}
                        </View>
                        <View style={styles.buyerInfo}>
                            <Text style={[styles.buyerName, { color: isDarkMode ? '#ddd' : colors.text }]}>
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
                    <Text style={[styles.deliveryText, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                        {item.deliveryType === 'delivery' ? item.deliveryAddress : 'Pickup'}
                    </Text>
                </View>

                {/* Order total */}
                <View style={styles.totalRow}>
                    <Text style={[styles.itemsCount, { color: colors.textSecondary }]}>
                        {item.itemsCount} item{item.itemsCount > 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.orderTotal, { color: colors.primary }]}>
                        {item.total.toLocaleString()} {item.currency}
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleContactBuyer(item)}
                    >
                        <Text style={styles.actionBtnText}>💬 Contact</Text>
                    </TouchableOpacity>

                    {canUpdate && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#444' : '#f0f0f0' }]}
                            onPress={() => handleUpdateStatus(item)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={[styles.actionBtnText, { color: isDarkMode ? '#fff' : colors.text }]}>
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
                            { backgroundColor: selectedStatus === item.id ? colors.primary : (isDarkMode ? '#333' : '#f0f0f0') }
                        ]}
                        onPress={() => handleStatusFilter(item.id as OrderStatus | '')}
                    >
                        <Text style={{ marginRight: 4 }}>{item.emoji}</Text>
                        <Text style={[
                            styles.filterLabel,
                            { color: selectedStatus === item.id ? '#fff' : (isDarkMode ? '#fff' : colors.text) }
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
                <View style={[styles.centerContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ProtectedScreen>
        );
    }

    return (
        <ProtectedScreen>
            <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
                <FlatList
                    data={orders}
                    renderItem={renderOrder}
                    keyExtractor={(item) => item.ID.toString()}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📦</Text>
                            <Text style={[styles.emptyTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                                No Orders Yet
                            </Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Orders from buyers will appear here
                            </Text>
                        </View>
                    }
                    ListFooterComponent={loadingMore ? (
                        <View style={styles.loadingFooter}>
                            <ActivityIndicator size="small" color={colors.primary} />
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

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    deliveryText: {
        marginLeft: 8,
        fontSize: 13,
        flex: 1,
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
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
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
    },
    emptyText: {
        fontSize: 15,
    },
    loadingFooter: {
        padding: 16,
        alignItems: 'center',
    },
});
