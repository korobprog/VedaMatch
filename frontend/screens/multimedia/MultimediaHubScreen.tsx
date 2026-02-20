import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ImageBackground,
    Platform,
    Alert,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import {
    Radio,
    Music,
    Film,
    Tv as TvIcon,
    ChevronRight,
    PlayCircle,
    Loader2,
    Heart,
    Clapperboard,
} from 'lucide-react-native';
import { multimediaService, RadioStation, TVChannel, MediaTrack } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';
import { GodModeStatusBanner } from '../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaSupportService, MultimediaSupportConfig } from '../../services/multimediaSupportService';

interface MultimediaHubScreenProps {
    onBack?: () => void;
}

export const MultimediaHubScreen: React.FC<MultimediaHubScreenProps> = ({ onBack }) => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
    const [tvChannels, setTVChannels] = useState<TVChannel[]>([]);
    const [featuredTracks, setFeaturedTracks] = useState<MediaTrack[]>([]);
    const [supportConfig, setSupportConfig] = useState<MultimediaSupportConfig | null>(null);
    const [showSupportPrompt, setShowSupportPrompt] = useState(false);
    const [supportSubmitting, setSupportSubmitting] = useState(false);

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

    useEffect(() => {
        let cancelled = false;
        const loadSupport = async () => {
            if (!user?.ID) return;
            try {
                const cfg = await multimediaSupportService.getSupportConfig();
                if (cancelled) return;
                setSupportConfig(cfg);
                if (!cfg.enabled || cfg.projectId <= 0) return;

                const lastPromptTs = await multimediaSupportService.getPromptCooldown(user.ID);
                const cooldownMs = Math.max(1, cfg.cooldownHours) * 60 * 60 * 1000;
                if (Date.now() - lastPromptTs >= cooldownMs) {
                    setShowSupportPrompt(true);
                }
            } catch (error) {
                console.warn('Failed to load multimedia support config', error);
            }
        };
        void loadSupport();
        return () => { cancelled = true; };
    }, [user?.ID]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const menuItems = [
        { id: 'radio', title: 'Радио', icon: Radio, color: roleColors.accent, screen: 'RadioScreen' },
        { id: 'audio', title: 'Аудио', icon: Music, color: roleColors.accent, screen: 'AudioScreen' },
        { id: 'video', title: 'Видео', icon: Film, color: roleColors.warning, screen: 'VideoScreen' },
        { id: 'circles', title: 'Кружки', icon: PlayCircle, color: roleColors.warning, screen: 'VideoCirclesScreen' },
        { id: 'series', title: 'Сериалы', icon: Clapperboard, color: roleColors.accent, screen: 'SeriesScreen' },
        { id: 'tv', title: 'ТВ', icon: TvIcon, color: roleColors.success, screen: 'TVScreen' },
        { id: 'favorites', title: 'Избранное', icon: Heart, color: roleColors.danger, screen: 'FavoritesScreen' },
        { id: 'playlists', title: 'Плейлисты', icon: Music, color: roleColors.success, screen: 'PlaylistsScreen' },
        { id: 'offline', title: 'Оффлайн', icon: PlayCircle, color: roleColors.accent, screen: 'OfflineMedia' },
    ];

    const onSupportLater = async () => {
        if (user?.ID) {
            await multimediaSupportService.setPromptCooldown(user.ID);
        }
        setShowSupportPrompt(false);
    };

    const onSupportDonate = async () => {
        if (!user?.ID || !supportConfig || supportSubmitting) return;
        if (!supportConfig.enabled || supportConfig.projectId <= 0) return;
        setSupportSubmitting(true);
        try {
            await multimediaSupportService.donateToMultimedia(
                supportConfig.projectId,
                Math.max(1, supportConfig.defaultAmount || 20),
                false,
                'Поддержка развития Sattva Media',
                'support_prompt',
                'MultimediaHubScreen',
            );
            await multimediaSupportService.setPromptCooldown(user.ID);
            await multimediaSupportService.resetInteractions(user.ID);
            setShowSupportPrompt(false);
            Alert.alert('Спасибо', 'Ваш донат поддерживает развитие Sattva Media');
        } catch (error: any) {
            Alert.alert('Ошибка', error?.message || 'Не удалось выполнить донат');
        } finally {
            setSupportSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: roleColors.background }]}>
                <Loader2 size={32} color={roleColors.accent} />
                <Text style={[styles.loadingText, { color: roleColors.textSecondary }]}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: roleColors.background }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        >
            <GodModeStatusBanner />
            <ImageBackground
                source={require('../../assets/sattva_media_bg.png')}
                style={styles.header}
                imageStyle={styles.headerImage}
            >
                <View style={[styles.headerOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)' }]} />
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => onBack ? onBack() : navigation.goBack()}
                    >
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleScroll}>
                        <Text style={[styles.headerTitleScrollText, { color: '#FFFFFF' }]}>Sattva Media</Text>
                        <Text style={[styles.headerSubtitleScrollText, { color: 'rgba(255,255,255,0.9)' }]}>Духовный мультимедиа-хаб</Text>
                    </View>
                </View>
            </ImageBackground>

            {showSupportPrompt && supportConfig?.enabled && supportConfig.projectId > 0 && (
                <View style={[styles.supportCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                    <Text style={[styles.supportTitle, { color: roleColors.textPrimary }]}>Поддержать Sattva Media</Text>
                    <Text style={[styles.supportText, { color: roleColors.textSecondary }]}>
                        Мы сохраняем контент бесплатным. Добровольный донат: {Math.max(1, supportConfig.defaultAmount || 20)} LKM.
                    </Text>
                    <View style={styles.supportActions}>
                        <TouchableOpacity style={[styles.supportBtn, { borderColor: roleColors.border }]} onPress={onSupportLater}>
                            <Text style={{ color: roleColors.textSecondary }}>Позже</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.supportBtn, { backgroundColor: roleColors.accent, borderColor: roleColors.accent }]}
                            onPress={onSupportDonate}
                            disabled={supportSubmitting}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>{supportSubmitting ? '...' : 'Поддержать'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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
                            <item.icon size={26} color="white" />
                        </View>
                        <Text style={[styles.menuItemText, { color: roleColors.textPrimary }]}>{item.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Radio Stations Section */}
            {radioStations.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.titleWithIcon}>
                            <View style={[styles.headerIconContainer, { backgroundColor: roleColors.accentSoft }]}>
                                <Radio size={18} color={roleColors.accent} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: roleColors.textPrimary, fontFamily: vTheme.typography.subHeader.fontFamily }]}>
                                Онлайн-радио
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('RadioScreen')} style={styles.seeAllContainer}>
                            <Text style={[styles.seeAll, { color: roleColors.accent }]}>Все</Text>
                            <ChevronRight size={16} color={roleColors.accent} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                        {radioStations.slice(0, 5).map((station) => (
                            <TouchableOpacity
                                key={station.ID}
                                style={[styles.radioCard, { backgroundColor: roleColors.surfaceElevated, ...vTheme.shadows.soft }]}
                                onPress={() => navigation.navigate('RadioPlayer', { station })}
                            >
                                {station.logoUrl ? (
                                    <Image source={{ uri: station.logoUrl }} style={styles.radioLogo} />
                                ) : (
                                    <View style={[styles.radioLogoPlaceholder, { backgroundColor: `${roleColors.accent}15` }]}>
                                        <Radio size={24} color={roleColors.accent} />
                                    </View>
                                )}
                                <Text style={[styles.radioName, { color: roleColors.textPrimary }]} numberOfLines={1}>{station.name}</Text>
                                <View style={[
                                    styles.liveBadge,
                                    { backgroundColor: station.status === 'online' ? `${roleColors.success}33` : `${roleColors.danger}33` }
                                ]}>
                                    <Text style={[
                                        styles.liveBadgeText,
                                        { color: station.status === 'online' ? roleColors.success : roleColors.danger }
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
                            <View style={[styles.headerIconContainer, { backgroundColor: `${roleColors.accent}15` }]}>
                                <Music size={18} color={roleColors.accent} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: roleColors.textPrimary, fontFamily: vTheme.typography.subHeader.fontFamily }]}>
                                Рекомендуем
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('AudioScreen')} style={styles.seeAllContainer}>
                            <Text style={[styles.seeAll, { color: roleColors.accent }]}>Все</Text>
                            <ChevronRight size={16} color={roleColors.accent} />
                        </TouchableOpacity>
                    </View>
                    {featuredTracks.map((track) => (
                        <TouchableOpacity
                            key={track.ID}
                            style={[styles.trackItem, { backgroundColor: roleColors.surfaceElevated, ...vTheme.shadows.soft }]}
                            onPress={() => navigation.navigate('AudioPlayer', { track })}
                        >
                            {track.thumbnailUrl ? (
                                <Image source={{ uri: track.thumbnailUrl }} style={styles.trackThumb} />
                            ) : (
                                <View style={[styles.trackThumbPlaceholder, { backgroundColor: `${roleColors.accent}10` }]}>
                                    {track.mediaType === 'audio' ? <Music size={20} color={roleColors.accent} /> : <Film size={20} color={roleColors.accent} />}
                                </View>
                            )}
                            <View style={styles.trackInfo}>
                                <Text style={[styles.trackTitle, { color: roleColors.textPrimary }]} numberOfLines={1}>{track.title}</Text>
                                <Text style={[styles.trackArtist, { color: roleColors.textSecondary }]} numberOfLines={1}>{track.artist || 'Неизвестный исполнитель'}</Text>
                            </View>
                            <PlayCircle size={28} color={roleColors.accent} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* TV Channels Section */}
            {tvChannels.length > 0 && (
                <View style={[styles.section, { marginBottom: 40 }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.titleWithIcon}>
                            <View style={[styles.headerIconContainer, { backgroundColor: `${roleColors.accent}15` }]}>
                                <TvIcon size={18} color={roleColors.accent} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: roleColors.textPrimary, fontFamily: vTheme.typography.subHeader.fontFamily }]}>
                                Духовное ТВ
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('TVScreen')} style={styles.seeAllContainer}>
                            <Text style={[styles.seeAll, { color: roleColors.accent }]}>Все</Text>
                            <ChevronRight size={16} color={roleColors.accent} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                        {tvChannels.slice(0, 5).map((channel) => (
                            <TouchableOpacity
                                key={channel.ID}
                                style={[styles.tvCard, { backgroundColor: roleColors.surfaceElevated, ...vTheme.shadows.soft }]}
                                onPress={() => navigation.navigate('TVPlayer', { channel })}
                            >
                                {channel.logoUrl ? (
                                    <Image source={{ uri: channel.logoUrl }} style={styles.tvLogo} />
                                ) : (
                                    <View style={[styles.tvLogoPlaceholder, { backgroundColor: `${roleColors.accent}15` }]}>
                                        <TvIcon size={32} color={roleColors.accent} />
                                    </View>
                                )}
                                <Text style={[styles.tvName, { color: roleColors.textPrimary }]} numberOfLines={1}>{channel.name}</Text>
                                {channel.isLive && (
                                    <View style={[styles.liveBadge, { backgroundColor: roleColors.accent }]}>
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
        height: 240,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
    },
    headerImage: {
        resizeMode: 'cover',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    headerTitleScroll: {
        flex: 1,
        marginLeft: 16,
    },
    headerTitleScrollText: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    headerSubtitleScrollText: {
        fontSize: 13,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        justifyContent: 'space-between',
    },
    supportCard: {
        marginHorizontal: 16,
        marginTop: 14,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
    },
    supportTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    supportText: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 18,
    },
    supportActions: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    supportBtn: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
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
