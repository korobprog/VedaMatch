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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Film, Search, Play, Loader2, ArrowLeft } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { multimediaService, MediaTrack } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

export const VideoScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [videos, setVideos] = useState<MediaTrack[]>([]);
    const [selectedMadh, setSelectedMadh] = useState<string | undefined>();
    const [search, setSearch] = useState('');

    const MADH_OPTIONS = [
        { id: 'iskcon', label: 'ISKCON' },
        { id: 'gaudiya', label: 'Gaudiya' },
        { id: 'srivaishnava', label: 'Sri Vaishnava' },
        { id: 'vedic', label: 'Vedic' },
    ];

    const loadVideos = async () => {
        try {
            const data = await multimediaService.getTracks({
                type: 'video',
                madh: selectedMadh,
                search: search.length > 2 ? search : undefined
            });
            setVideos(data.tracks);
        } catch (error) {
            console.error('Failed to load videos:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadVideos();
    }, [selectedMadh]);

    const renderVideo = ({ item }: { item: MediaTrack }) => (
        <TouchableOpacity
            style={[styles.videoCard, { backgroundColor: roleColors.surfaceElevated, ...vTheme.shadows.soft }]}
            onPress={() => navigation.navigate('VideoPlayer', { video: item })}
        >
            <View style={styles.thumbnailContainer}>
                {item.thumbnailUrl ? (
                    <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                ) : (
                    <View style={[styles.thumbnailPlaceholder, { backgroundColor: roleColors.accentSoft }]}>
                        <Film size={40} color={roleColors.accent} />
                    </View>
                )}
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{multimediaService.formatDuration(item.duration)}</Text>
                </View>
                <View style={styles.playIconContainer}>
                    <Play size={24} color="#fff" fill="#fff" />
                </View>
            </View>
            <View style={styles.info}>
                <Text style={[styles.title, { color: roleColors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.artist, { color: roleColors.textSecondary }]}>{item.artist || 'Неизвестный автор'}</Text>
                <Text style={[styles.stats, { color: roleColors.textSecondary, opacity: 0.72 }]}>👁️ {item.viewCount} просмотров</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: roleColors.background }]}>
            <View style={[styles.header, { backgroundColor: roleColors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={roleColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: roleColors.textPrimary }]}>Кинотеатр</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={[styles.searchContainer, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border, ...vTheme.shadows.soft }]}>
                <Search size={20} color={roleColors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: roleColors.textPrimary }]}
                    placeholder="Поиск фильмов, лекций..."
                    placeholderTextColor={roleColors.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => { setLoading(true); loadVideos(); }}
                />
            </View>

            {/* Matth Filter */}
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            !selectedMadh
                                ? { backgroundColor: roleColors.accentSoft, borderColor: roleColors.accent }
                                : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                        ]}
                        onPress={() => setSelectedMadh(undefined)}
                    >
                        <Text style={[styles.filterText, !selectedMadh ? { color: roleColors.accent } : { color: roleColors.textSecondary }]}>Все Традиции</Text>
                    </TouchableOpacity>
                    {MADH_OPTIONS.map((m) => (
                        <TouchableOpacity
                            key={m.id}
                            style={[
                                styles.filterChip,
                                selectedMadh === m.id
                                    ? { backgroundColor: roleColors.accentSoft, borderColor: roleColors.accent }
                                    : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                            ]}
                            onPress={() => setSelectedMadh(m.id)}
                        >
                            <Text style={[styles.filterText, selectedMadh === m.id ? { color: roleColors.accent } : { color: roleColors.textSecondary }]}>
                                {m.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color={roleColors.accent} />
                    <Text style={[styles.loadingText, { color: roleColors.textSecondary }]}>Загрузка фильмов...</Text>
                </View>
            ) : (
                <FlatList
                    data={videos}
                    renderItem={renderVideo}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadVideos(); }} tintColor={roleColors.accent} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Film size={48} color={roleColors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>Видео пока не добавлены</Text>
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
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        height: 50,
        marginLeft: 8,
        fontSize: 15,
    },
    filterSection: {
        paddingBottom: 16,
    },
    filterList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        padding: 16,
        paddingTop: 0,
    },
    videoCard: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
    },
    thumbnailContainer: {
        width: '100%',
        height: 210,
        position: 'relative',
        backgroundColor: '#000',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbnailPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    durationText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    playIconContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    info: {
        padding: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    artist: {
        fontSize: 14,
        marginBottom: 6,
    },
    stats: {
        fontSize: 12,
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

export default VideoScreen;
