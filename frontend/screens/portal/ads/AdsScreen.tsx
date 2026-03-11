import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { adsService } from '../../../services/adsService';
import {
    Ad,
    AdCategory,
    AdType,
    FestivalCalendarResponse,
    FestivalFeedPeriod,
    FestivalFeedSource,
    FestivalItem,
} from '../../../types/ads';
import { RootStackParamList } from '../../../types/navigation';
import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';

import { AdCard } from '../../../components/ads/AdCard';
import { CategoryPills } from '../../../components/ads/CategoryPills';
import { AdTabSwitcher } from '../../../components/ads/AdTabSwitcher';
import { AdsSectionMode, FestivalSectionSwitch } from '../../../components/ads/FestivalSectionSwitch';
import { FestivalMonthCalendar } from '../../../components/ads/FestivalMonthCalendar';
import { FestivalAgendaList } from '../../../components/ads/FestivalAgendaList';
import { FestivalFeedList } from '../../../components/ads/FestivalFeedList';
import { FestivalViewMode, FestivalViewSwitch } from '../../../components/ads/FestivalViewSwitch';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import {
    Search,
    X,
    SlidersHorizontal,
    Inbox,
    Plus,
    ArrowLeft,
} from 'lucide-react-native';

const DEFAULT_PERIOD: FestivalFeedPeriod = 'upcoming';
const DEFAULT_SOURCE: FestivalFeedSource = 'all';

