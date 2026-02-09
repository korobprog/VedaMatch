import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { VideoCircle, videoCirclesService } from '../../services/videoCirclesService';

export const MyVideoCirclesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<VideoCircle[]>([]);
  const [editing, setEditing] = useState<VideoCircle | null>(null);
  const [editCity, setEditCity] = useState('');
  const [editMatha, setEditMatha] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await videoCirclesService.getMyVideoCircles(1, 50);
      setItems(res.circles);
    } catch (error) {
      console.error('Failed to load my circles:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить ваши кружки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleDelete = (id: number) => {
    Alert.alert('Удалить кружок?', 'Кружок будет удалён из ленты.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await videoCirclesService.deleteCircle(id);
            setItems((prev) => prev.filter((item) => item.id !== id));
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить кружок');
          }
        },
      },
    ]);
  };

  const openEdit = (circle: VideoCircle) => {
    setEditing(circle);
    setEditCity(circle.city || '');
    setEditMatha(circle.matha || '');
    setEditCategory(circle.category || '');
  };

  const closeEdit = () => {
    setEditing(null);
    setEditCity('');
    setEditMatha('');
    setEditCategory('');
    setSavingEdit(false);
  };

  const submitEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const updated = await videoCirclesService.updateCircle(editing.id, {
        city: editCity.trim() || undefined,
        matha: editMatha.trim() || undefined,
        category: editCategory.trim() || undefined,
      });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      closeEdit();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить кружок');
      setSavingEdit(false);
    }
  };

  const handleRepublish = async (circle: VideoCircle) => {
    try {
      const updated = await videoCirclesService.republishCircle(circle.id, 60);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      Alert.alert('Готово', 'Кружок продлён на 60 минут');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось продлить кружок');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: roleColors.background }]}>
        <ActivityIndicator size="large" color={roleColors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: roleColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={roleColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: roleColors.textPrimary }]}>Мои кружки</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: roleColors.textSecondary }}>У вас пока нет кружков</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}> 
            <View style={styles.row}>
              <View style={styles.previewWrap}>
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.preview} />
                ) : (
                  <View style={[styles.preview, { backgroundColor: roleColors.surface }]} />
                )}
              </View>
              <View style={styles.info}>
                <Text style={{ color: roleColors.textPrimary, fontWeight: '700' }} numberOfLines={1}>
                  {item.category || 'Без категории'}
                </Text>
                <Text style={{ color: roleColors.textSecondary, marginTop: 4 }} numberOfLines={1}>
                  {item.city || '—'} • {item.matha || '—'}
                </Text>
                <Text style={{ color: roleColors.textSecondary, marginTop: 4 }}>
                  {item.status} • {item.likeCount} ❤️ {item.commentCount} 💬
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                <Pencil size={18} color={roleColors.textPrimary} />
              </TouchableOpacity>
              {(item.status !== 'active' || item.remainingSec <= 0) && (
                <TouchableOpacity onPress={() => handleRepublish(item)} style={styles.republishBtn}>
                  <RotateCcw size={18} color={roleColors.accent} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>Редактирование кружка</Text>
            <TextInput
              value={editCity}
              onChangeText={setEditCity}
              placeholder="City"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={editMatha}
              onChangeText={setEditMatha}
              placeholder="Matha"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder="Category"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: roleColors.border }]} onPress={closeEdit} disabled={savingEdit}>
                <Text style={{ color: roleColors.textSecondary }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: roleColors.accent }]} onPress={submitEdit} disabled={savingEdit}>
                {savingEdit ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Сохранить</Text>}
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
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  listContent: { paddingBottom: 24, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  previewWrap: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  info: { flex: 1, marginLeft: 10 },
  deleteBtn: { padding: 10 },
  editBtn: { padding: 10 },
  republishBtn: { padding: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});

export default MyVideoCirclesScreen;
