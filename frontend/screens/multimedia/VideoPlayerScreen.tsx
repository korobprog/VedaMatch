import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Play, Pause } from 'lucide-react-native';
import Video from 'react-native-video';
import { WebView } from 'react-native-webview';
import { MediaTrack } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

export const VideoPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const { video } = route.params as { video: MediaTrack };
    const [paused, setPaused] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check if it's a YouTube URL
    const isYouTube = video.url.includes('youtube.com') || video.url.includes('youtu.be');

    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const [error, setError] = useState<string | null>(null);

    const [showControls, setShowControls] = useState(true);

    // Auto-hide controls
    useEffect(() => {
        if (showControls && !paused) {
            const timer = setTimeout(() => setShowControls(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showControls, paused]);

    const toggleControls = () => {
        setShowControls(!showControls);
    };

    const renderPlayer = () => {
        if (isYouTube) {
            const videoId = getYouTubeId(video.url);
            return (
                <WebView
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    source={{ uri: `https://www.youtube.com/embed/${videoId}?autoplay=1` }}
                    onLoadEnd={() => setLoading(false)}
                    onError={(e) => {
                        setLoading(false);
                        setError(`YouTube Error: ${e.nativeEvent.description}`);
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
                    source={{ uri: video.url }}
                    style={styles.video}
                    controls={false} // Disable native controls to use our custom overlay
                    paused={paused}
                    resizeMode="contain"
                    onLoad={() => setLoading(false)}
                    onBuffer={({ isBuffering }) => setLoading(isBuffering)}
                    onError={(e) => {
                        setLoading(false);
                        console.log("Video Playback Error:", e);
                        setError(`Error: ${e.error.errorString || JSON.stringify(e.error)}`);
                    }}
                />

                {/* Custom Controls Overlay */}
                {showControls && !loading && (
                    <View style={styles.controlsOverlay}>
                        <TouchableOpacity
                            onPress={() => setPaused(!paused)}
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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{video.title}</Text>
                    <Text style={[styles.artist, { color: colors.textSecondary }]}>{video.artist || 'Неизвестный автор'}</Text>
                </View>
            </SafeAreaView>

            {/* Player Container */}
            <View style={[styles.playerContainer, { backgroundColor: colors.overlay }]}>
                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                        <Text style={[styles.errorUrlText, { color: colors.textSecondary }]} numberOfLines={2}>{video.url}</Text>
                    </View>
                ) : (
                    renderPlayer()
                )}
                {loading && !error && (
                    <View style={[styles.loader, { backgroundColor: colors.overlay }]}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                )}
            </View>

            {/* Info & Description */}
            <View style={[styles.details, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.description, { color: colors.textPrimary }]}>{video.description || 'Нет описания'}</Text>
                <View style={styles.statsRow}>
                    <Text style={[styles.statsText, { color: colors.textSecondary }]}>👁️ {video.viewCount} просмотров</Text>
                    <Text style={[styles.statsText, { color: colors.textSecondary }]}>❤️ {video.likeCount} отметок</Text>
                </View>
            </View>
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
});

export default VideoPlayerScreen;
