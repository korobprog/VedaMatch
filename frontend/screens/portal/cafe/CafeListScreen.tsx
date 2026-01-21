import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Star, Clock, MapPin, Search, XCircle, Coffee, Flame, Sparkles, Utensils, ShoppingBag, Car, Map as MapIcon, UserCircle } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Cafe, CafeFilters } from '../../../types/cafe';

const CafeListScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<CafeFilters>({
        sort: 'rating',
        page: 1,
        limit: 20,
    });
    const [hasMore, setHasMore] = useState(true);
    const [myCafe, setMyCafe] = useState<Cafe | null>(null);

    const checkMyCafe = async () => {
        try {
            const response = await cafeService.getMyCafe();
            if (response.hasCafe && response.cafe && response.cafe.id) {
                setMyCafe(response.cafe);
            } else {
                setMyCafe(null);
            }
        } catch (error) {
            setMyCafe(null);
        }
    };

    useEffect(() => {
        checkMyCafe();
    }, []);

    const loadCafes = useCallback(async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
                setFilters(prev => ({ ...prev, page: 1 }));
            }

            const response = await cafeService.getCafes({
                ...filters,
                search: search || undefined,
                page: reset ? 1 : filters.page,
            });

            if (reset) {
                setCafes(response.cafes);
            } else {
                setCafes(prev => [...prev, ...response.cafes]);
            }

            setHasMore(response.page < response.totalPages);
        } catch (error) {
            console.error('Error loading cafes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters, search]);

    useEffect(() => {
        loadCafes(true);
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        loadCafes(true);
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            setFilters(prev => ({ ...prev, page: prev.page! + 1 }));
            loadCafes();
        }
    };

    const handleSearch = () => {
        loadCafes(true);
    };

    const handleCafePress = (cafe: Cafe) => {
        navigation.navigate('CafeDetail', { cafeId: cafe.id });
    };

    const renderCafeCard = ({ item }: { item: Cafe }) => {
        // Safety check for undefined cafe data
        if (!item || item.id === undefined) {
            return null;
        }

        const rating = item.rating ?? 0;
        const reviewsCount = item.reviewsCount ?? 0;

        return (
            <TouchableOpacity
                style={styles.cafeCard}
                onPress={() => handleCafePress(item)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: item.coverUrl || item.logoUrl || 'https://via.placeholder.com/400x200' }}
                    style={styles.cafeImage}
                />
                <View style={styles.cafeOverlay}>
                    {!!item.logoUrl ? (
                        <Image source={{ uri: item.logoUrl }} style={styles.cafeLogo} />
                    ) : null}
                </View>
                <View style={styles.cafeInfo}>
                    <Text style={styles.cafeName}>{item.name || t('cafe.list.unnamed')}</Text>
                    <View style={styles.cafeDetailsRow}>
                        <View style={styles.ratingContainer}>
                            <Star size={14} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                            <Text style={styles.reviewsText}>({reviewsCount})</Text>
                        </View>
                        {!!item.avgPrepTime && item.avgPrepTime > 0 ? (
                            <View style={styles.prepTimeContainer}>
                                <Clock size={14} color="#8E8E93" strokeWidth={1.5} />
                                <Text style={styles.prepTimeText}>~{item.avgPrepTime} {t('common.min')}</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={styles.addressContainer}>
                        <MapPin size={12} color="#8E8E93" strokeWidth={1.5} />
                        <Text style={styles.cafeAddress} numberOfLines={1}>
                            {item.address || ''}
                        </Text>
                    </View>
                    <View style={styles.badgesContainer}>
                        {!!item.hasDineIn ? (
                            <View style={styles.badge}>
                                <Utensils size={12} color="#E5E5EA" strokeWidth={1.5} />
                                <Text style={styles.badgeText}>{t('cafe.form.dineIn')}</Text>
                            </View>
                        ) : null}
                        {!!item.hasTakeaway ? (
                            <View style={styles.badge}>
                                <ShoppingBag size={12} color="#E5E5EA" strokeWidth={1.5} />
                                <Text style={styles.badgeText}>{t('cafe.form.takeaway')}</Text>
                            </View>
                        ) : null}
                        {!!item.hasDelivery ? (
                            <View style={[styles.badge, styles.deliveryBadge]}>
                                <Car size={12} color="#FF6B00" strokeWidth={1.5} />
                                <Text style={[styles.badgeText, { color: '#FF6B00' }]}>{t('cafe.form.delivery')}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <View>
                    <Text style={styles.title}>{t('cafe.list.title')}</Text>
                    <Text style={styles.subtitle}>{t('cafe.list.subtitle')}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => navigation.navigate('CafesMap')}
                    >
                        <MapIcon size={24} color="#FFFFFF" strokeWidth={1.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => myCafe ? navigation.navigate('EditCafe', { cafeId: myCafe.id }) : navigation.navigate('CreateCafe')}
                    >
                        <UserCircle size={24} color={myCafe ? '#FF6B00' : '#FFFFFF'} strokeWidth={1.5} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color="#8E8E93" style={styles.searchIcon} strokeWidth={1.5} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('cafe.list.searchPlaceholder')}
                    placeholderTextColor="#8E8E93"
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {search.length > 0 ? (
                    <TouchableOpacity onPress={() => { setSearch(''); loadCafes(true); }}>
                        <XCircle size={20} color="#8E8E93" strokeWidth={1.5} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.sortContainer}>
                {[
                    { type: 'rating', label: t('cafe.list.rating'), icon: Star, color: '#FFD700', fill: true },
                    { type: 'popular', label: t('cafe.list.popular'), icon: Flame, color: '#FF6B00', fill: false },
                    { type: 'newest', label: t('cafe.list.newest'), icon: Sparkles, color: '#5AC8FA', fill: false },
                ].map((item) => {
                    const isActive = filters.sort === item.type;
                    return (
                        <TouchableOpacity
                            key={item.type}
                            style={[
                                styles.sortButton,
                                isActive && styles.sortButtonActive,
                            ]}
                            onPress={() => {
                                setFilters(prev => ({ ...prev, sort: item.type as any }));
                                loadCafes(true);
                            }}
                        >
                            <item.icon
                                size={16}
                                color={isActive ? '#FFFFFF' : item.color}
                                fill={item.fill ? (isActive ? '#FFFFFF' : item.color) : 'none'}
                                strokeWidth={1.5}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[
                                styles.sortButtonText,
                                isActive && styles.sortButtonTextActive,
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    if (loading && cafes.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>{t('cafe.list.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={cafes}
                renderItem={renderCafeCard}
                keyExtractor={item => (item?.id ?? Math.random()).toString()}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loading && cafes.length > 0 ? (
                        <ActivityIndicator size="small" color="#FF6B00" style={styles.footerLoader} />
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Coffee size={80} color="#2C2C2E" strokeWidth={1} />
                        <Text style={styles.emptyText}>{t('cafe.list.empty')}</Text>
                        <Text style={styles.emptySubtext}>{t('cafe.list.emptySubtext')}</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 12,
        fontSize: 16,
    },
    header: {
        padding: 16,
        paddingTop: 24,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
        fontFamily: 'System', // Use system font stack
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    headerActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        marginBottom: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        paddingHorizontal: 14,
        height: 50,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        color: '#FFFFFF',
        fontSize: 16,
    },
    sortContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'transparent',
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    sortButtonActive: {
        backgroundColor: '#FF6B00',
        borderColor: '#FF6B00',
    },
    sortButtonText: {
        color: '#8E8E93',
        fontSize: 14,
        fontWeight: '500',
    },
    sortButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 24,
    },
    cafeCard: {
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    cafeImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#2C2C2E',
    },
    cafeOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 1,
    },
    cafeLogo: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    cafeInfo: {
        padding: 16,
    },
    cafeName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    cafeDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 12,
    },
    ratingText: {
        color: '#FFD700',
        fontWeight: '700',
        fontSize: 13,
        marginLeft: 4,
    },
    reviewsText: {
        color: '#8E8E93',
        fontSize: 13,
        marginLeft: 4,
    },
    prepTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    prepTimeText: {
        color: '#8E8E93',
        marginLeft: 4,
        fontSize: 13,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 6,
    },
    cafeAddress: {
        color: '#8E8E93',
        fontSize: 14,
        flex: 1,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    deliveryBadge: {
        backgroundColor: 'rgba(255, 107, 0, 0.15)',
    },
    badgeText: {
        color: '#E5E5EA',
        fontSize: 12,
        fontWeight: '500',
    },
    footerLoader: {
        padding: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 48,
        marginTop: 40,
    },
    emptyText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#8E8E93',
        fontSize: 15,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default CafeListScreen;
