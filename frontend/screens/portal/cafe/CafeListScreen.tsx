import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    InteractionManager,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
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
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Cafe, CafeFilters } from '../../../types/cafe';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';
import { BalancePill } from '../../../components/wallet/BalancePill';
import { AssistantChatButton } from '../../../components/portal/AssistantChatButton';

const { width } = Dimensions.get('window');

interface CafeListScreenProps {
    onBack?: () => void;
}

type CafeSortType = NonNullable<CafeFilters['sort']>;

interface CafeCardProps {
    item: Cafe;
    styles: ReturnType<typeof createStyles>;
    accentColor: string;
    textSecondaryColor: string;
    deliveryLabel: string;
    minLabel: string;
    reducedVisuals: boolean;
    onPress: (cafe: Cafe) => void;
}

const CafeCard = React.memo<CafeCardProps>(({
    item,
    styles,
    accentColor,
    textSecondaryColor,
    deliveryLabel,
    minLabel,
    reducedVisuals,
    onPress,
}) => {
    if (!item || item.id === undefined) return null;

    const rating = item.rating ?? 0;
    const reviewsCount = item.reviewsCount ?? 0;
    const imageSource = {
        uri: item.coverUrl || item.logoUrl || 'https://via.placeholder.com/400x200',
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
    };
    const logoSource = item.logoUrl ? {
        uri: item.logoUrl,
        priority: FastImage.priority.low,
        cache: FastImage.cacheControl.immutable,
    } : null;

    return (
        <TouchableOpacity
            style={styles.cafeCard}
            onPress={() => onPress(item)}
            activeOpacity={0.9}
        >
            <View style={styles.cardImageContainer}>
                <FastImage
                    source={imageSource}
                    style={styles.cardImage}
                    resizeMode={FastImage.resizeMode.cover}
                />
                {reducedVisuals ? (
                    <View style={styles.cardImageOverlayReduced} />
                ) : (
                    <LinearGradient
                        colors={['transparent', 'rgba(10, 10, 20, 0.9)']}
                        style={styles.cardImageOverlay}
                    />
                )}

                <View style={styles.cardTopBadges}>
                    <View style={styles.ratingBadge}>
                        <Star size={10} color={accentColor} fill={accentColor} />
                        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                        {!reducedVisuals && (
                            <Text style={styles.reviewsText}>({reviewsCount})</Text>
                        )}
                    </View>

                    {!reducedVisuals && item.hasDelivery && (
                        <View style={styles.deliveryBadge}>
                            <Car size={10} color={accentColor} />
                            <Text style={styles.deliveryBadgeText}>{deliveryLabel}</Text>
                        </View>
                    )}
                </View>

                {!reducedVisuals && logoSource && (
                    <View style={styles.cardLogoContainer}>
                        <FastImage
                            source={logoSource}
                            style={styles.cardLogo}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    </View>
                )}
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>

                <View style={styles.cardDetailsRow}>
                    <View style={styles.detailItem}>
                        <MapPin size={12} color={textSecondaryColor} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.badgesRow}>
                        {!reducedVisuals && item.hasDineIn && (
                            <View style={styles.miniBadge}>
                                <Utensils size={10} color={textSecondaryColor} />
                            </View>
                        )}
                        {!reducedVisuals && item.hasTakeaway && (
                            <View style={styles.miniBadge}>
                                <ShoppingBag size={10} color={textSecondaryColor} />
                            </View>
                        )}
                    </View>

                    {!!item.avgPrepTime && (
                        <View style={styles.timeInfo}>
                            <Clock size={12} color={accentColor} />
                            <Text style={styles.timeText}>{item.avgPrepTime} {minLabel}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => (
    prevProps.item === nextProps.item
    && prevProps.styles === nextProps.styles
    && prevProps.accentColor === nextProps.accentColor
    && prevProps.textSecondaryColor === nextProps.textSecondaryColor
    && prevProps.deliveryLabel === nextProps.deliveryLabel
    && prevProps.minLabel === nextProps.minLabel
    && prevProps.reducedVisuals === nextProps.reducedVisuals
    && prevProps.onPress === nextProps.onPress
));

interface CafeSearchInputProps {
    styles: ReturnType<typeof createStyles>;
    placeholder: string;
    placeholderTextColor: string;
    iconColor: string;
    onSearchCommit: (query: string) => void;
}

const CafeSearchInput = React.memo<CafeSearchInputProps>(({
    styles,
    placeholder,
    placeholderTextColor,
    iconColor,
    onSearchCommit,
}) => {
    const [value, setValue] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const commitSearch = useCallback((query: string) => {
        onSearchCommit(query);
    }, [onSearchCommit]);

    const handleChange = useCallback((text: string) => {
        setValue(text);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            commitSearch(text);
            debounceRef.current = null;
        }, 350);
    }, [commitSearch]);

    const handleSubmit = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        commitSearch(value);
    }, [commitSearch, value]);

    const handleClear = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        setValue('');
        commitSearch('');
    }, [commitSearch]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
        };
    }, []);

    return (
        <View style={styles.searchSection}>
            <View style={styles.searchBackground}>
                <Search size={20} color={iconColor} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor}
                    value={value}
                    onChangeText={handleChange}
                    onSubmitEditing={handleSubmit}
                />
                {value.length > 0 && (
                    <TouchableOpacity onPress={handleClear}>
                        <XCircle size={20} color={iconColor} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}, (prevProps, nextProps) => (
    prevProps.styles === nextProps.styles
    && prevProps.placeholder === nextProps.placeholder
    && prevProps.placeholderTextColor === nextProps.placeholderTextColor
    && prevProps.iconColor === nextProps.iconColor
    && prevProps.onSearchCommit === nextProps.onSearchCommit
));

