import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Download, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaOfflineService, OfflineMediaTrack } from '../../services/multimediaOfflineService';

export const OfflineMediaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const [items, setItems] = useState<OfflineMediaTrack[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const list = await multimediaOfflineService.listOfflineTracks();
      setItems(list.sort((a, b) => +new Date(b.downloadedAt) - +new Date(a.downloadedAt)));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openTrack = (item: OfflineMediaTrack) => {
    const track = {
      ID: item.trackId,
      title: item.title,
      artist: item.artist,
      mediaType: item.mediaType,
      url: `file://${item.localPath}`,
      thumbnailUrl: item.thumbnailUrl,
      duration: 0,
      viewCount: 0,
      likeCount: 0,
      isFeatured: false,
      isActive: true,
    };
    if (item.mediaType === 'audio') {
      navigation.navigate('AudioPlayer', { track });
    } else {
      navigation.navigate('VideoPlayer', { video: track });
    }
  };

  const removeTrack = (item: OfflineMediaTrack) => {
    Alert.alert('Удалить файл?', item.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await multimediaOfflineService.removeOfflineTrack(item.trackId);
          await loadData();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Оффлайн медиа</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.trackId)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
            onPress={() => openTrack(item)}
          >
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.artist || 'Unknown'} • {item.mediaType.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeTrack(item)}>
              <Trash2 size={18} color={colors.danger} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Download size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Скачанных файлов пока нет</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: 8 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemInfo: { flex: 1, paddingRight: 8 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemMeta: { marginTop: 4, fontSize: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
});

export default OfflineMediaScreen;

