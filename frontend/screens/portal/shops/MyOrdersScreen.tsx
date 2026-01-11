import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, useColorScheme, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { Order, OrderStatus } from '../../../types/market';
import { Skeleton } from '../../../components/market/Skeleton';
import { EmptyState } from '../../../components/market/EmptyState';
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

export const MyOrdersScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();

    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

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

            const result = await marketService.getMyOrders(
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

    const handleOrderPress = (order: Order) => {
        navigation.navigate('OrderDetails', { orderId: order.ID });
    };

    const handleStatusFilter = (status: OrderStatus | '') => {
        setSelectedStatus(status);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderSkeleton = () => (
        <View style={[styles.orderCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
            <View style={styles.orderHeader}>
                <View style={{ flex: 1 }}>
                    <Skeleton width="40%" height={18} style={{ marginBottom: 6 }} />
                    <Skeleton width="30%" height={12} />
                </View>
                <Skeleton width={80} height={24} borderRadius={12} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Skeleton width={28} height={28} borderRadius={14} style={{ marginRight: 8 }} />
                <Skeleton width="50%" height={14} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 }}>
                <Skeleton width={60} height={14} />
                <Skeleton width={100} height={18} />
            </View>
        </View>
    );

    const renderOrder = ({ item }: { item: Order }) => {
        const statusConfig = ORDER_STATUS_CONFIG[item.status];

        return (
            <TouchableOpacity
                style={[styles.orderCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}
                onPress={() => handleOrderPress(item)}
            >
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

                {/* Shop info */}
                {item.shopInfo && (
                    <View style={styles.shopRow}>
                        <View style={[styles.shopLogo, { backgroundColor: colors.primary + '20' }]}>
                            {item.shopInfo.logoUrl ? (
                                <Image source={{ uri: getMediaUrl(item.shopInfo.logoUrl) || '' }} style={styles.shopLogoImage} />
                            ) : (
                                <Text style={{ fontSize: 14 }}>🏪</Text>
                            )}
                        </View>
                        <Text style={[styles.shopName, { color: isDarkMode ? '#ddd' : colors.text }]}>
                            {item.shopInfo.name}
                        </Text>
                    </View>
                )}

                {/* Items preview */}
                <View style={styles.itemsRow}>
                    <Text style={[styles.itemsCount, { color: colors.textSecondary }]}>
                        {item.itemsCount} item{item.itemsCount > 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.orderTotal, { color: colors.primary }]}>
                        {item.total.toLocaleString()} {item.currency}
                    </Text>
                </View>

                <View style={styles.actionRow}>
                    <Text style={{ color: colors.primary, fontSize: 13 }}>View Details →</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.filterSection}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                    { id: '', label: 'All' },
                    { id: 'new', label: 'New' },
                    { id: 'confirmed', label: 'Confirmed' },
                    { id: 'shipped', label: 'Shipped' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
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

    return (
        <ProtectedScreen>
            <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
                <FlatList
                    data={loading ? [1, 2, 3] : orders}
                    renderItem={loading ? renderSkeleton : renderOrder}
                    keyExtractor={(item, index) => loading ? `skel-${index}` : item.ID.toString()}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <EmptyState
                            icon="📦"
                            title="No Orders Yet"
                            message="Your orders will appear here. Start exploring the marketplace to find something special!"
                            actionLabel="Start Shopping"
                            onAction={() => navigation.navigate('MarketHome')}
                        />
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
                    // Optimization
                    initialNumToRender={10}
                    removeClippedSubviews={true}
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
        paddingHorizontal: 16,
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
    shopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    shopLogo: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    shopLogoImage: {
        width: '100%',
        height: '100%',
    },
    shopName: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    itemsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    itemsCount: {
        fontSize: 13,
    },
    orderTotal: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    actionRow: {
        marginTop: 12,
        alignItems: 'flex-end',
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
        marginBottom: 24,
    },
    shopBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    shopBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    loadingFooter: {
        padding: 16,
        alignItems: 'center',
    },
});
