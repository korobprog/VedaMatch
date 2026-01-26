import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    SafeAreaView,
    StatusBar,
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
    Heart,
    Music
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import TrackPlayer, {
    usePlaybackState,
    useProgress,
    State,
} from 'react-native-track-player';
import LinearGradient from 'react-native-linear-gradient';
import { audioPlayerService } from '../../services/audioPlayerService';
import { MediaTrack } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';

const { width } = Dimensions.get('window');

export const AudioPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { vTheme, isDarkMode } = useSettings();
    const playbackState = usePlaybackState();
    const progress = useProgress();
    const { track } = route.params as { track: MediaTrack };
    const [volume, setVolume] = useState(0.7);

    const isPlaying = playbackState.state === State.Playing;

    useEffect(() => {
        if (track) {
            audioPlayerService.playTrack(track);
        }
        initVolume();
    }, [track]);

    const initVolume = async () => {
        const vol = await TrackPlayer.getVolume();
        setVolume(vol);
    };

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

    const handleVolumeChange = async (value: number) => {
        setVolume(value);
        await TrackPlayer.setVolume(value);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" transparent />
            <LinearGradient
                colors={isDarkMode ? ['#1e1e2d', '#2d1e2d'] : [vTheme.colors.primary, '#f0f4f8']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.iconButton}
                    >
                        <ChevronDown size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Сейчас играет</Text>
                    <TouchableOpacity style={styles.iconButton}>
                        <MoreHorizontal size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Artwork */}
                <View style={styles.artworkContainer}>
                    <View style={[styles.artworkWrapper, vTheme.shadows.soft]}>
                        {track.thumbnailUrl ? (
                            <Image
                                source={{ uri: track.thumbnailUrl }}
                                style={styles.artwork}
                            />
                        ) : (
                            <View style={[styles.artworkPlaceholder, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <Music size={100} color="#fff" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Track Info */}
                <View style={styles.infoContainer}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: '#fff' }]} numberOfLines={1}>{track.title}</Text>
                            <Text style={[styles.artist, { color: 'rgba(255,255,255,0.7)' }]}>{track.artist || 'Неизвестный исполнитель'}</Text>
                        </View>
                        <TouchableOpacity style={styles.favButton}>
                            <Heart size={28} color="#fff" />
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
                        thumbTintColor="#fff"
                        minimumTrackTintColor="#fff"
                        maximumTrackTintColor="rgba(255,255,255,0.3)"
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
                        <Shuffle size={24} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => TrackPlayer.skipToPrevious()}>
                        <SkipBack size={36} color="#fff" fill="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                        {isPlaying ? (
                            <Pause size={36} color={vTheme.colors.primary} fill={vTheme.colors.primary} />
                        ) : (
                            <Play size={36} color={vTheme.colors.primary} fill={vTheme.colors.primary} style={{ marginLeft: 4 }} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => TrackPlayer.skipToNext()}>
                        <SkipForward size={36} color="#fff" fill="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity>
                        <Repeat size={24} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                </View>

                {/* Volume bar to fix overlapping issues */}
                <View style={styles.footer}>
                    <View style={[styles.volumeContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <Volume2 size={18} color={isDarkMode ? '#fff' : vTheme.colors.text} style={{ opacity: 0.6 }} />
                        <Slider
                            style={styles.volumeSlider}
                            minimumValue={0}
                            maximumValue={1}
                            value={volume}
                            onValueChange={handleVolumeChange}
                            minimumTrackTintColor={vTheme.colors.primary}
                            maximumTrackTintColor={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
                            thumbTintColor={vTheme.colors.primary}
                        />
                    </View>
                </View>
            </SafeAreaView>
        </View>
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
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    artworkContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    artworkWrapper: {
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    artwork: {
        width: width * 0.8,
        height: width * 0.8,
    },
    artworkPlaceholder: {
        width: width * 0.8,
        height: width * 0.8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        paddingHorizontal: 30,
        marginBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 4,
    },
    artist: {
        fontSize: 18,
        fontWeight: '500',
    },
    favButton: {
        padding: 5,
    },
    progressContainer: {
        paddingHorizontal: 25,
        marginBottom: 20,
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
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 30,
        marginBottom: 40,
    },
    playButton: {
        width: 84,
        height: 84,
        backgroundColor: '#fff',
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    footer: {
        paddingHorizontal: 30,
        paddingBottom: 30,
    },
    volumeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    volumeSlider: {
        flex: 1,
        height: 40,
        marginLeft: 10,
    },
});

export default AudioPlayerScreen;

export default AudioPlayerScreen;
