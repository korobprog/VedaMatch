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
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    Star,
    Clock,
    MapPin,
    Search,
    XCircle,
    Coffee,
    Flame,
    Sparkles,
    Utensils,
    ShoppingBag,
    Car,
    Map as MapIcon,
    UserCircle,
    ArrowLeft,
    PlusCircle,
    Wallet,
    Info
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Cafe, CafeFilters } from '../../../types/cafe';
import { useWallet } from '../../../context/WalletContext';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';

const { width } = Dimensions.get('window');

interface CafeListScreenProps {
    onBack?: () => void;
}

const CafeListScreen: React.FC<CafeListScreenProps> = ({ onBack }) => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { formattedBalance } = useWallet();

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
                page: reset ? 1 : (filters.page || 1),
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
            setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
            loadCafes();
        }
    };

    const handleSearch = () => {
        loadCafes(true);
    };

    const handleCafePress = (cafe: Cafe) => {
        navigation.navigate('CafeDetail', { cafeId: cafe.id });
    };

    const handleWallet = () => {
        navigation.navigate('Wallet');
    };

    const renderCafeCard = ({ item }: { item: Cafe }) => {
        if (!item || item.id === undefined) return null;

        const rating = item.rating ?? 0;
        const reviewsCount = item.reviewsCount ?? 0;

        return (
            <TouchableOpacity
                style={styles.cafeCard}
                onPress={() => handleCafePress(item)}
                activeOpacity={0.9}
            >
                {/* Image Section */}
                <View style={styles.cardImageContainer}>
                    <Image
                        source={{ uri: item.coverUrl || item.logoUrl || 'https://via.placeholder.com/400x200' }}
                        style={styles.cardImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(10, 10, 20, 0.9)']}
                        style={styles.cardImageOverlay}
                    />

                    <View style={styles.cardTopBadges}>
                        <View style={styles.ratingBadge}>
                            <Star size={10} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                            <Text style={styles.reviewsText}>({reviewsCount})</Text>
                        </View>

                        {item.hasDelivery && (
                            <View style={styles.deliveryBadge}>
                                <Car size={10} color="#F59E0B" />
                                <Text style={styles.deliveryBadgeText}>{t('cafe.form.delivery')}</Text>
                            </View>
                        )}
                    </View>

                    {item.logoUrl && (
                        <View style={styles.cardLogoContainer}>
                            <Image source={{ uri: item.logoUrl }} style={styles.cardLogo} />
                        </View>
                    )}
                </View>

                {/* Info Section */}
                <View style={styles.cardContent}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>

                    <View style={styles.cardDetailsRow}>
                        <View style={styles.detailItem}>
                            <MapPin size={12} color="rgba(255, 255, 255, 0.5)" />
                            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.badgesRow}>
                            {item.hasDineIn && (
                                <View style={styles.miniBadge}>
                                    <Utensils size={10} color="rgba(255, 255, 255, 0.6)" />
                                </View>
                            )}
                            {item.hasTakeaway && (
                                <View style={styles.miniBadge}>
                                    <ShoppingBag size={10} color="rgba(255, 255, 255, 0.6)" />
                                </View>
                            )}
                        </View>

                        {!!item.avgPrepTime && (
                            <View style={styles.timeInfo}>
                                <Clock size={12} color="#F59E0B" />
                                <Text style={styles.timeText}>{item.avgPrepTime} {t('common.min')}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => onBack ? onBack() : navigation.goBack()}
                >
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {t('cafe.list.title')}
                    </Text>
                    <Text style={styles.headerSubtitle}>{t('cafe.list.subtitle')}</Text>
                </View>

                <TouchableOpacity style={styles.walletButton} onPress={handleWallet}>
                    <LinearGradient
                        colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)']}
                        style={styles.walletInner}
                    >
                        <Wallet size={14} color="#F59E0B" />
                        <Text style={styles.walletBalance}>{formattedBalance}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={styles.featuredActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: '#1e1e3a', borderColor: 'rgba(245, 158, 11, 0.2)' }]}
                        onPress={() => myCafe ? navigation.navigate('EditCafe', { cafeId: myCafe.id }) : navigation.navigate('CreateCafe')}
                    >
                        <LinearGradient
                            colors={['rgba(245, 158, 11, 0.15)', 'transparent']}
                            style={styles.cardGradient}
                        />
                        <View style={styles.actionIconOuter}>
                            {myCafe ? (
                                <UserCircle size={24} color="#F59E0B" />
                            ) : (
                                <PlusCircle size={24} color="#F59E0B" />
                            )}
                        </View>
                        <View>
                            <Text style={styles.featuredCardTitle}>{myCafe ? t('cafe.list.myCafe') : t('cafe.list.create')}</Text>
                            <Text style={styles.featuredCardSub}>{myCafe ? t('cafe.list.manage') : t('cafe.list.business')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: '#1a1a2e', borderColor: 'rgba(255,255,255,0.05)' }]}
                        onPress={() => navigation.navigate('CafesMap')}
                    >
                        <View style={styles.actionIconOuter}>
                            <MapIcon size={24} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.featuredCardTitle}>{t('cafe.list.map')}</Text>
                            <Text style={styles.featuredCardSub}>{t('cafe.list.nearby')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBackground}>
                    <Search size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('cafe.list.searchPlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); loadCafes(true); }}>
                            <XCircle size={20} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.sortSection}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        { type: 'rating', label: t('cafe.list.rating'), icon: Star, color: '#FFD700' },
                        { type: 'popular', label: t('cafe.list.popular'), icon: Flame, color: '#FF6B00' },
                        { type: 'newest', label: t('cafe.list.newest'), icon: Sparkles, color: '#5AC8FA' },
                    ]}
                    contentContainerStyle={styles.sortList}
                    renderItem={({ item }) => {
                        const isActive = filters.sort === item.type;
                        return (
                            <TouchableOpacity
                                style={[styles.sortPill, isActive && styles.sortPillActive]}
                                onPress={() => {
                                    setFilters(prev => ({ ...prev, sort: item.type as any }));
                                    loadCafes(true);
                                }}
                            >
                                <item.icon size={14} color={isActive ? '#1a1a2e' : item.color} fill={isActive ? '#1a1a2e' : 'none'} />
                                <Text style={[styles.sortPillLabel, isActive && styles.sortPillLabelActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    keyExtractor={item => item.type}
                />
            </View>
        </View>
    );

    return (
        <LinearGradient
            colors={['#0a0a14', '#12122b']}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                {loading && cafes.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                    </View>
                ) : (
                    <FlatList
                        data={cafes}
                        renderItem={renderCafeCard}
                        keyExtractor={item => item.id.toString()}
                        ListHeaderComponent={
                            <>
                                <GodModeStatusBanner />
                                {renderHeader()}
                            </>
                        }
                        contentContainerStyle={styles.listContent}
                        numColumns={2}
                        columnWrapperStyle={styles.columnWrapper}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor="#F59E0B"
                            />
                        }
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loading && cafes.length > 0 ? (
                                <ActivityIndicator size="small" color="#F59E0B" style={styles.footerLoader} />
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Coffee size={64} color="rgba(255, 255, 255, 0.1)" />
                                <Text style={styles.emptyTitle}>{t('cafe.list.empty')}</Text>
                                <Text style={styles.emptySubtitle}>{t('cafe.list.emptySubtext')}</Text>
                            </View>
                        }
                    />
                )}
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
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
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
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 20,
    },
    walletBalance: {
        color: '#F59E0B',
        fontSize: 14,
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
        height: 100,
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
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    featuredCardTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    featuredCardSub: {
        color: 'rgba(255,255,255,0.4)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 56,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 12,
    },
    sortSection: {
        marginBottom: 20,
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
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    sortPillLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '700',
    },
    sortPillLabelActive: {
        color: '#1a1a2e',
    },
    listContent: {
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    cafeCard: {
        width: (width - 52) / 2,
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardImageContainer: {
        width: '100%',
        height: 120,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImageOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    cardTopBadges: {
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
    },
    ratingText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
    reviewsText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 8,
    },
    deliveryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    deliveryBadgeText: {
        color: '#F59E0B',
        fontSize: 8,
        fontWeight: '700',
    },
    cardLogoContainer: {
        position: 'absolute',
        bottom: -15,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1a1a2e',
        padding: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardLogo: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    cardContent: {
        padding: 12,
        paddingTop: 16,
    },
    cardName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
        marginBottom: 4,
    },
    cardDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    detailText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 8,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 6,
    },
    miniBadge: {
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '800',
    },
    footerLoader: {
        paddingVertical: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 16,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
    },
    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});

export default CafeListScreen;