const CafeListScreen: React.FC<CafeListScreenProps> = ({ onBack }) => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeSort, setActiveSort] = useState<CafeSortType>('rating');
    const [hasMore, setHasMore] = useState(true);
    const [myCafe, setMyCafe] = useState<Cafe | null>(null);
    const didInitialLoad = useRef(false);
    const latestCafesRequestRef = useRef(0);
    const latestMyCafeRequestRef = useRef(0);
    const loadMoreInProgressRef = useRef(false);
    const isMountedRef = useRef(true);
    const searchRef = useRef('');
    const filtersRef = useRef<CafeFilters>({
        sort: 'rating',
        page: 1,
        limit: 20,
    });
    const loadCafesRef = useRef<((reset?: boolean, overrides?: Partial<CafeFilters>, searchOverride?: string) => Promise<void>) | null>(null);

    const listTuning = useMemo(() => (
        Platform.OS === 'android'
            ? {
                initialNumToRender: 4,
                maxToRenderPerBatch: 4,
                windowSize: 5,
                updateCellsBatchingPeriod: 80,
            }
            : {
                initialNumToRender: 6,
                maxToRenderPerBatch: 8,
                windowSize: 7,
                updateCellsBatchingPeriod: 50,
            }
    ), []);
    const useReducedCardVisuals = Platform.OS === 'android';

    const checkMyCafe = useCallback(async () => {
        const requestId = ++latestMyCafeRequestRef.current;
        try {
            const response = await cafeService.getMyCafe();
            if (requestId !== latestMyCafeRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (response.hasCafe && response.cafe && response.cafe.id) {
                setMyCafe(response.cafe);
            } else {
                setMyCafe(null);
            }
        } catch {
            if (requestId === latestMyCafeRequestRef.current && isMountedRef.current) {
                setMyCafe(null);
            }
        }
    }, []);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            checkMyCafe();
        });

        return () => {
            task.cancel();
        };
    }, [checkMyCafe]);

    const loadCafes = useCallback(async (reset = false, overrides: Partial<CafeFilters> = {}, searchOverride?: string) => {
        const requestId = ++latestCafesRequestRef.current;
        const baseFilters = filtersRef.current;
        const nextFilters: CafeFilters = {
            ...baseFilters,
            ...overrides,
            page: reset ? 1 : (overrides.page ?? baseFilters.page ?? 1),
        };
        filtersRef.current = nextFilters;
        try {
            if (reset) {
                if (isMountedRef.current && !initialLoadCompleted) {
                    setLoading(true);
                }
            } else if (isMountedRef.current) {
                setLoadingMore(true);
            }

            const response = await cafeService.getCafes({
                ...nextFilters,
                search: (searchOverride ?? searchRef.current) || undefined,
            });
            if (requestId !== latestCafesRequestRef.current || !isMountedRef.current) {
                return;
            }

            if (reset) {
                setCafes(response.cafes);
            } else {
                setCafes(prev => {
                    const seen = new Set(prev.map(c => c.id));
                    const unique = response.cafes.filter(c => !seen.has(c.id));
                    return [...prev, ...unique];
                });
            }

            setHasMore(response.page < response.totalPages);
        } catch (error) {
            console.error('Error loading cafes:', error);
        } finally {
            if (requestId === latestCafesRequestRef.current && isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
                if (!initialLoadCompleted) {
                    setInitialLoadCompleted(true);
                }
            }
            loadMoreInProgressRef.current = false;
        }
    }, [initialLoadCompleted]);

    useEffect(() => {
        loadCafesRef.current = loadCafes;
    }, [loadCafes]);

    useEffect(() => {
        if (didInitialLoad.current) return;
        didInitialLoad.current = true;
        loadCafes(true);
    }, [loadCafes]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestCafesRequestRef.current += 1;
            latestMyCafeRequestRef.current += 1;
            loadMoreInProgressRef.current = false;
        };
    }, []);

    const handleRefresh = () => {
        if (loading || refreshing) {
            return;
        }
        setRefreshing(true);
        loadCafes(true);
    };

    const handleLoadMore = () => {
        if (!loading && !refreshing && !loadingMore && hasMore && !loadMoreInProgressRef.current) {
            loadMoreInProgressRef.current = true;
            const nextPage = (filtersRef.current.page || 1) + 1;
            loadCafes(false, { page: nextPage });
        }
    };

    const triggerSearch = useCallback((query: string) => {
        searchRef.current = query;
        loadCafesRef.current?.(true, { page: 1 }, query);
    }, []);

    const handleCafePress = useCallback((cafe: Cafe) => {
        navigation.navigate('CafeDetail', { cafeId: cafe.id });
    }, [navigation]);

    const handleBackPress = useCallback(() => {
        if (onBack) {
            onBack();
            return;
        }
        navigation.goBack();
    }, [navigation, onBack]);

    const handleCreateOrManageCafe = useCallback(() => {
        if (myCafe) {
            navigation.navigate('EditCafe', { cafeId: myCafe.id });
            return;
        }
        navigation.navigate('CreateCafe');
    }, [myCafe, navigation]);

    const handleOpenMap = useCallback(() => {
        navigation.navigate('CafesMap');
    }, [navigation]);

    const handleSortChange = useCallback((sort: CafeSortType) => {
        if (activeSort === sort) {
            return;
        }

        setActiveSort(sort);
        loadCafes(true, { sort, page: 1 });
    }, [activeSort, loadCafes]);

    const sortOptions = useMemo(() => ([
        { type: 'rating' as CafeSortType, label: t('cafe.list.rating'), icon: Star, color: colors.accent },
        { type: 'popular' as CafeSortType, label: t('cafe.list.popular'), icon: Flame, color: roleTheme.accentStrong },
        { type: 'newest' as CafeSortType, label: t('cafe.list.newest'), icon: Sparkles, color: colors.warning },
    ]), [colors.accent, colors.warning, roleTheme.accentStrong, t]);

    const deliveryLabel = t('cafe.form.delivery');
    const minLabel = t('common.min');
    const keyExtractor = useCallback((item: Cafe) => item.id.toString(), []);

    const renderCafeCard = useCallback(({ item }: { item: Cafe }) => (
        <CafeCard
            item={item}
            styles={styles}
            accentColor={colors.accent}
            textSecondaryColor={colors.textSecondary}
            deliveryLabel={deliveryLabel}
            minLabel={minLabel}
            reducedVisuals={useReducedCardVisuals}
            onPress={handleCafePress}
        />
    ), [colors.accent, colors.textSecondary, deliveryLabel, handleCafePress, minLabel, styles, useReducedCardVisuals]);

    const listFooterComponent = useMemo(() => (
        loadingMore && cafes.length > 0 ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.footerLoader} />
        ) : null
    ), [cafes.length, colors.accent, loadingMore, styles.footerLoader]);

    const listEmptyComponent = useMemo(() => (
        <View style={styles.emptyContainer}>
            <Coffee size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>{t('cafe.list.empty')}</Text>
            <Text style={styles.emptySubtitle}>{t('cafe.list.emptySubtext')}</Text>
        </View>
    ), [colors.textSecondary, styles.emptyContainer, styles.emptySubtitle, styles.emptyTitle, t]);

    const listHeaderComponent = useMemo(() => (
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
                        onPress={handleBackPress}
                    >
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
                            {t('cafe.list.title')}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>{t('cafe.list.subtitle')}</Text>
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
                        style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.accentSoft }]}
                        onPress={handleCreateOrManageCafe}
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
                        onPress={handleOpenMap}
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

            <CafeSearchInput
                styles={styles}
                placeholder={t('cafe.list.searchPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                iconColor={colors.textSecondary}
                onSearchCommit={triggerSearch}
            />

            <View style={styles.sortSection}>
                <View style={styles.sortList}>
                    {sortOptions.map(item => {
                        const isActive = activeSort === item.type;
                        return (
                            <TouchableOpacity
                                key={item.type}
                                style={[styles.sortPill, isActive && styles.sortPillActive]}
                                onPress={() => handleSortChange(item.type)}
                            >
                                <item.icon size={14} color={isActive ? colors.textPrimary : item.color} fill={isActive ? colors.textPrimary : 'none'} />
                                <Text style={[styles.sortPillLabel, isActive && styles.sortPillLabelActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    ), [
        activeSort,
        colors.accent,
        colors.accentSoft,
        colors.border,
        colors.surface,
        colors.textPrimary,
        colors.textSecondary,
        handleBackPress,
        handleCreateOrManageCafe,
        handleOpenMap,
        handleSortChange,
        myCafe,
        roleTheme.accentSoft,
        sortOptions,
        styles,
        t,
        triggerSearch,
    ]);

    const fullHeaderComponent = useMemo(() => (
        <>
            <GodModeStatusBanner />
            {listHeaderComponent}
        </>
    ), [listHeaderComponent]);

    return (
        <LinearGradient
            colors={roleTheme.gradient}
            style={styles.gradient}
        >
            <View style={styles.container}>
                {loading && !initialLoadCompleted ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <FlatList
                        data={cafes}
                        renderItem={renderCafeCard}
                        keyExtractor={keyExtractor}
                        ListHeaderComponent={fullHeaderComponent}
                        contentContainerStyle={styles.listContent}
                        numColumns={2}
                        columnWrapperStyle={styles.columnWrapper}
                        removeClippedSubviews
                        initialNumToRender={listTuning.initialNumToRender}
                        maxToRenderPerBatch={listTuning.maxToRenderPerBatch}
                        windowSize={listTuning.windowSize}
                        updateCellsBatchingPeriod={listTuning.updateCellsBatchingPeriod}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={listFooterComponent}
                        ListEmptyComponent={listEmptyComponent}
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
        flexDirection: 'row',
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
    cardImageOverlayReduced: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 20, 0.18)',
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
