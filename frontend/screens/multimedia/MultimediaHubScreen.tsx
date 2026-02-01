import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    Radio,
    Music,
    Film,
    Tv as TvIcon,
    ChevronRight,
    PlayCircle,
    Loader2,
    Heart
} from 'lucide-react-native';
import { multimediaService, RadioStation, TVChannel, MediaTrack } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';

interface MultimediaHubScreenProps { }

export const MultimediaHubScreen: React.FC<MultimediaHubScreenProps> = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
    const [tvChannels, setTVChannels] = useState<TVChannel[]>([]);
    const [featuredTracks, setFeaturedTracks] = useState<MediaTrack[]>([]);

    const loadData = async () => {
        try {
            const [radio, tv, tracks] = await Promise.all([
                multimediaService.getRadioStations(),
                multimediaService.getTVChannels(),
                multimediaService.getTracks({ featured: true, limit: 5 }),
            ]);
            setRadioStations(radio);
            setTVChannels(tv);
            setFeaturedTracks(tracks.tracks);
        } catch (error) {
            console.error('Failed to load multimedia data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const menuItems = [
        { id: 'radio', title: 'Радио', icon: Radio, color: vTheme.colors.accent, screen: 'RadioScreen' },
        { id: 'audio', title: 'Аудио', icon: Music, color: vTheme.colors.primary, screen: 'AudioScreen' },
        { id: 'video', title: 'Видео', icon: Film, color: '#45B7D1', screen: 'VideoScreen' },
        { id: 'tv', title: 'ТВ', icon: TvIcon, color: '#96CEB4', screen: 'TVScreen' },
        { id: 'favorites', title: 'Избранное', icon: Heart, color: '#EF4444', screen: 'FavoritesScreen' },
    ];

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: vTheme.colors.background }]}>
                <Loader2 size={32} color={vTheme.colors.primary} />
                <Text style={[styles.loadingText, { color: vTheme.colors.textSecondary }]}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: vTheme.colors.background }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={vTheme.colors.primary} />}
        >
            {/* Header */}
            <View style={[styles.header, { backgroundColor: vTheme.colors.primary }]}>
                <Text style={[styles.headerTitle, { color: vTheme.colors.textLight }]}>Sattva Media</Text>
                <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Духовный мультимедиа-хаб</Text>
            </View>

            {/* Menu Grid */}
            <View style={styles.menuGrid}>
                {menuItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={[
                            styles.menuItem,
                            {
                                backgroundColor: isDarkMode ? `${item.color}33` : `${item.color}15`,
                                borderColor: isDarkMode ? `${item.color}66` : `${item.color}33`,
                                borderWidth: 1,
                            }
                        ]}
                        onPress={() => navigation.navigate(item.screen)}
                    >
                        <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                            <item.icon size={26} color="#fff" />
                        </View>
                        <Text style={[styles.menuItemText, { color: vTheme.colors.text }]}>{item.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Radio Stations Section */}
            {radioStations.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.titleWithIcon}>
                            <View style={[styles.headerIconContainer, { backgroundColor: `${vTheme.colors.accent}15` }]}>
                                <Radio size={18} color={vTheme.colors.accent} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: vTheme.colors.text, fontFamily: vTheme.typography.subHeader.fontFamily }]}>
                                Онлайн-радио
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('RadioScreen')} style={styles.seeAllContainer}>
                            <Text style={[styles.seeAll, { color: vTheme.colors.primary }]}>Все</Text>
                            <ChevronRight size={16} color={vTheme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                        {radioStations.slice(0, 5).map((station) => (
                            <TouchableOpacity
                                key={station.ID}
                                style={[styles.radioCard, { backgroundColor: vTheme.colors.surface, ...vTheme.shadows.soft }]}
                                onPress={() => navigation.navigate('RadioPlayer', { station })}
                            >
                                {station.logoUrl ? (
                                    <Image source={{ uri: station.logoUrl }} style={styles.radioLogo} />
                                ) : (
                                    <View style={[styles.radioLogoPlaceholder, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                                        <Radio size={24} color={vTheme.colors.primary} />
                                    </View>
                                )}
                                <Text style={[styles.radioName, { color: vTheme.colors.text }]} numberOfLines={1}>{station.name}</Text>
                                <View style={[
                                    styles.liveBadge,
                                    { backgroundColor: station.status === 'online' ? '#4ade8020' : '#f8717120' }
                                ]}>
                                    <Text style={[
                                        styles.liveBadgeText,
                                        { color: station.status === 'online' ? '#166534' : '#991b1b' }
                                    ]}>
                                        {station.status === 'online' ? 'В СЕТИ' : 'ОФФЛАЙН'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Featured Tracks Section */}
            {featuredTracks.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.titleWithIcon}>
                            <View style={[styles.headerIconContainer, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                                <Music size={18} color={vTheme.colors.primary} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: vTheme.colors.text, fontFamily: vTheme.typography.subHeader.fontFamily }]}>
                                Рекомендуем
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('AudioScreen')} style={styles.seeAllContainer}>
                            <Text style={[styles.seeAll, { color: vTheme.colors.primary }]}>Все</Text>
                            <ChevronRight size={16} color={vTheme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    {featuredTracks.map((track) => (
                        <TouchableOpacity
                            key={track.ID}
                            style={[styles.trackItem, { backgroundColor: vTheme.colors.surface, ...vTheme.shadows.soft }]}
                            onPress={() => navigation.navigate('AudioPlayer', { track })}
                        >
                            {track.thumbnailUrl ? (
                                <Image source={{ uri: track.thumbnailUrl }} style={styles.trackThumb} />
                            ) : (
                                <View style={[styles.trackThumbPlaceholder, { backgroundColor: `${vTheme.colors.primary}10` }]}>
                                    {track.mediaType === 'audio' ? <Music size={20} color={vTheme.colors.primary} /> : <Film size={20} color={vTheme.colors.primary} />}
                                </View>
                            )}
                            <View style={styles.trackInfo}>
                                <Text style={[styles.trackTitle, { color: vTheme.colors.text }]} numberOfLines={1}>{track.title}</Text>
                                <Text style={[styles.trackArtist, { color: vTheme.colors.textSecondary }]} numberOfLines={1}>{track.artist || 'Неизвестный исполнитель'}</Text>
                            </View>
                            <PlayCircle size={28} color={vTheme.colors.primary} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* TV Channels Section */}
            {tvChannels.length > 0 && (
                <View style={[styles.section, { marginBottom: 40 }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.titleWithIcon}>
                            <View style={[styles.headerIconContainer, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                                <TvIcon size={18} color={vTheme.colors.primary} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: vTheme.colors.text, fontFamily: vTheme.typography.subHeader.fontFamily }]}>
                                Духовное ТВ
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('TVScreen')} style={styles.seeAllContainer}>
                            <Text style={[styles.seeAll, { color: vTheme.colors.primary }]}>Все</Text>
                            <ChevronRight size={16} color={vTheme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                        {tvChannels.slice(0, 5).map((channel) => (
                            <TouchableOpacity
                                key={channel.ID}
                                style={[styles.tvCard, { backgroundColor: vTheme.colors.surface, ...vTheme.shadows.soft }]}
                                onPress={() => navigation.navigate('TVPlayer', { channel })}
                            >
                                {channel.logoUrl ? (
                                    <Image source={{ uri: channel.logoUrl }} style={styles.tvLogo} />
                                ) : (
                                    <View style={[styles.tvLogoPlaceholder, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                                        <TvIcon size={32} color={vTheme.colors.primary} />
                                    </View>
                                )}
                                <Text style={[styles.tvName, { color: vTheme.colors.text }]} numberOfLines={1}>{channel.name}</Text>
                                {channel.isLive && (
                                    <View style={[styles.liveBadge, { backgroundColor: vTheme.colors.accent }]}>
                                        <Text style={styles.liveBadgeText}>LIVE</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    header: {
        padding: 24,
        paddingTop: 48,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '48%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        marginTop: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seeAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '600',
    },
    horizontalScroll: {
        paddingLeft: 20,
        paddingBottom: 20,
    },
    radioCard: {
        width: 130,
        marginRight: 16,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
    },
    radioLogo: {
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    radioLogoPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioName: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
    },
    liveBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 6,
    },
    liveBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 10,
    },
    trackThumb: {
        width: 52,
        height: 52,
        borderRadius: 12,
    },
    trackThumbPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackInfo: {
        flex: 1,
        marginLeft: 16,
    },
    trackTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    trackArtist: {
        fontSize: 12,
        marginTop: 2,
    },
    tvCard: {
        width: 150,
        marginRight: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    tvLogo: {
        width: '100%',
        height: 85,
        resizeMode: 'cover',
    },
    tvLogoPlaceholder: {
        width: '100%',
        height: 85,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tvName: {
        fontSize: 13,
        fontWeight: '600',
        padding: 10,
        textAlign: 'center',
    },
});

export default MultimediaHubScreen;
