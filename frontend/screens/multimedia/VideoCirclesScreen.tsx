import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Heart, MessageCircle, MessageSquare, Sparkles } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { VideoCircle, videoCirclesService } from '../../services/videoCirclesService';

export const VideoCirclesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circles, setCircles] = useState<VideoCircle[]>([]);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});

  const loadCircles = useCallback(async () => {
    try {
      const res = await videoCirclesService.getVideoCircles({ status: 'active', limit: 30, sort: 'newest' });
      setCircles(res.circles);
    } catch (error) {
      console.error('Failed to load video circles:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить кружки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

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
          <View style={styles.backButton} />
        </View>
      </View>
    ),
    [navigation, roleColors.textPrimary]
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
                <Text style={styles.boostText}>Premium boost</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
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
});

export default VideoCirclesScreen;
