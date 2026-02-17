import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    LayoutAnimation,
    UIManager,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { newsService, NewsItem } from '../../../services/newsService';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {
    LayoutGrid,
    Sun,
    Calendar,
    GraduationCap,
    Heart,
    Globe,
    Building2,
    Star,
    Bell,
    BellOff,
    Newspaper,
    Zap,
    Inbox,
    AlertCircle,
    Rss,
} from 'lucide-react-native';
import { useSettings } from '../../../context/SettingsContext';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../../context/UserContext';
import { GodModeFiltersPanel } from '../../../components/portal/god-mode/GodModeFiltersPanel';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

// Category pills for filtering
const CATEGORIES = [
    { id: '', label: 'Все темы', labelEn: 'All Topics' },
    { id: 'spiritual', label: 'Духовное', labelEn: 'Spiritual' },
    { id: 'events', label: 'События', labelEn: 'Events' },
    { id: 'education', label: 'Образование', labelEn: 'Education' },
    { id: 'wellness', label: 'Здоровье', labelEn: 'Wellness' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const NewsScreen = () => {
    const { i18n } = useTranslation();
    const { isDarkMode } = useSettings();
    const navigation = useNavigation();
    const { user, activeMathId, godModeFilters, setActiveMath } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const lang = i18n.language === 'en' ? 'en' : 'ru';

    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedMadh, setSelectedMadh] = useState('');
    const [personalized, setPersonalized] = useState(true); // Default to personalized

    // Subscription & Favorite states
    const [subscriptions, setSubscriptions] = useState<number[]>([]);
    const [favorites, setFavorites] = useState<number[]>([]);
    const [subscriptionUpdatingIds, setSubscriptionUpdatingIds] = useState<number[]>([]);
    const [favoriteUpdatingIds, setFavoriteUpdatingIds] = useState<number[]>([]);
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const inFlightPagesRef = useRef<Set<number>>(new Set());

    const loadNews = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
        if (inFlightPagesRef.current.has(pageNum)) {
            if (reset) {
                // Filter/state changed: invalidate older request for this page and allow immediate reload.
                latestLoadRequestRef.current += 1;
                inFlightPagesRef.current.delete(pageNum);
            } else {
                return;
            }
        }
        if (inFlightPagesRef.current.has(pageNum)) {
            return;
        }
        inFlightPagesRef.current.add(pageNum);
        const requestId = ++latestLoadRequestRef.current;

        const effectiveMadh = user?.godModeEnabled
            ? (activeMathId || undefined)
            : (user?.madh || undefined);

        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            const response = await newsService.getNews({
                page: pageNum,
                limit: 10,
                lang,
                category: selectedCategory || undefined,
                madh: effectiveMadh,
                personalized: personalized // Pass preference
            });

            if (!isMountedRef.current || requestId !== latestLoadRequestRef.current) {
                return;
            }

            if (reset || pageNum === 1) {
                setNews(response.news);
            } else {
                setNews(prev => {
                    const seen = new Set(prev.map(item => item.id));
                    const uniqueNext = response.news.filter(item => !seen.has(item.id));
                    return [...prev, ...uniqueNext];
                });
            }

            setHasMore(pageNum < response.totalPages);
            setPage(pageNum);
        } catch (err) {
            if (!isMountedRef.current || requestId !== latestLoadRequestRef.current) {
                return;
            }
            console.error('[NEWS] Error loading news:', err);
            setError('Не удалось загрузить новости');
        } finally {
            inFlightPagesRef.current.delete(pageNum);
            if (isMountedRef.current && requestId === latestLoadRequestRef.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [lang, selectedCategory, selectedMadh, personalized]);

    const loadUserPreferences = useCallback(async () => {
        try {
            const [subs, favs] = await Promise.all([
                newsService.getSubscriptions(),
                newsService.getFavorites()
            ]);
            if (!isMountedRef.current) {
                return;
            }
            setSubscriptions(subs);
            setFavorites(favs);
        } catch (err) {
            console.error('[NEWS] Error loading prefs:', err);
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            inFlightPagesRef.current.clear();
        };
    }, []);

    useEffect(() => {
        loadUserPreferences();
    }, [loadUserPreferences]);

    useEffect(() => {
        loadNews(1, true);
    }, [loadNews, activeMathId]); // Reload when activeMathId changes in Pro Mode

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadNews(1, true), loadUserPreferences()]);
        } finally {
            if (isMountedRef.current) {
                setRefreshing(false);
            }
        }
    }, [loadNews, loadUserPreferences]);

    const toggleSubscription = async (sourceId: number) => {
        if (subscriptionUpdatingIds.includes(sourceId)) {
            return;
        }
        setSubscriptionUpdatingIds(prev => [...prev, sourceId]);
        const isSubscribed = subscriptions.includes(sourceId);
        // Optimistic update
        try {
            if (isSubscribed) {
                setSubscriptions(prev => prev.filter(id => id !== sourceId));
                await newsService.unsubscribe(sourceId);
            } else {
                setSubscriptions(prev => [...prev, sourceId]);
                await newsService.subscribe(sourceId);
            }
        } catch (err) {
            // Rollback optimistic update on failure.
            setSubscriptions(prev =>
                isSubscribed ? [...prev, sourceId] : prev.filter(id => id !== sourceId)
            );
            console.error('[NEWS] Error toggling subscription:', err);
        } finally {
            if (isMountedRef.current) {
                setSubscriptionUpdatingIds(prev => prev.filter(id => id !== sourceId));
            }
        }
    };

    const toggleFavorite = async (sourceId: number) => {
        if (favoriteUpdatingIds.includes(sourceId)) {
            return;
        }
        setFavoriteUpdatingIds(prev => [...prev, sourceId]);
        const isFavorite = favorites.includes(sourceId);
        // Optimistic update
        try {
            if (isFavorite) {
                setFavorites(prev => prev.filter(id => id !== sourceId));
                await newsService.removeFavorite(sourceId);
            } else {
                setFavorites(prev => [...prev, sourceId]);
                await newsService.addFavorite(sourceId);
            }
        } catch (err) {
            // Rollback optimistic update on failure.
            setFavorites(prev =>
                isFavorite ? [...prev, sourceId] : prev.filter(id => id !== sourceId)
            );
            console.error('[NEWS] Error toggling favorite:', err);
        } finally {
            if (isMountedRef.current) {
                setFavoriteUpdatingIds(prev => prev.filter(id => id !== sourceId));
            }
        }
    };

    const handleLoadMore = useCallback(() => {
        if (!loading && !loadingMore && hasMore) {
            loadNews(page + 1);
        }
    }, [loading, loadingMore, hasMore, page, loadNews]);

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setPage(1);
    };

    const handleMadhSelect = (madhId: string) => {
        setSelectedMadh(madhId);
        setPage(1);
    };

    const renderCategoryPills = () => (
        <View style={[styles.categoriesContainer, { backgroundColor: colors.background, paddingTop: 4 }]}>
            {/* Regular Categories Filter */}
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={CATEGORIES}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.categoriesList}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleCategorySelect(item.id)}
                        style={[
                            styles.categoryPill,
                            {
                                backgroundColor: selectedCategory === item.id
                                    ? colors.accent
                                    : colors.surface,
                                borderColor: selectedCategory === item.id
                                    ? colors.accent
                                    : colors.border
                            }
                        ]}
                    >
                        {item.id === '' && <LayoutGrid size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />}
                        {item.id === 'spiritual' && <Sun size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />}
                        {item.id === 'events' && <Calendar size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />}
                        {item.id === 'education' && <GraduationCap size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />}
                        {item.id === 'wellness' && <Heart size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />}
                        <Text style={[
                            styles.categoryPillText,
                            { color: colors.textPrimary }
                        ]}>
                            {lang === 'en' ? item.labelEn : item.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const renderNewsItem = ({ item, index }: { item: NewsItem; index: number }) => {
        const isHero = index === 0 && page === 1;
        const isSubscribed = subscriptions.includes(item.sourceId);
        const isFavorite = favorites.includes(item.sourceId);
        const isSubscriptionUpdating = subscriptionUpdatingIds.includes(item.sourceId);
        const isFavoriteUpdating = favoriteUpdatingIds.includes(item.sourceId);

        return (
            <TouchableOpacity
                style={[
                    isHero ? styles.heroCard : [styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }],
                ]}
                activeOpacity={0.8}
                onPress={() => {
                    (navigation.navigate as any)('NewsDetail', { newsId: item.id });
                }}
            >
                {item.imageUrl ? (
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={isHero ? styles.heroImage : styles.cardImage}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={[colors.surfaceElevated, colors.surface]}
                        style={isHero ? styles.heroImage : styles.cardImage}
                    >
                        <Newspaper size={isHero ? 64 : 32} color={colors.textSecondary} />
                    </LinearGradient>
                )}

                {isHero && (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroContent}>
                            <View style={styles.heroTopActions}>
                                {item.isImportant && (
                                    <View style={styles.importantBadge}>
                                        <Zap size={12} color={colors.textPrimary} style={{ marginRight: 4 }} />
                                        <Text style={styles.importantBadgeText}>{lang === 'en' ? 'Important' : 'Важное'}</Text>
                                    </View>
                                )}
                                <View style={styles.sourceActions}>
                                    <TouchableOpacity
                                        onPress={() => toggleFavorite(item.sourceId)}
                                        style={styles.heroActionBtn}
                                        disabled={isFavoriteUpdating}
                                    >
                                        <Star size={18} color={isFavorite ? colors.warning : colors.textPrimary} fill={isFavorite ? colors.warning : 'transparent'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => toggleSubscription(item.sourceId)}
                                        style={styles.heroActionBtn}
                                        disabled={isSubscriptionUpdating}
                                    >
                                        {isSubscribed ? <Bell size={18} color={colors.textPrimary} /> : <BellOff size={18} color={colors.textPrimary} />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.heroTitle} numberOfLines={2}>{newsService.cleanText(item.title)}</Text>
                            <Text style={styles.heroSummary} numberOfLines={2}>{newsService.cleanText(item.summary)}</Text>
                            <View style={styles.heroMeta}>
                                <Text style={styles.heroDate}>
                                    {newsService.formatDate(item.publishedAt)}
                                </Text>
                                {item.category && (
                                    <Text style={styles.heroCategory}>{item.category}</Text>
                                )}
                            </View>
                        </View>
                    </LinearGradient>
                )}

                {!isHero && (
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.cardMeta}>
                                <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                                    {newsService.formatDate(item.publishedAt)}
                                </Text>
                                {item.isImportant && (
                                    <Zap size={12} color={colors.accent} style={{ marginLeft: 6 }} />
                                )}
                            </View>
                            <View style={styles.cardActions}>
                                <TouchableOpacity onPress={() => toggleFavorite(item.sourceId)} disabled={isFavoriteUpdating}>
                                    <Star size={16} color={isFavorite ? colors.accent : colors.textSecondary} fill={isFavorite ? colors.accent : 'transparent'} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => toggleSubscription(item.sourceId)} disabled={isSubscriptionUpdating}>
                                    {isSubscribed ? <Bell size={16} color={colors.accent} /> : <BellOff size={16} color={colors.textSecondary} />}
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                            {newsService.cleanText(item.title)}
                        </Text>
                        <Text style={[styles.cardSummary, { color: colors.textSecondary }]} numberOfLines={2}>
                            {newsService.cleanText(item.summary)}
                        </Text>
                        <View style={styles.cardFooter}>
                            {item.category && (
                                <View style={[styles.categoryTag, { backgroundColor: colors.background }]}>
                                    <Text style={[styles.categoryTagText, { color: colors.textSecondary }]}>
                                        {item.category}
                                    </Text>
                                </View>
                            )}
                            {item.sourceName && (
                                <Text style={[styles.sourceName, { color: colors.accent }]}>
                                    {item.sourceName}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!loadingMore || !hasMore) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.accent} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                <Inbox size={64} color={colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {lang === 'en' ? 'No news yet' : 'Новостей пока нет'}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {lang === 'en'
                        ? 'Check back later for updates'
                        : 'Загляните позже для обновлений'}
                </Text>
            </View>
        );
    };

    if (loading && news.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {lang === 'en' ? 'Loading news...' : 'Загрузка новостей...'}
                </Text>
            </View>
        );
    }

    if (error && news.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <AlertCircle size={48} color={colors.accent} style={{ marginBottom: 16 }} />
                <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.accent }]}
                    onPress={() => loadNews(1, true)}
                >
                    <Text style={styles.retryButtonText}>
                        {lang === 'en' ? 'Try again' : 'Попробовать снова'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 1. PRO Filter Panel / Fixed Math Info (Topmost) */}
            <View style={{ marginTop: 12 }}>
                {user?.godModeEnabled ? (
                    <GodModeFiltersPanel
                        filters={godModeFilters}
                        activeMathId={activeMathId || undefined}
                        onSelectMath={setActiveMath}
                    />
                ) : (
                    user?.madh && (
                        <View style={styles.fixedMadhContainer}>
                            <Building2 size={14} color={colors.textSecondary} />
                            <Text style={[styles.fixedMadhText, { color: colors.textSecondary }]}>
                                {user.madh}
                            </Text>
                        </View>
                    )
                )}
            </View>

            {/* 2. Personalized Feed Toggle (Below PRO) */}
            <View style={[styles.personalizedToggleContainer, { marginTop: 4, marginBottom: 8 }]}>
                <TouchableOpacity
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setPersonalized(!personalized);
                    }}
                    style={[
                        styles.toggleButton,
                        personalized
                            ? {
                                backgroundColor: colors.accent,
                                borderColor: colors.accent,
                                shadowColor: colors.accent,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 3,
                            }
                            : { backgroundColor: colors.surface, borderColor: colors.border }
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Rss
                            size={14}
                            color={personalized ? colors.textPrimary : colors.textSecondary}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[
                            styles.toggleText,
                            { color: personalized ? colors.textPrimary : colors.textSecondary }
                        ]}>
                            {lang === 'en' ? 'My Feed' : 'Моя лента'}
                        </Text>
                        {personalized && (
                            <View style={{ marginLeft: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 2 }}>
                                <Sun size={10} color={colors.textPrimary} fill={colors.textPrimary} />
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <Text style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginLeft: 4,
                    alignSelf: 'center',
                    opacity: personalized ? 1 : 0.5
                }}>
                    {personalized
                        ? (lang === 'en' ? 'Personalized' : 'Персонально')
                        : (lang === 'en' ? 'General' : 'Общая')}
                </Text>
            </View>

            {renderCategoryPills()}
            <FlatList
                data={news}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderNewsItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 16,
        paddingTop: 8,
    },

    // Categories
    categoriesContainer: {
        paddingTop: 12,
        paddingBottom: 4,
    },
    personalizedToggleContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    toggleButton: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(0,0,0,0.5)',
    },
    categoriesList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryPill: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        alignItems: 'center',
        elevation: 1,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    categoryPillText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Hero Card (first item)
    heroCard: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    heroImage: {
        width: '100%',
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
        justifyContent: 'flex-end',
    },
    heroContent: {
        padding: 16,
    },
    heroTopActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sourceActions: {
        flexDirection: 'row',
        gap: 8,
    },
    heroActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionEmoji: {
        fontSize: 18,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    heroSummary: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 8,
    },
    heroMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    heroDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    heroCategory: {
        fontSize: 12,
        color: colors.textSecondary,
        backgroundColor: colors.overlay,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    importantBadge: {
        backgroundColor: colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    importantBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },

    // Regular Card
    card: {
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        flexDirection: 'row',
        elevation: 2,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardImage: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 32,
    },
    cardContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    cardActionEmoji: {
        fontSize: 16,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardDate: {
        fontSize: 11,
    },
    importantIcon: {
        marginLeft: 6,
        fontSize: 12,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 20,
    },
    cardSummary: {
        fontSize: 13,
        lineHeight: 18,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    categoryTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    categoryTagText: {
        fontSize: 11,
        fontWeight: '500',
    },
    sourceName: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },

    // Loading & Empty states
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    footer: {
        paddingVertical: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    fixedMadhContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        marginBottom: 4,
    },
    fixedMadhText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
