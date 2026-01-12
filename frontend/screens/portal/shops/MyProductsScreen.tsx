import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, useColorScheme, Image, TextInput
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { Product } from '../../../types/market';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';
import { EmptyState } from '../../../components/market/EmptyState';

export const MyProductsScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Data
    const [products, setProducts] = useState<Product[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useFocusEffect(
        useCallback(() => {
            loadProducts(1, true);
        }, [])
    );

    const loadProducts = async (pageNum: number, reset: boolean = false) => {
        try {
            if (reset) setLoading(true);

            const result = await marketService.getMyProducts(pageNum, 20);

            if (reset) {
                setProducts(result.products || []);
            } else {
                setProducts(prev => [...prev, ...(result.products || [])]);
            }

            setPage(result.page);
            setTotalPages(result.totalPages);
            setTotalItems(result.total);
        } catch (error) {
            console.error('Error loading my products:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadProducts(1, true);
    };

    const onLoadMore = () => {
        if (loadingMore || page >= totalPages) return;
        setLoadingMore(true);
        loadProducts(page + 1, false);
    };

    const handleAddProduct = () => {
        navigation.navigate('CreateProduct');
    };

    const handleProductPress = (product: Product) => {
        navigation.navigate('EditProduct', { productId: product.ID });
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const statusColor = item.status === 'active' ? '#4CAF50' : '#FFC107';

        return (
            <TouchableOpacity
                style={[styles.productCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}
                onPress={() => handleProductPress(item)}
            >
                <View style={styles.imageContainer}>
                    {item.mainImageUrl ? (
                        <Image
                            source={{ uri: getMediaUrl(item.mainImageUrl) || '' }}
                            style={styles.productImage}
                        />
                    ) : (
                        <View style={[styles.placeholderImage, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={{ fontSize: 24 }}>📦</Text>
                        </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>
                            {item.status === 'active' ? t('market.seller.active') : item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.productInfo}>
                    <Text
                        style={[styles.productName, { color: isDarkMode ? '#fff' : colors.text }]}
                        numberOfLines={2}
                    >
                        {item.name}
                    </Text>

                    <View style={styles.priceRow}>
                        <Text style={[styles.productPrice, { color: colors.primary }]}>
                            {item.basePrice.toLocaleString()} {item.currency}
                        </Text>
                        {item.salePrice && item.salePrice > 0 && (
                            <Text style={[styles.salePrice, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                                {item.salePrice.toLocaleString()}
                            </Text>
                        )}
                    </View>

                    <View style={styles.statsRow}>
                        <Text style={[styles.statText, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.seller.stock')}: {item.stock}
                        </Text>
                        <Text style={[styles.statText, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.views')} {item.viewsCount || 0}
                        </Text>
                        <Text style={[styles.statText, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.sold')}: {item.salesCount || 0}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing && page === 1) {
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
                <View style={styles.header}>
                    <Text style={[styles.subtitle, { color: isDarkMode ? '#ddd' : colors.textSecondary }]}>
                        {totalItems} {t('market.shops.productsCount') || 'products'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={handleAddProduct}
                    >
                        <Text style={styles.addButtonText}>➕ {t('market.product.add')}</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={products}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.5}
                    ListEmptyComponent={
                        <EmptyState
                            icon="📦"
                            title={t('market.seller.noProducts') || 'No products yet'}
                            message={t('market.seller.noProductsMsg') || "You haven't listed any products."}
                            actionLabel={`+ ${t('market.product.add')}`}
                            onAction={handleAddProduct}
                        />
                    }
                    ListFooterComponent={loadingMore ? (
                        <View style={styles.loadingFooter}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : null}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    subtitle: {
        fontSize: 14,
    },
    addButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
    },
    productCard: {
        flexDirection: 'row',
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        height: 120,
    },
    imageContainer: {
        width: 120,
        height: '100%',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    productInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    productPrice: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    salePrice: {
        fontSize: 14,
        textDecorationLine: 'line-through',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statText: {
        fontSize: 12,
    },
    loadingFooter: {
        padding: 16,
        alignItems: 'center',
    },
});
