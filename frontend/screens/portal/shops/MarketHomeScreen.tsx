import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Image, Dimensions, ImageBackground, Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../../services/marketService';
import { useSettings } from '../../../context/SettingsContext';
import { Product, ProductCategoryConfig, ProductFilters } from '../../../types/market';
import { getMediaUrl } from '../../../utils/url';
import { Skeleton } from '../../../components/market/Skeleton';
import { EmptyState } from '../../../components/market/EmptyState';
import { ProductCard } from '../../../components/market/ProductCard';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
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
    Search as SearchIcon,
    X,
    ArrowLeft,
} from 'lucide-react-native';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { BalancePill } from '../../../components/wallet/BalancePill';
import { SemanticColorTokens } from '../../../theme/semanticTokens';
import { AssistantChatButton } from '../../../components/portal/AssistantChatButton';

const { width } = Dimensions.get('window');

interface MarketHomeScreenProps {
    onBack?: () => void;
}

export const MarketHomeScreen: React.FC<MarketHomeScreenProps> = ({ onBack }) => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors: roleColors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(roleColors, roleTheme, isDarkMode), [roleColors, roleTheme, isDarkMode]);
    const currentLang = i18n.language === 'ru' ? 'ru' : 'en';

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
        setProducts([]);
        setLoading(true);

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

    const getCategoryIcon = (emoji: string, size = 14, color = roleColors.textSecondary) => {
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

    const renderProduct = ({ item }: { item: Product }) => (
        <ProductCard item={item} onPress={handleProductPress} />
    );

    const renderSkeleton = () => (
        <View style={styles.skeletonCard}>
            <Skeleton height={140} borderRadius={20} />
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
        <View style={styles.header}>
            <ImageBackground
                source={require('../../../assets/market_banner_bg.png')}
                style={styles.bannerHeader}
                imageStyle={styles.bannerImage}
            >
                <View style={styles.bannerOverlay} />
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => onBack ? onBack() : navigation.goBack()}
                    >
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
                            {t('market.title')}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>{t('market.subtitle')}</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <AssistantChatButton />
                        <BalancePill size="small" lightMode={true} />
                    </View>
                </View>
            </ImageBackground>

            <View style={styles.featuredActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.featuredCard, { borderColor: 'rgba(255, 255, 255, 0.2)' }]}
                        onPress={handleShopsPress}
                    >
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.15)', 'transparent']}
                            style={styles.cardGradient}
                        />
                        <View style={[styles.actionIconOuter, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : roleColors.accentSoft }]}>
                            <Store size={22} color={isDarkMode ? "#FFFFFF" : roleColors.accent} />
                        </View>
                        <View>
                            <Text style={[styles.featuredCardTitle, { color: roleColors.textPrimary }]}>{t('market.shops')}</Text>
                            <Text style={[styles.featuredCardSub, { color: roleColors.textSecondary }]}>{t('market.view_all_shops')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.featuredCard, { borderColor: 'rgba(255, 255, 255, 0.2)' }]}
                        onPress={() => navigation.navigate('ShopsMap')}
                    >
                        <View style={[styles.actionIconOuter, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : roleColors.accentSoft }]}>
                            <Map size={22} color={isDarkMode ? "#FFFFFF" : roleColors.accent} />
                        </View>
                        <View>
                            <Text style={[styles.featuredCardTitle, { color: roleColors.textPrimary }]}>{t('market.map.title')}</Text>
                            <Text style={[styles.featuredCardSub, { color: roleColors.textSecondary }]}>{t('market.nearby')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchSection}>
                <View style={[styles.searchBackground, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}>
                    <SearchIcon size={20} color={roleColors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: roleColors.textPrimary }]}
                        placeholder={t('market.search')}
                        placeholderTextColor={roleColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); loadProducts(1, true); }}>
                            <X size={20} color={roleColors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.categoriesSection}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{ id: '', emoji: '🏷️', label: { ru: 'Все', en: 'All' } }, ...categories]}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isActive = selectedCategory === item.id;
                        return (
                            <TouchableOpacity
                                style={[styles.sortPill, isActive && styles.sortPillActive, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : roleColors.surface }]}
                                onPress={() => handleCategorySelect(item.id)}
                            >
                                <View style={styles.pillIcon}>
                                    {getCategoryIcon(item.emoji, 14, isActive ? roleColors.textPrimary : roleColors.accent)}
                                </View>
                                <Text style={[styles.sortPillLabel, isActive && styles.sortPillLabelActive, { color: isActive ? roleColors.textPrimary : roleColors.textSecondary }]}>
                                    {item.label[currentLang] || item.label.en}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    contentContainerStyle={styles.sortList}
                />
            </View>

            {!loading && total > 0 && (
                <View style={styles.resultsHeader}>
                    <Text style={[styles.resultsCount, { color: roleColors.textSecondary }]}>
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
                <ActivityIndicator size="small" color={roleColors.accent} />
            </View>
        );
    };

    return (
        <LinearGradient
            colors={roleTheme.gradient}
            style={styles.gradient}
        >
            <View style={styles.container}>
                <FlatList
                    data={loading ? ([1, 2, 3, 4, 5, 6] as any) : products}
                    renderItem={loading ? renderSkeleton : renderProduct}
                    keyExtractor={(item, index) => loading ? `skel-${index}` : item?.ID?.toString() || index.toString()}
                    numColumns={2}
                    ListHeaderComponent={
                        <>
                            <GodModeStatusBanner />
                            {renderHeader()}
                        </>
                    }
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        !loading ? (
                            <EmptyState
                                icon={<ShoppingBag size={64} color={roleColors.textSecondary} />}
                                title={t('market.noProductsTitle')}
                                message={t('market.noProductsMsg')}
                                actionLabel={t('market.clearFilters')}
                                onAction={() => {
                                    setSelectedCategory('');
                                    setSearchQuery('');
                                    loadProducts(1, true);
                                }}
                            />
                        ) : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={roleColors.accent}
                        />
                    }
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    initialNumToRender={8}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            </View>
        </LinearGradient>
    );
};

const createStyles = (roleColors: SemanticColorTokens, roleTheme: any, isDarkMode: boolean) => StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        marginBottom: 24,
    },
    bannerHeader: {
        width: '100%',
        height: 240,
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
    },
    bannerImage: {
        resizeMode: 'cover',
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '900',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 12,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 4,
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    walletInnerGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
    },
    walletBalanceGlass: {
        fontSize: 14,
        fontWeight: '800',
    },
    walletButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    featuredActions: {
        paddingHorizontal: 20,
        marginBottom: 24,
        marginTop: 20,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    featuredCard: {
        flex: 1,
        height: 100,
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : roleColors.surface,
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    actionIconOuter: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    featuredCardTitle: {
        fontSize: 15,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    featuredCardSub: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    searchSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchBackground: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 54,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 12,
    },
    categoriesSection: {
        marginBottom: 16,
    },
    sortList: {
        paddingHorizontal: 20,
        gap: 10,
    },
    sortPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        gap: 8,
    },
    sortPillActive: {
        backgroundColor: 'rgb(245,158,11)',
        borderColor: 'rgb(245,158,11)',
    },
    pillIcon: {
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortPillLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    sortPillLabelActive: {
        color: 'rgb(26,26,46)',
    },
    resultsHeader: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    resultsCount: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 14,
    },
    skeletonCard: {
        width: (width - 48) / 2,
        margin: 7,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    loadingFooter: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});
