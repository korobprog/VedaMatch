import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { RootStackParamList } from '../../types/navigation';
import { HolyPlaceDetail } from '../../types/dhama';
import { dhamaService } from '../../services/dhamaService';
import { useSettings } from '../../context/SettingsContext';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { DhamaBackButton } from './DhamaBackButton';

type Props = NativeStackScreenProps<RootStackParamList, 'HolyPlaceDetail'>;

const humanizeDhamaValue = (value: string) => value
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (match) => match.toUpperCase());

export const HolyPlaceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();
  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<HolyPlaceDetail | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    dhamaService.getPlace(route.params.slug)
      .then((payload) => {
        if (mounted) {
          setPlace(payload);
        }
      })
      .catch((error) => {
        console.warn('[HolyPlaceDetail] failed to load place', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [route.params.slug]);

  if (loading) {
    return (
      <ScreenScaffold contentStyle={styles.loadingWrap}>
        <ActivityIndicator color={vTheme.colors.primary} />
      </ScreenScaffold>
    );
  }

  if (!place) {
    return (
      <ScreenScaffold contentStyle={styles.loadingWrap}>
        <Text style={{ color: vTheme.colors.textSecondary }}>{t('dhama.empty')}</Text>
      </ScreenScaffold>
    );
  }

  const sections = [
    { title: t('dhama.sections.about'), body: place.description },
    { title: t('dhama.sections.rules'), body: place.visitRules },
    { title: t('dhama.sections.etiquette'), body: place.etiquette },
    { title: t('dhama.sections.tips'), body: place.pilgrimageTips },
    { title: t('dhama.sections.practices'), body: place.practices },
    { title: t('dhama.sections.faq'), body: place.faq },
  ].filter((item) => item.body);
  const gallery = Array.isArray(place.gallery) ? place.gallery : [];
  const linkedMedia = Array.isArray(place.linkedMedia) ? place.linkedMedia : [];
  const linkedYatras = Array.isArray(place.linkedYatras) ? place.linkedYatras : [];
  const collections = Array.isArray(place.collections) ? place.collections : [];
  const normalizedPlaceType = place.placeType ? place.placeType.replace(/_/g, '-') : '';
  const localizedPlaceType = normalizedPlaceType
    ? t(`dhama.filterValues.placeType.${normalizedPlaceType}`, { defaultValue: humanizeDhamaValue(place.placeType) })
    : '';
  const metaParts = [place.city, place.state, localizedPlaceType].filter(Boolean);

  return (
    <ScreenScaffold>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <DhamaBackButton navigation={navigation} />
        </View>
        {place.heroImageUrl ? <Image source={{ uri: place.heroImageUrl }} style={styles.hero} /> : null}
        <Text style={[styles.title, { color: vTheme.colors.text }]}>{place.title}</Text>
        <Text style={[styles.meta, { color: vTheme.colors.textSecondary }]}>{metaParts.join(' · ')}</Text>
        <Text style={[styles.short, { color: vTheme.colors.textSecondary }]}>{place.shortDescription}</Text>

        {collections.length > 0 ? (
          <View style={styles.collectionSection}>
            <Text style={[styles.collectionSectionTitle, { color: vTheme.colors.text }]}>{t('dhama.collections')}</Text>
            <View style={styles.collectionChipRow}>
              {collections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  onPress={() => navigation.navigate('DhamaCollectionDetail', { slug: collection.slug })}
                  style={[styles.collectionChip, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
                >
                  <Text style={[styles.collectionChipText, { color: vTheme.colors.text }]}>{collection.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => navigation.navigate('DhamaMap')}
          style={[styles.secondaryButton, { borderColor: vTheme.colors.divider }]}
        >
          <Text style={{ color: vTheme.colors.text }}>{t('dhama.openMap')}</Text>
        </TouchableOpacity>

        {gallery.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {gallery.map((imageUrl, index) => (
              <Image key={`${imageUrl}-${index}`} source={{ uri: imageUrl }} style={styles.galleryImage} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.sectionList}>
          {sections.map((section) => (
            <View key={section.title} style={[styles.sectionCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
              <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{section.title}</Text>
              <Text style={[styles.sectionBody, { color: vTheme.colors.textSecondary }]}>{section.body}</Text>
            </View>
          ))}
        </View>

        {linkedMedia.length > 0 ? (
          <View style={styles.linkSection}>
            <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.audioSection')}</Text>
            {linkedMedia.map((track) => (
              <TouchableOpacity
                key={track.id}
                onPress={() => navigation.navigate('AudioPlayer', { track: { ...track, ID: track.id, thumbnailUrl: track.thumbnailUrl } })}
                style={[styles.linkCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
              >
                <Text style={[styles.linkTitle, { color: vTheme.colors.text }]}>{track.title}</Text>
                <Text style={{ color: vTheme.colors.textSecondary }}>{track.artist || t('dhama.audioLecture')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {linkedYatras.length > 0 ? (
          <View style={styles.linkSection}>
            <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.yatraSection')}</Text>
            {linkedYatras.map((yatra) => (
              <TouchableOpacity
                key={yatra.id}
                onPress={() => navigation.navigate('YatraDetail', { yatraId: yatra.id })}
                style={[styles.linkCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
              >
                <Text style={[styles.linkTitle, { color: vTheme.colors.text }]}>{yatra.title}</Text>
                <Text style={{ color: vTheme.colors.textSecondary }}>
                  {yatra.startCity || ''} {yatra.startDate ? `· ${new Date(yatra.startDate).toLocaleDateString()}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 14 },
  topBar: { alignItems: 'flex-start' },
  hero: { width: '100%', height: 240, borderRadius: 22, backgroundColor: '#ddd' },
  title: { fontSize: 28, fontWeight: '800' },
  meta: { fontSize: 14 },
  short: { fontSize: 16, lineHeight: 23 },
  collectionSection: { gap: 10 },
  collectionSectionTitle: { fontSize: 16, fontWeight: '700' },
  collectionChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  collectionChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  collectionChipText: { fontSize: 14, fontWeight: '600' },
  secondaryButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  galleryRow: { gap: 10 },
  galleryImage: { width: 180, height: 120, borderRadius: 16, backgroundColor: '#ddd' },
  sectionList: { gap: 12 },
  sectionCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionBody: { fontSize: 15, lineHeight: 22 },
  linkSection: { gap: 10 },
  linkCard: { borderWidth: 1, borderRadius: 16, padding: 14 },
  linkTitle: { fontSize: 16, fontWeight: '700' },
});
