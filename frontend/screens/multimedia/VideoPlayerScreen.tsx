import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MessageSquare, Pause, Play, Share2, Download, Gauge } from 'lucide-react-native';
import Video from 'react-native-video';
import { WebView } from 'react-native-webview';
import { MediaTrack } from '../../services/multimediaService';
import { RootStackParamList } from '../../types/navigation';
import { videoCirclesService } from '../../services/videoCirclesService';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaOfflineService } from '../../services/multimediaOfflineService';

type VideoPlayerRouteProp = RouteProp<RootStackParamList, 'VideoPlayer'>;

export const VideoPlayerScreen: React.FC = () => {
    const route = useRoute<VideoPlayerRouteProp>();
    const navigation = useNavigation<any>();
    const { isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);

    const { video, source, circle } = route.params || {};
    const media = (video || {}) as Partial<MediaTrack> & {
        url?: string;
        title?: string;
        artist?: string;
        description?: string;
        viewCount?: number;
        likeCount?: number;
    };

    const isCircleMode = source === 'video_circles' && !!circle;
    const mediaUrl = typeof media?.url === 'string' ? media.url : '';
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [commentCount, setCommentCount] = useState(circle?.commentCount ?? 0);
    const [commentSending, setCommentSending] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [offlineProgress, setOfflineProgress] = useState<number | null>(null);

    const isYouTube = useMemo(
        () => mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be'),
        [mediaUrl]
    );

    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    useEffect(() => {
        if (isCircleMode) {
            return;
        }
        if (showControls && !paused) {
            const timer = setTimeout(() => setShowControls(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isCircleMode, paused, showControls]);

    const toggleControls = () => {
        setShowControls((prev) => !prev);
    };

    const handleCircleComment = useCallback(async () => {
        if (!circle?.id || commentSending) {
            return;
        }
        setCommentSending(true);
        try {
            const response = await videoCirclesService.interact(circle.id, 'comment', 'add');
            if (typeof response?.commentCount === 'number') {
                setCommentCount(response.commentCount);
            } else {
                setCommentCount((prev) => prev + 1);
            }
        } catch (interactionError) {
            console.error('Failed to add circle comment interaction:', interactionError);
            Alert.alert('Ошибка', 'Не удалось отправить комментарий');
        } finally {
            setCommentSending(false);
        }
    }, [circle?.id, commentSending]);

    const handleCircleShare = useCallback(async () => {
        try {
            await Share.share({
                title: media.title || 'Видео кружок',
                message: mediaUrl,
                url: mediaUrl,
            });
        } catch (shareError) {
            console.error('Failed to share video circle:', shareError);
            Alert.alert('Ошибка', 'Не удалось открыть меню "Поделиться"');
        }
    }, [media.title, mediaUrl]);

    const renderDefaultPlayer = () => {
        if (isYouTube) {
            const videoId = getYouTubeId(mediaUrl);
            return (
                <WebView
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    source={{ uri: `https://www.youtube.com/embed/${videoId}?autoplay=1` }}
                    onLoadEnd={() => setLoading(false)}
                    onError={(event) => {
                        setLoading(false);
                        setError(`YouTube Error: ${event.nativeEvent.description}`);
                    }}
                />
            );
        }

        return (
            <TouchableOpacity
                activeOpacity={1}
                onPress={toggleControls}
                style={styles.videoWrapper}
            >
                <Video
                    source={{ uri: mediaUrl }}
                    style={styles.video}
                    controls={false}
                    paused={paused}
                    rate={playbackRate}
                    resizeMode="contain"
                    onLoad={() => setLoading(false)}
                    onBuffer={({ isBuffering }) => setLoading(isBuffering)}
                    onError={(event) => {
                        setLoading(false);
                        console.log('Video Playback Error:', event);
                        setError(`Error: ${event.error?.errorString || JSON.stringify(event.error)}`);
                    }}
                />

                {showControls && !loading && (
                    <View style={styles.controlsOverlay}>
                        <TouchableOpacity
                            onPress={() => setPaused((prev) => !prev)}
                            style={[styles.playButton, { backgroundColor: colors.overlay }]}
                        >
                            {paused ? (
                                <Play size={40} color={colors.textPrimary} fill={colors.textPrimary} />
                            ) : (
                                <Pause size={40} color={colors.textPrimary} fill={colors.textPrimary} />
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (!mediaUrl) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <SafeAreaView style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.danger }]}>Некорректная ссылка на видео</Text>
                </View>
            </View>
        );
    }

    const changeRate = () => {
        const rates = [0.5, 1, 1.25, 1.5, 2];
        const currentIndex = rates.findIndex((r) => r === playbackRate);
        setPlaybackRate(rates[(currentIndex + 1) % rates.length]);
    };

    const downloadOffline = async () => {
        try {
            setOfflineProgress(0);
            await multimediaOfflineService.downloadTrack(
                {
                    ID: Number(media?.ID || 0),
                    title: media?.title || 'Video',
                    artist: media?.artist || '',
                    mediaType: 'video',
                    url: mediaUrl,
                    thumbnailUrl: media?.thumbnailUrl,
                    duration: Number(media?.duration || 0),
                    viewCount: Number(media?.viewCount || 0),
                    likeCount: Number(media?.likeCount || 0),
                    isFeatured: Boolean(media?.isFeatured),
                    isActive: true,
                } as MediaTrack,
                (p) => setOfflineProgress(p),
            );
            setOfflineProgress(null);
            Alert.alert('Оффлайн', 'Видео сохранено оффлайн');
        } catch (error: any) {
            setOfflineProgress(null);
            Alert.alert('Оффлайн', error?.message || 'Не удалось скачать видео');
        }
    };

    if (isCircleMode && circle) {
        return (
            <View style={styles.circleContainer} testID="video-player-circles-mode">
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setPaused((prev) => !prev)}
                    style={styles.circleVideoTap}
                    testID="video-player-circles-tap-layer"
                >
                    <Video
                        source={{ uri: mediaUrl }}
                        style={styles.circleVideo}
                        controls={false}
                        paused={paused}
                        repeat
                        resizeMode="cover"
                        onLoad={() => setLoading(false)}
                        onBuffer={({ isBuffering }) => setLoading(isBuffering)}
                        onError={(event) => {
                            setLoading(false);
                            console.log('Video circle playback error:', event);
                            setError('Не удалось воспроизвести видео');
                        }}
                    />
                </TouchableOpacity>

                <SafeAreaView style={styles.circleTopBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBackButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>

                <View style={styles.circleSideActions}>
                    <TouchableOpacity
                        style={styles.circleActionButton}
                        onPress={handleCircleComment}
                        testID="video-player-circles-comment-btn"
                    >
                        {commentSending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <MessageSquare size={24} color="#fff" />
                        )}
                        <Text style={styles.circleActionText}>{commentCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.circleActionButton}
                        onPress={handleCircleShare}
                        testID="video-player-circles-share-btn"
                    >
                        <Share2 size={24} color="#fff" />
                        <Text style={styles.circleActionText}>Share</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.circleBottomOverlay}>
                    <Text style={styles.circleTitle} numberOfLines={1}>
                        {media.title || 'Видео кружок'}
                    </Text>
                    <Text style={styles.circleMeta} numberOfLines={2}>
                        {[circle.city, circle.matha].filter(Boolean).join(' • ')}
                    </Text>
                    <Text style={styles.circleCategory} numberOfLines={1}>
                        {circle.category || ''}
                    </Text>
                </View>

                {paused && !loading && (
                    <View style={styles.circlePauseOverlay}>
                        <Play size={56} color="#fff" fill="#fff" />
                    </View>
                )}

                {loading && !error && (
                    <View style={styles.circleLoader}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}

                {!!error && (
                    <View style={styles.circleErrorOverlay}>
                        <Text style={styles.circleErrorText}>{error}</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]} testID="video-player-default-mode">
            <SafeAreaView style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{media.title}</Text>
                    <Text style={[styles.artist, { color: colors.textSecondary }]}>{media.artist || 'Неизвестный автор'}</Text>
                </View>
            </SafeAreaView>

            <View style={[styles.playerContainer, { backgroundColor: colors.overlay }]}>
                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                        <Text style={[styles.errorUrlText, { color: colors.textSecondary }]} numberOfLines={2}>{mediaUrl}</Text>
                    </View>
                ) : (
                    renderDefaultPlayer()
                )}
                {loading && !error && (
                    <View style={[styles.loader, { backgroundColor: colors.overlay }]}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                )}
            </View>

            <View style={[styles.details, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.description, { color: colors.textPrimary }]}>{media.description || 'Нет описания'}</Text>
                {!isYouTube && (
                    <View style={styles.utilityRow}>
                        <TouchableOpacity style={[styles.utilityBtn, { backgroundColor: colors.accentSoft }]} onPress={downloadOffline}>
                            <Download size={16} color={colors.textPrimary} />
                            <Text style={[styles.utilityText, { color: colors.textPrimary }]}>
                                {offlineProgress !== null ? `${Math.round(offlineProgress * 100)}%` : 'Оффлайн'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.utilityBtn, { backgroundColor: colors.accentSoft }]} onPress={changeRate}>
                            <Gauge size={16} color={colors.textPrimary} />
                            <Text style={[styles.utilityText, { color: colors.textPrimary }]}>{playbackRate}x</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.statsRow}>
                    <Text style={[styles.statsText, { color: colors.textSecondary }]}>👁️ {media.viewCount || 0} просмотров</Text>
                    <Text style={[styles.statsText, { color: colors.textSecondary }]}>❤️ {media.likeCount || 0} отметок</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    utilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        marginBottom: 6,
    },
    utilityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    utilityText: {
        fontSize: 12,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    artist: {
        fontSize: 12,
    },
    playerContainer: {
        width: '100%',
        height: 250,
        marginTop: 20,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoWrapper: {
        width: '100%',
        height: '100%',
    },
    webview: {
        width: '100%',
        height: '100%',
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2,6,23,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    details: {
        padding: 20,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 20,
    },
    statsText: {
        fontSize: 12,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
    },
    errorUrlText: {
        fontSize: 10,
        textAlign: 'center',
    },
    circleContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    circleVideoTap: {
        ...StyleSheet.absoluteFillObject,
    },
    circleVideo: {
        ...StyleSheet.absoluteFillObject,
    },
    circleTopBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 12,
    },
    circleBackButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    circleSideActions: {
        position: 'absolute',
        right: 12,
        bottom: 126,
        gap: 18,
    },
    circleActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    circleActionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    circleBottomOverlay: {
        position: 'absolute',
        left: 16,
        right: 90,
        bottom: 34,
        gap: 6,
    },
    circleTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    circleMeta: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '500',
    },
    circleCategory: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        fontWeight: '600',
    },
    circlePauseOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    circleLoader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleErrorOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    circleErrorText: {
        color: '#fff',
        fontSize: 15,
        textAlign: 'center',
    },
});

export default VideoPlayerScreen;
