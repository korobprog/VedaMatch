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
    ChevronDown,
    Volume2,
    Share2,
    Activity
} from 'lucide-react-native';
import { usePlaybackState, State } from 'react-native-track-player';
import { audioPlayerService } from '../../services/audioPlayerService';
import { RadioStation } from '../../services/multimediaService';

const { width } = Dimensions.get('window');

export const RadioPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const playbackState = usePlaybackState();
    const { station } = route.params as { station: RadioStation };

    const isPlaying = playbackState.state === State.Playing;

    useEffect(() => {
        if (station) {
            audioPlayerService.playRadio(station.name, station.streamUrl, station.logoUrl);
        }
        return () => {
            // Option: stop radio on exit, or keep playing in background
        };
    }, [station]);

    const togglePlayback = async () => {
        if (isPlaying) {
            await audioPlayerService.pause();
        } else {
            await audioPlayerService.resume();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronDown size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Прямой эфир</Text>
                <TouchableOpacity>
                    <Share2 size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    {station.logoUrl ? (
                        <Image source={{ uri: station.logoUrl }} style={styles.logo} />
                    ) : (
                        <View style={styles.logoPlaceholder}>
                            <Activity size={80} color="#6366F1" />
                        </View>
                    )}
                    <View style={styles.liveBadge}>
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>

                <Text style={styles.name}>{station.name}</Text>
                <Text style={styles.description}>{station.description || 'Радиостанция духовного вещания'}</Text>

                {isPlaying && (
                    <View style={styles.visualizer}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <View key={i} style={[styles.visBar, { height: 10 + Math.random() * 30 }]} />
                        ))}
                    </View>
                )}

                <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                    {isPlaying ? (
                        <Pause size={40} color="#fff" fill="#fff" />
                    ) : (
                        <Play size={40} color="#fff" fill="#fff" style={{ marginLeft: 6 }} />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Volume2 size={24} color="#6B7280" />
                <View style={styles.volumeTrack}>
                    <View style={[styles.volumeLevel, { width: '70%' }]} />
                </View>
            </View>
        </SafeAreaView>
    );
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
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 40,
    },
    logo: {
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: 30,
    },
    logoPlaceholder: {
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    liveBadge: {
        position: 'absolute',
        top: 20,
        right: -10,
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        elevation: 4,
    },
    liveText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
    },
    visualizer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        gap: 8,
        marginTop: 40,
    },
    visBar: {
        width: 6,
        backgroundColor: '#6366F1',
        borderRadius: 3,
    },
    playButton: {
        marginTop: 40,
        width: 90,
        height: 90,
        backgroundColor: '#6366F1',
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 60,
    },
    volumeTrack: {
        flex: 1,
        height: 4,
        backgroundColor: '#F3F4F6',
        marginLeft: 15,
        borderRadius: 2,
    },
    volumeLevel: {
        height: '100%',
        backgroundColor: '#9CA3AF',
        borderRadius: 2,
    },
});

export default RadioPlayerScreen;
