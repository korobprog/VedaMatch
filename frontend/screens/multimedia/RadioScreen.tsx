import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Radio as RadioIcon, Play, Loader2, ArrowLeft } from 'lucide-react-native';
import { multimediaService, RadioStation } from '../../services/multimediaService';

export const RadioScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stations, setStations] = useState<RadioStation[]>([]);

    const loadStations = async () => {
        try {
            const data = await multimediaService.getRadioStations();
            setStations(data);
        } catch (error) {
            console.error('Failed to load radio stations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadStations();
    }, []);

    const renderStation = ({ item }: { item: RadioStation }) => (
        <TouchableOpacity
            style={styles.stationCard}
            onPress={() => navigation.navigate('RadioPlayer', { station: item })}
        >
            {item.logoUrl ? (
                <Image source={{ uri: item.logoUrl }} style={styles.logo} />
            ) : (
                <View style={styles.logoPlaceholder}>
                    <RadioIcon size={32} color="#6366F1" />
                </View>
            )}
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {item.description || 'Духовное радио вещание'}
                </Text>
                <View style={styles.meta}>
                    {item.isLive && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>В ЭФИРЕ</Text>
                        </View>
                    )}
                    {item.viewerCount > 0 && (
                        <Text style={styles.viewerCount}>👥 {item.viewerCount}</Text>
                    )}
                </View>
            </View>
            <View style={styles.playButton}>
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
                <Text style={styles.headerTitle}>Онлайн-радио</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color="#6366F1" />
                    <Text style={styles.loadingText}>Загрузка станций...</Text>
                </View>
            ) : (
                <FlatList
                    data={stations}
                    renderItem={renderStation}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStations(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <RadioIcon size={48} color="#ccc" />
                            <Text style={styles.emptyText}>Радиостанции пока не добавлены</Text>
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
    stationCard: {
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
    logo: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: 16,
        marginRight: 8,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
        marginRight: 4,
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    viewerCount: {
        fontSize: 11,
        color: '#6B7280',
    },
    playButton: {
        width: 40,
        height: 40,
        backgroundColor: '#EEF2FF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
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

export default RadioScreen;
