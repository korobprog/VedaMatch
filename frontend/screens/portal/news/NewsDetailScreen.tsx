import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Share,
    Dimensions,
    Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { newsService, NewsItem } from '../../../services/newsService';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const { width } = Dimensions.get('window');

type NewsDetailRouteProp = RouteProp<RootStackParamList, 'NewsDetail'>;

export const NewsDetailScreen = () => {
    const { t, i18n } = useTranslation();
    const { isDarkMode } = useSettings();
    const navigation = useNavigation();
    const route = useRoute<NewsDetailRouteProp>();
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const lang = i18n.language === 'en' ? 'en' : 'ru';

    const { newsId } = route.params;

    const [news, setNews] = useState<NewsItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadNewsDetail();
    }, [newsId]);

    const loadNewsDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const item = await newsService.getNewsById(newsId, lang);
            setNews(item);
        } catch (err) {
            console.error('[NewsDetail] Error loading news:', err);
            setError('Failed to load news');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!news) return;
        try {
            await Share.share({
                message: `${news.title}\n\n${news.summary}`,
                title: news.title,
            });
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>
                    Loading...
                </Text>
            </View>
        );
    }

    if (error || !news) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorEmoji}>😕</Text>
                <Text style={styles.errorText}>
                    {error || 'News not found'}
                </Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.accent }]}
                    onPress={loadNewsDetail}
                >
                    <Text style={styles.retryButtonText}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                >
                    <Text style={[styles.backButtonText, { color: colors.accent }]}>
                        ← Back
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                    <Text style={[styles.headerButtonText, { color: colors.accent }]}>
                        ← Back
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                    <Text style={[styles.headerButtonText, { color: colors.accent }]}>
                        Share ↗
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Image */}
                {news.imageUrl ? (
                    <Image
                        source={{ uri: news.imageUrl }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={[colors.accentSoft, colors.surfaceElevated]}
                        style={styles.heroImage}
                    >
                        <Text style={styles.placeholderEmoji}>📰</Text>
                    </LinearGradient>
                )}

                {/* Content */}
                <View style={styles.contentContainer}>
                    {/* Meta info */}
                    <View style={styles.metaContainer}>
                        {news.isImportant && (
                            <View style={[styles.importantBadge, { backgroundColor: colors.accent }]}>
                                <Text style={[styles.importantBadgeText, { color: colors.background }]}>
                                    ⚡ Important
                                </Text>
                            </View>
                        )}
                        <Text style={styles.date}>
                            {newsService.formatDate(news.publishedAt, i18n.language)}
                        </Text>
                        {news.category ? (
                            <View style={styles.categoryTag}>
                                <Text style={styles.categoryTagText}>
                                    {news.category}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>
                        {newsService.cleanText(news.title)}
                    </Text>

                    {/* Summary */}
                    {news.summary && (
                        <Text style={styles.summary}>
                            {newsService.cleanText(news.summary)}
                        </Text>
                    )}

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Original Source Button (for Video/Audio) */}
                    {typeof news.originalUrl === 'string' && news.originalUrl.length > 0 && (
                        <TouchableOpacity
                            style={[styles.sourceButton, { borderColor: colors.accent }]}
                            onPress={() => Linking.openURL(news.originalUrl as string)}
                        >
                            <Text style={[styles.sourceButtonText, { color: colors.accent }]}>
                                📺 View Original (Video/Audio)
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Content */}
                    <Text style={styles.content}>
                        {newsService.cleanText(news.content || news.summary) || 'No content available'}
                    </Text>

                    {/* Tags */}
                    {news.tags && (
                        <View style={styles.tagsContainer}>
                            {(typeof news.tags === 'string' ? news.tags.split(',') : []).map((tag: string, index: number) => {
                                const trimmedTag = tag.trim();
                                if (!trimmedTag) return null;
                                return (
                                    <View
                                        key={index}
                                        style={styles.tag}
                                    >
                                        <Text style={styles.tagText}>
                                            #{trimmedTag}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Views count */}
                    <View style={styles.statsContainer}>
                        <Text style={styles.statsText}>
                            👁 {news.viewsCount || 0} views
                        </Text>
                    </View>
                </View>
            </ScrollView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        backgroundColor: colors.surfaceElevated,
        borderBottomColor: colors.border,
    },
    headerButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    headerButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroImage: {
        width: width,
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 64,
    },
    contentContainer: {
        padding: 20,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 12,
    },
    importantBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    importantBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    date: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    categoryTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: colors.surfaceElevated,
    },
    categoryTagText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 32,
        marginBottom: 12,
        color: colors.textPrimary,
    },
    summary: {
        fontSize: 16,
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: 16,
        color: colors.textSecondary,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 16,
        backgroundColor: colors.border,
    },
    content: {
        fontSize: 16,
        lineHeight: 26,
        textAlign: 'justify',
        color: colors.textPrimary,
    },
    sourceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    sourceButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 24,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.surfaceElevated,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    statsContainer: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statsText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
        color: colors.textPrimary,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    retryButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    backButton: {
        paddingVertical: 8,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default NewsDetailScreen;
