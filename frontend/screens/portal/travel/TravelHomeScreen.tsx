import React, { useState, useEffect, useCallback } from 'react';
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

type TabType = 'yatras' | 'shelters';

const TravelHomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
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

    const loadYatras = useCallback(async (reset = false) => {
        try {
            if (reset) setYatrasLoading(true);
            const response = await yatraService.getYatras({
                search: search || undefined,
                status: 'open',
                page: 1,
                limit: 20,
            });
            setYatras(response.yatras);
        } catch (error) {
            console.error('Error loading yatras:', error);
        } finally {
            setYatrasLoading(false);
            setYatrasRefreshing(false);
        }
    }, [search]);

    const loadShelters = useCallback(async (reset = false) => {
        try {
            if (reset) setSheltersLoading(true);
            const response = await yatraService.getShelters({
                search: search || undefined,
                page: 1,
                limit: 20,
            });
            setShelters(response.shelters);
        } catch (error) {
            console.error('Error loading shelters:', error);
        } finally {
            setSheltersLoading(false);
            setSheltersRefreshing(false);
        }
    }, [search]);

    useEffect(() => {
        loadYatras(true);
        loadShelters(true);
    }, []);

    const handleSearch = () => {
        if (activeTab === 'yatras') {
            loadYatras(true);
        } else {
            loadShelters(true);
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
                style={styles.card}
                onPress={() => handleYatraPress(item)}
                activeOpacity={0.8}
            >
                <FastImage
                    source={{ uri: yatraService.getImageUrl(item.coverImageUrl || null), priority: FastImage.priority.normal }}
                    style={styles.cardImage}
                    resizeMode={FastImage.resizeMode.cover}
                />
                <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>
                        {YATRA_THEME_LABELS[item.theme] || item.theme}
                    </Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.cardRow}>
                        <MapPin size={14} color="#FF9500" strokeWidth={2} />
                        <Text style={styles.cardRowText}>
                            {item.startCity} → {item.endCity}
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Calendar size={14} color="#5AC8FA" strokeWidth={2} />
                        <Text style={styles.cardRowText}>
                            {yatraService.formatDateRange(item.startDate, item.endDate)} ({duration} дн.)
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Users size={14} color="#34C759" strokeWidth={2} />
                        <Text style={styles.cardRowText}>
                            {item.participantCount}/{item.maxParticipants} участников
                        </Text>
                    </View>

                    <View style={styles.cardFooter}>
                        {daysUntil > 0 ? (
                            <View style={styles.daysChip}>
                                <Text style={styles.daysChipText}>
                                    Через {daysUntil} дн.
                                </Text>
                            </View>
                        ) : daysUntil === 0 ? (
                            <View style={[styles.daysChip, styles.todayChip]}>
                                <Text style={styles.daysChipText}>Сегодня!</Text>
                            </View>
                        ) : (
                            <View style={[styles.daysChip, styles.activeChip]}>
                                <Text style={styles.daysChipText}>В пути</Text>
                            </View>
                        )}
                        <ChevronRight size={20} color="#8E8E93" />
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
                style={styles.card}
                onPress={() => handleShelterPress(item)}
                activeOpacity={0.8}
            >
                <FastImage
                    source={{ uri: yatraService.getImageUrl(imageUrl), priority: FastImage.priority.normal }}
                    style={styles.cardImage}
                    resizeMode={FastImage.resizeMode.cover}
                />
                {item.sevaExchange && (
                    <View style={[styles.cardBadge, styles.sevaBadge]}>
                        <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.cardBadgeText}>Seva</Text>
                    </View>
                )}
                <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                        {SHELTER_TYPE_LABELS[item.type] || item.type}
                    </Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

                    <View style={styles.cardRow}>
                        <MapPin size={14} color="#FF9500" strokeWidth={2} />
                        <Text style={styles.cardRowText} numberOfLines={1}>
                            {item.city}{item.nearTemple ? ` • ${item.nearTemple}` : ''}
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Star size={14} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.cardRowText}>
                            {item.rating.toFixed(1)} ({item.reviewsCount} отзывов)
                        </Text>
                    </View>

                    <View style={styles.cardRow}>
                        <Users size={14} color="#34C759" strokeWidth={2} />
                        <Text style={styles.cardRowText}>
                            До {item.capacity} гостей • {item.rooms} комнат
                        </Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.priceText}>
                            {item.pricePerNight || 'Уточняйте'}
                        </Text>
                        <ChevronRight size={20} color="#8E8E93" />
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
                        <Footprints size={32} color="#FF9500" />
                        <Text style={[styles.title, { marginBottom: 0 }]}>Yatra Seva</Text>
                    </View>
                    <Text style={styles.subtitle}>Духовные путешествия вместе</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate(activeTab === 'yatras' ? 'CreateYatra' : 'CreateShelter')}
                >
                    <Plus size={24} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color="#8E8E93" style={styles.searchIcon} strokeWidth={1.5} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={activeTab === 'yatras' ? 'Поиск туров...' : 'Поиск жилья...'}
                    placeholderTextColor="#8E8E93"
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(''); handleSearch(); }}>
                        <XCircle size={20} color="#8E8E93" strokeWidth={1.5} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'yatras' && styles.tabActive]}
                    onPress={() => setActiveTab('yatras')}
                >
                    <Compass size={18} color={activeTab === 'yatras' ? '#FFFFFF' : '#8E8E93'} strokeWidth={2} />
                    <Text style={[styles.tabText, activeTab === 'yatras' && styles.tabTextActive]}>
                        Туры
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'shelters' && styles.tabActive]}
                    onPress={() => setActiveTab('shelters')}
                >
                    <Home size={18} color={activeTab === 'shelters' ? '#FFFFFF' : '#8E8E93'} strokeWidth={2} />
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
                <ActivityIndicator size="large" color="#FF9500" />
                <Text style={styles.loadingText}>Загрузка...</Text>
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
                <Tent size={80} color="#2C2C2E" strokeWidth={1} />
            ) : (
                <Building2 size={80} color="#2C2C2E" strokeWidth={1} />
            )}
            <Text style={styles.emptyText}>
                {activeTab === 'yatras' ? 'Туры не найдены' : 'Жильё не найдено'}
            </Text>
            <Text style={styles.emptySubtext}>
                {activeTab === 'yatras'
                    ? 'Создайте свой тур или попробуйте другой поиск'
                    : 'Добавьте своё жильё или попробуйте другой поиск'}
            </Text>
            <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate(activeTab === 'yatras' ? 'CreateYatra' : 'CreateShelter')}
            >
                <Plus size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.emptyButtonText}>
                    {activeTab === 'yatras' ? 'Создать тур' : 'Добавить жильё'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {activeTab === 'yatras' ? (
                <FlatList<Yatra>
                    data={yatras}
                    renderItem={renderYatraCard}
                    keyExtractor={item => (item?.id ?? Math.random()).toString()}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl {...refreshControlProps} />}
                    ListEmptyComponent={emptyComponent}
                />
            ) : (
                <FlatList<Shelter>
                    data={shelters}
                    renderItem={renderShelterCard}
                    keyExtractor={item => (item?.id ?? Math.random()).toString()}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl {...refreshControlProps} />}
                    ListEmptyComponent={emptyComponent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    loadingText: {
        color: '#FFFFFF',
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
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF9500',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        paddingHorizontal: 14,
        height: 50,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        color: '#FFFFFF',
        fontSize: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E',
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
        backgroundColor: '#FF9500',
    },
    tabText: {
        color: '#8E8E93',
        fontSize: 15,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingBottom: 24,
    },
    card: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    cardImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#2C2C2E',
    },
    cardBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#FF9500',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sevaBadge: {
        backgroundColor: '#FF2D55',
    },
    cardBadgeText: {
        color: '#FFFFFF',
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
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    cardContent: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    cardRowText: {
        color: '#E5E5EA',
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
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    todayChip: {
        backgroundColor: '#34C759',
    },
    activeChip: {
        backgroundColor: '#5AC8FA',
    },
    daysChipText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    priceText: {
        color: '#34C759',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 48,
        marginTop: 40,
    },
    emptyText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#8E8E93',
        fontSize: 15,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF9500',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        marginTop: 24,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TravelHomeScreen;
