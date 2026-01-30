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
    ChevronDown,
    Volume2,
    Share2,
    Radio as RadioIcon
} from 'lucide-react-native';
import TrackPlayer, { usePlaybackState, State, Event } from 'react-native-track-player';
import LinearGradient from 'react-native-linear-gradient';
import Slider from '@react-native-community/slider';
import { ActivityIndicator } from 'react-native';
import { audioPlayerService } from '../../services/audioPlayerService';
import { RadioStation } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';

const { width, height } = Dimensions.get('window');

export const RadioPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { vTheme, isDarkMode } = useSettings();
    const playbackState = usePlaybackState();
    const { station } = route.params as { station: RadioStation };
    const [volume, setVolume] = useState(0.7);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // TrackPlayer v4 state handling
    const state = playbackState.state;
    const isPlaying = state === State.Playing;
    const isBuffering = state === State.Buffering || state === State.Loading;

    useEffect(() => {
        const listener = TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
            console.error('Screen PlaybackError:', error);
            setErrorMessage(`Ошибка: ${error.message || 'Не удалось подключиться'}`);
        });

        if (station) {
            setErrorMessage(null);
            audioPlayerService.playRadio(station.name, station.streamUrl, station.logoUrl);
        }
        initVolume();

        return () => listener.remove();
    }, [station]);

    const initVolume = async () => {
        try {
            const vol = await TrackPlayer.getVolume();
            setVolume(vol);
        } catch (e) {
            console.error('Failed to get volume', e);
        }
    };

    const togglePlayback = async () => {
        setErrorMessage(null);
        try {
            if (isPlaying) {
                await audioPlayerService.pause();
            } else {
                await audioPlayerService.playRadio(station.name, station.streamUrl, station.logoUrl);
            }
        } catch (e) {
            console.error('Toggle playback failed', e);
        }
    };

    const handleVolumeChange = async (value: number) => {
        setVolume(value);
        try {
            await TrackPlayer.setVolume(value);
        } catch (e) {
            console.error('Failed to set volume', e);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={isDarkMode ? ['#1a1c2c', '#4a192c'] : [vTheme.colors.primary, '#f8fafc']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    >
                        <ChevronDown size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Прямой эфир</Text>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Share2 size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={[styles.logoContainer, vTheme.shadows.soft]}>
                        {station.logoUrl ? (
                            <Image source={{ uri: station.logoUrl }} style={styles.logo} />
                        ) : (
                            <View style={[styles.logoPlaceholder, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <RadioIcon size={width * 0.3} color="#fff" />
                            </View>
                        )}
                        <View style={[styles.liveBadge, { backgroundColor: vTheme.colors.accent }]}>
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={[styles.name, { color: '#fff' }]}>{station.name}</Text>

                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: station.status === 'online' ? '#4ade80' : station.status === 'offline' ? '#f87171' : '#fbbf24' }
                            ]} />
                            <Text style={styles.statusLabel}>
                                {station.status === 'online' ? 'В сети' : station.status === 'offline' ? 'Не в сети' : 'Проверка...'}
                            </Text>
                        </View>

                        <Text style={[styles.description, { color: errorMessage ? '#ff6b6b' : 'rgba(255,255,255,0.7)' }]}>
                            {errorMessage || (isBuffering ? 'Подключение к серверу...' : (station.description || 'Радиостанция духовного вещания'))}
                        </Text>
                    </View>

                    <View style={styles.controlsContainer}>
                        <TouchableOpacity
                            style={[styles.playButton, { backgroundColor: '#fff' }]}
                            onPress={togglePlayback}
                            disabled={isBuffering && !errorMessage}
                        >
                            {isBuffering ? (
                                <ActivityIndicator size="large" color={vTheme.colors.primary} />
                            ) : isPlaying ? (
                                <Pause size={42} color={vTheme.colors.primary} fill={vTheme.colors.primary} />
                            ) : (
                                <Play size={42} color={vTheme.colors.primary} fill={vTheme.colors.primary} style={{ marginLeft: 6 }} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={[styles.volumeContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <Volume2 size={20} color={isDarkMode ? '#fff' : vTheme.colors.text} style={{ opacity: 0.8 }} />
                        <Slider
                            style={styles.volumeSlider}
                            minimumValue={0}
                            maximumValue={1}
                            value={volume}
                            onValueChange={handleVolumeChange}
                            minimumTrackTintColor={vTheme.colors.primary}
                            maximumTrackTintColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}
                            thumbTintColor={vTheme.colors.primary}
                        />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
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
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 35,
        padding: 5,
    },
    logo: {
        width: width * 0.75,
        height: width * 0.75,
        borderRadius: 30,
    },
    logoPlaceholder: {
        width: width * 0.75,
        height: width * 0.75,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    liveBadge: {
        position: 'absolute',
        top: 20,
        right: -10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    liveText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    name: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    controlsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    footer: {
        paddingHorizontal: 30,
        paddingBottom: 40,
    },
    volumeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 15,
        borderRadius: 25,
    },
    volumeSlider: {
        flex: 1,
        height: 40,
        marginLeft: 10,
    },
});

export default RadioPlayerScreen;
