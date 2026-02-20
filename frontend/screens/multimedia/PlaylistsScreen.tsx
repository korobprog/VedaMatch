import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, ListMusic, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { multimediaService, Playlist } from '../../services/multimediaService';

export const PlaylistsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadPlaylists = useCallback(async () => {
    try {
      const data = await multimediaService.getPlaylists(1, 100);
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Failed to load playlists', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const createPlaylist = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название плейлиста');
      return;
    }
    try {
      await multimediaService.createPlaylist({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setModalOpen(false);
      setName('');
      setDescription('');
      await loadPlaylists();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать плейлист');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Плейлисты</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} style={styles.iconButton}>
          <Plus size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => String(item.ID)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPlaylists(); }} />}
        contentContainerStyle={playlists.length === 0 ? styles.emptyWrap : styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.ID, playlistName: item.name })}
          >
            <ListMusic size={18} color={colors.accent} />
            <View style={styles.info}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={1}>{item.description || 'Без описания'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ListMusic size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Создайте первый плейлист</Text>
          </View>
        }
      />

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Новый плейлист</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Название"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Описание (опционально)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={[styles.modalBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createPlaylist} style={[styles.modalBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: 8 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  info: { marginLeft: 10, flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemDesc: { marginTop: 4, fontSize: 12 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  modalBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
});

export default PlaylistsScreen;

