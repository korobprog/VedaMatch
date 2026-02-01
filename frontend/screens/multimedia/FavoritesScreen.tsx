import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    Music,
    PlayCircle,
    Loader2,
    ArrowLeft,
    Heart,
    Trash2,
    HeartOff,
} from 'lucide-react-native';
import { multimediaService, MediaTrack } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';

export const FavoritesScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tracks, setTracks] = useState<MediaTrack[]>([]);
    const [total, setTotal] = useState(0);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const loadData = async () => {
        try {
            const data = await multimediaService.getFavorites(1, 50);
            setTracks(data.tracks || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Reload favorites when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleRemove = async (trackId: number) => {
        Alert.alert(
            'Удалить из избранного?',
            'Трек будет удалён из вашего списка избранного',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        setRemovingId(trackId);
                        try {
                            await multimediaService.removeFromFavorites(trackId);
                            setTracks(prev => prev.filter(t => t.ID !== trackId));
                            setTotal(prev => prev - 1);
                        } catch (error) {
                            console.error('Failed to remove from favorites:', error);
                            Alert.alert('Ошибка', 'Не удалось удалить трек');
                        } finally {
                            setRemovingId(null);
                        }
                    }
                }
            ]
        );
    };

    const renderTrack = ({ item }: { item: MediaTrack }) => (
        <TouchableOpacity
            style={[styles.trackCard, { borderBottomColor: vTheme.colors.divider }]}
            onPress={() => navigation.navigate('AudioPlayer', { track: item })}
        >
            <View style={styles.thumbContainer}>
                {item.thumbnailUrl ? (
                    <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                ) : (
                    <View style={[styles.thumbPlaceholder, { backgroundColor: `${vTheme.colors.primary}20` }]}>
                        <Music size={24} color={vTheme.colors.primary} />
                    </View>
                )}
                <View style={styles.playOverlay}>
                    <PlayCircle size={24} color="#fff" />
                </View>
            </View>

            <View style={styles.trackInfo}>
                <Text style={[styles.title, { color: vTheme.colors.text }]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={[styles.artist, { color: vTheme.colors.textSecondary }]} numberOfLines={1}>
                    {item.artist || 'Неизвестный исполнитель'}
                </Text>
                <Text style={[styles.duration, { color: vTheme.colors.textSecondary }]}>
                    {multimediaService.formatDuration(item.duration)}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item.ID)}
                disabled={removingId === item.ID}
            >
                {removingId === item.ID ? (
                    <Loader2 size={20} color="#EF4444" />
                ) : (
                    <Heart size={20} color="#EF4444" fill="#EF4444" />
                )}
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
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: vTheme.colors.text }]}>Избранное</Text>
                    {total > 0 && (
                        <Text style={[styles.headerSubtitle, { color: vTheme.colors.textSecondary }]}>
                            {total} {total === 1 ? 'трек' : total < 5 ? 'трека' : 'треков'}
                        </Text>
                    )}
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color={vTheme.colors.primary} />
                    <Text style={[styles.loadingText, { color: vTheme.colors.textSecondary }]}>
                        Загрузка избранного...
                    </Text>
                </View>
            ) : tracks.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                        <HeartOff size={48} color={vTheme.colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: vTheme.colors.text }]}>
                        Нет избранных треков
                    </Text>
                    <Text style={[styles.emptyDescription, { color: vTheme.colors.textSecondary }]}>
                        Нажмите на сердечко рядом с треком, чтобы добавить его сюда
                    </Text>
                    <TouchableOpacity
                        style={[styles.exploreButton, { backgroundColor: vTheme.colors.primary }]}
                        onPress={() => navigation.navigate('Audio')}
                    >
                        <Music size={18} color="#fff" />
                        <Text style={styles.exploreButtonText}>Перейти к аудио</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={tracks}
                    renderItem={renderTrack}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadData(); }}
                            tintColor={vTheme.colors.primary}
                        />
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
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    trackCard: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
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
        marginBottom: 2,
    },
    artist: {
        fontSize: 13,
        marginBottom: 2,
    },
    duration: {
        fontSize: 11,
    },
    removeButton: {
        padding: 12,
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    exploreButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default FavoritesScreen;
