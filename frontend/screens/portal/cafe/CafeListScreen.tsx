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
    ImageBackground,
    Platform,
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
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const { width } = Dimensions.get('window');

interface CafeListScreenProps {
    onBack?: () => void;
}

const CafeListScreen: React.FC<CafeListScreenProps> = ({ onBack }) => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { formattedBalance } = useWallet();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
                            <Star size={10} color={colors.accent} fill={colors.accent} />
                            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                            <Text style={styles.reviewsText}>({reviewsCount})</Text>
                        </View>

                        {item.hasDelivery && (
                            <View style={styles.deliveryBadge}>
                                <Car size={10} color={colors.accent} />
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
                            <MapPin size={12} color={colors.textSecondary} />
                            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.badgesRow}>
                            {item.hasDineIn && (
                                <View style={styles.miniBadge}>
                                    <Utensils size={10} color={colors.textSecondary} />
                                </View>
                            )}
                            {item.hasTakeaway && (
                                <View style={styles.miniBadge}>
                                    <ShoppingBag size={10} color={colors.textSecondary} />
                                </View>
                            )}
                        </View>

                        {!!item.avgPrepTime && (
                            <View style={styles.timeInfo}>
                                <Clock size={12} color={colors.accent} />
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
            <ImageBackground
                source={require('../../../assets/cafe_banner_bg.png')}
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
                            {t('cafe.list.title')}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>{t('cafe.list.subtitle')}</Text>
                    </View>

                    <TouchableOpacity style={styles.walletButton} onPress={handleWallet}>
                        <View style={styles.walletInnerGlass}>
                            <Wallet size={14} color="#FFFFFF" />
                            <Text style={styles.walletBalanceGlass}>{formattedBalance}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ImageBackground>

            <View style={styles.featuredActions}>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.accentSoft }]}
                        onPress={() => myCafe ? navigation.navigate('EditCafe', { cafeId: myCafe.id }) : navigation.navigate('CreateCafe')}
                    >
                        <LinearGradient
                            colors={[roleTheme.accentSoft, 'transparent']}
                            style={styles.cardGradient}
                        />
                        <View style={styles.actionIconOuter}>
                            {myCafe ? (
                                <UserCircle size={24} color={colors.accent} />
                            ) : (
                                <PlusCircle size={24} color={colors.accent} />
                            )}
                        </View>
                        <View>
                            <Text style={styles.featuredCardTitle}>{myCafe ? t('cafe.list.myCafe') : t('cafe.list.create')}</Text>
                            <Text style={styles.featuredCardSub}>{myCafe ? t('cafe.list.manage') : t('cafe.list.business')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('CafesMap')}
                    >
                        <View style={styles.actionIconOuter}>
                            <MapIcon size={24} color={colors.textPrimary} />
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
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('cafe.list.searchPlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); loadCafes(true); }}>
                            <XCircle size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.sortSection}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        { type: 'rating', label: t('cafe.list.rating'), icon: Star, color: colors.accent },
                        { type: 'popular', label: t('cafe.list.popular'), icon: Flame, color: roleTheme.accentStrong },
                        { type: 'newest', label: t('cafe.list.newest'), icon: Sparkles, color: colors.warning },
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
                                <item.icon size={14} color={isActive ? colors.textPrimary : item.color} fill={isActive ? colors.textPrimary : 'none'} />
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
            colors={roleTheme.gradient}
            style={styles.gradient}
        >
            <View style={styles.container}>
                {loading && cafes.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
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
                                tintColor={colors.accent}
                            />
                        }
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loading && cafes.length > 0 ? (
                                <ActivityIndicator size="small" color={colors.accent} style={styles.footerLoader} />
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Coffee size={64} color={colors.textSecondary} />
                                <Text style={styles.emptyTitle}>{t('cafe.list.empty')}</Text>
                                <Text style={styles.emptySubtitle}>{t('cafe.list.emptySubtext')}</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </LinearGradient>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
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
        marginBottom: 24,
    },
    bannerHeader: {
        width: '100%',
        height: 240,
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    bannerImage: {
        resizeMode: 'cover',
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
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
        fontSize: 28,
        fontWeight: '900',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 3,
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
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
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
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
        borderColor: colors.accentSoft,
        borderRadius: 20,
    },
    walletBalance: {
        color: colors.accent,
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
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    featuredCardTitle: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '800',
    },
    featuredCardSub: {
        color: colors.textSecondary,
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
        backgroundColor: colors.surface,
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 56,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
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
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    sortPillActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    sortPillLabel: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    sortPillLabelActive: {
        color: colors.textPrimary,
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
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.textPrimary,
        fontSize: 9,
        fontWeight: '800',
    },
    reviewsText: {
        color: colors.textSecondary,
        fontSize: 8,
    },
    deliveryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accentSoft,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    deliveryBadgeText: {
        color: colors.accent,
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
        backgroundColor: colors.surface,
        padding: 2,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.textPrimary,
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
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        color: colors.accent,
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
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
    },
    emptySubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});

export default CafeListScreen;
