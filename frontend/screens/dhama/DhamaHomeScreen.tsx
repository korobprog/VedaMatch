import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MapPinned, Search } from 'lucide-react-native';

import { RootStackParamList } from '../../types/navigation';
import { HolyPlaceSummary } from '../../types/dhama';
import { dhamaService } from '../../services/dhamaService';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { useSettings } from '../../context/SettingsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DhamaHome'>;

const ListSeparator = () => <View style={styles.separator} />;

export const DhamaHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<HolyPlaceSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    dhamaService.getPlaces({ search, limit: 50 })
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
  }, [search]);

  const featured = useMemo(() => places.filter((place) => place.isFeatured), [places]);

  const renderCard = ({ item }: { item: HolyPlaceSummary }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('HolyPlaceDetail', { slug: item.slug })}
      style={[styles.card, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
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

  return (
    <ScreenScaffold>
      <FlatList
        data={places}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCard}
        contentContainerStyle={styles.container}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: vTheme.colors.text }]}>{t('dhama.homeTitle')}</Text>
                <Text style={[styles.subtitle, { color: vTheme.colors.textSecondary }]}>{t('dhama.homeSubtitle')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('DhamaMap')}
                style={[styles.mapButton, { backgroundColor: vTheme.colors.primary }]}
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

            {featured.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.featured')}</Text>
                <FlatList
                  data={featured}
                  horizontal
                  keyExtractor={(item) => `featured-${item.id}`}
                  renderItem={renderCard}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('dhama.allPlaces')}</Text>
              {loading ? <ActivityIndicator color={vTheme.colors.primary} /> : null}
            </View>
          </>
        )}
        ListEmptyComponent={loading ? null : <Text style={{ color: vTheme.colors.textSecondary }}>{t('dhama.empty')}</Text>}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 14, maxWidth: 220 },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  mapButtonText: { color: '#fff', fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  card: { width: 280, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  cardImage: { width: '100%', height: 150, backgroundColor: '#ddd' },
  cardBody: { padding: 14, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardMeta: { fontSize: 13 },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  separator: { height: 12 },
});
