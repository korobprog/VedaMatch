import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    useColorScheme,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';
import { newsService, NewsItem } from '../../../services/newsService';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

// Category pills for filtering
const CATEGORIES = [
    { id: '', label: 'Все', labelEn: 'All' },
    { id: 'spiritual', label: 'Духовное', labelEn: 'Spiritual' },
    { id: 'events', label: 'События', labelEn: 'Events' },
    { id: 'education', label: 'Образование', labelEn: 'Education' },
    { id: 'wellness', label: 'Здоровье', labelEn: 'Wellness' },
];

export const NewsScreen = () => {
    const { t, i18n } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const navigation = useNavigation();
    const lang = i18n.language === 'en' ? 'en' : 'ru';

    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [personalized, setPersonalized] = useState(true); // Default to personalized

    const loadNews = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            }
            setError(null);

            const response = await newsService.getNews({
                page: pageNum,
                limit: 10,
                lang,
                category: selectedCategory || undefined,
                personalized: personalized // Pass preference
            });

            if (reset || pageNum === 1) {
                setNews(response.news);
            } else {
                setNews(prev => [...prev, ...response.news]);
            }

            setHasMore(pageNum < response.totalPages);
            setPage(pageNum);
        } catch (err) {
            console.error('[NEWS] Error loading news:', err);
            setError('Не удалось загрузить новости');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [lang, selectedCategory, personalized]);

    useEffect(() => {
        loadNews(1, true);
    }, [loadNews, selectedCategory]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadNews(1, true);
    }, [loadNews]);

    const handleLoadMore = useCallback(() => {
        if (!loading && hasMore) {
            loadNews(page + 1);
        }
    }, [loading, hasMore, page, loadNews]);

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setPage(1);
    };

    const renderCategoryPills = () => (
        <View style={styles.categoriesContainer}>
            {/* Personalized Toggle */}
            <View style={styles.personalizedToggleContainer}>
                <TouchableOpacity
                    onPress={() => setPersonalized(true)}
                    style={[
                        styles.toggleButton,
                        personalized && { backgroundColor: theme.primary || '#6366f1' }
                    ]}
                >
                    <Text style={[styles.toggleText, personalized && { color: '#fff' }]}>
                        {lang === 'en' ? 'My Feed' : 'Моя лента'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setPersonalized(false)}
                    style={[
                        styles.toggleButton,
                        !personalized && { backgroundColor: theme.primary || '#6366f1' }
                    ]}
                >
                    <Text style={[styles.toggleText, !personalized && { color: '#fff' }]}>
                        {lang === 'en' ? 'All' : 'Все'}
                    </Text>
                </TouchableOpacity>
            </View>

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
                                    ? theme.primary || '#6366f1'
                                    : theme.header,
                                borderColor: selectedCategory === item.id
                                    ? 'transparent'
                                    : theme.borderColor
                            }
                        ]}
                    >
                        <Text style={[
                            styles.categoryPillText,
                            {
                                color: selectedCategory === item.id
                                    ? '#fff'
                                    : theme.text
                            }
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

        return (
            <TouchableOpacity
                style={[
                    isHero ? styles.heroCard : styles.card,
                    { backgroundColor: theme.header }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                    navigation.navigate('NewsDetail' as never, { newsId: item.id } as never);
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
                        colors={isDarkMode ? ['#1e293b', '#334155'] : ['#e0e7ff', '#c7d2fe']}
                        style={isHero ? styles.heroImage : styles.cardImage}
                    >
                        <Text style={styles.placeholderEmoji}>📰</Text>
                    </LinearGradient>
                )}

                {isHero && (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroContent}>
                            {item.isImportant && (
                                <View style={styles.importantBadge}>
                                    <Text style={styles.importantBadgeText}>⚡ {lang === 'en' ? 'Important' : 'Важное'}</Text>
                                </View>
                            )}
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
                        <View style={styles.cardMeta}>
                            <Text style={[styles.cardDate, { color: theme.subText }]}>
                                {newsService.formatDate(item.publishedAt)}
                            </Text>
                            {item.isImportant && (
                                <Text style={styles.importantIcon}>⚡</Text>
                            )}
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                            {newsService.cleanText(item.title)}
                        </Text>
                        <Text style={[styles.cardSummary, { color: theme.subText }]} numberOfLines={2}>
                            {newsService.cleanText(item.summary)}
                        </Text>
                        {item.category && (
                            <View style={[styles.categoryTag, { backgroundColor: theme.background }]}>
                                <Text style={[styles.categoryTagText, { color: theme.subText }]}>
                                    {item.category}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!hasMore) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={theme.primary || '#6366f1'} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {lang === 'en' ? 'No news yet' : 'Новостей пока нет'}
                </Text>
                <Text style={[styles.emptyText, { color: theme.subText }]}>
                    {lang === 'en'
                        ? 'Check back later for updates'
                        : 'Загляните позже для обновлений'}
                </Text>
            </View>
        );
    };

    if (loading && news.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary || '#6366f1'} />
                <Text style={[styles.loadingText, { color: theme.subText }]}>
                    {lang === 'en' ? 'Loading news...' : 'Загрузка новостей...'}
                </Text>
            </View>
        );
    }

    if (error && news.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <Text style={styles.errorEmoji}>😕</Text>
                <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: theme.primary || '#6366f1' }]}
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
        <View style={[styles.container, { backgroundColor: theme.background }]}>
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
                        tintColor={theme.primary || '#6366f1'}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        backgroundColor: 'rgba(0,0,0,0.05)',
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
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
        shadowColor: '#000',
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
    heroTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 6,
    },
    heroSummary: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
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
        color: 'rgba(255,255,255,0.7)',
    },
    heroCategory: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    importantBadge: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    importantBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },

    // Regular Card
    card: {
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        flexDirection: 'row',
        elevation: 2,
        shadowColor: '#000',
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
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
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
    categoryTag: {
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    categoryTagText: {
        fontSize: 11,
        fontWeight: '500',
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
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
