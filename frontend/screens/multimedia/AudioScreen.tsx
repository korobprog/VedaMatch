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
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    Music,
    Search,
    Filter,
    PlayCircle,
    Loader2,
    ArrowLeft,
    Heart
} from 'lucide-react-native';
import { multimediaService, MediaTrack, MediaCategory } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';

export const AudioScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tracks, setTracks] = useState<MediaTrack[]>([]);
    const [categories, setCategories] = useState<MediaCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
    const [search, setSearch] = useState('');

    const loadData = async () => {
        try {
            const [categoriesData, tracksData] = await Promise.all([
                multimediaService.getCategories('audio'),
                multimediaService.getTracks({
                    type: 'audio',
                    categoryId: selectedCategory,
                    search: search.length > 2 ? search : undefined
                }),
            ]);
            setCategories(categoriesData);
            setTracks(tracksData.tracks);
        } catch (error) {
            console.error('Failed to load audio data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedCategory]);

    const handleSearch = () => {
        setLoading(true);
        loadData();
    };

    const renderTrack = ({ item }: { item: MediaTrack }) => (
        <TouchableOpacity
            style={styles.trackCard}
            onPress={() => navigation.navigate('AudioPlayer', { track: item })}
        >
            <View style={styles.thumbContainer}>
                {item.thumbnailUrl ? (
                    <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                ) : (
                    <View style={styles.thumbPlaceholder}>
                        <Music size={24} color="#6366F1" />
                    </View>
                )}
                <View style={styles.playOverlay}>
                    <PlayCircle size={24} color="#fff" />
                </View>
            </View>

            <View style={styles.trackInfo}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>{item.artist || 'Неизвестный исполнитель'}</Text>
                <Text style={styles.duration}>{multimediaService.formatDuration(item.duration)}</Text>
            </View>

            <TouchableOpacity
                style={styles.favButton}
                onPress={() => console.log('Toggle favorite', item.ID)}
            >
                <Heart size={20} color="#9CA3AF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: vTheme.colors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: vTheme.colors.text }]}>Аудио Библиотека</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchContainer, { backgroundColor: vTheme.colors.surface, ...vTheme.shadows.soft }]}>
                    <Search size={20} color={vTheme.colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: vTheme.colors.text }]}
                        placeholder="Поиск бхаджанов, лекций..."
                        placeholderTextColor={vTheme.colors.textSecondary}
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
            </View>

            {/* Categories Filter */}
            <View style={styles.categoriesSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            !selectedCategory ? { backgroundColor: vTheme.colors.primary, borderColor: vTheme.colors.primary } : { backgroundColor: vTheme.colors.surface, borderColor: vTheme.colors.divider }
                        ]}
                        onPress={() => setSelectedCategory(undefined)}
                    >
                        <Text style={[styles.categoryText, !selectedCategory ? { color: '#fff' } : { color: vTheme.colors.textSecondary }]}>Все</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.ID}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.ID ? { backgroundColor: vTheme.colors.primary, borderColor: vTheme.colors.primary } : { backgroundColor: vTheme.colors.surface, borderColor: vTheme.colors.divider }
                            ]}
                            onPress={() => setSelectedCategory(cat.ID)}
                        >
                            <Text style={[styles.categoryText, selectedCategory === cat.ID ? { color: '#fff' } : { color: vTheme.colors.textSecondary }]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color={vTheme.colors.primary} />
                    <Text style={[styles.loadingText, { color: vTheme.colors.textSecondary }]}>Загрузка аудио...</Text>
                </View>
            ) : (
                <FlatList
                    data={tracks}
                    renderItem={renderTrack}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={vTheme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Music size={48} color={vTheme.colors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={[styles.emptyText, { color: vTheme.colors.textSecondary }]}>Ничего не найдено</Text>
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
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 45,
        fontSize: 14,
        color: '#111827',
    },
    categoriesSection: {
        paddingBottom: 12,
    },
    categoriesList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    categoryChipActive: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    categoryText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    categoryTextActive: {
        color: '#fff',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    trackCard: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'center',
    },
    thumbContainer: {
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: 8,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackInfo: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    artist: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 2,
    },
    duration: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    favButton: {
        padding: 8,
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
        color: '#6B7280',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default AudioScreen;
