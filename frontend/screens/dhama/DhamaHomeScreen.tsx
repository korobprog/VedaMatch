import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MapPinned, Search } from 'lucide-react-native';

import { RootStackParamList } from '../../types/navigation';
import { DhamaCollection, HolyPlaceSummary } from '../../types/dhama';
import { dhamaService } from '../../services/dhamaService';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { useSettings } from '../../context/SettingsContext';
import { DhamaBackButton } from './DhamaBackButton';

type Props = NativeStackScreenProps<RootStackParamList, 'DhamaHome'>;

const ListSeparator = () => <View style={styles.separator} />;
const HorizontalSeparator = () => <View style={styles.horizontalSeparator} />;

export const DhamaHomeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();
  const [loading, setLoading] = useState(true);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<HolyPlaceSummary[]>([]);
  const [collections, setCollections] = useState<DhamaCollection[]>([]);
  const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.collectionSlug) {
      setSelectedCollectionSlug(route.params.collectionSlug);
    }
  }, [route.params?.collectionSlug]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    dhamaService.getPlaces({ search, collection: selectedCollectionSlug || undefined, limit: 50 })
      .then((payload) => {
        if (mounted) {
          setPlaces(payload.places || []);
        }
      })
      .catch((error) => {
        console.warn('[DhamaHome] failed to load places', error);
        if (mounted) {
          setPlaces([]);
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
  }, [search, selectedCollectionSlug]);

  useEffect(() => {
    let mounted = true;
    setCollectionsLoading(true);
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
  }, []);

  const featured = useMemo(() => places.filter((place) => place.isFeatured), [places]);
  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.slug === selectedCollectionSlug) || null,
    [collections, selectedCollectionSlug],
  );

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
            <View style={styles.topBar}>
              <DhamaBackButton navigation={navigation} />
            </View>
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: vTheme.colors.text }]}>{t('dhama.homeTitle')}</Text>
                <Text style={[styles.subtitle, { color: vTheme.colors.textSecondary }]}>{t('dhama.homeSubtitle')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('DhamaMap', selectedCollectionSlug ? { collectionSlug: selectedCollectionSlug } : undefined)}
                style={[styles.mapButton, { backgroundColor: vTheme.colors.primary }]}
                activeOpacity={0.9}
              >
                <MapPinned size={18} color="#fff" />
                <Text style={styles.mapButtonText}>{t('dhama.openMap')}</Text>
              </TouchableOpacity>
            </View>

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

            {(collectionsLoading || collections.length > 0) ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.collections')}</Text>
                {selectedCollection?.description ? (
                  <Text style={[styles.sectionCaption, { color: vTheme.colors.textSecondary }]}>{selectedCollection.description}</Text>
                ) : null}
                {collectionsLoading ? (
                  <ActivityIndicator color={vTheme.colors.primary} />
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

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>
                {selectedCollection ? selectedCollection.title : t('dhama.allPlaces')}
              </Text>
              {selectedCollection && selectedCollection.description ? (
                <Text style={[styles.sectionCaption, { color: vTheme.colors.textSecondary }]}>{selectedCollection.description}</Text>
              ) : null}
              {loading ? <ActivityIndicator color={vTheme.colors.primary} /> : null}
            </View>
          </>
        )}
        ListEmptyComponent={loading ? null : <Text style={{ color: vTheme.colors.textSecondary }}>{t('dhama.empty')}</Text>}
        ListFooterComponent={<View style={styles.footerSpace} />}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 18 },
  topBar: { alignItems: 'flex-start', marginBottom: 2 },
  header: { gap: 14, alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 6, fontSize: 16, lineHeight: 22, maxWidth: 320 },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14 },
  mapButtonText: { color: '#fff', fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, gap: 12, marginTop: 12 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  section: { gap: 14, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionCaption: { fontSize: 14, lineHeight: 21 },
  collectionListContent: { paddingRight: 20, paddingTop: 2, paddingBottom: 4 },
  collectionCard: { width: 264, borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  collectionImage: { width: '100%', height: 132, backgroundColor: '#ddd' },
  collectionBody: { padding: 16, gap: 8 },
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
  separator: { height: 16 },
  horizontalSeparator: { width: 16 },
  footerSpace: { height: 8 },
});
