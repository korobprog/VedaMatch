import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    ArrowLeft, Play, ChevronDown, ChevronUp,
    Clock, Eye, Layers, Calendar, Share2, Heart
} from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaService } from '../../services/multimediaService';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Episode {
    id: number;
    number: number;
    title: string;
    description: string;
    videoURL: string;
    thumbnailURL: string;
    duration: number;
    viewCount: number;
}

interface Season {
    id: number;
    number: number;
    title: string;
    episodes: Episode[];
}

interface Series {
    id: number;
    title: string;
    description: string;
    coverImageURL: string;
    year: number;
    genre: string;
    language: string;
    isActive: boolean;
    isFeatured: boolean;
    viewCount: number;
    seasons: Season[];
}

export const SeriesDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const [series, setSeries] = useState<Series>(route.params?.series);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);
    const [expandedDescription, setExpandedDescription] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    // Load full series details with episodes
    useEffect(() => {
        const loadDetails = async () => {
            try {
                const res = await multimediaService.getSeriesDetails(series.id);
                setSeries(res);
                if (res.seasons?.length > 0) {
                    setSelectedSeason(res.seasons[0].number);
                }
            } catch (error) {
                console.error('Failed to load series details:', error);
            }
        };
        loadDetails();
    }, []);

    const currentSeason = series.seasons?.find(s => s.number === selectedSeason);
    const episodes = currentSeason?.episodes || [];

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlayEpisode = (episode: Episode) => {
        navigation.navigate('VideoPlayer', {
            video: {
                ID: episode.id,
                title: `${series.title} - ${episode.title || `Серия ${episode.number}`}`,
                url: episode.videoURL,
                thumbnailUrl: episode.thumbnailURL || series.coverImageURL,
                duration: episode.duration,
            }
        });
    };

    const cleanTitle = (title: string, episodeNum: number) => {
        // If title is just a long number (likely a timestamp/id), show generic name
        if (/^\d{10,}$/.test(title)) {
            return `Серия ${episodeNum}`;
        }
        return title || `Серия ${episodeNum}`;
    };

    const renderEpisode = ({ item, index }: { item: Episode; index: number }) => (
        <TouchableOpacity
            style={[styles.episodeCard, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => handlePlayEpisode(item)}
            activeOpacity={0.8}
        >
            <View style={styles.episodeLeft}>
                <View style={[styles.episodeNumber, { backgroundColor: colors.accentSoft }]}>
                    <Text style={[styles.episodeNumberText, { color: colors.accent }]}>
                        {item.number}
                    </Text>
                </View>
                <View style={styles.episodeInfo}>
                    <Text style={[styles.episodeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {cleanTitle(item.title, item.number)}
                    </Text>
                    <View style={styles.episodeMeta}>
                        {item.duration > 0 && (
                            <View style={styles.metaItem}>
                                <Clock size={12} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                    {formatDuration(item.duration)}
                                </Text>
                            </View>
                        )}
                        {item.viewCount > 0 && (
                            <View style={styles.metaItem}>
                                <Eye size={12} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                    {item.viewCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            <View style={[styles.playButton, { backgroundColor: colors.accent }]}>
                <Play size={16} color="white" fill="white" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Hero Section */}
            <View style={styles.hero}>
                {series.coverImageURL ? (
                    <Image source={{ uri: series.coverImageURL }} style={styles.heroImage} />
                ) : (
                    <View style={[styles.heroPlaceholder, { backgroundColor: colors.accent }]} />
                )}

                {/* Gradient overlay */}
                <LinearGradient
                    colors={['transparent', colors.background]}
                    style={styles.heroGradient}
                />

                {/* Back button */}
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: colors.overlay }]}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.heroActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.overlay }]}
                        onPress={() => setIsFavorite(!isFavorite)}
                    >
                        <Heart
                            size={20}
                            color={isFavorite ? colors.danger : colors.textPrimary}
                            fill={isFavorite ? colors.danger : 'transparent'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.overlay }]}>
                        <Share2 size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Title & Meta */}
                <View style={styles.titleSection}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{series.title}</Text>

                    <View style={styles.metaRow}>
                        {series.year && (
                            <View style={styles.metaItem}>
                                <Calendar size={14} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{series.year}</Text>
                            </View>
                        )}
                        {series.seasons && (
                            <View style={styles.metaItem}>
                                <Layers size={14} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                    {series.seasons.length} сезонов
                                </Text>
                            </View>
                        )}
                        {series.genre && (
                            <View style={[styles.genreBadge, { backgroundColor: colors.accentSoft }]}>
                                <Text style={[styles.genreText, { color: colors.accent }]}>{series.genre}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Description */}
                {series.description && (
                    <TouchableOpacity
                        style={styles.descriptionSection}
                        onPress={() => setExpandedDescription(!expandedDescription)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[styles.description, { color: colors.textSecondary }]}
                            numberOfLines={expandedDescription ? undefined : 3}
                        >
                            {series.description}
                        </Text>
                        {series.description.length > 150 && (
                            <View style={styles.expandRow}>
                                <Text style={[styles.expandText, { color: colors.accent }]}>
                                    {expandedDescription ? 'Свернуть' : 'Развернуть'}
                                </Text>
                                {expandedDescription ? (
                                    <ChevronUp size={16} color={colors.accent} />
                                ) : (
                                    <ChevronDown size={16} color={colors.accent} />
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {/* Season Selector */}
                {series.seasons && series.seasons.length > 1 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.seasonSelector}
                        contentContainerStyle={styles.seasonSelectorContent}
                    >
                        {series.seasons.map((season) => (
                            <TouchableOpacity
                                key={season.id}
                                style={[
                                    styles.seasonTab,
                                    selectedSeason === season.number && {
                                        backgroundColor: colors.accent,
                                    },
                                    selectedSeason !== season.number && {
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }
                                ]}
                                onPress={() => setSelectedSeason(season.number)}
                            >
                                <Text style={[
                                    styles.seasonTabText,
                                    { color: selectedSeason === season.number ? 'white' : colors.textPrimary }
                                ]}>
                                    Сезон {season.number}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Episodes Header */}
                <View style={styles.episodesHeader}>
                    <Text style={[styles.episodesTitle, { color: colors.textPrimary }]}>
                        Серии
                    </Text>
                    <Text style={[styles.episodesCount, { color: colors.textSecondary }]}>
                        {episodes.length} эпизодов
                    </Text>
                </View>

                {/* Episodes List */}
                <View style={styles.episodesList}>
                    {episodes.map((episode, index) => (
                        <View key={episode.id}>
                            {renderEpisode({ item: episode, index })}
                        </View>
                    ))}

                    {episodes.length === 0 && (
                        <View style={styles.emptyEpisodes}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Серии ещё не добавлены
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    hero: {
        width: '100%',
        height: height * 0.45,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '60%',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroActions: {
        position: 'absolute',
        top: 50,
        right: 16,
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginTop: -40,
    },
    titleSection: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
    },
    genreBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    genreText: {
        fontSize: 12,
        fontWeight: '600',
    },
    descriptionSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    description: {
        fontSize: 14,
        lineHeight: 22,
    },
    expandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    expandText: {
        fontSize: 13,
        fontWeight: '600',
    },
    seasonSelector: {
        marginBottom: 20,
    },
    seasonSelectorContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    seasonTab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
    },
    seasonTabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    episodesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    episodesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    episodesCount: {
        fontSize: 13,
    },
    episodesList: {
        paddingHorizontal: 20,
    },
    episodeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
    },
    episodeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    episodeNumber: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    episodeNumberText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    episodeInfo: {
        flex: 1,
    },
    episodeTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    episodeMeta: {
        flexDirection: 'row',
        gap: 12,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyEpisodes: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    },
});

export default SeriesDetailScreen;
