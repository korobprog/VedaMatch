import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    TextInput,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Film, Search, Play, Loader2, ArrowLeft, Layers, Calendar } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { useSettings } from '../../context/SettingsContext';
import { multimediaService } from '../../services/multimediaService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Series {
    id: number;
    title: string;
    description: string;
    coverImageURL: string;
    year: number;
    genre: string;
    isActive: boolean;
    isFeatured: boolean;
    viewCount: number;
    seasons: Season[];
}

interface Season {
    id: number;
    number: number;
    title: string;
    episodes: Episode[];
}

interface Episode {
    id: number;
    number: number;
    title: string;
    videoURL: string;
    thumbnailURL: string;
    duration: number;
}

export const SeriesScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [series, setSeries] = useState<Series[]>([]);
    const [search, setSearch] = useState('');

    const loadSeries = async () => {
        try {
            const res = await multimediaService.getSeries();
            setSeries(res.series || []);
        } catch (error) {
            console.error('Failed to load series:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadSeries();
    }, []);

    const filteredSeries = series.filter(s =>
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.genre?.toLowerCase().includes(search.toLowerCase())
    );

    const renderSeriesCard = ({ item }: { item: Series }) => {
        const seasonsCount = item.seasons?.length || 0;
        const episodesCount = item.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;

        return (
            <TouchableOpacity
                style={[styles.seriesCard, { backgroundColor: vTheme.colors.surface, ...vTheme.shadows.soft }]}
                onPress={() => navigation.navigate('SeriesDetail', { series: item })}
                activeOpacity={0.8}
            >
                {item.coverImageURL ? (
                    <Image source={{ uri: item.coverImageURL }} style={styles.poster} />
                ) : (
                    <View style={[styles.posterPlaceholder, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                        <Film size={40} color={vTheme.colors.primary} />
                    </View>
                )}

                {/* Overlay with gradient effect */}
                <View style={styles.cardOverlay}>
                    <View style={styles.badgeContainer}>
                        {item.isFeatured && (
                            <View style={[styles.featuredBadge, { backgroundColor: vTheme.colors.accent }]}>
                                <Text style={styles.featuredText}>★ ТОП</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <Text style={[styles.seriesTitle, { color: vTheme.colors.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <View style={styles.metaRow}>
                        {item.year && (
                            <View style={styles.metaItem}>
                                <Calendar size={12} color={vTheme.colors.textSecondary} />
                                <Text style={[styles.metaText, { color: vTheme.colors.textSecondary }]}>{item.year}</Text>
                            </View>
                        )}
                        <View style={styles.metaItem}>
                            <Layers size={12} color={vTheme.colors.textSecondary} />
                            <Text style={[styles.metaText, { color: vTheme.colors.textSecondary }]}>
                                {seasonsCount} сез.
                            </Text>
                        </View>
                    </View>

                    {item.genre && (
                        <View style={[styles.genreBadge, { backgroundColor: `${vTheme.colors.accent}20` }]}>
                            <Text style={[styles.genreText, { color: vTheme.colors.accent }]}>{item.genre}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: vTheme.colors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: vTheme.colors.text }]}>Сериалы</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: vTheme.colors.surface, ...vTheme.shadows.soft }]}>
                <Search size={20} color={vTheme.colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: vTheme.colors.text }]}
                    placeholder="Поиск сериалов..."
                    placeholderTextColor={vTheme.colors.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color={vTheme.colors.primary} />
                    <Text style={[styles.loadingText, { color: vTheme.colors.textSecondary }]}>Загрузка сериалов...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredSeries}
                    renderItem={renderSeriesCard}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.row}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadSeries(); }}
                            tintColor={vTheme.colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Film size={48} color={vTheme.colors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={[styles.emptyText, { color: vTheme.colors.textSecondary }]}>
                                Сериалы пока не добавлены
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        marginTop: 0,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    searchInput: {
        flex: 1,
        height: 50,
        marginLeft: 8,
        fontSize: 15,
    },
    list: {
        padding: 16,
        paddingTop: 8,
    },
    row: {
        justifyContent: 'space-between',
    },
    seriesCard: {
        width: CARD_WIDTH,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    poster: {
        width: '100%',
        height: CARD_WIDTH * 1.4,
        resizeMode: 'cover',
    },
    posterPlaceholder: {
        width: '100%',
        height: CARD_WIDTH * 1.4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        height: CARD_WIDTH * 1.4,
    },
    badgeContainer: {
        position: 'absolute',
        top: 8,
        left: 8,
    },
    featuredBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    featuredText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardInfo: {
        padding: 12,
    },
    seriesTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
    },
    genreBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    genreText: {
        fontSize: 10,
        fontWeight: '600',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
    },
});

export default SeriesScreen;
