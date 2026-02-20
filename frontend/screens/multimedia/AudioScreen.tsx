import React, { useEffect, useState, useCallback } from 'react';
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
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    Music,
    Search,
    PlayCircle,
    Loader2,
    ArrowLeft,
    Heart,
    ListPlus,
} from 'lucide-react-native';
import { multimediaService, MediaTrack, MediaCategory } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaSupportService, MultimediaSupportConfig } from '../../services/multimediaSupportService';

export const AudioScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tracks, setTracks] = useState<MediaTrack[]>([]);
    const [categories, setCategories] = useState<MediaCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
    const [selectedMadh, setSelectedMadh] = useState<string | undefined>();
    const [search, setSearch] = useState('');
    const [favorites, setFavorites] = useState<Set<number>>(new Set());
    const [togglingFavorite, setTogglingFavorite] = useState<number | null>(null);
    const [supportConfig, setSupportConfig] = useState<MultimediaSupportConfig | null>(null);
    const [showSupportPrompt, setShowSupportPrompt] = useState(false);
    const [supportSubmitting, setSupportSubmitting] = useState(false);

    const MADH_OPTIONS = [
        { id: 'iskcon', label: 'ISKCON' },
        { id: 'gaudiya', label: 'Gaudiya' },
        { id: 'srivaishnava', label: 'Sri Vaishnava' },
        { id: 'vedic', label: 'Vedic' },
    ];

    // Load user favorites on mount
    const loadFavorites = useCallback(async () => {
        try {
            const data = await multimediaService.getFavorites(1, 100);
            const favoriteIds = new Set((data.tracks || []).map(t => t.ID));
            setFavorites(favoriteIds);
        } catch (error) {
            console.log('Failed to load favorites (user might not be logged in)');
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [loadFavorites])
    );

    const toggleFavorite = async (trackId: number) => {
        setTogglingFavorite(trackId);
        try {
            if (favorites.has(trackId)) {
                await multimediaService.removeFromFavorites(trackId);
                setFavorites(prev => {
                    const next = new Set(prev);
                    next.delete(trackId);
                    return next;
                });
            } else {
                await multimediaService.addToFavorites(trackId);
                setFavorites(prev => new Set(prev).add(trackId));
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            Alert.alert('Ошибка', 'Войдите в аккаунт, чтобы добавлять в избранное');
        } finally {
            setTogglingFavorite(null);
        }
    };

    const loadData = async () => {
        try {
            const [categoriesData, tracksData] = await Promise.all([
                multimediaService.getCategories('audio'),
                multimediaService.getTracks({
                    type: 'audio',
                    categoryId: selectedCategory,
                    madh: selectedMadh,
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
    }, [selectedCategory, selectedMadh]);

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
            } catch (e) {
                console.warn('Failed to load multimedia support', e);
            }
        };
        void loadSupport();
        return () => { cancelled = true; };
    }, [user?.ID]);

    const handleSearch = () => {
        setLoading(true);
        loadData();
    };

    const renderTrack = ({ item }: { item: MediaTrack }) => {
        const isFavorite = favorites.has(item.ID);
        const isToggling = togglingFavorite === item.ID;

        return (
            <TouchableOpacity
                style={[styles.trackCard, { borderBottomColor: roleColors.border }]}
                onPress={async () => {
                    if (user?.ID) {
                        await multimediaSupportService.incrementInteractions(user.ID);
                    }
                    navigation.navigate('AudioPlayer', { track: item });
                }}
            >
                <View style={styles.thumbContainer}>
                    {item.thumbnailUrl ? (
                        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                    ) : (
                        <View style={[styles.thumbPlaceholder, { backgroundColor: roleColors.accentSoft }]}>
                            <Music size={24} color={roleColors.accent} />
                        </View>
                    )}
                    <View style={styles.playOverlay}>
                        <PlayCircle size={24} color="white" />
                    </View>
                </View>

                <View style={styles.trackInfo}>
                    <Text style={[styles.title, { color: roleColors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.artist, { color: roleColors.textSecondary }]} numberOfLines={1}>{item.artist || 'Неизвестный исполнитель'}</Text>
                    <Text style={[styles.duration, { color: roleColors.textSecondary }]}>{multimediaService.formatDuration(item.duration)}</Text>
                </View>

                <View style={styles.rightActions}>
                    <TouchableOpacity
                        style={styles.favButton}
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
                        <ListPlus size={20} color={roleColors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.favButton}
                        onPress={() => toggleFavorite(item.ID)}
                        disabled={isToggling}
                    >
                        {isToggling ? (
                            <Loader2 size={20} color={roleColors.accent} />
                        ) : (
                            <Heart
                                size={20}
                                color={isFavorite ? roleColors.danger : roleColors.textSecondary}
                                fill={isFavorite ? roleColors.danger : 'transparent'}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const supportLater = async () => {
        if (user?.ID) {
            await multimediaSupportService.setPromptCooldown(user.ID);
        }
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
                'Поддержка Audio',
                'support_prompt',
                'AudioScreen',
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
            {/* Header */}
            <View style={[styles.header, { backgroundColor: roleColors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={roleColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: roleColors.textPrimary }]}>Аудио Библиотека</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchContainer, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border, ...vTheme.shadows.soft }]}>
                    <Search size={20} color={roleColors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: roleColors.textPrimary }]}
                        placeholder="Поиск бхаджанов, лекций..."
                        placeholderTextColor={roleColors.textSecondary}
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
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

            {/* Matth Filter */}
            <View style={[styles.categoriesSection, { paddingTop: 0 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            !selectedMadh
                                ? { backgroundColor: roleColors.accentSoft, borderColor: roleColors.accent }
                                : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                        ]}
                        onPress={() => setSelectedMadh(undefined)}
                    >
                        <Text style={[styles.categoryText, !selectedMadh ? { color: roleColors.accent } : { color: roleColors.textSecondary }]}>Все Традиции</Text>
                    </TouchableOpacity>
                    {MADH_OPTIONS.map((m) => (
                        <TouchableOpacity
                            key={m.id}
                            style={[
                                styles.categoryChip,
                                selectedMadh === m.id
                                    ? { backgroundColor: roleColors.accentSoft, borderColor: roleColors.accent }
                                    : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                            ]}
                            onPress={() => setSelectedMadh(m.id)}
                        >
                            <Text style={[styles.categoryText, selectedMadh === m.id ? { color: roleColors.accent } : { color: roleColors.textSecondary }]}>
                                {m.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Categories Filter */}
            <View style={styles.categoriesSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            !selectedCategory
                                ? { backgroundColor: roleColors.accent, borderColor: roleColors.accent }
                                : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                        ]}
                        onPress={() => setSelectedCategory(undefined)}
                    >
                        <Text style={[styles.categoryText, !selectedCategory ? { color: 'white' } : { color: roleColors.textSecondary }]}>Все Категории</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.ID}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat.ID
                                    ? { backgroundColor: roleColors.accent, borderColor: roleColors.accent }
                                    : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                            ]}
                            onPress={() => setSelectedCategory(cat.ID)}
                        >
                            <Text style={[styles.categoryText, selectedCategory === cat.ID ? { color: 'white' } : { color: roleColors.textSecondary }]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color={roleColors.accent} />
                    <Text style={[styles.loadingText, { color: roleColors.textSecondary }]}>Загрузка аудио...</Text>
                </View>
            ) : (
                <FlatList
                    data={tracks}
                    renderItem={renderTrack}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={roleColors.accent} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Music size={48} color={roleColors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>Ничего не найдено</Text>
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
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 45,
        fontSize: 14,
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
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '500',
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
    favButton: {
        padding: 8,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
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

export default AudioScreen;
