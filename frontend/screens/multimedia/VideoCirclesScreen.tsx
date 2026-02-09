import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ArrowLeft, Heart, MessageCircle, MessageSquare, Plus, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { Asset, launchImageLibrary } from 'react-native-image-picker';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { VideoCircle, VideoTariff, videoCirclesService } from '../../services/videoCirclesService';

export const VideoCirclesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circles, setCircles] = useState<VideoCircle[]>([]);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [tariffs, setTariffs] = useState<VideoTariff[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Asset | null>(null);
  const [city, setCity] = useState('');
  const [matha, setMatha] = useState('');
  const [category, setCategory] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterMatha, setFilterMatha] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'expired' | 'deleted'>('active');
  const isTariffAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const loadCircles = useCallback(async () => {
    try {
      const res = await videoCirclesService.getVideoCircles({
        status: filterStatus,
        city: filterCity.trim() || undefined,
        matha: filterMatha.trim() || undefined,
        category: filterCategory.trim() || undefined,
        limit: 30,
        sort: 'newest',
      });
      setCircles(res.circles);
    } catch (error) {
      console.error('Failed to load video circles:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить кружки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCategory, filterCity, filterMatha, filterStatus]);

  const loadTariffs = useCallback(async () => {
    try {
      const list = await videoCirclesService.getVideoTariffs();
      setTariffs(list);
    } catch (error) {
      console.error('Failed to load video tariffs:', error);
    }
  }, []);

  useEffect(() => {
    loadCircles();
    loadTariffs();
  }, [loadCircles, loadTariffs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCircles((prev) =>
        prev
          .map((item) => ({ ...item, remainingSec: Math.max(item.remainingSec - 1, 0) }))
          .filter((item) => item.remainingSec > 0)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCircles();
  };

  const pickVideo = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if ((asset.fileSize || 0) > 250 * 1024 * 1024) {
        Alert.alert('Слишком большой файл', 'Максимальный размер видео для кружка — 250MB');
        return;
      }
      setSelectedVideo(asset);
      setPublishOpen(true);
    } catch (error) {
      console.error('Failed to pick video:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать видео');
    }
  };

  const resetPublishForm = () => {
    setPublishOpen(false);
    setSelectedVideo(null);
    setCity('');
    setMatha('');
    setCategory('');
  };

  const publishCircle = async () => {
    if (!selectedVideo?.uri) {
      Alert.alert('Ошибка', 'Выберите видео');
      return;
    }

    setPublishing(true);
    try {
      await videoCirclesService.uploadAndCreateCircle({
        video: {
          uri: selectedVideo.uri,
          name: selectedVideo.fileName || `circle_${Date.now()}.mp4`,
          type: selectedVideo.type || 'video/mp4',
        },
        city: city.trim() || undefined,
        matha: matha.trim() || undefined,
        category: category.trim() || undefined,
        durationSec: 60,
      });
      resetPublishForm();
      await loadCircles();
      Alert.alert('Готово', 'Кружок опубликован');
    } catch (error) {
      console.error('Failed to publish circle:', error);
      Alert.alert('Ошибка', 'Не удалось опубликовать кружок');
    } finally {
      setPublishing(false);
    }
  };

  const handleInteraction = async (circle: VideoCircle, type: 'like' | 'comment' | 'chat') => {
    const prev = circles;
    const liked = !!likedMap[circle.id];

    setCircles((list) =>
      list.map((item) => {
        if (item.id !== circle.id) return item;
        if (type === 'like') {
          return {
            ...item,
            likeCount: liked ? Math.max(item.likeCount - 1, 0) : item.likeCount + 1,
          };
        }
        if (type === 'comment') {
          return { ...item, commentCount: item.commentCount + 1 };
        }
        return { ...item, chatCount: item.chatCount + 1 };
      })
    );

    if (type === 'like') {
      setLikedMap((prevMap) => ({ ...prevMap, [circle.id]: !liked }));
    }

    try {
      const action = type === 'like' ? 'toggle' : 'add';
      await videoCirclesService.interact(circle.id, type, action);
    } catch (error) {
      console.error('Failed interaction:', error);
      setCircles(prev);
      if (type === 'like') {
        setLikedMap((prevMap) => ({ ...prevMap, [circle.id]: liked }));
      }
      Alert.alert('Ошибка', 'Не удалось обновить реакцию');
    }
  };

  const handleBoost = async (circleId: number) => {
    try {
      await videoCirclesService.boostCircle(circleId, 'premium');
      await loadCircles();
      Alert.alert('Готово', 'Premium boost применён');
    } catch (error: any) {
      const message = typeof error?.message === 'string' && error.message.includes('INSUFFICIENT_LKM')
        ? 'Недостаточно LKM'
        : 'Не удалось применить premium boost';
      Alert.alert('Ошибка', message);
    }
  };

  const premiumPrice = useMemo(() => {
    const item = tariffs.find((tariff) => tariff.code === 'premium_boost' && tariff.isActive);
    return item?.priceLkm ?? null;
  }, [tariffs]);

  const renderTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color={roleColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: roleColors.textPrimary }]}>Video Circles</Text>
          <View style={styles.headerActions}>
            {isTariffAdmin && (
              <TouchableOpacity onPress={() => navigation.navigate('VideoTariffsAdminScreen')} style={styles.myBtn}>
                <Text style={{ color: roleColors.textPrimary, fontWeight: '700', fontSize: 11 }}>Тарифы</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('MyVideoCirclesScreen')} style={styles.myBtn}>
              <Text style={{ color: roleColors.textPrimary, fontWeight: '700', fontSize: 12 }}>Мои</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickVideo} style={styles.backButton}>
              <Plus size={22} color={roleColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltersOpen(true)} style={styles.backButton}>
              <SlidersHorizontal size={20} color={roleColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.filterStateRow}>
          <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>
            {`status=${filterStatus}`}
          </Text>
          {!!filterCity && <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>{`city=${filterCity}`}</Text>}
          {!!filterMatha && <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>{`matha=${filterMatha}`}</Text>}
          {!!filterCategory && <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>{`category=${filterCategory}`}</Text>}
        </View>
      </View>
    ),
    [filterCategory, filterCity, filterMatha, filterStatus, isTariffAdmin, navigation, roleColors.textPrimary, roleColors.textSecondary]
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: roleColors.background }]}>
        <ActivityIndicator size="large" color={roleColors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: roleColors.background }]}>
      <FlatList
        data={circles}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: roleColors.textSecondary }}>Кружки не найдены</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}> 
            <View style={styles.mediaWrap}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: roleColors.surface }]} />
              )}
              <View style={styles.topBadges}>
                <Text style={styles.badge}>60s</Text>
                <Text style={styles.badge}>{renderTime(item.remainingSec)}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              {!!item.city && <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>{item.city}</Text>}
              {!!item.matha && <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>{item.matha}</Text>}
              {!!item.category && <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>{item.category}</Text>}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleInteraction(item, 'like')}>
                <Heart size={18} color={likedMap[item.id] ? '#ef4444' : roleColors.textPrimary} fill={likedMap[item.id] ? '#ef4444' : 'transparent'} />
                <Text style={{ color: roleColors.textPrimary }}>{item.likeCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => handleInteraction(item, 'comment')}>
                <MessageSquare size={18} color={roleColors.textPrimary} />
                <Text style={{ color: roleColors.textPrimary }}>{item.commentCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => handleInteraction(item, 'chat')}>
                <MessageCircle size={18} color={roleColors.textPrimary} />
                <Text style={{ color: roleColors.textPrimary }}>{item.chatCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.boostBtn, { backgroundColor: roleColors.accent }]} onPress={() => handleBoost(item.id)}>
                <Sparkles size={15} color="#fff" />
                <Text style={styles.boostText}>
                  {premiumPrice !== null ? `Premium ${premiumPrice} LKM` : 'Premium boost'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={publishOpen} animationType="slide" transparent onRequestClose={resetPublishForm}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>Публикация кружка</Text>
            <Text style={[styles.modalHint, { color: roleColors.textSecondary }]}>
              {selectedVideo?.fileName || 'Видео выбрано'}
            </Text>

            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={matha}
              onChangeText={setMatha}
              placeholder="Matha"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Category"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: roleColors.border }]} onPress={resetPublishForm} disabled={publishing}>
                <Text style={{ color: roleColors.textSecondary }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: roleColors.accent }]} onPress={publishCircle} disabled={publishing}>
                {publishing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Опубликовать</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>Фильтры ленты</Text>

            <View style={styles.statusRow}>
              {(['active', 'expired', 'deleted'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusPill,
                    {
                      borderColor: roleColors.border,
                      backgroundColor: filterStatus === status ? roleColors.accent : roleColors.surface,
                    },
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={{ color: filterStatus === status ? '#fff' : roleColors.textPrimary, fontWeight: '600' }}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={filterCity}
              onChangeText={setFilterCity}
              placeholder="City"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={filterMatha}
              onChangeText={setFilterMatha}
              placeholder="Matha"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={filterCategory}
              onChangeText={setFilterCategory}
              placeholder="Category"
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: roleColors.border }]}
                onPress={() => {
                  setFilterStatus('active');
                  setFilterCity('');
                  setFilterMatha('');
                  setFilterCategory('');
                }}
              >
                <Text style={{ color: roleColors.textSecondary }}>Сброс</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: roleColors.accent }]}
                onPress={async () => {
                  setFiltersOpen(false);
                  setRefreshing(true);
                  await loadCircles();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Применить</Text>
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
  listContent: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrap: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  filterStateRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterStateText: { fontSize: 11 },
  myBtn: {
    minWidth: 44,
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700' },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaWrap: { height: 210, position: 'relative', backgroundColor: '#111827' },
  thumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  topBadges: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  metaText: { fontSize: 12 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  boostBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  boostText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalHint: { fontSize: 12, marginBottom: 4 },
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

export default VideoCirclesScreen;