export const AdsScreen: React.FC = () => {
    const { t } = useTranslation();
    const { isDarkMode, vTheme } = useSettings();
    const { user } = useUser();
    const colors = vTheme.colors;
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [activeTab, setActiveTab] = useState<AdType>('looking');
    const [selectedCategory, setSelectedCategory] = useState<AdCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [sectionMode, setSectionMode] = useState<AdsSectionMode>('ads');
    const [festivalViewMode, setFestivalViewMode] = useState<FestivalViewMode>('feed');

    const [ads, setAds] = useState<Ad[]>([]);
    const [adsLoading, setAdsLoading] = useState(true);
    const [adsRefreshing, setAdsRefreshing] = useState(false);
    const [adsHasMore, setAdsHasMore] = useState(true);
    const adsPageRef = useRef(1);

    const [festivalCalendar, setFestivalCalendar] = useState<FestivalCalendarResponse | null>(null);
    const [festivalItems, setFestivalItems] = useState<FestivalItem[]>([]);
    const [festivalMonthDate, setFestivalMonthDate] = useState<Date>(new Date());
    const [selectedFestivalDate, setSelectedFestivalDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [festivalCalendarLoading, setFestivalCalendarLoading] = useState(false);
    const [festivalCalendarRefreshing, setFestivalCalendarRefreshing] = useState(false);

    const [festivalFeedItems, setFestivalFeedItems] = useState<FestivalItem[]>([]);
    const [festivalFeedLoading, setFestivalFeedLoading] = useState(true);
    const [festivalFeedRefreshing, setFestivalFeedRefreshing] = useState(false);
    const [festivalFeedHasMore, setFestivalFeedHasMore] = useState(true);
    const festivalFeedPageRef = useRef(1);

    const [festivalCityFilter, setFestivalCityFilter] = useState('');
    const [festivalSourceFilter, setFestivalSourceFilter] = useState<FestivalFeedSource>(DEFAULT_SOURCE);
    const [festivalPeriodFilter, setFestivalPeriodFilter] = useState<FestivalFeedPeriod>(DEFAULT_PERIOD);
    const [festivalCities, setFestivalCities] = useState<Array<{ value: string; count: number }>>([]);

    const [festivalFiltersVisible, setFestivalFiltersVisible] = useState(false);
    const [draftFestivalCity, setDraftFestivalCity] = useState('');
    const [draftFestivalSource, setDraftFestivalSource] = useState<FestivalFeedSource>(DEFAULT_SOURCE);
    const [draftFestivalPeriod, setDraftFestivalPeriod] = useState<FestivalFeedPeriod>(DEFAULT_PERIOD);

    const monthKey = useCallback((date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const fetchAds = useCallback(async (reset = false) => {
        try {
            if (reset) {
                setAdsLoading(true);
                adsPageRef.current = 1;
            }

            const currentPage = reset ? 1 : adsPageRef.current;
            let response;

            if (activeTab === 'my') {
                const myAds = await adsService.getMyAds();
                response = {
                    ads: myAds,
                    total: myAds.length,
                    page: 1,
                    totalPages: 1
                };
            } else {
                response = await adsService.getAds({
                    adType: activeTab,
                    category: selectedCategory === 'all' ? undefined : selectedCategory,
                    search: searchQuery,
                    page: currentPage,
                    limit: 10,
                    status: 'active'
                });
            }

            if (reset) {
                setAds(response.ads);
            } else {
                setAds(prev => [...prev, ...response.ads]);
            }

            setAdsHasMore(currentPage < response.totalPages);
            adsPageRef.current = currentPage + 1;
        } catch (error) {
            console.error('Failed to load ads', error);
        } finally {
            setAdsLoading(false);
            setAdsRefreshing(false);
        }
    }, [activeTab, selectedCategory, searchQuery]);

    const fetchFestivalCalendarData = useCallback(async () => {
        try {
            setFestivalCalendarLoading(true);
            const month = monthKey(festivalMonthDate);
            const [calendarResponse, agendaResponse] = await Promise.all([
                adsService.getFestivalCalendar(month, {
                    search: searchQuery || undefined,
                    includeSadhu: true,
                }),
                adsService.getFestivalsByDate(selectedFestivalDate, {
                    search: searchQuery || undefined,
                    includeSadhu: true,
                    page: 1,
                    limit: 50,
                }),
            ]);
            setFestivalCalendar(calendarResponse);
            setFestivalItems(agendaResponse.items || []);
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 404) {
                setFestivalCalendar({ month: monthKey(festivalMonthDate), days: [] });
                setFestivalItems([]);
            } else {
                console.warn('Failed to load festivals calendar', error?.message || error);
            }
        } finally {
            setFestivalCalendarLoading(false);
            setFestivalCalendarRefreshing(false);
        }
    }, [festivalMonthDate, monthKey, searchQuery, selectedFestivalDate]);

    const fetchFestivalFeed = useCallback(async (reset = false) => {
        try {
            if (reset) {
                setFestivalFeedLoading(true);
                festivalFeedPageRef.current = 1;
            }

            const currentPage = reset ? 1 : festivalFeedPageRef.current;
            const response = await adsService.getFestivalFeed({
                search: searchQuery || undefined,
                city: festivalCityFilter || undefined,
                source: festivalSourceFilter,
                period: festivalPeriodFilter,
                includeSadhu: true,
                page: currentPage,
                limit: 20,
            });

            if (reset) {
                setFestivalFeedItems(response.items || []);
            } else {
                setFestivalFeedItems(prev => [...prev, ...(response.items || [])]);
            }

            setFestivalFeedHasMore(currentPage < response.totalPages);
            festivalFeedPageRef.current = currentPage + 1;
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 404) {
                setFestivalFeedItems([]);
                setFestivalFeedHasMore(false);
            } else {
                console.warn('Failed to load festival feed', error?.message || error);
            }
        } finally {
            setFestivalFeedLoading(false);
            setFestivalFeedRefreshing(false);
        }
    }, [festivalCityFilter, festivalPeriodFilter, festivalSourceFilter, searchQuery]);

    const fetchFestivalFacets = useCallback(async () => {
        try {
            const response = await adsService.getFestivalFacets({
                search: searchQuery || undefined,
                source: festivalSourceFilter,
                period: festivalPeriodFilter,
                includeSadhu: true,
            });
            setFestivalCities(response.cities || []);
        } catch (error: any) {
            if (error?.response?.status !== 404) {
                console.warn('Failed to load festival facets', error?.message || error);
            }
            setFestivalCities([]);
        }
    }, [festivalPeriodFilter, festivalSourceFilter, searchQuery]);

    useEffect(() => {
        if (sectionMode === 'ads') {
            void fetchAds(true);
        }
    }, [fetchAds, sectionMode]);

    useEffect(() => {
        if (sectionMode === 'festivals' && festivalViewMode === 'calendar') {
            void fetchFestivalCalendarData();
        }
    }, [fetchFestivalCalendarData, festivalViewMode, sectionMode]);

    useEffect(() => {
        if (sectionMode === 'festivals' && festivalViewMode === 'feed') {
            void fetchFestivalFeed(true);
            void fetchFestivalFacets();
        }
    }, [fetchFestivalFacets, fetchFestivalFeed, festivalViewMode, sectionMode]);

    const onRefresh = () => {
        if (sectionMode === 'ads') {
            setAdsRefreshing(true);
            void fetchAds(true);
            return;
        }

        if (festivalViewMode === 'calendar') {
            setFestivalCalendarRefreshing(true);
            void fetchFestivalCalendarData();
            return;
        }

        setFestivalFeedRefreshing(true);
        void fetchFestivalFeed(true);
    };

    const loadMore = () => {
        if (sectionMode === 'ads') {
            if (!adsLoading && adsHasMore) {
                void fetchAds();
            }
            return;
        }

        if (festivalViewMode === 'feed' && !festivalFeedLoading && festivalFeedHasMore) {
            void fetchFestivalFeed();
        }
    };

    const handleFavorite = async (ad: Ad) => {
        try {
            const result = await adsService.toggleFavorite(ad.ID);
            setAds(prev => prev.map(item =>
                item.ID === ad.ID ? { ...item, isFavorite: result.isFavorite } : item
            ));
        } catch (error) {
            console.error('Error toggling favorite', error);
        }
    };

    const handleFestivalDetails = useCallback((item: FestivalItem) => {
        if (typeof item.adId === 'number') {
            navigation.navigate('AdDetail', { adId: item.adId });
            return;
        }
        if (typeof item.channelId === 'number') {
            navigation.navigate('ChannelDetails', { channelId: item.channelId, source: 'sadhu_sanga' });
            return;
        }
        if (typeof item.serviceId === 'number') {
            navigation.navigate('ServiceDetail', { serviceId: item.serviceId });
            return;
        }
        Alert.alert(t('common.error'), t('ads.festivals.cannotOpenDetails'));
    }, [navigation, t]);

    const handleFestivalOpenMap = useCallback(async (item: FestivalItem) => {
        const hasCoords = typeof item.venueLat === 'number' && typeof item.venueLng === 'number';
        const query = hasCoords
            ? `${item.venueLat},${item.venueLng}`
            : (item.venueAddress || item.city || '').trim();
        if (!query) {
            Alert.alert(t('common.error'), t('ads.festivals.mapNotAvailable'));
            return;
        }
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        try {
            const supported = await Linking.canOpenURL(mapUrl);
            if (!supported) {
                Alert.alert(t('common.error'), t('ads.festivals.mapNotAvailable'));
                return;
            }
            await Linking.openURL(mapUrl);
        } catch {
            Alert.alert(t('common.error'), t('ads.festivals.mapNotAvailable'));
        }
    }, [t]);

    const handleSearchSubmit = () => {
        if (sectionMode === 'ads') {
            void fetchAds(true);
            return;
        }
        if (festivalViewMode === 'calendar') {
            void fetchFestivalCalendarData();
            return;
        }
        void fetchFestivalFeed(true);
        void fetchFestivalFacets();
    };

    const handleSearchClear = () => {
        setSearchQuery('');
    };

    const openFestivalFilters = () => {
        setDraftFestivalCity(festivalCityFilter);
        setDraftFestivalSource(festivalSourceFilter);
        setDraftFestivalPeriod(festivalPeriodFilter);
        setFestivalFiltersVisible(true);
    };

    const applyFestivalFilters = () => {
        setFestivalCityFilter(draftFestivalCity);
        setFestivalSourceFilter(draftFestivalSource);
        setFestivalPeriodFilter(draftFestivalPeriod);
        setFestivalFiltersVisible(false);
    };

    const resetFestivalFilters = () => {
        setDraftFestivalCity('');
        setDraftFestivalSource(DEFAULT_SOURCE);
        setDraftFestivalPeriod(DEFAULT_PERIOD);
    };

    const clearAllFeedFilters = () => {
        setSearchQuery('');
        setFestivalCityFilter('');
        setFestivalSourceFilter(DEFAULT_SOURCE);
        setFestivalPeriodFilter(DEFAULT_PERIOD);
    };

    const handleBackToPortal = useCallback(() => {
        navigation.navigate('Portal');
    }, [navigation]);

    const hasActiveFeedFilters = useMemo(() => {
        return (
            searchQuery.trim().length > 0
            || festivalCityFilter.trim().length > 0
            || festivalSourceFilter !== DEFAULT_SOURCE
            || festivalPeriodFilter !== DEFAULT_PERIOD
        );
    }, [festivalCityFilter, festivalPeriodFilter, festivalSourceFilter, searchQuery]);

    const festivalCityOptions = useMemo(() => {
        const normalized = new Set<string>();
        const options: Array<{ value: string; count: number }> = [];
        const profileCity = String(user?.city || '').trim();
        if (profileCity) {
            const key = profileCity.toLowerCase();
            normalized.add(key);
            options.push({ value: profileCity, count: 0 });
        }
        (festivalCities || []).forEach((item) => {
            const value = String(item.value || '').trim();
            const key = value.toLowerCase();
            if (!value || normalized.has(key)) {
                return;
            }
            normalized.add(key);
            options.push({ value, count: Number(item.count) || 0 });
        });
        return options;
    }, [festivalCities, user?.city]);

    const sourceOptions: Array<{ key: FestivalFeedSource; label: string }> = [
        { key: 'all', label: t('ads.festivals.source.all') },
        { key: 'ad', label: t('ads.festivals.source.ad') },
        { key: 'sadhu', label: t('ads.festivals.source.sadhu') },
    ];

    const periodOptions: Array<{ key: FestivalFeedPeriod; label: string }> = [
        { key: 'today', label: t('ads.festivals.period.today') },
        { key: '7d', label: t('ads.festivals.period.7d') },
        { key: '30d', label: t('ads.festivals.period.30d') },
        { key: 'upcoming', label: t('ads.festivals.period.upcoming') },
    ];

    return (
        <ProtectedScreen>
            <View style={[styles.container, { backgroundColor: isDarkMode ? vTheme.colors.background : colors.background }]}>
                <View style={[styles.header, { backgroundColor: isDarkMode ? vTheme.colors.background : colors.background }]}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={[styles.portalBackButton, { backgroundColor: isDarkMode ? '#333' : '#fff', borderColor: 'rgba(0,0,0,0.08)' }]}
                            onPress={handleBackToPortal}
                            activeOpacity={0.85}
                        >
                            <ArrowLeft size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#333' : '#fff', borderColor: 'rgba(0,0,0,0.1)' }]}>
                        <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: isDarkMode ? '#fff' : colors.text }]}
                            placeholder={sectionMode === 'ads' ? t('ads.searchPlaceholder') : t('ads.festivals.searchPlaceholder')}
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearchSubmit}
                        />
                        {searchQuery !== '' && (
                            <TouchableOpacity onPress={handleSearchClear}>
                                <X size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.filterBtn,
                                sectionMode === 'festivals' && festivalViewMode !== 'feed' && styles.filterBtnDisabled,
                            ]}
                            onPress={() => {
                                if (sectionMode === 'ads') {
                                    navigation.navigate('AdsFilters');
                                    return;
                                }
                                if (festivalViewMode === 'feed') {
                                    openFestivalFilters();
                                }
                            }}
                            disabled={sectionMode === 'festivals' && festivalViewMode !== 'feed'}
                        >
                            <SlidersHorizontal size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <FestivalSectionSwitch mode={sectionMode} onChange={setSectionMode} />

                {sectionMode === 'ads' ? (
                    <>
                        <AdTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
                        <GodModeStatusBanner />

                        <CategoryPills selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

                        <FlatList
                            data={ads}
                            keyExtractor={item => item.ID.toString()}
                            renderItem={({ item }) => (
                                <AdCard
                                    ad={item}
                                    onPress={() => navigation.navigate('AdDetail', { adId: item.ID })}
                                    onFavorite={() => handleFavorite(item)}
                                    onEdit={() => navigation.navigate('CreateAd', { adId: item.ID })}
                                />
                            )}
                            contentContainerStyle={styles.list}
                            refreshControl={
                                <RefreshControl refreshing={adsRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                            }
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.5}
                            ListEmptyComponent={
                                !adsLoading ? (
                                    <View style={styles.emptyContainer}>
                                        <Inbox size={64} color={colors.textSecondary} opacity={0.3} style={{ marginBottom: 16 }} />
                                        <Text style={{ color: colors.textSecondary }}>{t('ads.noAds')}</Text>
                                    </View>
                                ) : null
                            }
                            ListFooterComponent={
                                adsLoading && !adsRefreshing ? <View style={styles.listFooter}><Text style={{ color: colors.textSecondary }}>{t('common.loading') || 'Loading...'}</Text></View> : null
                            }
                        />
                    </>
                ) : (
                    <>
                        <FestivalViewSwitch mode={festivalViewMode} onChange={setFestivalViewMode} />

                        {festivalViewMode === 'feed' ? (
                            <FestivalFeedList
                                items={festivalFeedItems}
                                loading={festivalFeedLoading}
                                refreshing={festivalFeedRefreshing}
                                hasMore={festivalFeedHasMore}
                                hasActiveFilters={hasActiveFeedFilters}
                                onRefresh={onRefresh}
                                onEndReached={loadMore}
                                onOpenDetails={handleFestivalDetails}
                                onOpenMap={handleFestivalOpenMap}
                                onResetFilters={clearAllFeedFilters}
                            />
                        ) : (
                            <ScrollView
                                refreshControl={
                                    <RefreshControl
                                        refreshing={festivalCalendarRefreshing}
                                        onRefresh={onRefresh}
                                        colors={[colors.primary]}
                                    />
                                }
                            >
                                <FestivalMonthCalendar
                                    monthDate={festivalMonthDate}
                                    selectedDate={selectedFestivalDate}
                                    calendar={festivalCalendar}
                                    onSelectDate={setSelectedFestivalDate}
                                    onPrevMonth={() => {
                                        const next = new Date(festivalMonthDate.getFullYear(), festivalMonthDate.getMonth() - 1, 1);
                                        setFestivalMonthDate(next);
                                        setSelectedFestivalDate(new Date(next.getFullYear(), next.getMonth(), 1).toISOString().slice(0, 10));
                                    }}
                                    onNextMonth={() => {
                                        const next = new Date(festivalMonthDate.getFullYear(), festivalMonthDate.getMonth() + 1, 1);
                                        setFestivalMonthDate(next);
                                        setSelectedFestivalDate(new Date(next.getFullYear(), next.getMonth(), 1).toISOString().slice(0, 10));
                                    }}
                                />
                                <FestivalAgendaList
                                    items={festivalItems}
                                    loading={festivalCalendarLoading}
                                    onOpenAd={(adId) => navigation.navigate('AdDetail', { adId })}
                                />
                            </ScrollView>
                        )}
                    </>
                )}

                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.gradientStart }]}
                    onPress={() => navigation.navigate('CreateAd', sectionMode === 'festivals' ? { initialCategory: 'events' } : undefined)}
                >
                    <Plus size={32} color="#fff" />
                </TouchableOpacity>

                <Modal
                    visible={festivalFiltersVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setFestivalFiltersVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setFestivalFiltersVisible(false)} />
                        <View style={[styles.modalCard, { backgroundColor: colors.surface || '#fff' }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ads.festivals.feedFiltersTitle')}</Text>

                            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('ads.filters.city')}</Text>
                            <ScrollView style={styles.modalCityList} contentContainerStyle={styles.modalCityListContent}>
                                <TouchableOpacity
                                    style={[
                                        styles.modalOptionButton,
                                        !draftFestivalCity && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                                    ]}
                                    onPress={() => setDraftFestivalCity('')}
                                >
                                    <Text style={[styles.modalOptionText, { color: colors.text }]}>{t('ads.festivals.cityAll')}</Text>
                                </TouchableOpacity>
                                {festivalCityOptions.map((city) => (
                                    <TouchableOpacity
                                        key={city.value.toLowerCase()}
                                        style={[
                                            styles.modalOptionButton,
                                            draftFestivalCity.toLowerCase() === city.value.toLowerCase()
                                                ? { borderColor: colors.primary, backgroundColor: colors.primary + '18' }
                                                : null,
                                        ]}
                                        onPress={() => setDraftFestivalCity(city.value)}
                                    >
                                        <Text style={[styles.modalOptionText, { color: colors.text }]}>
                                            {city.value}
                                            {city.count > 0 ? ` (${city.count})` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('ads.festivals.sourceLabel')}</Text>
                            <View style={styles.optionRow}>
                                {sourceOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.choiceChip,
                                            draftFestivalSource === option.key
                                                ? { borderColor: colors.primary, backgroundColor: colors.primary + '18' }
                                                : null,
                                        ]}
                                        onPress={() => setDraftFestivalSource(option.key)}
                                    >
                                        <Text style={[styles.choiceChipText, { color: colors.text }]}>{option.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t('ads.festivals.periodLabel')}</Text>
                            <View style={styles.optionRow}>
                                {periodOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.choiceChip,
                                            draftFestivalPeriod === option.key
                                                ? { borderColor: colors.primary, backgroundColor: colors.primary + '18' }
                                                : null,
                                        ]}
                                        onPress={() => setDraftFestivalPeriod(option.key)}
                                    >
                                        <Text style={[styles.choiceChipText, { color: colors.text }]}>{option.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={[styles.modalActionButton, { borderColor: colors.textSecondary }]}
                                    onPress={resetFestivalFilters}
                                >
                                    <Text style={[styles.modalActionText, { color: colors.textSecondary }]}>{t('ads.filters.reset')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalActionButton, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                                    onPress={applyFestivalFilters}
                                >
                                    <Text style={[styles.modalActionText, { color: '#fff' }]}>{t('ads.filters.apply')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    portalBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    filterBtn: {
        padding: 8,
        marginLeft: 4,
    },
    filterBtnDisabled: {
        opacity: 0.45,
    },
    list: {
        paddingTop: 8,
        paddingBottom: 80,
    },
    listFooter: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    modalCard: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 28,
        maxHeight: '78%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 6,
    },
    modalCityList: {
        maxHeight: 160,
    },
    modalCityListContent: {
        gap: 8,
        paddingBottom: 6,
    },
    modalOptionButton: {
        borderWidth: 1,
        borderColor: '#DADADA',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    modalOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    choiceChip: {
        borderWidth: 1,
        borderColor: '#DADADA',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    choiceChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    modalActionsRow: {
        marginTop: 16,
        flexDirection: 'row',
        gap: 10,
    },
    modalActionButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 11,
    },
    modalActionText: {
        fontSize: 14,
        fontWeight: '800',
    },
});
