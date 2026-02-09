import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Pencil, Plus } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { UpsertVideoTariffPayload, VideoTariff, videoCirclesService } from '../../services/videoCirclesService';

const TARIFF_CODES: UpsertVideoTariffPayload['code'][] = ['lkm_boost', 'city_boost', 'premium_boost'];

export const VideoTariffsAdminScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tariffs, setTariffs] = useState<VideoTariff[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState<UpsertVideoTariffPayload['code']>('lkm_boost');
  const [priceLkm, setPriceLkm] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadTariffs = useCallback(async () => {
    try {
      const list = await videoCirclesService.getVideoTariffs();
      setTariffs(list);
    } catch (error) {
      console.error('Failed to load tariffs:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить тарифы');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTariffs();
  }, [loadTariffs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTariffs();
  };

  const openCreate = () => {
    setEditingId(null);
    setCode('lkm_boost');
    setPriceLkm('10');
    setDurationMinutes('60');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (item: VideoTariff) => {
    setEditingId(item.id);
    setCode(item.code);
    setPriceLkm(String(item.priceLkm));
    setDurationMinutes(String(item.durationMinutes));
    setIsActive(item.isActive);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
  };

  const canSubmit = useMemo(() => {
    const p = Number(priceLkm);
    const d = Number(durationMinutes);
    return Number.isFinite(p) && p >= 0 && Number.isFinite(d) && d > 0;
  }, [durationMinutes, priceLkm]);

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert('Ошибка', 'Проверьте цену и длительность');
      return;
    }
    setSaving(true);
    try {
      const payload: UpsertVideoTariffPayload = {
        code,
        priceLkm: Number(priceLkm),
        durationMinutes: Number(durationMinutes),
        isActive,
      };

      if (editingId) {
        await videoCirclesService.updateVideoTariff(editingId, payload);
      } else {
        await videoCirclesService.createVideoTariff(payload);
      }
      closeModal();
      await loadTariffs();
      Alert.alert('Готово', 'Тариф сохранён');
    } catch (error) {
      console.error('Failed to save tariff:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить тариф');
      setSaving(false);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={roleColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: roleColors.textPrimary }]}>Video Tariffs</Text>
        <TouchableOpacity onPress={openCreate} style={styles.iconBtn}>
          <Plus size={22} color={roleColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tariffs}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={{ color: roleColors.textPrimary, fontWeight: '700' }}>{item.code}</Text>
                <Text style={{ color: roleColors.textSecondary, marginTop: 4 }}>
                  {item.priceLkm} LKM • {item.durationMinutes} min • {item.isActive ? 'active' : 'inactive'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                <Pencil size={18} color={roleColors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>
              {editingId ? 'Редактировать тариф' : 'Новый тариф'}
            </Text>

            <View style={styles.codesRow}>
              {TARIFF_CODES.map((itemCode) => (
                <TouchableOpacity
                  key={itemCode}
                  onPress={() => setCode(itemCode)}
                  style={[
                    styles.codePill,
                    {
                      borderColor: roleColors.border,
                      backgroundColor: code === itemCode ? roleColors.accent : roleColors.surface,
                    },
                  ]}
                >
                  <Text style={{ color: code === itemCode ? '#fff' : roleColors.textPrimary, fontSize: 12 }}>{itemCode}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={priceLkm}
              onChangeText={setPriceLkm}
              keyboardType="numeric"
              placeholder="Price LKM"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
              placeholder="Duration minutes"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <View style={styles.switchRow}>
              <Text style={{ color: roleColors.textPrimary }}>Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: roleColors.border }]} onPress={closeModal} disabled={saving}>
                <Text style={{ color: roleColors.textSecondary }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: roleColors.accent }]} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Сохранить</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  codesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  switchRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalActions: { marginTop: 6, flexDirection: 'row', gap: 10 },
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

export default VideoTariffsAdminScreen;

