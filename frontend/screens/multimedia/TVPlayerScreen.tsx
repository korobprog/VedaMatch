import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Share2, Info } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import Video from 'react-native-video';
import { TVChannel } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

export const TVPlayerScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const { channel } = route.params as { channel: TVChannel };

    const isYouTube = channel.streamUrl.includes('youtube.com') || channel.streamUrl.includes('youtu.be');

    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const renderPlayer = () => {
        if (isYouTube) {
            const videoId = getYouTubeId(channel.streamUrl);
            return (
                <WebView
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsFullscreenVideo={true}
                    mediaPlaybackRequiresUserAction={false}
                    source={{ uri: `https://www.youtube.com/embed/${videoId}?autoplay=1&live=1` }}
                />
            );
        }

        return (
            <Video
                source={{ uri: channel.streamUrl }}
                style={styles.video}
                controls={true}
                resizeMode="contain"
                playInBackground={true}
            />
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{channel.name}</Text>
                <TouchableOpacity style={styles.shareButton}>
                    <Share2 size={24} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>

            <View style={styles.playerWrapper}>
                {renderPlayer()}
                {channel.isLive && (
                    <View style={[styles.liveOverlay, { backgroundColor: colors.danger }]}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>ПРЯМОЙ ЭФИР</Text>
                    </View>
                )}
            </View>

            <View style={[styles.infoSection, { backgroundColor: colors.surfaceElevated }]}>
                <View style={styles.infoTitleRow}>
                    <Info size={20} color={colors.accent} />
                    <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>О канале</Text>
                </View>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {channel.description || 'Трансляция духовных мероприятий и лекций в прямом эфире.'}
                </Text>
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
        paddingVertical: 10,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    shareButton: {
        padding: 8,
    },
    playerWrapper: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        position: 'relative',
    },
    webview: {
        flex: 1,
        backgroundColor: '#000',
    },
    video: {
        flex: 1,
    },
    liveOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginRight: 6,
    },
    liveText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    infoSection: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 20,
        padding: 24,
    },
    infoTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 14,
        lineHeight: 22,
    },
});

export default TVPlayerScreen;
