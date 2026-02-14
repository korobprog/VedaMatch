import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Image, Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { marketService } from '../../../services/marketService';
import { useSettings } from '../../../context/SettingsContext';
import { Shop, ShopCategoryConfig, ShopFilters } from '../../../types/market';
import { ShopCard } from '../../../components/market/ShopCard';
import {
    Store,
    MapPin,
    Tag,
    X,
    Search as SearchIcon,
    ArrowLeft,
    Map as MapIcon,
    PlusCircle
} from 'lucide-react-native';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { BalancePill } from '../../../components/wallet/BalancePill';
import { AssistantChatButton } from '../../../components/portal/AssistantChatButton';

const { width } = Dimensions.get('window');

export const ShopsScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors: roleColors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const currentLang = i18n.language === 'ru' ? 'ru' : 'en';

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
        <ShopCard item={item} onPress={handleShopPress} />
    );


    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={22} color={roleColors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {t('market.shops')}
                    </Text>
                    <Text style={styles.headerSubtitle}>{t('market.shops_list') || 'Список магазинов'}</Text>
                </View>

                <View style={styles.headerActions}>
                    <AssistantChatButton />
                    <BalancePill size="small" lightMode={true} />
                </View>
            </View>

            <View style={styles.featuredActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: roleColors.surface, borderColor: roleColors.accentSoft }]}
                        onPress={() => navigation.navigate('CreateShop')}
                    >
                        <LinearGradient
                            colors={[roleTheme.accentSoft, 'transparent']}
                            style={styles.cardGradient}
                        />
                        <View style={styles.actionIconOuter}>
                            <PlusCircle size={22} color={roleColors.accent} />
                        </View>
                        <View>
                            <Text style={styles.featuredCardTitle}>{t('market.shop.create')}</Text>
                            <Text style={styles.featuredCardSub}>{t('market.become_seller') || 'Стать продавцом'}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: 'rgba(26, 26, 46, 0.5)', borderColor: 'rgba(255,255,255,0.05)' }]}
                        onPress={() => navigation.navigate('ShopsMap')}
                    >
                        <View style={styles.actionIconOuter}>
                            <MapIcon size={22} color="rgba(255,255,255,1)" />
                        </View>
                        <View>
                            <Text style={styles.featuredCardTitle}>{t('market.map.title')}</Text>
                            <Text style={styles.featuredCardSub}>{t('market.view_on_map') || 'На карте'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBackground}>
                    <SearchIcon size={20} color={roleColors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: roleColors.textPrimary }]}
                        placeholder={t('market.searchShops')}
                        placeholderTextColor={roleColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); loadShops(1, true); }}>
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
                                style={[styles.sortPill, isActive && styles.sortPillActive]}
                                onPress={() => handleCategorySelect(item.id)}
                            >
                                <Tag size={12} color={isActive ? 'rgb(26,26,46)' : roleColors.accent} style={{ marginRight: 6 }} />
                                <Text style={[styles.sortPillLabel, isActive && styles.sortPillLabelActive]}>
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
                    <Text style={styles.resultsCount}>
                        {total} {t('market.shopsFound')}
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

    if (loading && shops.length === 0) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <ActivityIndicator size="large" color={roleColors.accent} />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={roleTheme.gradient}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                <FlatList
                    data={shops}
                    renderItem={renderShop}
                    keyExtractor={(item) => item.ID.toString()}
                    numColumns={2}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Store size={64} color="rgba(255, 255, 255, 0.1)" />
                            <Text style={styles.emptyText}>
                                {t('market.noShops')}
                            </Text>
                        </View>
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
                />
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 22,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 2,
    },
    walletButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    walletInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 20,
    },
    walletBalance: {
        color: 'rgb(245,158,11)',
        fontSize: 13,
        fontWeight: '800',
    },
    featuredActions: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    featuredCard: {
        flex: 1,
        height: 90,
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    actionIconOuter: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    featuredCardTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 13,
        fontWeight: '800',
    },
    featuredCardSub: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 54,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    searchInput: {
        flex: 1,
        color: 'rgba(255,255,255,1)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    sortPillLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
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
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
    },
    loadingFooter: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});
