import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    Search, XCircle, MapPin, Calendar, Users, ChevronRight,
    Compass, Home, Plus, Star, Heart, Tent, Building2, Footprints
} from 'lucide-react-native';
import { yatraService } from '../../../services/yatraService';
import { Yatra, Shelter, YatraFilters, ShelterFilters, YATRA_THEME_LABELS, SHELTER_TYPE_LABELS } from '../../../types/yatra';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';

type TabType = 'yatras' | 'shelters';

const TravelHomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const [activeTab, setActiveTab] = useState<TabType>('yatras');
    const [search, setSearch] = useState('');

    // Yatras state
    const [yatras, setYatras] = useState<Yatra[]>([]);
    const [yatrasLoading, setYatrasLoading] = useState(true);
    const [yatrasRefreshing, setYatrasRefreshing] = useState(false);

    // Shelters state
    const [shelters, setShelters] = useState<Shelter[]>([]);
    const [sheltersLoading, setSheltersLoading] = useState(true);
    const [sheltersRefreshing, setSheltersRefreshing] = useState(false);
    const isMountedRef = useRef(true);
    const latestYatrasRequestRef = useRef(0);
    const latestSheltersRequestRef = useRef(0);

    const loadYatras = useCallback(async (reset = false, queryOverride?: string) => {
        const requestId = ++latestYatrasRequestRef.current;
        try {
            if (reset && isMountedRef.current) setYatrasLoading(true);
            const query = typeof queryOverride === 'string' ? queryOverride : search;
            const response = await yatraService.getYatras({
                search: query || undefined,
                status: 'open',
                page: 1,
                limit: 20,
            });
            if (requestId !== latestYatrasRequestRef.current || !isMountedRef.current) {
                return;
            }
            setYatras(response.yatras);
        } catch (error) {
            if (requestId !== latestYatrasRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.error('Error loading yatras:', error);
        } finally {
            if (requestId === latestYatrasRequestRef.current && isMountedRef.current) {
                setYatrasLoading(false);
                setYatrasRefreshing(false);
            }
        }
    }, [search]);

    const loadShelters = useCallback(async (reset = false, queryOverride?: string) => {
        const requestId = ++latestSheltersRequestRef.current;
        try {
            if (reset && isMountedRef.current) setSheltersLoading(true);
            const query = typeof queryOverride === 'string' ? queryOverride : search;
            const response = await yatraService.getShelters({
                search: query || undefined,
                page: 1,
                limit: 20,
            });
            if (requestId !== latestSheltersRequestRef.current || !isMountedRef.current) {
                return;
            }
            setShelters(response.shelters);
        } catch (error) {
            if (requestId !== latestSheltersRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.error('Error loading shelters:', error);
        } finally {
            if (requestId === latestSheltersRequestRef.current && isMountedRef.current) {
                setSheltersLoading(false);
                setSheltersRefreshing(false);
            }
        }
    }, [search]);

    useEffect(() => {
        void loadYatras(true);
        void loadShelters(true);
        return () => {
            isMountedRef.current = false;
            latestYatrasRequestRef.current += 1;
            latestSheltersRequestRef.current += 1;
        };
    }, [loadYatras, loadShelters]);

    const handleSearch = () => {
        if (activeTab === 'yatras') {
            void loadYatras(true);
        } else {
            void loadShelters(true);
        }
    };

    const handleYatraPress = (yatra: Yatra) => {
        navigation.navigate('YatraDetail', { yatraId: yatra.id });
    };

    const handleShelterPress = (shelter: Shelter) => {
        navigation.navigate('ShelterDetail', { shelterId: shelter.id });
    };

    const renderYatraCard = ({ item }: { item: Yatra }) => {
        if (!item || item.id === undefined) return null;

        const daysUntil = yatraService.getDaysUntilStart(item.startDate);
        const duration = yatraService.getTripDuration(item.startDate, item.endDate);

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => handleYatraPress(item)}
                activeOpacity={0.8}
            >
                <FastImage
                    source={{ uri: yatraService.getImageUrl(item.coverImageUrl || null), priority: FastImage.priority.normal }}
                    style={[styles.cardImage, { backgroundColor: colors.surface }]}
                    resizeMode={FastImage.resizeMode.cover}
                />
                <View style={[styles.cardBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.cardBadgeText}>
                        {YATRA_THEME_LABELS[item.theme] || item.theme}
                    </Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.cardRow}>
                        <MapPin size={14} color={colors.accent} strokeWidth={2} />
                        <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>
                            {item.startCity} → {item.endCity}
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Calendar size={14} color={colors.warning} strokeWidth={2} />
                        <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>
                            {yatraService.formatDateRange(item.startDate, item.endDate)} ({duration} дн.)
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Users size={14} color={colors.success} strokeWidth={2} />
                        <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>
                            {item.participantCount}/{item.maxParticipants} участников
                        </Text>
                    </View>

                    <View style={styles.cardFooter}>
                        {daysUntil > 0 ? (
                            <View style={[styles.daysChip, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.daysChipText, { color: colors.textSecondary }]}>
                                    Через {daysUntil} дн.
                                </Text>
                            </View>
                        ) : daysUntil === 0 ? (
                            <View style={[styles.daysChip, styles.todayChip, { backgroundColor: colors.success }]}>
                                <Text style={[styles.daysChipText, { color: colors.background }]}>Сегодня!</Text>
                            </View>
                        ) : (
                            <View style={[styles.daysChip, styles.activeChip, { backgroundColor: colors.warning }]}>
                                <Text style={[styles.daysChipText, { color: colors.background }]}>В пути</Text>
                            </View>
                        )}
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderShelterCard = ({ item }: { item: Shelter }) => {
        if (!item || item.id === undefined) return null;

        const photos = yatraService.parsePhotos(item.photos);
        const imageUrl = photos.length > 0 ? photos[0] : null;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => handleShelterPress(item)}
                activeOpacity={0.8}
            >
                <FastImage
                    source={{ uri: yatraService.getImageUrl(imageUrl), priority: FastImage.priority.normal }}
                    style={[styles.cardImage, { backgroundColor: colors.surface }]}
                    resizeMode={FastImage.resizeMode.cover}
                />
                {item.sevaExchange && (
                    <View style={[styles.cardBadge, styles.sevaBadge, { backgroundColor: colors.danger }]}>
                        <Heart size={12} color="white" fill="white" />
                        <Text style={styles.cardBadgeText}>Seva</Text>
                    </View>
                )}
                <View style={[styles.typeBadge, { backgroundColor: colors.overlay }]}>
                    <Text style={styles.typeBadgeText}>
                        {SHELTER_TYPE_LABELS[item.type] || item.type}
                    </Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.cardRow}>
                        <MapPin size={14} color={colors.accent} strokeWidth={2} />
                        <Text style={[styles.cardRowText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.city}{item.nearTemple ? ` • ${item.nearTemple}` : ''}
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Star size={14} color={colors.warning} fill={colors.warning} />
                        <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>
                            {item.rating.toFixed(1)} ({item.reviewsCount} отзывов)
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Users size={14} color={colors.success} strokeWidth={2} />
                        <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>
                            До {item.capacity} гостей • {item.rooms} комнат
                        </Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={[styles.priceText, { color: colors.success }]}>
                            {item.pricePerNight || 'Уточняйте'}
                        </Text>
                        <ChevronRight size={20} color={colors.textSecondary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <Footprints size={32} color={colors.accent} />
                            <Text style={[styles.title, { marginBottom: 0, color: colors.textPrimary }]}>Yatra Seva</Text>
                        </View>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Духовные путешествия вместе</Text>
                    </View>
                    <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                    onPress={() => navigation.navigate(activeTab === 'yatras' ? 'CreateYatra' : 'CreateShelter')}
                >
                    <Plus size={24} color="white" strokeWidth={2} />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Search size={20} color={colors.textSecondary} style={styles.searchIcon} strokeWidth={1.5} />
                <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder={activeTab === 'yatras' ? 'Поиск туров...' : 'Поиск жилья...'}
                    placeholderTextColor={colors.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => {
                        setSearch('');
                        if (activeTab === 'yatras') {
                            void loadYatras(true, '');
                        } else {
                            void loadShelters(true, '');
                        }
                    }}>
                        <XCircle size={20} color={colors.textSecondary} strokeWidth={1.5} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={[styles.tabContainer, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'yatras' && styles.tabActive, activeTab === 'yatras' && { backgroundColor: colors.accent }]}
                    onPress={() => setActiveTab('yatras')}
                >
                    <Compass size={18} color={activeTab === 'yatras' ? 'white' : colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.tabText, activeTab === 'yatras' && styles.tabTextActive]}>
                        Туры
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'shelters' && styles.tabActive, activeTab === 'shelters' && { backgroundColor: colors.accent }]}
                    onPress={() => setActiveTab('shelters')}
                >
                    <Home size={18} color={activeTab === 'shelters' ? 'white' : colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.tabText, activeTab === 'shelters' && styles.tabTextActive]}>
                        Жильё
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const isLoading = activeTab === 'yatras' ? yatrasLoading : sheltersLoading;
    const isRefreshing = activeTab === 'yatras' ? yatrasRefreshing : sheltersRefreshing;
    const data = activeTab === 'yatras' ? yatras : shelters;

    if (isLoading && data.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Загрузка...</Text>
            </View>
        );
    }

    const refreshControlProps = {
        refreshing: isRefreshing,
        onRefresh: () => {
            if (activeTab === 'yatras') {
                setYatrasRefreshing(true);
                loadYatras(true);
            } else {
                setSheltersRefreshing(true);
                loadShelters(true);
            }
        }
    };

    const emptyComponent = (
        <View style={styles.emptyContainer}>
            {activeTab === 'yatras' ? (
                <Tent size={80} color={colors.border} strokeWidth={1} />
            ) : (
                <Building2 size={80} color={colors.border} strokeWidth={1} />
            )}
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                {activeTab === 'yatras' ? 'Туры не найдены' : 'Жильё не найдено'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {activeTab === 'yatras'
                    ? 'Создайте свой тур или попробуйте другой поиск'
                    : 'Добавьте своё жильё или попробуйте другой поиск'}
            </Text>
            <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate(activeTab === 'yatras' ? 'CreateYatra' : 'CreateShelter')}
            >
                <Plus size={20} color="white" strokeWidth={2} />
                <Text style={styles.emptyButtonText}>
                    {activeTab === 'yatras' ? 'Создать тур' : 'Добавить жильё'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {activeTab === 'yatras' ? (
                <FlatList<Yatra>
                    data={yatras}
                    renderItem={renderYatraCard}
                    keyExtractor={item => `yatra-${item.id}`}
                    ListHeaderComponent={
                        <>
                            <GodModeStatusBanner />
                            {renderHeader()}
                        </>
                    }
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl {...refreshControlProps} tintColor={colors.accent} />}
                    ListEmptyComponent={emptyComponent}
                />
            ) : (
                <FlatList<Shelter>
                    data={shelters}
                    renderItem={renderShelterCard}
                    keyExtractor={item => `shelter-${item.id}`}
                    ListHeaderComponent={
                        <>
                            <GodModeStatusBanner />
                            {renderHeader()}
                        </>
                    }
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl {...refreshControlProps} tintColor={colors.accent} />}
                    ListEmptyComponent={emptyComponent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        marginTop: 12,
        fontSize: 16,
    },
    header: {
        padding: 16,
        paddingTop: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'white',
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'white',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 14,
        height: 50,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        color: 'white',
        fontSize: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    tabActive: {
        backgroundColor: 'white',
    },
    tabText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    tabTextActive: {
        color: 'white',
    },
    listContent: {
        paddingBottom: 24,
    },
    card: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    cardImage: {
        width: '100%',
        height: 160,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    cardBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sevaBadge: {
        backgroundColor: 'white',
    },
    cardBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    typeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    typeBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
    },
    cardContent: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
        marginBottom: 12,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    cardRowText: {
        color: 'white',
        fontSize: 14,
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    daysChip: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    todayChip: {
        backgroundColor: 'white',
    },
    activeChip: {
        backgroundColor: 'white',
    },
    daysChipText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    priceText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 48,
        marginTop: 40,
    },
    emptyText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        color: 'white',
        fontSize: 15,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        marginTop: 24,
    },
    emptyButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TravelHomeScreen;
