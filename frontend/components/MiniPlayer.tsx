import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Dimensions,
} from 'react-native';
import TrackPlayer, {
    State,
    usePlaybackState,
    useActiveTrack,
} from 'react-native-track-player';
import { Play, Pause, X, Music, ChevronUp } from 'lucide-react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

export const MiniPlayer: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const playbackState = usePlaybackState();
    const activeTrack = useActiveTrack();
    const [translateY] = useState(new Animated.Value(100));

    const currentRoute = useNavigationState(state => state?.routes[state.index]?.name);
    const isPlayerScreen = currentRoute === 'RadioPlayer' || currentRoute === 'AudioPlayer' || currentRoute === 'VideoPlayer' || currentRoute === 'TVPlayer';

    const isPlaying = playbackState.state === State.Playing;
    const isPaused = playbackState.state === State.Paused;
    const isBuffering = playbackState.state === State.Buffering || playbackState.state === State.Loading;
    const isVisible = !!activeTrack && !isPlayerScreen;

    useEffect(() => {
        const anim = Animated.spring(translateY, {
            toValue: isVisible ? 0 : 150,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        });
        anim.start();
        return () => anim.stop();
    }, [isVisible, translateY]);

    if (!isVisible && !isPaused && !isPlaying && !isBuffering) return null;

    const handlePlayPause = async () => {
        if (isPlaying) {
            await TrackPlayer.pause();
        } else {
            await TrackPlayer.play();
        }
    };

    const handleStop = async () => {
        await TrackPlayer.reset();
    };

    const navigateToFullPlayer = () => {
        if (activeTrack?.isLiveStream) {
            navigation.navigate('RadioPlayer', { station: { name: activeTrack.title, streamUrl: activeTrack.url, logoUrl: activeTrack.artwork } });
        } else {
            navigation.navigate('AudioPlayer', { track: { title: activeTrack?.title, artist: activeTrack?.artist, url: activeTrack?.url, thumbnailUrl: activeTrack?.artwork } });
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                    transform: [{ translateY }],
                    borderTopColor: vTheme.colors.divider,
                }
            ]}
        >
            <TouchableOpacity
                style={styles.content}
                activeOpacity={0.9}
                onPress={navigateToFullPlayer}
            >
                <Image
                    source={{ uri: activeTrack?.artwork || 'https://via.placeholder.com/150' }}
                    style={styles.artwork}
                />

                <View style={styles.trackInfo}>
                    <Text style={[styles.title, { color: vTheme.colors.text }]} numberOfLines={1}>
                        {activeTrack?.title || 'Нет трека'}
                    </Text>
                    <Text style={[styles.artist, { color: vTheme.colors.textSecondary }]} numberOfLines={1}>
                        {activeTrack?.artist || '—'}
                    </Text>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
                        {isPlaying ? (
                            <Pause size={24} color={vTheme.colors.primary} fill={vTheme.colors.primary} />
                        ) : (
                            <Play size={24} color={vTheme.colors.primary} fill={vTheme.colors.primary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleStop} style={styles.closeButton}>
                        <X size={20} color={vTheme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        width: width,
        height: 70,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingHorizontal: 12,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    trackInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    artist: {
        fontSize: 12,
        marginTop: 2,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        padding: 8,
        marginRight: 4,
    },
    closeButton: {
        padding: 8,
    },
});
