import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { RootStackParamList } from '../../types/navigation';
import { DhamaCollection } from '../../types/dhama';
import { dhamaService } from '../../services/dhamaService';
import { useSettings } from '../../context/SettingsContext';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { DhamaSkeletonBlock } from './DhamaSkeleton';

type Props = NativeStackScreenProps<RootStackParamList, 'DhamaCollectionDetail'>;
const EMPTY_PLACES: DhamaCollection['places'] = [];

export const DhamaCollectionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [collection, setCollection] = useState<DhamaCollection | null>(null);
  const places = collection?.places ?? EMPTY_PLACES;
  const uniqueStates = useMemo(
    () => Array.from(new Set(places.map((place) => place.state).filter(Boolean))),
    [places],
  );
  const featuredPlaces = useMemo(
    () => places.filter((place) => place.isFeatured),
    [places],
  );
  const leadPlace = featuredPlaces[0] || places[0] || null;
  const skeletonColor = vTheme.colors.divider;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    dhamaService.getCollection(route.params.slug)
      .then((payload) => {
        if (mounted) {
          setCollection(payload);
        }
      })
      .catch((error) => {
        console.warn('[DhamaCollectionDetail] failed to load collection', error);
        if (mounted) {
          setCollection(null);
          setLoadError(true);
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
  }, [refreshKey, route.params.slug]);

  if (loading) {
    return (
      <ScreenScaffold>
        <ScrollView contentContainerStyle={styles.container}>
          <DhamaSkeletonBlock color={skeletonColor} style={styles.hero} />
          <View style={styles.headerBlock}>
            <DhamaSkeletonBlock color={skeletonColor} style={styles.eyebrowSkeleton} />
            <DhamaSkeletonBlock color={skeletonColor} style={styles.titleSkeleton} />
            <DhamaSkeletonBlock color={skeletonColor} style={styles.descriptionSkeleton} />
            <DhamaSkeletonBlock color={skeletonColor} style={styles.descriptionSkeletonShort} />
          </View>
          <View style={styles.statsRow}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={`stat-skeleton-${index}`} style={[styles.statCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
                <DhamaSkeletonBlock color={skeletonColor} style={styles.statValueSkeleton} />
                <DhamaSkeletonBlock color={skeletonColor} style={styles.statLabelSkeleton} />
              </View>
            ))}
          </View>
          <View style={styles.actionRow}>
            <DhamaSkeletonBlock color={skeletonColor} style={styles.buttonSkeleton} />
            <DhamaSkeletonBlock color={skeletonColor} style={styles.buttonSkeleton} />
          </View>
          <View style={styles.section}>
            <DhamaSkeletonBlock color={skeletonColor} style={styles.sectionTitleSkeleton} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipRow}>
              {Array.from({ length: 4 }).map((_, index) => (
                <DhamaSkeletonBlock key={`quick-chip-skeleton-${index}`} color={skeletonColor} style={styles.quickChipSkeleton} />
              ))}
            </ScrollView>
          </View>
          <View style={[styles.leadCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
            <DhamaSkeletonBlock color={skeletonColor} style={styles.leadImage} />
            <View style={styles.leadBody}>
              <DhamaSkeletonBlock color={skeletonColor} style={styles.leadTitleSkeleton} />
              <DhamaSkeletonBlock color={skeletonColor} style={styles.leadMetaSkeleton} />
            </View>
          </View>
        </ScrollView>
      </ScreenScaffold>
    );
  }

  if (!collection) {
    return (
      <ScreenScaffold contentStyle={styles.loadingWrap}>
        <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
          <Text style={[styles.feedbackTitle, { color: vTheme.colors.text }]}>
            {loadError ? t('dhama.collectionErrorTitle') : t('dhama.collectionEmpty')}
          </Text>
          <Text style={[styles.feedbackBody, { color: vTheme.colors.textSecondary }]}>
            {loadError ? t('dhama.collectionErrorBody') : t('dhama.collectionEmpty')}
          </Text>
          <TouchableOpacity onPress={() => setRefreshKey((current) => current + 1)} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
            <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      <ScrollView contentContainerStyle={styles.container}>
        {collection.heroImageUrl ? (
          <Image source={{ uri: collection.heroImageUrl }} style={styles.hero} />
        ) : (
          <View style={[styles.heroFallback, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
            <Text style={[styles.heroFallbackEyebrow, { color: vTheme.colors.primary }]}>{t('dhama.collectionLabel')}</Text>
            <Text style={[styles.heroFallbackTitle, { color: vTheme.colors.text }]}>{collection.title}</Text>
          </View>
        )}

        <View style={styles.headerBlock}>
          <Text style={[styles.eyebrow, { color: vTheme.colors.primary }]}>{t('dhama.collectionLabel')}</Text>
          <Text style={[styles.title, { color: vTheme.colors.text }]}>{collection.title}</Text>
          <Text style={[styles.description, { color: vTheme.colors.textSecondary }]}>{collection.description}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
            <Text style={[styles.statValue, { color: vTheme.colors.text }]}>{collection.places.length}</Text>
            <Text style={[styles.statLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.stats.places')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
            <Text style={[styles.statValue, { color: vTheme.colors.text }]}>{uniqueStates.length}</Text>
            <Text style={[styles.statLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.stats.regions')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
            <Text style={[styles.statValue, { color: vTheme.colors.text }]}>{featuredPlaces.length}</Text>
            <Text style={[styles.statLabel, { color: vTheme.colors.textSecondary }]}>{t('dhama.stats.featured')}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('DhamaHome', { collectionSlug: collection.slug, collectionTitle: collection.title })}
            style={[styles.primaryButton, { backgroundColor: vTheme.colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>{t('dhama.showCollectionPlaces')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('DhamaMap', { collectionSlug: collection.slug })}
            style={[styles.secondaryButton, { borderColor: vTheme.colors.divider }]}
          >
            <Text style={{ color: vTheme.colors.text }}>{t('dhama.openCollectionMap')}</Text>
          </TouchableOpacity>
        </View>

        {collection.places.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.quickAccess')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipRow}>
              {collection.places.map((place) => (
                <TouchableOpacity
                  key={`quick-${place.id}`}
                  onPress={() => navigation.navigate('HolyPlaceDetail', { slug: place.slug })}
                  style={[styles.quickChip, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
                >
                  <Text style={[styles.quickChipText, { color: vTheme.colors.text }]}>{place.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {leadPlace ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.collectionLead')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('HolyPlaceDetail', { slug: leadPlace.slug })}
              style={[styles.leadCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
            >
              {leadPlace.heroImageUrl ? <Image source={{ uri: leadPlace.heroImageUrl }} style={styles.leadImage} /> : null}
              <View style={styles.leadBody}>
                <Text style={[styles.leadTitle, { color: vTheme.colors.text }]}>{leadPlace.title}</Text>
                <Text style={[styles.leadMeta, { color: vTheme.colors.textSecondary }]}>{leadPlace.city}, {leadPlace.state}</Text>
                <Text style={[styles.leadHint, { color: vTheme.colors.primary }]}>{t('dhama.openPlace')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>
            {t('dhama.collectionPlaces', { count: collection.places.length })}
          </Text>
          <Text style={[styles.sectionCaption, { color: vTheme.colors.textSecondary }]}>
            {collection.places.length > 0 ? t('dhama.collectionPlacesHint') : t('dhama.collectionEmpty')}
          </Text>
          <View style={styles.placeList}>
            {collection.places.map((place) => (
              <TouchableOpacity
                key={place.id}
                onPress={() => navigation.navigate('HolyPlaceDetail', { slug: place.slug })}
                style={[styles.placeCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
              >
                {place.heroImageUrl ? <Image source={{ uri: place.heroImageUrl }} style={styles.placeImage} /> : null}
                <View style={styles.placeBody}>
                  <View style={styles.placeHeaderRow}>
                    <Text style={[styles.placeTitle, { color: vTheme.colors.text }]}>{place.title}</Text>
                    {place.isFeatured ? (
                      <View style={[styles.featuredBadge, { backgroundColor: vTheme.colors.primary }]}>
                        <Text style={styles.featuredBadgeText}>★</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.placeMeta, { color: vTheme.colors.textSecondary }]}>{place.city}, {place.state}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 16 },
  hero: { width: '100%', height: 220, borderRadius: 22, backgroundColor: '#ddd' },
  heroFallback: { width: '100%', minHeight: 220, borderRadius: 22, borderWidth: 1, padding: 22, justifyContent: 'flex-end', gap: 8 },
  heroFallbackEyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  heroFallbackTitle: { fontSize: 30, fontWeight: '800', lineHeight: 36, maxWidth: '88%' },
  headerBlock: { gap: 8 },
  eyebrowSkeleton: { width: 102, height: 12, borderRadius: 999 },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  titleSkeleton: { width: '72%', height: 34, borderRadius: 999 },
  title: { fontSize: 28, fontWeight: '800' },
  descriptionSkeleton: { width: '100%', height: 14, borderRadius: 999 },
  descriptionSkeletonShort: { width: '76%', height: 14, borderRadius: 999 },
  description: { fontSize: 16, lineHeight: 23 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 12, gap: 4 },
  statValueSkeleton: { width: 32, height: 22, borderRadius: 999 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabelSkeleton: { width: 58, height: 10, borderRadius: 999 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  actionRow: { gap: 10 },
  buttonSkeleton: { width: '100%', height: 48, borderRadius: 16 },
  primaryButton: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  section: { gap: 12 },
  sectionTitleSkeleton: { width: 148, height: 24, borderRadius: 999 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionCaption: { fontSize: 14, lineHeight: 21 },
  feedbackCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10, maxWidth: 360 },
  feedbackTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  feedbackBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  feedbackButton: { alignSelf: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  feedbackButtonText: { fontSize: 13, fontWeight: '700' },
  quickChipRow: { gap: 10, paddingRight: 16 },
  quickChipSkeleton: { width: 96, height: 36, borderRadius: 999 },
  quickChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  quickChipText: { fontSize: 13, fontWeight: '600' },
  leadCard: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  leadImage: { width: '100%', height: 168, backgroundColor: '#ddd' },
  leadBody: { padding: 18, gap: 6 },
  leadTitleSkeleton: { width: '64%', height: 22, borderRadius: 999 },
  leadMetaSkeleton: { width: '40%', height: 12, borderRadius: 999 },
  leadTitle: { fontSize: 20, fontWeight: '800' },
  leadMeta: { fontSize: 14 },
  leadHint: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  placeList: { gap: 12 },
  placeCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  placeImage: { width: '100%', height: 156, backgroundColor: '#ddd' },
  placeBody: { padding: 16, gap: 6 },
  placeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  placeTitle: { fontSize: 17, fontWeight: '700' },
  placeMeta: { fontSize: 14 },
  featuredBadge: { minWidth: 24, height: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  featuredBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
