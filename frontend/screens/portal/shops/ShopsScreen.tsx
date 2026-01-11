import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, useColorScheme, Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { Shop, ShopCategoryConfig, ShopFilters } from '../../../types/market';
import { getMediaUrl } from '../../../utils/url';

export const ShopsScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const currentLang = i18n.language === 'ru' ? 'ru' : 'en';

    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [shops, setShops] = useState<Shop[]>([]);
    const [categories, setCategories] = useState<ShopCategoryConfig[]>([]);
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

            // Load categories
            const cats = await marketService.getShopCategories();
            setCategories(cats);

            // Load shops
            await loadShops(1, true);
        } catch (error) {
            console.error('Error loading shops data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadShops = async (pageNum: number, reset: boolean = false) => {
        try {
            const filters: ShopFilters = {
                page: pageNum,
                limit: 20,
                sort: 'rating',
                status: 'active',
            };

            if (selectedCategory) {
                filters.category = selectedCategory as any;
            }
            if (searchQuery.trim()) {
                filters.search = searchQuery.trim();
            }

            const result = await marketService.getShops(filters);

            if (reset) {
                setShops(result.shops || []);
            } else {
                setShops(prev => [...prev, ...(result.shops || [])]);
            }

            setPage(result.page);
            setTotalPages(result.totalPages);
            setTotal(result.total);
        } catch (error) {
            console.error('Error loading shops:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadShops(1, true);
        setRefreshing(false);
    };

    const onLoadMore = async () => {
        if (loadingMore || page >= totalPages) return;

        setLoadingMore(true);
        await loadShops(page + 1, false);
        setLoadingMore(false);
    };

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
        setPage(1);
        loadShops(1, true);
    };

    const handleSearch = () => {
        setPage(1);
        loadShops(1, true);
    };

    const handleShopPress = (shop: Shop) => {
        navigation.navigate('ShopDetails', { shopId: shop.ID });
    };

    const renderShop = ({ item }: { item: Shop }) => (
        <TouchableOpacity
            style={[styles.shopCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}
            onPress={() => handleShopPress(item)}
        >
            <View style={styles.shopImageContainer}>
                {item.logoUrl ? (
                    <Image source={{ uri: getMediaUrl(item.logoUrl) || '' }} style={styles.shopLogo} />
                ) : (
                    <View style={[styles.shopLogoPlaceholder, { backgroundColor: colors.primary + '30' }]}>
                        <Text style={{ fontSize: 40 }}>🏪</Text>
                    </View>
                )}
            </View>

            <View style={styles.shopInfo}>
                <Text style={[styles.shopName, { color: isDarkMode ? '#fff' : colors.text }]} numberOfLines={1}>
                    {item.name}
                </Text>

                <Text style={[styles.shopCategory, { color: isDarkMode ? '#aaa' : colors.textSecondary }]} numberOfLines={1}>
                    {item.category}
                </Text>

                <View style={styles.shopMeta}>
                    {item.rating > 0 ? (
                        <View style={styles.ratingContainer}>
                            <Text style={styles.ratingText}>★ {item.rating.toFixed(1)}</Text>
                            <Text style={[styles.reviewsCount, { color: isDarkMode ? '#888' : colors.textSecondary }]}>
                                ({item.reviewsCount})
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.newShop, { color: colors.primary }]}>{t('market.new')}</Text>
                    )}

                    <Text style={[styles.shopCity, { color: isDarkMode ? '#888' : colors.textSecondary }]}>
                        📍 {item.city}
                    </Text>
                </View>

                <Text style={[styles.productsCount, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                    {item.productsCount} {t('market.map.productsCount')}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, {
                        backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                        color: isDarkMode ? '#fff' : colors.text
                    }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('market.searchShops')}
                    placeholderTextColor={isDarkMode ? '#888' : colors.textSecondary}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
                    <Text style={{ color: '#fff', fontSize: 16 }}>🔍</Text>
                </TouchableOpacity>
            </View>

            {/* Categories */}
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
                            }
                        ]}
                        onPress={() => handleCategorySelect(item.id)}
                    >
                        <Text style={styles.categoryEmoji}>{item.emoji}</Text>
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

            {/* Results Count */}
            <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                    {total} {t('market.shopsFound')}
                </Text>
            </View>
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

    if (loading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
            <FlatList
                data={shops}
                renderItem={renderShop}
                keyExtractor={(item) => item.ID.toString()}
                numColumns={2}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🏪</Text>
                        <Text style={[styles.emptyText, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.noShops')}
                        </Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
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
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        fontSize: 15,
    },
    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoriesList: {
        paddingHorizontal: 16,
        paddingBottom: 12,
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
    shopCard: {
        flex: 1,
        margin: 6,
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    shopImageContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shopLogo: {
        width: '100%',
        height: '100%',
    },
    shopLogoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shopInfo: {
        padding: 12,
    },
    shopName: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    shopCategory: {
        fontSize: 12,
        marginBottom: 6,
        textTransform: 'capitalize',
    },
    shopMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        color: '#FFA000',
        fontSize: 13,
        fontWeight: '600',
    },
    reviewsCount: {
        fontSize: 11,
        marginLeft: 2,
    },
    newShop: {
        fontSize: 12,
        fontWeight: '600',
    },
    shopCity: {
        fontSize: 11,
    },
    productsCount: {
        fontSize: 11,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    loadingFooter: {
        padding: 16,
        alignItems: 'center',
    },
});
