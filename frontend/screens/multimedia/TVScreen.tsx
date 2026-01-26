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

export const TVScreen: React.FC = () => {
    const navigation = useNavigation<any>();
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
            style={styles.channelCard}
            onPress={() => navigation.navigate('TVPlayer', { channel: item })}
        >
            <View style={styles.logoContainer}>
                {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.logo} />
                ) : (
                    <View style={styles.logoPlaceholder}>
                        <Tv size={40} color="#6366F1" />
                    </View>
                )}
                {item.isLive && (
                    <View style={styles.liveBadge}>
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.type}>
                    {item.streamType === 'youtube' ? 'YouTube Трансляция' : 'Прямой эфир'}
                </Text>
            </View>
            <View style={styles.playIcon}>
                <Play size={24} color="#6366F1" fill="#6366F1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Духовное ТВ</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color="#6366F1" />
                    <Text style={styles.loadingText}>Загрузка каналов...</Text>
                </View>
            ) : (
                <FlatList
                    data={channels}
                    renderItem={renderChannel}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChannels(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Tv size={48} color="#ccc" />
                            <Text style={styles.emptyText}>Каналы пока не добавлены</Text>
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
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    list: {
        padding: 16,
    },
    channelCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    logoContainer: {
        position: 'relative',
        width: 100,
        height: 60,
        borderRadius: 8,
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
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: '#EF4444',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    liveText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    info: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    type: {
        fontSize: 12,
        color: '#6B7280',
    },
    playIcon: {
        padding: 10,
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
        color: '#6B7280',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default TVScreen;
