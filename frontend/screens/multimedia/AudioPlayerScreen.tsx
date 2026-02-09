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
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

const { width } = Dimensions.get('window');

export const AudioPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();
    const { roleTheme, colors } = useRoleTheme(user?.role, isDarkMode);
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
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient
                colors={isDarkMode ? roleTheme.gradient : [roleTheme.accentStrong, colors.background]}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}
                    >
                        <ChevronDown size={28} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Сейчас играет</Text>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.accentSoft }]}>
                        <MoreHorizontal size={24} color={colors.textPrimary} />
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
                            <View style={[styles.artworkPlaceholder, { backgroundColor: colors.accentSoft }]}>
                                <Music size={100} color={colors.textPrimary} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Track Info */}
                <View style={styles.infoContainer}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{track.title}</Text>
                            <Text style={[styles.artist, { color: colors.textSecondary }]}>{track.artist || 'Неизвестный исполнитель'}</Text>
                        </View>
                        <TouchableOpacity style={styles.favButton}>
                            <Heart size={28} color={colors.textPrimary} />
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
                        thumbTintColor={colors.accent}
                        minimumTrackTintColor={colors.accent}
                        maximumTrackTintColor={colors.border}
                        onSlidingComplete={handleSeek}
                    />
                    <View style={styles.timeRow}>
                        <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(progress.position)}</Text>
                        <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(progress.duration)}</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controlsContainer}>
                    <TouchableOpacity>
                        <Shuffle size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => TrackPlayer.skipToPrevious()}>
                        <SkipBack size={36} color={colors.textPrimary} fill={colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.surfaceElevated }]} onPress={togglePlayback}>
                        {isPlaying ? (
                            <Pause size={36} color={colors.accent} fill={colors.accent} />
                        ) : (
                            <Play size={36} color={colors.accent} fill={colors.accent} style={{ marginLeft: 4 }} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => TrackPlayer.skipToNext()}>
                        <SkipForward size={36} color={colors.textPrimary} fill={colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity>
                        <Repeat size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Volume bar to fix overlapping issues */}
                <View style={styles.footer}>
                    <View style={[styles.volumeContainer, { backgroundColor: colors.accentSoft }]}>
                        <Volume2 size={18} color={colors.textPrimary} style={{ opacity: 0.8 }} />
                        <Slider
                            style={styles.volumeSlider}
                            minimumValue={0}
                            maximumValue={1}
                            value={volume}
                            onValueChange={handleVolumeChange}
                            minimumTrackTintColor={colors.accent}
                            maximumTrackTintColor={colors.border}
                            thumbTintColor={colors.accent}
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
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
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
        backgroundColor: 'rgba(255,255,255,0.06)',
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
