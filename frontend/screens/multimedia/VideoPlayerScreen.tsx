import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Maximize, RotateCcw, Play, Pause } from 'lucide-react-native';
import Video from 'react-native-video';
import { WebView } from 'react-native-webview';
import { MediaTrack } from '../../services/multimediaService';

const { width, height } = Dimensions.get('window');

export const VideoPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
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
                />
            );
        }

        return (
            <Video
                source={{ uri: video.url }}
                style={styles.video}
                controls={true}
                paused={paused}
                resizeMode="contain"
                onLoad={() => setLoading(false)}
                onBuffer={({ isBuffering }) => setLoading(isBuffering)}
            />
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title} numberOfLines={1}>{video.title}</Text>
                    <Text style={styles.artist}>{video.artist || 'Неизвестный автор'}</Text>
                </View>
            </SafeAreaView>

            {/* Player Container */}
            <View style={styles.playerContainer}>
                {renderPlayer()}
                {loading && (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#6366F1" />
                    </View>
                )}
            </View>

            {/* Info & Description */}
            {!loading && !isYouTube && (
                <View style={styles.controlsOverlay}>
                    <TouchableOpacity onPress={() => setPaused(!paused)}>
                        {paused ? <Play size={40} color="#fff" /> : <Pause size={40} color="#fff" />}
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.details}>
                <Text style={styles.description}>{video.description || 'Нет описания'}</Text>
                <View style={styles.statsRow}>
                    <Text style={styles.statsText}>👁️ {video.viewCount} просмотров</Text>
                    <Text style={styles.statsText}>❤️ {video.likeCount} отметок</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    artist: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    playerContainer: {
        width: '100%',
        height: 250,
        backgroundColor: '#111',
        marginTop: 20,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    webview: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    controlsOverlay: {
        position: 'absolute',
        top: 200,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    details: {
        padding: 20,
    },
    description: {
        color: '#E5E7EB',
        fontSize: 14,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 20,
    },
    statsText: {
        color: '#9CA3AF',
        fontSize: 12,
    },
});

export default VideoPlayerScreen;
