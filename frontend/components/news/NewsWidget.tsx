import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { newsService, NewsItem } from '../../services/newsService';
import { COLORS } from '../chat/ChatConstants';

interface NewsWidgetProps {
    limit?: number;
    onSeeAll?: () => void;
    onPressItem?: (item: NewsItem) => void;
    style?: any;
}

/**
 * A compact news widget to display latest news on the main screen
 * Can be used on Dashboard, Home screens, etc.
 */
export const NewsWidget: React.FC<NewsWidgetProps> = ({
    limit = 3,
    onSeeAll,
    onPressItem,
    style,
}) => {
    const { i18n } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('hi') ? 'hi' : 'en';
    const copy = {
        en: {
            loadFailed: 'Failed to load news',
            title: '📰 Latest News',
            empty: 'No news yet',
            seeAll: 'See all',
        },
        ru: {
            loadFailed: 'Ошибка загрузки',
            title: '📰 Новости',
            empty: 'Новостей пока нет',
            seeAll: 'Все',
        },
        hi: {
            loadFailed: 'समाचार लोड नहीं हुए',
            title: '📰 समाचार',
            empty: 'अभी कोई समाचार नहीं है',
            seeAll: 'सब देखें',
        },
    }[lang];

    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadNews = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const items = await newsService.getLatestNews(limit, lang);
            setNews(items);
        } catch (err) {
            console.error('[NewsWidget] Error:', err);
            setError(copy.loadFailed);
        } finally {
            setLoading(false);
        }
    }, [copy.loadFailed, lang, limit]);

    useEffect(() => {
        loadNews();
    }, [loadNews]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, style]}>
                <ActivityIndicator size="small" color={theme.primary || '#6366f1'} />
            </View>
        );
    }

    if (error || news.length === 0) {
        return (
            <View style={[styles.container, style, { backgroundColor: theme.header }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>
                        {copy.title}
                    </Text>
                </View>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: theme.subText }]}>
                        {error || copy.empty}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, style, { backgroundColor: theme.header }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>
                    {copy.title}
                </Text>
                {onSeeAll && (
                    <TouchableOpacity onPress={onSeeAll}>
                        <Text style={[styles.seeAll, { color: theme.primary || '#6366f1' }]}>
                            {copy.seeAll}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* News Items */}
            <View style={styles.newsContainer}>
                {news.map((item, index) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.newsItem,
                            { borderBottomColor: theme.borderColor },
                            index === news.length - 1 && styles.lastItem
                        ]}
                        activeOpacity={0.7}
                        onPress={() => onPressItem?.(item)}
                    >
                        {/* Thumbnail */}
                        {item.imageUrl ? (
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.thumbnail}
                                resizeMode="cover"
                            />
                        ) : (
                            <LinearGradient
                                colors={isDarkMode ? ['#1e293b', '#334155'] : ['#e0e7ff', '#c7d2fe']}
                                style={styles.thumbnail}
                            >
                                <Text style={styles.thumbnailPlaceholder}>📰</Text>
                            </LinearGradient>
                        )}

                        {/* Content */}
                        <View style={styles.itemContent}>
                            <View style={styles.itemMeta}>
                                <Text style={[styles.itemDate, { color: theme.subText }]}>
                                    {newsService.formatDate(item.publishedAt, i18n.language)}
                                </Text>
                                {item.isImportant && (
                                    <View style={styles.importantBadge}>
                                        <Text style={styles.importantBadgeText}>⚡</Text>
                                    </View>
                                )}
                            </View>
                            <Text
                                style={[styles.itemTitle, { color: theme.text }]}
                                numberOfLines={2}
                            >
                                {item.title}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '500',
    },
    newsContainer: {
        gap: 0,
    },
    newsItem: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 12,
    },
    lastItem: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    thumbnail: {
        width: 56,
        height: 56,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailPlaceholder: {
        fontSize: 20,
    },
    itemContent: {
        flex: 1,
        justifyContent: 'center',
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemDate: {
        fontSize: 11,
    },
    importantBadge: {
        marginLeft: 6,
        backgroundColor: '#fef3c7',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    importantBadgeText: {
        fontSize: 10,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 19,
    },
    emptyState: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
    },
});

export default NewsWidget;
