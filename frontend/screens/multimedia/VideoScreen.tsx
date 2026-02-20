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
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Film, Search, Play, Loader2, ArrowLeft, ListPlus } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { multimediaService, MediaTrack } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaSupportService, MultimediaSupportConfig } from '../../services/multimediaSupportService';

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
    const [supportConfig, setSupportConfig] = useState<MultimediaSupportConfig | null>(null);
    const [showSupportPrompt, setShowSupportPrompt] = useState(false);
    const [supportSubmitting, setSupportSubmitting] = useState(false);

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

    useEffect(() => {
        let cancelled = false;
        const loadSupport = async () => {
            if (!user?.ID) return;
            try {
                const cfg = await multimediaSupportService.getSupportConfig();
                if (cancelled) return;
                setSupportConfig(cfg);
                if (!cfg.enabled || cfg.projectId <= 0) return;
                const lastPrompt = await multimediaSupportService.getPromptCooldown(user.ID);
                const cooldownMs = Math.max(1, cfg.cooldownHours) * 60 * 60 * 1000;
                if (Date.now() - lastPrompt >= cooldownMs) {
                    const interactions = await multimediaSupportService.incrementInteractions(user.ID);
                    if (interactions >= 5) setShowSupportPrompt(true);
                }
            } catch (error) {
                console.warn('Failed to load multimedia support in video', error);
            }
        };
        void loadSupport();
        return () => { cancelled = true; };
    }, [user?.ID]);

    const renderVideo = ({ item }: { item: MediaTrack }) => (
        <TouchableOpacity
            style={[styles.videoCard, { backgroundColor: roleColors.surfaceElevated, ...vTheme.shadows.soft }]}
            onPress={async () => {
                if (user?.ID) {
                    await multimediaSupportService.incrementInteractions(user.ID);
                }
                navigation.navigate('VideoPlayer', { video: item });
            }}
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
                <TouchableOpacity
                    style={styles.playlistBtn}
                    onPress={async () => {
                        try {
                            const playlists = await multimediaService.getPlaylists(1, 100);
                            if (!playlists.playlists.length) {
                                Alert.alert('Плейлисты', 'Сначала создайте плейлист в разделе Плейлисты');
                                return;
                            }
                            await multimediaService.addTrackToPlaylist(playlists.playlists[0].ID, item.ID);
                            Alert.alert('Плейлисты', `Добавлено в "${playlists.playlists[0].name}"`);
                        } catch {
                            Alert.alert('Ошибка', 'Не удалось добавить в плейлист');
                        }
                    }}
                >
                    <ListPlus size={16} color={roleColors.accent} />
                    <Text style={[styles.playlistBtnText, { color: roleColors.accent }]}>В плейлист</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const supportLater = async () => {
        if (user?.ID) await multimediaSupportService.setPromptCooldown(user.ID);
        setShowSupportPrompt(false);
    };

    const supportDonate = async () => {
        if (!user?.ID || !supportConfig || supportSubmitting) return;
        setSupportSubmitting(true);
        try {
            await multimediaSupportService.donateToMultimedia(
                supportConfig.projectId,
                Math.max(1, supportConfig.defaultAmount || 20),
                false,
                'Поддержка Video',
                'support_prompt',
                'VideoScreen',
            );
            await multimediaSupportService.setPromptCooldown(user.ID);
            await multimediaSupportService.resetInteractions(user.ID);
            setShowSupportPrompt(false);
            Alert.alert('Спасибо', 'Ваш донат принят');
        } catch (e: any) {
            Alert.alert('Ошибка', e?.message || 'Не удалось выполнить донат');
        } finally {
            setSupportSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: roleColors.background }]}>
            <View style={[styles.header, { backgroundColor: roleColors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={roleColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: roleColors.textPrimary }]}>Кинотеатр</Text>
                <View style={{ width: 40 }} />
            </View>

            {showSupportPrompt && supportConfig?.enabled && supportConfig.projectId > 0 && (
                <View style={[styles.supportCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                    <Text style={[styles.supportTitle, { color: roleColors.textPrimary }]}>Поддержать медиа</Text>
                    <Text style={[styles.supportText, { color: roleColors.textSecondary }]}>Добровольный донат {Math.max(1, supportConfig.defaultAmount || 20)} LKM</Text>
                    <View style={styles.supportRow}>
                        <TouchableOpacity style={[styles.supportBtn, { borderColor: roleColors.border }]} onPress={supportLater}>
                            <Text style={{ color: roleColors.textSecondary }}>Позже</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.supportBtn, { backgroundColor: roleColors.accent, borderColor: roleColors.accent }]} onPress={supportDonate}>
                            <Text style={{ color: '#fff', fontWeight: '700' }}>{supportSubmitting ? '...' : 'Поддержать'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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
    playlistBtn: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    playlistBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    supportCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    supportTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    supportText: {
        marginTop: 4,
        fontSize: 12,
    },
    supportRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 8,
    },
    supportBtn: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
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
