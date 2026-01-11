import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator, useColorScheme, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { Shop, ShopStats, Product } from '../../../types/market';
import { Skeleton } from '../../../components/market/Skeleton';
import { EmptyState } from '../../../components/market/EmptyState';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';

export const SellerDashboardScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();

    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasShop, setHasShop] = useState(false);
    const [shop, setShop] = useState<Shop | null>(null);
    const [stats, setStats] = useState<ShopStats | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);

            // Check if user has a shop
            const myShopResult = await marketService.getMyShop();
            setHasShop(myShopResult.hasShop);

            if (myShopResult.hasShop && myShopResult.shop) {
                setShop(myShopResult.shop);

                // Load stats and products
                const [statsData, productsData] = await Promise.all([
                    marketService.getSellerStats(),
                    marketService.getMyProducts(1, 10)
                ]);

                setStats(statsData);
                setProducts(productsData.products || []);
            }
        } catch (error) {
            console.error('Error loading seller data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleCreateShop = () => {
        navigation.navigate('CreateShop');
    };

    const handleEditShop = () => {
        navigation.navigate('EditShop', { shopId: shop?.ID });
    };

    const handleAddProduct = () => {
        navigation.navigate('CreateProduct');
    };

    const handleViewAllProducts = () => {
        navigation.navigate('MyProducts');
    };

    const handleViewOrders = () => {
        navigation.navigate('SellerOrders');
    };

    const handleProductPress = (product: Product) => {
        navigation.navigate('EditProduct', { productId: product.ID });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
                <ScrollView>
                    {/* Header Skeleton */}
                    <View style={[styles.shopHeader, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                        <View style={styles.shopHeaderContent}>
                            <Skeleton width={70} height={70} borderRadius={35} />
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
                                <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
                                <Skeleton width="30%" height={12} />
                            </View>
                        </View>
                    </View>

                    {/* Stats Grid Skeleton */}
                    <View style={styles.statsGrid}>
                        {[1, 2, 3, 4].map(i => (
                            <View key={i} style={[styles.statCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                                <Skeleton width={40} height={40} style={{ marginBottom: 8 }} />
                                <Skeleton width="50%" height={24} style={{ marginBottom: 4 }} />
                                <Skeleton width="40%" height={12} />
                            </View>
                        ))}
                    </View>

                    {/* Actions Skeleton */}
                    <View style={styles.actionsSection}>
                        <Skeleton width="48%" height={50} borderRadius={14} />
                        <Skeleton width="48%" height={50} borderRadius={14} />
                    </View>

                    {/* Products Scroll Skeleton */}
                    <View style={{ padding: 16 }}>
                        <Skeleton width="40%" height={20} style={{ marginBottom: 12 }} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {[1, 2].map(i => (
                                <View key={i} style={{ width: 150, height: 200, backgroundColor: isDarkMode ? '#252525' : '#fff', borderRadius: 14, padding: 10 }}>
                                    <Skeleton width="100%" height={120} borderRadius={10} style={{ marginBottom: 8 }} />
                                    <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
                                    <Skeleton width="50%" height={12} />
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // No shop yet - show create prompt
    if (!hasShop) {
        return (
            <ProtectedScreen>
                <View style={[styles.centerContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }]}>
                    <Text style={styles.noShopIcon}>🏪</Text>
                    <Text style={[styles.noShopTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                        {t('market.seller.noShop') || 'You don\'t have a shop yet'}
                    </Text>
                    <Text style={[styles.noShopDesc, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                        {t('market.seller.createPrompt') || 'Create your shop and start selling products to the community'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.createShopBtn, { backgroundColor: colors.gradientStart }]}
                        onPress={handleCreateShop}
                    >
                        <Text style={styles.createShopText}>
                            {t('market.seller.createShop')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ProtectedScreen>
        );
    }

    return (
        <ProtectedScreen>
            <ScrollView
                style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Shop Header */}
                <View style={[styles.shopHeader, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                    <View style={styles.shopHeaderContent}>
                        <View style={[styles.shopLogo, { backgroundColor: colors.primary + '30' }]}>
                            {shop?.logoUrl ? (
                                <Image source={{ uri: getMediaUrl(shop.logoUrl) || '' }} style={styles.logoImage} />
                            ) : (
                                <Text style={{ fontSize: 32 }}>🏪</Text>
                            )}
                        </View>
                        <View style={styles.shopInfo}>
                            <Text style={[styles.shopName, { color: isDarkMode ? '#fff' : colors.text }]}>
                                {shop?.name}
                            </Text>
                            <View style={[styles.statusBadge, {
                                backgroundColor: shop?.status === 'active' ? '#4CAF50' : '#FFC107'
                            }]}>
                                <Text style={styles.statusText}>
                                    {shop?.status === 'active' ? `✓ ${t('market.seller.active')}` : `⏳ ${t('market.seller.pending')}`}
                                </Text>
                            </View>
                            <Text style={[styles.shopCity, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                                📍 {shop?.city}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={handleEditShop}>
                        <Text style={{ color: colors.primary, fontSize: 14 }}>✏️ {t('common.save').slice(0, 3) /* Ред. */}</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                        <Text style={styles.statEmoji}>👁️</Text>
                        <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : colors.text }]}>
                            {stats?.totalViews || 0}
                        </Text>
                        <Text style={[styles.statLabel, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.views')}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                        <Text style={styles.statEmoji}>📦</Text>
                        <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : colors.text }]}>
                            {stats?.totalOrders || 0}
                        </Text>
                        <Text style={[styles.statLabel, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.seller.orders')}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                        <Text style={styles.statEmoji}>🛍️</Text>
                        <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : colors.text }]}>
                            {stats?.totalProducts || 0}
                        </Text>
                        <Text style={[styles.statLabel, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.seller.myProducts')}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
                        <Text style={styles.statEmoji}>⭐</Text>
                        <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : colors.text }]}>
                            {stats?.averageRating?.toFixed(1) || '-'}
                        </Text>
                        <Text style={[styles.statLabel, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.seller.rating')}
                        </Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsSection}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.gradientStart }]}
                        onPress={handleAddProduct}
                    >
                        <Text style={styles.actionIcon}>➕</Text>
                        <Text style={styles.actionText}>{t('market.product.add')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={handleViewOrders}
                    >
                        <Text style={styles.actionIcon}>📋</Text>
                        <Text style={styles.actionText}>{t('market.seller.orders')}</Text>
                        {(stats?.pendingOrders ?? 0) > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{stats?.pendingOrders}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Products Section */}
                <View style={styles.productsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                            {t('market.seller.myProducts')}
                        </Text>
                        <TouchableOpacity onPress={handleViewAllProducts}>
                            <Text style={{ color: colors.primary }}>{t('market.seller.viewAll')} →</Text>
                        </TouchableOpacity>
                    </View>

                    {products.length === 0 ? (
                        <EmptyState
                            icon="📦"
                            title={t('market.seller.noProducts') || 'No products yet'}
                            message={t('market.seller.noProductsMsg') || "You haven't listed any products. Let's add something beautiful to your shop!"}
                            actionLabel={`+ ${t('market.product.add')}`}
                            onAction={handleAddProduct}
                        />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScroll}>
                            {products.map((product) => (
                                <TouchableOpacity
                                    key={product.ID}
                                    style={[styles.productCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}
                                    onPress={() => handleProductPress(product)}
                                >
                                    <View style={styles.productImageContainer}>
                                        {product.mainImageUrl ? (
                                            <Image
                                                source={{ uri: getMediaUrl(product.mainImageUrl) || '' }}
                                                style={styles.productImage}
                                            />
                                        ) : (
                                            <View style={[styles.productPlaceholder, { backgroundColor: colors.primary + '30' }]}>
                                                <Text style={{ fontSize: 24 }}>📦</Text>
                                            </View>
                                        )}
                                        <View style={[styles.productStatus, {
                                            backgroundColor: product.status === 'active' ? '#4CAF50' : '#FFC107'
                                        }]}>
                                            <Text style={{ color: '#fff', fontSize: 10 }}>
                                                {product.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.productName, { color: isDarkMode ? '#fff' : colors.text }]} numberOfLines={2}>
                                        {product.name}
                                    </Text>
                                    <Text style={[styles.productPrice, { color: colors.primary }]}>
                                        {product.basePrice.toLocaleString()} {product.currency}
                                    </Text>
                                    <Text style={[styles.productStock, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                                        {t('market.seller.stock')}: {product.stock}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </ScrollView>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    noShopIcon: {
        fontSize: 72,
        marginBottom: 16,
    },
    noShopTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    noShopDesc: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    createShopBtn: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        elevation: 4,
    },
    createShopText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    shopHeader: {
        padding: 16,
        margin: 16,
        marginBottom: 8,
        borderRadius: 16,
        elevation: 2,
    },
    shopHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shopLogo: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    shopInfo: {
        flex: 1,
        marginLeft: 14,
    },
    shopName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    shopCity: {
        fontSize: 14,
        marginTop: 4,
    },
    editBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    statCard: {
        width: '45%',
        margin: '2.5%',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 2,
    },
    statEmoji: {
        fontSize: 24,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 13,
        marginTop: 2,
    },
    actionsSection: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 8,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 14,
        elevation: 3,
    },
    actionIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    actionText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    badge: {
        backgroundColor: '#FF5722',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    productsSection: {
        padding: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptyProducts: {
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    productsScroll: {
        flexDirection: 'row',
    },
    productCard: {
        width: 150,
        marginRight: 12,
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 2,
    },
    productImageContainer: {
        height: 120,
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    productPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productStatus: {
        position: 'absolute',
        top: 8,
        right: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        padding: 10,
        paddingBottom: 4,
    },
    productPrice: {
        fontSize: 15,
        fontWeight: 'bold',
        paddingHorizontal: 10,
    },
    productStock: {
        fontSize: 12,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
});
