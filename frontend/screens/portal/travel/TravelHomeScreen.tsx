import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    FlatList,
    Platform,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    Search, XCircle, MapPin, Calendar, Users, ChevronRight,
    Compass, Home, Plus, Star, Heart, Tent, Building2, Footprints
} from 'lucide-react-native';
import { yatraService } from '../../../services/yatraService';
import { Yatra, Shelter, getShelterTypeLabel, getYatraThemeLabel } from '../../../types/yatra';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';
import { useSheltersQuery, useYatrasQuery } from '../../../hooks/queries/useTravelQueries';
import { FlashList, shouldUseFlashList } from '../../../lib/flashListCompat';

type TabType = 'yatras' | 'shelters';

type TravelCardCommonProps = {
    colors: ReturnType<typeof useRoleTheme>['colors'];
    reducedVisuals: boolean;
};

type YatraCardProps = TravelCardCommonProps & {
    item: Yatra;
    language: string;
    onPress: (yatra: Yatra) => void;
};

type ShelterCardProps = TravelCardCommonProps & {
    item: Shelter;
    language: string;
    onPress: (shelter: Shelter) => void;
};

const YatraCard = React.memo<YatraCardProps>(({ item, language, onPress, colors, reducedVisuals }) => {
    const daysUntil = yatraService.getDaysUntilStart(item.startDate);
    const duration = yatraService.getTripDuration(item.startDate, item.endDate);

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => onPress(item)}
            activeOpacity={0.8}
        >
            <FastImage
                source={{ uri: yatraService.getImageUrl(item.coverImageUrl || null), priority: FastImage.priority.normal }}
                style={[styles.cardImage, reducedVisuals && styles.cardImageReduced, { backgroundColor: colors.surface }]}
                resizeMode={FastImage.resizeMode.cover}
            />
            {!reducedVisuals && (
                <View style={[styles.cardBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.cardBadgeText}>
                        {getYatraThemeLabel(item.theme, language)}
                    </Text>
                </View>
            )}
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
                        {yatraService.formatDateRange(item.startDate, item.endDate, language)} ({duration} days)
                    </Text>
                </View>

                <View style={styles.cardRow}>
                    <Users size={14} color={colors.success} strokeWidth={2} />
                    <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>
                        {item.participantCount}/{item.maxParticipants} participants
                    </Text>
                </View>

                <View style={styles.cardFooter}>
                    {daysUntil > 0 ? (
                        <View style={[styles.daysChip, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.daysChipText, { color: colors.textSecondary }]}>
                                In {daysUntil} days
                            </Text>
                        </View>
                    ) : daysUntil === 0 ? (
                        <View style={[styles.daysChip, styles.todayChip, { backgroundColor: colors.success }]}>
                            <Text style={[styles.daysChipText, { color: colors.background }]}>Today!</Text>
                        </View>
                    ) : (
                        <View style={[styles.daysChip, styles.activeChip, { backgroundColor: colors.warning }]}>
                            <Text style={[styles.daysChipText, { color: colors.background }]}>In progress</Text>
                        </View>
                    )}
                    <ChevronRight size={20} color={colors.textSecondary} />
                </View>
            </View>
        </TouchableOpacity>
    );
});

const ShelterCard = React.memo<ShelterCardProps>(({ item, language, onPress, colors, reducedVisuals }) => {
    const photos = yatraService.parsePhotos(item.photos);
    const imageUrl = photos.length > 0 ? photos[0] : null;

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => onPress(item)}
            activeOpacity={0.8}
        >
            <FastImage
                source={{ uri: yatraService.getImageUrl(imageUrl), priority: FastImage.priority.normal }}
                style={[styles.cardImage, reducedVisuals && styles.cardImageReduced, { backgroundColor: colors.surface }]}
                resizeMode={FastImage.resizeMode.cover}
            />
            {!reducedVisuals && item.sevaExchange && (
                <View style={[styles.cardBadge, styles.sevaBadge, { backgroundColor: colors.danger }]}>
                    <Heart size={12} color="white" fill="white" />
                    <Text style={styles.cardBadgeText}>Seva</Text>
                </View>
            )}
            {!reducedVisuals && (
                <View style={[styles.typeBadge, { backgroundColor: colors.overlay }]}>
                    <Text style={styles.typeBadgeText}>
                        {getShelterTypeLabel(item.type, language)}
                    </Text>
                </View>
            )}
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
                        {item.rating.toFixed(1)} ({item.reviewsCount} reviews)
                    </Text>
                </View>

                <View style={styles.cardRow}>
                    <Users size={14} color={colors.success} strokeWidth={2} />
                    <Text style={[styles.cardRowText, { color: colors.textSecondary }]}>
                        Up to {item.capacity} guests • {item.rooms} rooms
                    </Text>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={[styles.priceText, { color: colors.success }]}>
                        {item.pricePerNight || 'Contact for details'}
                    </Text>
                    <ChevronRight size={20} color={colors.textSecondary} />
                </View>
            </View>
        </TouchableOpacity>
    );
});

const TravelHomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { i18n } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const [activeTab, setActiveTab] = useState<TabType>('yatras');
    const [search, setSearch] = useState('');
    const [submittedSearch, setSubmittedSearch] = useState('');
    const reducedVisuals = Platform.OS === 'android';
    const listTuning = useMemo(() => (
        reducedVisuals
            ? {
                initialNumToRender: 3,
                maxToRenderPerBatch: 3,
                windowSize: 4,
                updateCellsBatchingPeriod: 80,
                estimatedItemSize: 320,
            }
            : {
                initialNumToRender: 5,
                maxToRenderPerBatch: 5,
                windowSize: 6,
                updateCellsBatchingPeriod: 50,
                estimatedItemSize: 360,
            }
    ), [reducedVisuals]);

    const yatrasQuery = useYatrasQuery({ search: submittedSearch, limit: 20 });
    const sheltersQuery = useSheltersQuery({ search: submittedSearch, limit: 20 });

    const handleSearch = useCallback(() => {
        setSubmittedSearch(search.trim());
    }, [search]);

    const handleYatraPress = useCallback((yatra: Yatra) => {
        navigation.navigate('YatraDetail', { yatraId: yatra.id });
    }, [navigation]);

    const handleShelterPress = useCallback((shelter: Shelter) => {
        navigation.navigate('ShelterDetail', { shelterId: shelter.id });
    }, [navigation]);

    const handleCreatePress = useCallback(() => {
        navigation.navigate(activeTab === 'yatras' ? 'CreateYatra' : 'CreateShelter');
    }, [activeTab, navigation]);

    const clearSearch = useCallback(() => {
        setSearch('');
        setSubmittedSearch('');
    }, []);

    const renderHeader = useMemo(() => (
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <Footprints size={32} color={colors.accent} />
                            <Text style={[styles.title, { marginBottom: 0, color: colors.textPrimary }]}>Yatra Seva</Text>
                        </View>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Spiritual journeys together</Text>
                    </View>
                    <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                    onPress={handleCreatePress}
                >
                    <Plus size={24} color="white" strokeWidth={2} />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Search size={20} color={colors.textSecondary} style={styles.searchIcon} strokeWidth={1.5} />
                <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder={activeTab === 'yatras' ? 'Search trips...' : 'Search stays...'}
                    placeholderTextColor={colors.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={clearSearch}>
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
                        Trips
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'shelters' && styles.tabActive, activeTab === 'shelters' && { backgroundColor: colors.accent }]}
                    onPress={() => setActiveTab('shelters')}
                >
                    <Home size={18} color={activeTab === 'shelters' ? 'white' : colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.tabText, activeTab === 'shelters' && styles.tabTextActive]}>
                        Stays
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    ), [activeTab, clearSearch, colors.accent, colors.border, colors.surfaceElevated, colors.textPrimary, colors.textSecondary, handleCreatePress, handleSearch, search]);

    const yatras = yatrasQuery.data?.yatras || [];
    const shelters = sheltersQuery.data?.shelters || [];
    const TravelListComponent: any = shouldUseFlashList(true) ? FlashList : FlatList;
    const isLoading = activeTab === 'yatras' ? yatrasQuery.isLoading : sheltersQuery.isLoading;
    const isRefreshing = activeTab === 'yatras'
        ? (yatrasQuery.isRefetching && !yatrasQuery.isLoading)
        : (sheltersQuery.isRefetching && !sheltersQuery.isLoading);
    const data = activeTab === 'yatras' ? yatras : shelters;

    const handleRefresh = useCallback(() => {
        if (activeTab === 'yatras') {
            yatrasQuery.refetch().catch((error) => {
                console.warn('[travel] failed to refresh yatras', error);
            });
        } else {
            sheltersQuery.refetch().catch((error) => {
                console.warn('[travel] failed to refresh shelters', error);
            });
        }
    }, [activeTab, sheltersQuery, yatrasQuery]);

    const refreshControlProps = useMemo(() => ({
        refreshing: isRefreshing,
        onRefresh: handleRefresh,
    }), [handleRefresh, isRefreshing]);

    const emptyComponent = useMemo(() => (
        <View style={styles.emptyContainer}>
            {activeTab === 'yatras' ? (
                <Tent size={80} color={colors.border} strokeWidth={1} />
            ) : (
                <Building2 size={80} color={colors.border} strokeWidth={1} />
            )}
            <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                {activeTab === 'yatras' ? 'No trips found' : 'No stays found'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {activeTab === 'yatras'
                    ? 'Create your own trip or try another search'
                    : 'Add your stay or try another search'}
            </Text>
            <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={handleCreatePress}
            >
                <Plus size={20} color="white" strokeWidth={2} />
                <Text style={styles.emptyButtonText}>
                    {activeTab === 'yatras' ? 'Create trip' : 'Add stay'}
                </Text>
            </TouchableOpacity>
        </View>
    ), [activeTab, colors.accent, colors.border, colors.textPrimary, colors.textSecondary, handleCreatePress]);

    const keyExtractor = useCallback((item: Yatra | Shelter) => (
        `${activeTab === 'yatras' ? 'yatra' : 'shelter'}-${item.id}`
    ), [activeTab]);

    const renderYatraCard = useCallback(({ item }: { item: Yatra }) => {
        if (!item || item.id === undefined) return null;

        return (
            <YatraCard
                item={item}
                language={i18n.language}
                onPress={handleYatraPress}
                colors={colors}
                reducedVisuals={reducedVisuals}
            />
        );
    }, [colors, handleYatraPress, i18n.language, reducedVisuals]);

    const renderShelterCard = useCallback(({ item }: { item: Shelter }) => {
        if (!item || item.id === undefined) return null;

        return (
            <ShelterCard
                item={item}
                language={i18n.language}
                onPress={handleShelterPress}
                colors={colors}
                reducedVisuals={reducedVisuals}
            />
        );
    }, [colors, handleShelterPress, i18n.language, reducedVisuals]);

    const listHeaderComponent = useMemo(() => (
        <>
            <GodModeStatusBanner />
            {renderHeader}
        </>
    ), [renderHeader]);

    if (isLoading && data.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {activeTab === 'yatras' ? (
                <TravelListComponent
                    data={yatras}
                    renderItem={renderYatraCard}
                    keyExtractor={keyExtractor}
                    ListHeaderComponent={listHeaderComponent}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl {...refreshControlProps} tintColor={colors.accent} />}
                    ListEmptyComponent={emptyComponent}
                    removeClippedSubviews={reducedVisuals}
                    initialNumToRender={listTuning.initialNumToRender}
                    maxToRenderPerBatch={listTuning.maxToRenderPerBatch}
                    windowSize={listTuning.windowSize}
                    updateCellsBatchingPeriod={listTuning.updateCellsBatchingPeriod}
                    estimatedItemSize={listTuning.estimatedItemSize}
                />
            ) : (
                <TravelListComponent
                    data={shelters}
                    renderItem={renderShelterCard}
                    keyExtractor={keyExtractor}
                    ListHeaderComponent={listHeaderComponent}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl {...refreshControlProps} tintColor={colors.accent} />}
                    ListEmptyComponent={emptyComponent}
                    removeClippedSubviews={reducedVisuals}
                    initialNumToRender={listTuning.initialNumToRender}
                    maxToRenderPerBatch={listTuning.maxToRenderPerBatch}
                    windowSize={listTuning.windowSize}
                    updateCellsBatchingPeriod={listTuning.updateCellsBatchingPeriod}
                    estimatedItemSize={listTuning.estimatedItemSize}
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
    cardImageReduced: {
        height: 136,
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
