import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, useColorScheme, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { Product, ProductCategoryConfig, ProductFilters } from '../../../types/market';
import { getMediaUrl } from '../../../utils/url';
import { Skeleton } from '../../../components/market/Skeleton';
import { EmptyState } from '../../../components/market/EmptyState';
import { ProductCard } from '../../../components/market/ProductCard';
import {
    ShoppingBag,
    Store,
    Map,
    BarChart3,
    Search,
    Tag,
    Book,
    Shirt,
    Salad,
    ChevronRight,
    Search as SearchIcon,
    X
} from 'lucide-react-native';

export const MarketHomeScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const currentLang = i18n.language === 'ru' ? 'ru' : 'en';

    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategoryConfig[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [])
    );

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // Load categories and products in parallel
            const [cats, result] = await Promise.all([
                marketService.getProductCategories(),
                marketService.getProducts({ page: 1, limit: 20, sort: 'newest' })
            ]);

            setCategories(cats);
            setProducts(result.products || []);
            setPage(result.page);
            setTotalPages(result.totalPages);
            setTotal(result.total);
        } catch (error) {
            console.error('Error loading market data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadProducts = async (pageNum: number, reset: boolean = false) => {
        try {
            const filters: ProductFilters = {
                page: pageNum,
                limit: 20,
                sort: 'newest',
            };

            if (selectedCategory) {
                filters.category = selectedCategory as any;
            }
            if (searchQuery.trim()) {
                filters.search = searchQuery.trim();
            }

            const result = await marketService.getProducts(filters);

            if (reset) {
                setProducts(result.products || []);
            } else {
                setProducts(prev => [...prev, ...(result.products || [])]);
            }

            setPage(result.page);
            setTotalPages(result.totalPages);
            setTotal(result.total);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadProducts(1, true);
        setRefreshing(false);
    };

    const onLoadMore = async () => {
        if (loadingMore || page >= totalPages) return;

        setLoadingMore(true);
        await loadProducts(page + 1, false);
        setLoadingMore(false);
    };

    const handleCategorySelect = (categoryId: string) => {
        const newCategory = categoryId === selectedCategory ? '' : categoryId;
        setSelectedCategory(newCategory);
        setPage(1);
        // Instant feedback for better UX
        setProducts([]);
        setLoading(true);

        // Use timeout to allow UI update before heavy fetch
        setTimeout(() => {
            loadProducts(1, true).finally(() => setLoading(false));
        }, 0);
    };

    const handleSearch = () => {
        setPage(1);
        setLoading(true);
        loadProducts(1, true).finally(() => setLoading(false));
    };

    const handleProductPress = (product: Product) => {
        navigation.navigate('ProductDetails', { productId: product.ID });
    };

    const getCategoryIcon = (emoji: string, size = 16, color = '#666') => {
        switch (emoji) {
            case '📚': return <Book size={size} color={color} />;
            case '👕': return <Shirt size={size} color={color} />;
            case '🍲': return <Salad size={size} color={color} />;
            case '🏷️': return <Tag size={size} color={color} />;
            default: return <Tag size={size} color={color} />;
        }
    };

    const handleShopsPress = () => {
        navigation.navigate('Shops');
    };

    const handleSellerDashboard = () => {
        navigation.navigate('SellerDashboard');
    };

    const renderProduct = ({ item }: { item: Product }) => (
        <ProductCard item={item} onPress={handleProductPress} />
    );

    const renderSkeleton = () => (
        <View style={styles.skeletonCard}>
            <Skeleton height={140} borderRadius={14} />
            <View style={{ padding: 10 }}>
                <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Skeleton width="50%" height={20} />
                </View>
            </View>
        </View>
    );

    const renderHeader = () => (
        <View>
            {/* Hero Section */}
            <View style={[styles.heroSection, { backgroundColor: colors.primary }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <ShoppingBag size={32} color="#fff" style={{ marginRight: 12 }} />
                    <Text style={styles.heroTitle}>{t('market.title')}</Text>
                </View>
                <Text style={styles.heroSubtitle}>
                    {t('market.subtitle')}
                </Text>

                <View style={styles.heroButtons}>
                    <TouchableOpacity style={styles.heroBtn} onPress={handleShopsPress}>
                        <Store size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.heroBtnText}>{t('market.shops')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('ShopsMap')}>
                        <Map size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.heroBtnText}>{t('market.map.title')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.heroBtn} onPress={handleSellerDashboard}>
                        <BarChart3 size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.heroBtnText}>{t('market.myShop')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchInputWrapper, { backgroundColor: isDarkMode ? '#333' : '#f5f5f5' }]}>
                    <Search size={18} color={isDarkMode ? '#888' : colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: isDarkMode ? '#fff' : colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t('market.search')}
                        placeholderTextColor={isDarkMode ? '#888' : colors.textSecondary}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); loadProducts(1, true); }}>
                            <X size={18} color={isDarkMode ? '#888' : colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
                    <SearchIcon size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Categories */}
            <View style={styles.categoriesSection}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{ id: '', emoji: '🏷️', label: { ru: 'Все', en: 'All' } }, ...categories]}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.categoryPill,
                                {
                                    backgroundColor: selectedCategory === item.id
                                        ? colors.primary
                                        : (isDarkMode ? '#333' : '#f0f0f0'),
                                    borderColor: selectedCategory === item.id ? colors.primary : 'rgba(0,0,0,0.05)',
                                    borderWidth: 1
                                }
                            ]}
                            onPress={() => handleCategorySelect(item.id)}
                        >
                            <View style={{ marginRight: 6 }}>
                                {getCategoryIcon(item.emoji, 14, selectedCategory === item.id ? '#fff' : colors.primary)}
                            </View>
                            <Text style={[
                                styles.categoryLabel,
                                { color: selectedCategory === item.id ? '#fff' : (isDarkMode ? '#fff' : colors.text) }
                            ]}>
                                {item.label[currentLang] || item.label.en}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.categoriesList}
                />
            </View>

            {/* Results Count */}
            {!loading && (
                <View style={styles.resultsHeader}>
                    <Text style={[styles.resultsCount, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                        {total} {t('market.productsFound')}
                    </Text>
                </View>
            )}
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
            <FlatList
                data={loading ? ([1, 2, 3, 4] as any) : products}
                renderItem={loading ? renderSkeleton : renderProduct}
                keyExtractor={(item, index) => loading ? `skel-${index}` : item.ID.toString()}
                numColumns={2}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <EmptyState
                        icon={<ShoppingBag size={64} color={isDarkMode ? '#555' : colors.textSecondary} opacity={0.5} />}
                        title={t('market.noProductsTitle')}
                        message={t('market.noProductsMsg')}
                        actionLabel={t('market.clearFilters')}
                        onAction={() => {
                            setSelectedCategory('');
                            setSearchQuery('');
                            loadProducts(1, true);
                        }}
                    />
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                // List Optimization props
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroSection: {
        padding: 24,
        paddingTop: 16,
        paddingBottom: 20,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    heroButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 12,
    },
    heroBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    heroBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    searchInputWrapper: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        paddingHorizontal: 4,
    },
    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonCard: {
        flex: 1,
        margin: 6,
        borderRadius: 14,
        overflow: 'hidden',
    },
    categoriesSection: {
        marginBottom: 8,
    },
    categoriesList: {
        paddingHorizontal: 16,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        marginRight: 8,
    },
    categoryEmoji: {
        fontSize: 14,
        marginRight: 6,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    resultsHeader: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    resultsCount: {
        fontSize: 13,
    },
    listContent: {
        paddingBottom: 20,
    },
    columnWrapper: {
        paddingHorizontal: 8,
    },
    loadingFooter: {
        padding: 16,
        alignItems: 'center',
    },
});
