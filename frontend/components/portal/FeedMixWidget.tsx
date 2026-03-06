import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { feedService, FeedV2Item } from '../../services/feedService';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';

export const FeedMixWidget: React.FC = () => {
  const navigation = useNavigation<any>();
  const { vTheme } = useSettings();
  const { i18n } = useTranslation();
  const copy = i18n.language?.startsWith('ru')
    ? { title: 'Лента', empty: 'Пусто' }
    : i18n.language?.startsWith('hi')
      ? { title: 'फ़ीड', empty: 'खाली' }
      : { title: 'Feed', empty: 'Empty' };
  const [items, setItems] = useState<FeedV2Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await feedService.getFeedV2({ limit: 3, include: 'posts,circles', mode: 'auto' });
        if (mounted) {
          setItems(response.items || []);
        }
      } catch (error) {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: vTheme.colors.surface }]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ChannelsHub')}
    >
      <Text style={[styles.title, { color: vTheme.colors.text }]}>{copy.title}</Text>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={vTheme.colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <Text style={[styles.empty, { color: vTheme.colors.textSecondary }]}>{copy.empty}</Text>
      ) : (
        <View style={styles.itemsWrap}>
          {items.map((item) => {
            const image = item.preview?.thumbnail || item.preview?.image;
            return (
              <View key={item.id} style={styles.row}>
                {image ? <Image source={{ uri: image }} style={styles.thumb} /> : <View style={styles.thumbFallback} />}
                <Text style={[styles.rowText, { color: vTheme.colors.text }]} numberOfLines={1}>
                  {item.preview?.text || item.type}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 168,
    height: 168,
    borderRadius: 20,
    padding: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: 12,
  },
  itemsWrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#D1D5DB',
  },
  thumbFallback: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  rowText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },
});
