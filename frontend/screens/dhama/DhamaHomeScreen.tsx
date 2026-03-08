import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MapPinned, Search } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { RootStackParamList } from '../../types/navigation';
import { DhamaCollection, HolyPlaceFiltersResponse, HolyPlaceSummary } from '../../types/dhama';
import { dhamaService } from '../../services/dhamaService';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { useSettings } from '../../context/SettingsContext';
import { DhamaBackButton } from './DhamaBackButton';
import { DhamaSkeletonBlock } from './DhamaSkeleton';

type Props = NativeStackScreenProps<RootStackParamList, 'DhamaHome'>;

const ListSeparator = () => <View style={styles.separator} />;
const HorizontalSeparator = () => <View style={styles.horizontalSeparator} />;

const LoadingPillRow: React.FC<{ color: string }> = ({ color }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFilterRow}>
    {Array.from({ length: 4 }).map((_, index) => (
      <DhamaSkeletonBlock
        key={`pill-${index}`}
        color={color}
        style={styles.quickFilterSkeletonChip}
      />
    ))}
  </ScrollView>
);

const humanizeDhamaFilterValue = (value: string) => value
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (match) => match.toUpperCase());

export const DhamaHomeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();
  const [loading, setLoading] = useState(true);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<HolyPlaceSummary[]>([]);
  const [collections, setCollections] = useState<DhamaCollection[]>([]);
  const [filters, setFilters] = useState<HolyPlaceFiltersResponse>({ placeTypes: [], states: [], cities: [], traditions: [], types: [] });
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null);
  const [selectedPlaceType, setSelectedPlaceType] = useState<string | null>(null);
  const [placesError, setPlacesError] = useState(false);
  const [collectionsError, setCollectionsError] = useState(false);
  const [filtersError, setFiltersError] = useState(false);

  useEffect(() => {
    if (route.params?.collectionSlug) {
      setSelectedCollectionSlug(route.params.collectionSlug);
    }
  }, [route.params?.collectionSlug]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setPlacesError(false);
    dhamaService.getPlaces({
      search,
      collection: selectedCollectionSlug || undefined,
      state: selectedState || undefined,
      tradition: selectedTradition || undefined,
      type: selectedPlaceType || undefined,
      limit: 50,
    })
      .then((payload) => {
        if (mounted) {
          setPlaces(payload.places || []);
        }
      })
      .catch((error) => {
        console.warn('[DhamaHome] failed to load places', error);
        if (mounted) {
          setPlaces([]);
          setPlacesError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey, search, selectedCollectionSlug, selectedPlaceType, selectedState, selectedTradition]);

  useEffect(() => {
    let mounted = true;
    setCollectionsLoading(true);
    setCollectionsError(false);
    dhamaService.getCollections()
      .then((payload) => {
        if (mounted) {
          setCollections(payload.collections || []);
        }
      })
      .catch((error) => {
        console.warn('[DhamaHome] failed to load collections', error);
        if (mounted) {
          setCollections([]);
          setCollectionsError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setCollectionsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let mounted = true;
    setFiltersLoading(true);
    setFiltersError(false);
    dhamaService.getFilters()
      .then((payload) => {
        if (mounted) {
          setFilters(payload);
        }
      })
      .catch((error) => {
        console.warn('[DhamaHome] failed to load filters', error);
        if (mounted) {
          setFilters({ placeTypes: [], states: [], cities: [], traditions: [], types: [] });
          setFiltersError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setFiltersLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const featured = useMemo(() => places.filter((place) => place.isFeatured), [places]);
  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.slug === selectedCollectionSlug) || null,
    [collections, selectedCollectionSlug],
  );
  const stateOptions = useMemo(() => filters.states.slice(0, 8), [filters.states]);
  const traditionOptions = useMemo(() => filters.traditions.slice(0, 8), [filters.traditions]);
  const placeTypeOptions = useMemo(() => {
    const source = filters.placeTypes.length > 0 ? filters.placeTypes : filters.types;
    return source.slice(0, 8);
  }, [filters.placeTypes, filters.types]);
  const hasActiveQuickFilters = Boolean(selectedState || selectedTradition || selectedPlaceType);
  const hasAnyActiveFilter = Boolean(search.trim() || selectedCollectionSlug || hasActiveQuickFilters);

  const renderPlaceCard = (item: HolyPlaceSummary, variant: 'featured' | 'list') => (
    <TouchableOpacity
      onPress={() => navigation.navigate('HolyPlaceDetail', { slug: item.slug })}
      style={[
        styles.card,
        variant === 'featured' ? styles.featuredCard : styles.listCard,
        { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider },
      ]}
      activeOpacity={0.9}
    >
      {item.heroImageUrl ? <Image source={{ uri: item.heroImageUrl }} style={styles.cardImage} /> : null}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: vTheme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardMeta, { color: vTheme.colors.textSecondary }]}>{item.city}, {item.state}</Text>
        <Text numberOfLines={3} style={[styles.cardDescription, { color: vTheme.colors.textSecondary }]}>
          {item.shortDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCollectionCard = ({ item }: { item: DhamaCollection }) => {
    const isActive = item.slug === selectedCollectionSlug;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('DhamaCollectionDetail', { slug: item.slug })}
        style={[
          styles.collectionCard,
          {
            backgroundColor: vTheme.colors.surfaceElevated,
            borderColor: isActive ? vTheme.colors.primary : vTheme.colors.divider,
          },
        ]}
        activeOpacity={0.92}
      >
        {item.heroImageUrl ? <Image source={{ uri: item.heroImageUrl }} style={styles.collectionImage} /> : null}
        <View style={styles.collectionBody}>
          <View style={styles.collectionTitleRow}>
            <Text style={[styles.collectionTitle, { color: vTheme.colors.text }]}>{item.title}</Text>
            {item.isFeatured ? <Text style={[styles.collectionMetaBadge, { color: vTheme.colors.primary }]}>★</Text> : null}
          </View>
          <Text numberOfLines={2} style={[styles.collectionDescription, { color: vTheme.colors.textSecondary }]}>
            {item.description}
          </Text>
          <Text style={[styles.collectionCount, { color: isActive ? vTheme.colors.primary : vTheme.colors.textSecondary }]}>
            {item.placesCount} • {t('dhama.allPlaces')}
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedCollectionSlug((current) => (current === item.slug ? null : item.slug))}
            style={[styles.collectionFilterButton, { borderColor: isActive ? vTheme.colors.primary : vTheme.colors.divider }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.collectionFilterButtonText, { color: isActive ? vTheme.colors.primary : vTheme.colors.textSecondary }]}>
              {isActive ? t('dhama.clearCollectionFilter') : t('dhama.filterByCollection')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedCard = ({ item }: { item: HolyPlaceSummary }) => renderPlaceCard(item, 'featured');
  const renderListCard = ({ item }: { item: HolyPlaceSummary }) => renderPlaceCard(item, 'list');
  const getQuickFilterLabel = (kind: 'state' | 'tradition' | 'placeType', rawValue: string) => {
    if (kind === 'state') {
      return rawValue;
    }

    const normalizedValue = rawValue.replace(/_/g, '-');
    const fallback = humanizeDhamaFilterValue(rawValue);
    const key = kind === 'tradition'
      ? `dhama.filterValues.tradition.${normalizedValue}`
      : `dhama.filterValues.placeType.${normalizedValue}`;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const renderQuickChip = (key: string, label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={[
        styles.quickFilterChip,
        {
          backgroundColor: vTheme.colors.surfaceElevated,
          borderColor: active ? vTheme.colors.primary : vTheme.colors.divider,
        },
      ]}
      activeOpacity={0.88}
    >
      <Text style={[styles.quickFilterChipText, { color: active ? vTheme.colors.primary : vTheme.colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
  const resetAllFilters = () => {
    setSearch('');
    setSelectedCollectionSlug(null);
    setSelectedState(null);
    setSelectedTradition(null);
    setSelectedPlaceType(null);
  };
  const retryAll = () => setRefreshKey((current) => current + 1);
  const skeletonColor = vTheme.colors.divider;

  return (
    <ScreenScaffold>
      <FlatList
        data={places}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderListCard}
        contentContainerStyle={styles.container}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={(
          <>
            <LinearGradient
              colors={['#1C214A', '#8D4B24', '#E4B66B']}
              start={{ x: 0.04, y: 0.08 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroShell}
            >
              <View style={styles.heroGlowTop} />
              <View style={styles.heroGlowBottom} />
              <View style={styles.heroTopBar}>
                <DhamaBackButton navigation={navigation} />
              </View>
              <View style={styles.heroContent}>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.heroEyebrow}>{selectedCollection ? t('dhama.collectionLabel') : t('dhama.homeTitle')}</Text>
                  <Text style={styles.heroTitle}>{selectedCollection ? selectedCollection.title : t('dhama.homeTitle')}</Text>
                  <Text style={styles.heroSubtitle}>
                    {selectedCollection?.description || t('dhama.homeSubtitle')}
                  </Text>
                </View>

                <View style={styles.heroFooter}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DhamaMap', selectedCollectionSlug ? { collectionSlug: selectedCollectionSlug } : undefined)}
                    style={styles.heroMapButton}
                    activeOpacity={0.9}
                  >
                    <MapPinned size={18} color="#1F1A14" />
                    <Text style={styles.heroMapButtonText}>{t('dhama.openMap')}</Text>
                  </TouchableOpacity>

                  {selectedCollection ? (
                    <View style={styles.heroActiveChip}>
                      <Text style={styles.heroActiveChipText}>{t('dhama.filterByCollection')}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </LinearGradient>

            <View style={[styles.searchBox, { backgroundColor: vTheme.colors.surface, borderColor: vTheme.colors.divider }]}>
              <Search size={18} color={vTheme.colors.textSecondary} />
              <TextInput
                placeholder={t('dhama.searchPlaceholder')}
                placeholderTextColor={vTheme.colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, { color: vTheme.colors.text }]}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.filterSectionHeader}>
                <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.quickFilters')}</Text>
                {hasActiveQuickFilters ? (
                  <TouchableOpacity onPress={() => {
                    setSelectedState(null);
                    setSelectedTradition(null);
                    setSelectedPlaceType(null);
                  }}>
                    <Text style={[styles.clearFiltersText, { color: vTheme.colors.primary }]}>{t('dhama.clearAllFilters')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {filtersLoading ? (
                <View style={styles.quickFilterGroups}>
                  <View style={styles.quickFilterGroup}>
                    <DhamaSkeletonBlock color={skeletonColor} style={styles.quickFilterSkeletonLabel} />
                    <LoadingPillRow color={skeletonColor} />
                  </View>
                  <View style={styles.quickFilterGroup}>
                    <DhamaSkeletonBlock color={skeletonColor} style={styles.quickFilterSkeletonLabel} />
                    <LoadingPillRow color={skeletonColor} />
                  </View>
                </View>
              ) : filtersError ? (
                <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
                  <Text style={[styles.feedbackTitle, { color: vTheme.colors.text }]}>{t('dhama.filtersErrorTitle')}</Text>
                  <Text style={[styles.feedbackBody, { color: vTheme.colors.textSecondary }]}>{t('dhama.filtersErrorBody')}</Text>
                  <TouchableOpacity onPress={retryAll} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
                    <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('common.retry', 'Retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.quickFilterGroups}>
                  {stateOptions.length > 0 ? (
                    <View style={styles.quickFilterGroup}>
                      <Text style={[styles.quickFilterLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.filterLabels.region')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFilterRow}>
                        {stateOptions.map((state) => renderQuickChip(`state-${state}`, state, selectedState === state, () => {
                          setSelectedState((current) => (current === state ? null : state));
                        }))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {traditionOptions.length > 0 ? (
                    <View style={styles.quickFilterGroup}>
                      <Text style={[styles.quickFilterLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.filterLabels.tradition')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFilterRow}>
                        {traditionOptions.map((tradition) => renderQuickChip(
                          `tradition-${tradition}`,
                          getQuickFilterLabel('tradition', tradition),
                          selectedTradition === tradition,
                          () => {
                          setSelectedTradition((current) => (current === tradition ? null : tradition));
                          },
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {placeTypeOptions.length > 0 ? (
                    <View style={styles.quickFilterGroup}>
                      <Text style={[styles.quickFilterLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.filterLabels.placeType')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFilterRow}>
                        {placeTypeOptions.map((placeType) => renderQuickChip(
                          `placeType-${placeType}`,
                          getQuickFilterLabel('placeType', placeType),
                          selectedPlaceType === placeType,
                          () => {
                          setSelectedPlaceType((current) => (current === placeType ? null : placeType));
                          },
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            {(collectionsLoading || collections.length > 0) ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.collections')}</Text>
                {selectedCollection?.description ? (
                  <Text style={[styles.sectionCaption, { color: vTheme.colors.textSecondary }]}>{selectedCollection.description}</Text>
                ) : null}
                {collectionsLoading ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionListContent}>
                    {Array.from({ length: 2 }).map((_, index) => (
                      <View
                        key={`collection-skeleton-${index}`}
                        style={[
                          styles.collectionCard,
                          styles.collectionSkeletonCard,
                          { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider },
                        ]}
                      >
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.collectionImage} />
                        <View style={styles.collectionBody}>
                          <DhamaSkeletonBlock color={skeletonColor} style={styles.collectionSkeletonTitle} />
                          <DhamaSkeletonBlock color={skeletonColor} style={styles.collectionSkeletonLine} />
                          <DhamaSkeletonBlock color={skeletonColor} style={styles.collectionSkeletonLineShort} />
                          <DhamaSkeletonBlock color={skeletonColor} style={styles.collectionSkeletonMeta} />
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : collectionsError ? (
                  <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
                    <Text style={[styles.feedbackTitle, { color: vTheme.colors.text }]}>{t('dhama.collectionsErrorTitle')}</Text>
                    <Text style={[styles.feedbackBody, { color: vTheme.colors.textSecondary }]}>{t('dhama.collectionsErrorBody')}</Text>
                    <TouchableOpacity onPress={retryAll} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
                      <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('common.retry', 'Retry')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={collections}
                    horizontal
                    keyExtractor={(item) => `collection-${item.id}`}
                    renderItem={renderCollectionCard}
                    contentContainerStyle={styles.collectionListContent}
                    ItemSeparatorComponent={HorizontalSeparator}
                    showsHorizontalScrollIndicator={false}
                  />
                )}
              </View>
            ) : null}

            {featured.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.featured')}</Text>
                <FlatList
                  data={featured}
                  horizontal
                  keyExtractor={(item) => `featured-${item.id}`}
                  renderItem={renderFeaturedCard}
                  contentContainerStyle={styles.featuredListContent}
                  ItemSeparatorComponent={HorizontalSeparator}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            ) : null}

            {loading && featured.length === 0 ? (
              <View style={styles.section}>
                <DhamaSkeletonBlock color={skeletonColor} style={styles.sectionTitleSkeleton} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredListContent}>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <View
                      key={`featured-skeleton-${index}`}
                      style={[
                        styles.card,
                        styles.featuredCard,
                        { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider },
                      ]}
                    >
                      <DhamaSkeletonBlock color={skeletonColor} style={styles.cardImage} />
                      <View style={styles.cardBody}>
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardTitleSkeleton} />
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardMetaSkeleton} />
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardLineSkeleton} />
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardLineSkeletonShort} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>
                {selectedCollection ? selectedCollection.title : t('dhama.allPlaces')}
              </Text>
              {selectedCollection && selectedCollection.description ? (
                <Text style={[styles.sectionCaption, { color: vTheme.colors.textSecondary }]}>{selectedCollection.description}</Text>
              ) : null}
              {loading ? (
                <View style={styles.placeSkeletonList}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <View
                      key={`place-skeleton-${index}`}
                      style={[
                        styles.card,
                        styles.listCard,
                        { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider },
                      ]}
                    >
                      <DhamaSkeletonBlock color={skeletonColor} style={styles.cardImage} />
                      <View style={styles.cardBody}>
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardTitleSkeleton} />
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardMetaSkeleton} />
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardLineSkeleton} />
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardLineSkeleton} />
                        <DhamaSkeletonBlock color={skeletonColor} style={styles.cardLineSkeletonShort} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {!loading && placesError ? (
                <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
                  <Text style={[styles.feedbackTitle, { color: vTheme.colors.text }]}>{t('dhama.homeErrorTitle')}</Text>
                  <Text style={[styles.feedbackBody, { color: vTheme.colors.textSecondary }]}>{t('dhama.homeErrorBody')}</Text>
                  <TouchableOpacity onPress={retryAll} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
                    <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('common.retry', 'Retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </>
        )}
        ListEmptyComponent={loading || placesError ? null : (
          <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
            <Text style={[styles.feedbackTitle, { color: vTheme.colors.text }]}>
              {hasAnyActiveFilter ? t('dhama.emptyFilteredTitle') : t('dhama.empty')}
            </Text>
            <Text style={[styles.feedbackBody, { color: vTheme.colors.textSecondary }]}>
              {hasAnyActiveFilter ? t('dhama.emptyFilteredBody') : t('dhama.emptyDefaultBody')}
            </Text>
            <View style={styles.feedbackActions}>
              {hasAnyActiveFilter ? (
                <TouchableOpacity onPress={resetAllFilters} style={[styles.feedbackButton, { borderColor: vTheme.colors.divider }]}>
                  <Text style={[styles.feedbackButtonText, { color: vTheme.colors.text }]}>{t('dhama.clearAllFilters')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={retryAll} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
                <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('common.retry', 'Retry')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={<View style={styles.footerSpace} />}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 18 },
  heroShell: {
    minHeight: 270,
    borderRadius: 30,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    marginBottom: 4,
  },
  heroGlowTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(252, 215, 163, 0.18)',
    top: -92,
    right: -28,
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 25, 88, 0.26)',
    bottom: -88,
    left: -36,
  },
  heroTopBar: { alignItems: 'flex-start' },
  heroContent: { flex: 1, justifyContent: 'space-between', gap: 22, paddingTop: 18 },
  heroTextWrap: { gap: 10, maxWidth: '88%' },
  heroEyebrow: {
    color: 'rgba(255, 245, 228, 0.76)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: { color: '#FFF8EA', fontSize: 34, lineHeight: 38, fontWeight: '900', maxWidth: '92%' },
  heroSubtitle: { color: 'rgba(255, 244, 228, 0.9)', fontSize: 16, lineHeight: 23, maxWidth: '92%' },
  heroFooter: { gap: 12, alignItems: 'flex-start' },
  heroMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#F6E7C8',
  },
  heroMapButtonText: { color: '#1F1A14', fontWeight: '800', fontSize: 15 },
  heroActiveChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 249, 237, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 249, 237, 0.26)',
  },
  heroActiveChipText: { color: '#FFF1D5', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 6, fontSize: 16, lineHeight: 22, maxWidth: 320 },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14 },
  mapButtonText: { color: '#fff', fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, gap: 12, marginTop: 12 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  section: { gap: 14, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionCaption: { fontSize: 14, lineHeight: 21 },
  filterSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  clearFiltersText: { fontSize: 13, fontWeight: '700' },
  quickFilterGroups: { gap: 12 },
  quickFilterGroup: { gap: 8 },
  quickFilterLabel: { fontSize: 13, fontWeight: '600' },
  quickFilterRow: { gap: 10, paddingRight: 20 },
  quickFilterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  quickFilterChipText: { fontSize: 13, fontWeight: '600' },
  quickFilterSkeletonLabel: { width: 86, height: 12, borderRadius: 999 },
  quickFilterSkeletonChip: { width: 92, height: 36, borderRadius: 999 },
  feedbackCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  feedbackTitle: { fontSize: 17, fontWeight: '700' },
  feedbackBody: { fontSize: 14, lineHeight: 21 },
  feedbackActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  feedbackButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  feedbackButtonText: { fontSize: 13, fontWeight: '700' },
  collectionListContent: { paddingRight: 20, paddingTop: 2, paddingBottom: 4 },
  collectionCard: { width: 264, borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  collectionSkeletonCard: { justifyContent: 'flex-start' },
  collectionImage: { width: '100%', height: 132, backgroundColor: '#ddd' },
  collectionBody: { padding: 16, gap: 8 },
  collectionSkeletonTitle: { width: '82%', height: 20, borderRadius: 999 },
  collectionSkeletonLine: { width: '100%', height: 12, borderRadius: 999 },
  collectionSkeletonLineShort: { width: '72%', height: 12, borderRadius: 999 },
  collectionSkeletonMeta: { width: 94, height: 12, borderRadius: 999, marginTop: 6 },
  collectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  collectionTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  collectionMetaBadge: { fontSize: 18, fontWeight: '800' },
  collectionDescription: { fontSize: 14, lineHeight: 21 },
  collectionCount: { fontSize: 13, fontWeight: '600' },
  collectionFilterButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginTop: 2 },
  collectionFilterButtonText: { fontSize: 12, fontWeight: '700' },
  featuredListContent: { paddingRight: 20, paddingTop: 2, paddingBottom: 4 },
  card: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  featuredCard: { width: 308 },
  listCard: { width: '100%' },
  cardImage: { width: '100%', height: 172, backgroundColor: '#ddd' },
  cardBody: { padding: 18, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardMeta: { fontSize: 14 },
  cardDescription: { fontSize: 15, lineHeight: 22 },
  sectionTitleSkeleton: { width: 156, height: 24, borderRadius: 999 },
  cardTitleSkeleton: { width: '74%', height: 20, borderRadius: 999 },
  cardMetaSkeleton: { width: '46%', height: 12, borderRadius: 999 },
  cardLineSkeleton: { width: '100%', height: 12, borderRadius: 999, marginTop: 4 },
  cardLineSkeletonShort: { width: '66%', height: 12, borderRadius: 999, marginTop: 4 },
  placeSkeletonList: { gap: 16 },
  separator: { height: 16 },
  horizontalSeparator: { width: 16 },
  footerSpace: { height: 8 },
});
