import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    useColorScheme,
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
import { COLORS } from '../../../components/chat/ChatConstants';
import { newsService, NewsItem } from '../../../services/newsService';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';

const { width } = Dimensions.get('window');

type NewsDetailRouteProp = RouteProp<RootStackParamList, 'NewsDetail'>;

export const NewsDetailScreen = () => {
    const { t, i18n } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const navigation = useNavigation();
    const route = useRoute<NewsDetailRouteProp>();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
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
            setError(lang === 'en' ? 'Failed to load news' : 'Не удалось загрузить новость');
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
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={roleColors.accent} />
                <Text style={[styles.loadingText, { color: theme.subText }]}>
                    {lang === 'en' ? 'Loading...' : 'Загрузка...'}
                </Text>
            </View>
        );
    }

    if (error || !news) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <Text style={styles.errorEmoji}>😕</Text>
                <Text style={[styles.errorText, { color: theme.text }]}>
                    {error || (lang === 'en' ? 'News not found' : 'Новость не найдена')}
                </Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: roleColors.accent }]}
                    onPress={loadNewsDetail}
                >
                    <Text style={styles.retryButtonText}>
                        {lang === 'en' ? 'Try again' : 'Попробовать снова'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                >
                    <Text style={[styles.backButtonText, { color: roleColors.accent }]}>
                        {lang === 'en' ? '← Back' : '← Назад'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header with back button */}
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
                    <Text style={[styles.headerButtonText, { color: roleColors.accent }]}>
                        ← {lang === 'en' ? 'Back' : 'Назад'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                    <Text style={[styles.headerButtonText, { color: roleColors.accent }]}>
                        {lang === 'en' ? 'Share' : 'Поделиться'} ↗
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
                        colors={[roleColors.accentSoft, roleColors.surfaceElevated]}
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
                            <View style={[styles.importantBadge, { backgroundColor: roleColors.accent }]}>
                                <Text style={[styles.importantBadgeText, { color: roleColors.background }]}>
                                    ⚡ {lang === 'en' ? 'Important' : 'Важное'}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.date, { color: theme.subText }]}>
                            {newsService.formatDate(news.publishedAt)}
                        </Text>
                        {news.category && (
                            <View style={[styles.categoryTag, { backgroundColor: theme.header }]}>
                                <Text style={[styles.categoryTagText, { color: theme.subText }]}>
                                    {news.category}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.text }]}>
                        {newsService.cleanText(news.title)}
                    </Text>

                    {/* Summary */}
                    {news.summary && (
                        <Text style={[styles.summary, { color: theme.subText }]}>
                            {newsService.cleanText(news.summary)}
                        </Text>
                    )}

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

                    {/* Original Source Button (for Video/Audio) */}
                    {typeof news.originalUrl === 'string' && news.originalUrl.length > 0 && (
                        <TouchableOpacity
                            style={[styles.sourceButton, { borderColor: roleColors.accent }]}
                            onPress={() => Linking.openURL(news.originalUrl as string)}
                        >
                            <Text style={[styles.sourceButtonText, { color: roleColors.accent }]}>
                                {lang === 'en' ? '📺 View Original (Video/Audio)' : '📺 Перейти к источнику (Видео/Аудио)'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Content */}
                    <Text style={[styles.content, { color: theme.text }]}>
                        {newsService.cleanText(news.content || news.summary) || (lang === 'en' ? 'No content available' : 'Содержимое недоступно')}
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
                                        style={[styles.tag, { backgroundColor: theme.header }]}
                                    >
                                        <Text style={[styles.tagText, { color: theme.subText }]}>
                                            #{trimmedTag}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Views count */}
                    <View style={styles.statsContainer}>
                        <Text style={[styles.statsText, { color: theme.subText }]}>
                            👁 {news.viewsCount || 0} {lang === 'en' ? 'views' : 'просмотров'}
                        </Text>
                    </View>
                </View>
            </ScrollView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
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
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    importantBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    date: {
        fontSize: 13,
    },
    categoryTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryTagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 32,
        marginBottom: 12,
    },
    summary: {
        fontSize: 16,
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 16,
    },
    content: {
        fontSize: 16,
        lineHeight: 26,
        textAlign: 'justify',
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
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
    },
    statsContainer: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    statsText: {
        fontSize: 13,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
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
        marginBottom: 12,
    },
    retryButtonText: {
        color: '#fff',
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
