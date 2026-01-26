import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Tv, Play, Loader2, ArrowLeft } from 'lucide-react-native';
import { multimediaService, TVChannel } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';

export const TVScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [channels, setChannels] = useState<TVChannel[]>([]);

    const loadChannels = async () => {
        try {
            const data = await multimediaService.getTVChannels();
            setChannels(data);
        } catch (error) {
            console.error('Failed to load TV channels:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadChannels();
    }, []);

    const renderChannel = ({ item }: { item: TVChannel }) => (
        <TouchableOpacity
            style={[styles.channelCard, { backgroundColor: vTheme.colors.surface, ...vTheme.shadows.soft }]}
            onPress={() => navigation.navigate('TVPlayer', { channel: item })}
        >
            <View style={styles.logoContainer}>
                {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.logo} />
                ) : (
                    <View style={[styles.logoPlaceholder, { backgroundColor: `${vTheme.colors.primary}10` }]}>
                        <Tv size={40} color={vTheme.colors.primary} />
                    </View>
                )}
                {item.isLive && (
                    <View style={[styles.liveBadge, { backgroundColor: vTheme.colors.accent }]}>
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                )}
            </View>
            <View style={styles.info}>
                <Text style={[styles.name, { color: vTheme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.type, { color: vTheme.colors.textSecondary }]}>
                    {item.streamType === 'youtube' ? 'YouTube Трансляция' : 'Прямой эфир'}
                </Text>
            </View>
            <View style={styles.playIcon}>
                <Play size={24} color={vTheme.colors.primary} fill={vTheme.colors.primary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: vTheme.colors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: vTheme.colors.text }]}>Духовное ТВ</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color={vTheme.colors.primary} />
                    <Text style={[styles.loadingText, { color: vTheme.colors.textSecondary }]}>Загрузка каналов...</Text>
                </View>
            ) : (
                <FlatList
                    data={channels}
                    renderItem={renderChannel}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChannels(); }} tintColor={vTheme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Tv size={48} color={vTheme.colors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={[styles.emptyText, { color: vTheme.colors.textSecondary }]}>Каналы пока не добавлены</Text>
                        </View>
                    }
                />
            )}
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
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        padding: 20,
    },
    channelCard: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    logoContainer: {
        position: 'relative',
        width: 100,
        height: 64,
        borderRadius: 12,
        overflow: 'hidden',
    },
    logo: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    info: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    type: {
        fontSize: 13,
    },
    playIcon: {
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
    },
});

export default TVScreen;
