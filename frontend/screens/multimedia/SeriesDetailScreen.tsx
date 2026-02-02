import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    ArrowLeft, Play, ChevronDown, ChevronUp,
    Clock, Eye, Layers, Calendar, Share2, Heart
} from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
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
    const { vTheme } = useSettings();
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

    const renderEpisode = ({ item, index }: { item: Episode; index: number }) => (
        <TouchableOpacity
            style={[styles.episodeCard, { backgroundColor: vTheme.colors.surface }]}
            onPress={() => handlePlayEpisode(item)}
            activeOpacity={0.8}
        >
            <View style={styles.episodeLeft}>
                <View style={[styles.episodeNumber, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                    <Text style={[styles.episodeNumberText, { color: vTheme.colors.primary }]}>
                        {item.number}
                    </Text>
                </View>
                <View style={styles.episodeInfo}>
                    <Text style={[styles.episodeTitle, { color: vTheme.colors.text }]} numberOfLines={1}>
                        {item.title || `Серия ${item.number}`}
                    </Text>
                    <View style={styles.episodeMeta}>
                        {item.duration > 0 && (
                            <View style={styles.metaItem}>
                                <Clock size={12} color={vTheme.colors.textSecondary} />
                                <Text style={[styles.metaText, { color: vTheme.colors.textSecondary }]}>
                                    {formatDuration(item.duration)}
                                </Text>
                            </View>
                        )}
                        {item.viewCount > 0 && (
                            <View style={styles.metaItem}>
                                <Eye size={12} color={vTheme.colors.textSecondary} />
                                <Text style={[styles.metaText, { color: vTheme.colors.textSecondary }]}>
                                    {item.viewCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            <View style={[styles.playButton, { backgroundColor: vTheme.colors.primary }]}>
                <Play size={16} color="#fff" fill="#fff" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            {/* Hero Section */}
            <View style={styles.hero}>
                {series.coverImageURL ? (
                    <Image source={{ uri: series.coverImageURL }} style={styles.heroImage} />
                ) : (
                    <View style={[styles.heroPlaceholder, { backgroundColor: vTheme.colors.primary }]} />
                )}

                {/* Gradient overlay */}
                <LinearGradient
                    colors={['transparent', vTheme.colors.background]}
                    style={styles.heroGradient}
                />

                {/* Back button */}
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.heroActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                        onPress={() => setIsFavorite(!isFavorite)}
                    >
                        <Heart
                            size={20}
                            color={isFavorite ? '#ff6b6b' : '#fff'}
                            fill={isFavorite ? '#ff6b6b' : 'transparent'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                        <Share2 size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Title & Meta */}
                <View style={styles.titleSection}>
                    <Text style={[styles.title, { color: vTheme.colors.text }]}>{series.title}</Text>

                    <View style={styles.metaRow}>
                        {series.year && (
                            <View style={styles.metaItem}>
                                <Calendar size={14} color={vTheme.colors.textSecondary} />
                                <Text style={[styles.metaText, { color: vTheme.colors.textSecondary }]}>{series.year}</Text>
                            </View>
                        )}
                        {series.seasons && (
                            <View style={styles.metaItem}>
                                <Layers size={14} color={vTheme.colors.textSecondary} />
                                <Text style={[styles.metaText, { color: vTheme.colors.textSecondary }]}>
                                    {series.seasons.length} сезонов
                                </Text>
                            </View>
                        )}
                        {series.genre && (
                            <View style={[styles.genreBadge, { backgroundColor: `${vTheme.colors.accent}20` }]}>
                                <Text style={[styles.genreText, { color: vTheme.colors.accent }]}>{series.genre}</Text>
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
                            style={[styles.description, { color: vTheme.colors.textSecondary }]}
                            numberOfLines={expandedDescription ? undefined : 3}
                        >
                            {series.description}
                        </Text>
                        {series.description.length > 150 && (
                            <View style={styles.expandRow}>
                                <Text style={[styles.expandText, { color: vTheme.colors.primary }]}>
                                    {expandedDescription ? 'Свернуть' : 'Развернуть'}
                                </Text>
                                {expandedDescription ? (
                                    <ChevronUp size={16} color={vTheme.colors.primary} />
                                ) : (
                                    <ChevronDown size={16} color={vTheme.colors.primary} />
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
                                        backgroundColor: vTheme.colors.primary,
                                    },
                                    selectedSeason !== season.number && {
                                        backgroundColor: vTheme.colors.surface,
                                        borderWidth: 1,
                                        borderColor: vTheme.colors.divider,
                                    }
                                ]}
                                onPress={() => setSelectedSeason(season.number)}
                            >
                                <Text style={[
                                    styles.seasonTabText,
                                    { color: selectedSeason === season.number ? '#fff' : vTheme.colors.text }
                                ]}>
                                    Сезон {season.number}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Episodes Header */}
                <View style={styles.episodesHeader}>
                    <Text style={[styles.episodesTitle, { color: vTheme.colors.text }]}>
                        Серии
                    </Text>
                    <Text style={[styles.episodesCount, { color: vTheme.colors.textSecondary }]}>
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
                            <Text style={[styles.emptyText, { color: vTheme.colors.textSecondary }]}>
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
