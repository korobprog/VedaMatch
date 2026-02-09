import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../../services/marketService';
import { Order, OrderStatus } from '../../../types/market';
import { Skeleton } from '../../../components/market/Skeleton';
import { EmptyState } from '../../../components/market/EmptyState';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; tone: 'accent' | 'success' | 'warning' | 'danger' | 'secondary'; emoji: string }> = {
    new: { label: 'New', tone: 'accent', emoji: '🆕' },
    confirmed: { label: 'Confirmed', tone: 'accent', emoji: '✅' },
    paid: { label: 'Paid', tone: 'success', emoji: '💰' },
    shipped: { label: 'Shipped', tone: 'warning', emoji: '📦' },
    delivered: { label: 'Delivered', tone: 'success', emoji: '🎉' },
    completed: { label: 'Completed', tone: 'success', emoji: '✨' },
    cancelled: { label: 'Cancelled', tone: 'danger', emoji: '❌' },
    dispute: { label: 'Dispute', tone: 'danger', emoji: '⚠️' },
};

export const MyOrdersScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
        <View style={styles.orderCard}>
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
            <View style={styles.skeletonFooter}>
                <Skeleton width={60} height={14} />
                <Skeleton width={100} height={18} />
            </View>
        </View>
    );

    const renderOrder = ({ item }: { item: Order }) => {
        const statusConfig = ORDER_STATUS_CONFIG[item.status];
        const statusColor = statusConfig.tone === 'success'
            ? colors.success
            : statusConfig.tone === 'warning'
                ? colors.warning
                : statusConfig.tone === 'danger'
                    ? colors.danger
                    : statusConfig.tone === 'secondary'
                        ? colors.textSecondary
                        : colors.accent;

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => handleOrderPress(item)}
            >
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={[styles.orderNumber, { color: colors.textPrimary }]}>
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

                {/* Shop info */}
                {item.shopInfo && (
                    <View style={styles.shopRow}>
                        <View style={[styles.shopLogo, { backgroundColor: colors.accentSoft }]}>
                            {item.shopInfo.logoUrl ? (
                                <Image source={{ uri: getMediaUrl(item.shopInfo.logoUrl) || '' }} style={styles.shopLogoImage} />
                            ) : (
                                <Text style={{ fontSize: 14 }}>🏪</Text>
                            )}
                        </View>
                        <Text style={[styles.shopName, { color: colors.textPrimary }]}>
                            {item.shopInfo.name}
                        </Text>
                    </View>
                )}

                {/* Items preview */}
                <View style={styles.itemsRow}>
                    <Text style={[styles.itemsCount, { color: colors.textSecondary }]}>
                        {item.itemsCount} item{item.itemsCount > 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.orderTotal, { color: colors.accent }]}>
                        {item.total.toLocaleString()} {item.currency}
                    </Text>
                </View>

                <View style={styles.actionRow}>
                    <Text style={{ color: colors.accent, fontSize: 13 }}>View Details →</Text>
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
                            { backgroundColor: selectedStatus === item.id ? colors.accent : colors.surface }
                        ]}
                        onPress={() => handleStatusFilter(item.id as OrderStatus | '')}
                    >
                        <Text style={[
                            styles.filterLabel,
                            { color: selectedStatus === item.id ? colors.textPrimary : colors.textSecondary }
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
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {loading ? (
                    <FlatList
                        data={[1, 2, 3]}
                        renderItem={renderSkeleton}
                        keyExtractor={(_, index) => `skel-${index}`}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={styles.listContent}
                        removeClippedSubviews={true}
                    />
                ) : (
                    <FlatList
                        data={orders}
                        renderItem={renderOrder}
                        keyExtractor={(item) => item.ID.toString()}
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
                                <ActivityIndicator size="small" color={colors.accent} />
                            </View>
                        ) : null}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        onEndReached={onLoadMore}
                        onEndReachedThreshold={0.5}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={10}
                        removeClippedSubviews={true}
                    />
                )}
            </View>
        </ProtectedScreen>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
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
        borderTopColor: colors.border,
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
        color: 'rgba(255,255,255,1)',
        fontSize: 15,
        fontWeight: '600',
    },
    skeletonFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    loadingFooter: {
        padding: 16,
        alignItems: 'center',
    },
});
