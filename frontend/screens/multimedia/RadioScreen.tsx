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
import { Radio as RadioIcon, Play, Loader2, ArrowLeft } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { multimediaService, RadioStation } from '../../services/multimediaService';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

export const RadioScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stations, setStations] = useState<RadioStation[]>([]);
    const [selectedMadh, setSelectedMadh] = useState<string | undefined>();

    const MADH_OPTIONS = [
        { id: 'iskcon', label: 'ISKCON' },
        { id: 'gaudiya', label: 'Gaudiya' },
        { id: 'srivaishnava', label: 'Sri Vaishnava' },
        { id: 'vedic', label: 'Vedic' },
    ];

    const loadStations = async () => {
        try {
            const data = await multimediaService.getRadioStations(selectedMadh);
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
    }, [selectedMadh]);

    const renderStation = ({ item }: { item: RadioStation }) => (
        <TouchableOpacity
            style={[styles.stationCard, { backgroundColor: roleColors.surfaceElevated, ...vTheme.shadows.soft }]}
            onPress={() => navigation.navigate('RadioPlayer', { station: item })}
        >
            {item.logoUrl ? (
                <Image source={{ uri: item.logoUrl }} style={styles.logo} />
            ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: roleColors.accentSoft }]}>
                    <RadioIcon size={32} color={roleColors.accent} />
                </View>
            )}
            <View style={styles.info}>
                <Text style={[styles.name, { color: roleColors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.description, { color: roleColors.textSecondary }]} numberOfLines={2}>
                    {item.description || 'Духовное радио вещание'}
                </Text>
                <View style={styles.meta}>
                    <View style={[
                        styles.liveBadge,
                        { backgroundColor: item.status === 'online' ? roleColors.success + '33' : roleColors.danger + '33' }
                    ]}>
                        <View style={[
                            styles.liveDot,
                            { backgroundColor: item.status === 'online' ? roleColors.success : roleColors.danger }
                        ]} />
                        <Text style={[
                            styles.liveText,
                            { color: item.status === 'online' ? roleColors.success : roleColors.danger }
                        ]}>
                            {item.status === 'online' ? 'В СЕТИ' : 'ОФФЛАЙН'}
                        </Text>
                    </View>
                    {item.viewerCount > 0 && (
                        <Text style={[styles.viewerCount, { color: roleColors.textSecondary }]}>👥 {item.viewerCount}</Text>
                    )}
                </View>
            </View>
            <View style={[styles.playButton, { backgroundColor: roleColors.accentSoft }]}>
                <Play size={24} color={roleColors.accent} fill={roleColors.accent} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: roleColors.background }]}>
            <View style={[styles.header, { backgroundColor: roleColors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={roleColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: roleColors.textPrimary }]}>Онлайн-радио</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Matth Filter */}
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            !selectedMadh
                                ? { backgroundColor: roleColors.accentSoft, borderColor: roleColors.accent }
                                : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                        ]}
                        onPress={() => setSelectedMadh(undefined)}
                    >
                        <Text style={[styles.filterText, !selectedMadh ? { color: roleColors.accent } : { color: roleColors.textSecondary }]}>Все Традиции</Text>
                    </TouchableOpacity>
                    {MADH_OPTIONS.map((m) => (
                        <TouchableOpacity
                            key={m.id}
                            style={[
                                styles.filterChip,
                                selectedMadh === m.id
                                    ? { backgroundColor: roleColors.accentSoft, borderColor: roleColors.accent }
                                    : { backgroundColor: roleColors.surface, borderColor: roleColors.border }
                            ]}
                            onPress={() => setSelectedMadh(m.id)}
                        >
                            <Text style={[styles.filterText, selectedMadh === m.id ? { color: roleColors.accent } : { color: roleColors.textSecondary }]}>
                                {m.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <Loader2 size={32} color={roleColors.accent} />
                    <Text style={[styles.loadingText, { color: roleColors.textSecondary }]}>Загрузка станций...</Text>
                </View>
            ) : (
                <FlatList
                    data={stations}
                    renderItem={renderStation}
                    keyExtractor={(item) => item.ID.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStations(); }} tintColor={roleColors.accent} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <RadioIcon size={48} color={roleColors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>Радиостанции пока не добавлены</Text>
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
    filterSection: {
        paddingBottom: 8,
    },
    filterList: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        padding: 20,
        paddingTop: 10,
    },
    stationCard: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    logo: {
        width: 76,
        height: 76,
        borderRadius: 14,
    },
    logoPlaceholder: {
        width: 76,
        height: 76,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        marginLeft: 16,
        marginRight: 8,
    },
    name: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        marginBottom: 8,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    liveText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    viewerCount: {
        fontSize: 12,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
    },
});

export default RadioScreen;
