import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    ChevronDown,
    Repeat,
    Shuffle,
    Volume2,
    MoreHorizontal,
    Heart
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import TrackPlayer, {
    usePlaybackState,
    useProgress,
    State,
    Event,
    useTrackPlayerEvents
} from 'react-native-track-player';
import { audioPlayerService } from '../../services/audioPlayerService';
import { MediaTrack } from '../../services/multimediaService';

const { width } = Dimensions.get('window');

export const AudioPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const playbackState = usePlaybackState();
    const progress = useProgress();
    const { track } = route.params as { track: MediaTrack };

    const isPlaying = playbackState.state === State.Playing;

    useEffect(() => {
        if (track) {
            audioPlayerService.playTrack(track);
        }
    }, [track]);

    const togglePlayback = async () => {
        if (isPlaying) {
            await audioPlayerService.pause();
        } else {
            await audioPlayerService.resume();
        }
    };

    const handleSeek = async (value: number) => {
        await audioPlayerService.seekTo(value);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronDown size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Сейчас играет</Text>
                <TouchableOpacity>
                    <MoreHorizontal size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Artwork */}
            <View style={styles.artworkContainer}>
                <Image
                    source={{ uri: track.thumbnailUrl || 'https://via.placeholder.com/300' }}
                    style={styles.artwork}
                />
            </View>

            {/* Track Info */}
            <View style={styles.infoContainer}>
                <View style={styles.titleRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
                        <Text style={styles.artist}>{track.artist || 'Неизвестный исполнитель'}</Text>
                    </View>
                    <TouchableOpacity>
                        <Heart size={24} color="#6366F1" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <Slider
                    style={styles.slider}
                    value={progress.position}
                    minimumValue={0}
                    maximumValue={progress.duration}
                    thumbTintColor="#6366F1"
                    minimumTrackTintColor="#6366F1"
                    maximumTrackTintColor="#E5E7EB"
                    onSlidingComplete={handleSeek}
                />
                <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(progress.position)}</Text>
                    <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity>
                    <Shuffle size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => TrackPlayer.skipToPrevious()}>
                    <SkipBack size={32} color="#333" fill="#333" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                    {isPlaying ? (
                        <Pause size={32} color="#fff" fill="#fff" />
                    ) : (
                        <Play size={32} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => TrackPlayer.skipToNext()}>
                    <SkipForward size={32} color="#333" fill="#333" />
                </TouchableOpacity>

                <TouchableOpacity>
                    <Repeat size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                <TouchableOpacity>
                    <Volume2 size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.playlistButton}>
                    <Text style={styles.playlistText}>Плейлист</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    artworkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    artwork: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    infoContainer: {
        paddingHorizontal: 30,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
    },
    artist: {
        fontSize: 16,
        color: '#6366F1',
        marginTop: 4,
    },
    progressContainer: {
        paddingHorizontal: 20,
        marginTop: 30,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    timeText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 30,
        marginTop: 30,
    },
    playButton: {
        width: 70,
        height: 70,
        backgroundColor: '#6366F1',
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    bottomActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        position: 'absolute',
        bottom: 40,
        width: '100%',
    },
    playlistButton: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    playlistText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
});

export default AudioPlayerScreen;
