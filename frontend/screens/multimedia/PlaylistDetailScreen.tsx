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
import { ArrowLeft, Music2, Trash2 } from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaService, PlaylistDetailResponse } from '../../services/multimediaService';
import { RootStackParamList } from '../../types/navigation';

type Route = RouteProp<RootStackParamList, 'PlaylistDetail'>;

export const PlaylistDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { playlistId } = route.params;
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const [data, setData] = useState<PlaylistDetailResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const details = await multimediaService.getPlaylistDetails(playlistId);
      setData(details);
    } catch (error) {
      console.error('Failed to load playlist details', error);
    } finally {
      setRefreshing(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openTrack = (track: any) => {
    if (track.mediaType === 'video') {
      navigation.navigate('VideoPlayer', { video: track });
      return;
    }
    navigation.navigate('AudioPlayer', { track });
  };

  const removeTrack = (trackId: number) => {
    Alert.alert('Удалить трек?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await multimediaService.removeTrackFromPlaylist(playlistId, trackId);
            await loadData();
          } catch {
            Alert.alert('Ошибка', 'Не удалось удалить трек');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {data?.playlist?.name || route.params.playlistName || 'Плейлист'}
        </Text>
        <View style={styles.iconButton} />
      </View>

      <FlatList
        data={data?.items || []}
        keyExtractor={(item) => String(item.ID)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        contentContainerStyle={(data?.items?.length || 0) === 0 ? styles.emptyWrap : styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => item.track && openTrack(item.track)}
          >
            <Music2 size={18} color={colors.accent} />
            <View style={styles.info}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.track?.title || 'Unknown track'}</Text>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.track?.artist || 'Unknown artist'}</Text>
            </View>
            <TouchableOpacity onPress={() => removeTrack(item.mediaTrackId)}>
              <Trash2 size={18} color={colors.danger} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Music2 size={34} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>В плейлисте пока нет треков</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  list: { padding: 16, gap: 8 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: 10, marginRight: 8 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemMeta: { marginTop: 4, fontSize: 12 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
});

export default PlaylistDetailScreen;

