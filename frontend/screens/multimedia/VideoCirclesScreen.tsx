import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, MessageSquare, Plus, Send, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { VideoCircle, VideoTariff, videoCirclesService } from '../../services/videoCirclesService';
import { RootStackParamList } from '../../types/navigation';
import { DATING_TRADITIONS } from '../../constants/DatingConstants';

type PortalRoleType = 'user' | 'in_goodness' | 'yogi' | 'devotee';
type VideoCirclesRouteParams = RootStackParamList['VideoCirclesScreen'];



const normalizePortalRole = (value?: string): PortalRoleType => {
  switch ((value || '').trim().toLowerCase()) {
    case 'in_goodness':
      return 'in_goodness';
    case 'yogi':
      return 'yogi';
    case 'devotee':
      return 'devotee';
    default:
      return 'user';
  }
};

export const VideoCirclesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const routeParams = (route?.params || {}) as VideoCirclesRouteParams;
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
  const openPublishHandled = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circles, setCircles] = useState<VideoCircle[]>([]);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [tariffs, setTariffs] = useState<VideoTariff[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState<VideoCircle | null>(null);
  const [commentText, setCommentText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Asset | null>(null);
  const [city, setCity] = useState('');
  const [matha, setMatha] = useState('');
  const [category, setCategory] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterMatha, setFilterMatha] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'expired' | 'deleted'>('active');
  const [roleScope, setRoleScope] = useState<PortalRoleType[]>([]);
  const [feedScope, setFeedScope] = useState<'all' | 'friends'>(routeParams?.scope === 'friends' ? 'friends' : 'all');
  const isTariffAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const ROLE_FILTER_OPTIONS = useMemo(() => [
    { value: 'user' as PortalRoleType, label: t('portal.roles.user') },
    { value: 'in_goodness' as PortalRoleType, label: t('portal.roles.in_goodness') },
    { value: 'yogi' as PortalRoleType, label: t('portal.roles.yogi') },
    { value: 'devotee' as PortalRoleType, label: t('portal.roles.devotee') },
  ], [t]);

  const CIRCLE_CATEGORIES = useMemo(() => [
    { value: 'spiritual', label: t('videoCircles.categories.spiritual') },
    { value: 'yoga', label: t('videoCircles.categories.yoga') },
    { value: 'lecture', label: t('videoCircles.categories.lecture') },
    { value: 'kirtan', label: t('videoCircles.categories.kirtan') },
    { value: 'prasad', label: t('videoCircles.categories.prasad') },
    { value: 'communication', label: t('videoCircles.categories.communication') },
    { value: 'nature', label: t('videoCircles.categories.nature') },
    { value: 'other', label: t('videoCircles.categories.other') },
  ], [t]);

  const loadCircles = useCallback(async () => {
    try {
      const res = await videoCirclesService.getVideoCircles({
        status: filterStatus,
        city: filterCity.trim() || undefined,
        matha: filterMatha.trim() || undefined,
        category: filterCategory.trim() || undefined,
        roleScope,
        scope: feedScope,
        limit: 30,
        sort: 'newest',
      });
      setCircles(res.circles);
    } catch (error) {
      console.error('Failed to load video circles:', error);
      Alert.alert(t('common.error'), t('videoCircles.errorLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [feedScope, filterCategory, filterCity, filterMatha, filterStatus, roleScope]);

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
    if (routeParams?.scope === 'friends') {
      setFeedScope('friends');
    }
  }, [routeParams?.scope]);

  useEffect(() => {
    if (roleScope.length > 0) {
      return;
    }
    if (user?.godModeEnabled || user?.role === 'superadmin') {
      return;
    }
    setRoleScope([normalizePortalRole(user?.role)]);
  }, [roleScope.length, user?.godModeEnabled, user?.role]);

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

  const openVideoPicker = async (source: 'camera' | 'gallery') => {
    console.log('[VideoCircles] openVideoPicker called with source:', source);
    try {
      const result = source === 'camera'
        ? await launchCamera({
          mediaType: 'video',
          durationLimit: 60,
          videoQuality: 'high',
          quality: 0.8,
        })
        : await launchImageLibrary({
          mediaType: 'video',
          selectionLimit: 1,
          quality: 0.8,
        });
      console.log('[VideoCircles] picker result:', JSON.stringify(result, null, 2));
      if (result.didCancel) {
        console.log('[VideoCircles] User cancelled the picker');
        return;
      }
      if (result.errorCode) {
        console.log('[VideoCircles] Picker error:', result.errorCode, result.errorMessage);
        if (result.errorCode === 'camera_unavailable') {
          Alert.alert(
            t('qr.noAccess'),
            t('qr.noAccessDesc'),
            [
              { text: t('chat.customImage'), onPress: () => openVideoPicker('gallery') },
              { text: t('common.cancel'), style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(t('common.error'), result.errorMessage || `${t('qr.scanError')}: ${result.errorCode}`);
        }
        return;
      }
      if (!result.assets || result.assets.length === 0) {
        console.log('[VideoCircles] No assets returned');
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
      console.error('Failed to pick video source:', error);
      const message = source === 'camera'
        ? t('chat.uploadError')
        : t('chat.imagePickError');
      Alert.alert(t('common.error'), message);
    }
  };

  const openPublishSourceSheet = useCallback(() => {
    Alert.alert(t('videoCircles.publishTitle'), t('chat.chooseAction'), [
      { text: t('contacts.takePhoto'), onPress: () => openVideoPicker('camera') },
      { text: t('chat.customImage'), onPress: () => openVideoPicker('gallery') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [t]);

  useEffect(() => {
    if (routeParams?.openPublish && !openPublishHandled.current) {
      openPublishHandled.current = true;
      openPublishSourceSheet();
    }
  }, [openPublishSourceSheet, routeParams?.openPublish]);

  const resetPublishForm = () => {
    setPublishOpen(false);
    setSelectedVideo(null);
    // Keep user profile values as defaults for next time
    setCity(user?.city || '');
    setMatha(user?.madh || '');
    setCategory('');
  };

  // Pre-fill form with user profile data when opening publish modal
  useEffect(() => {
    if (publishOpen && selectedVideo) {
      if (!city && user?.city) setCity(user.city);
      if (!matha && user?.madh) setMatha(user.madh);
    }
  }, [publishOpen, selectedVideo, user?.city, user?.madh]);

  const publishCircle = async () => {
    if (!selectedVideo?.uri) {
      Alert.alert(t('common.error'), t('chat.imagePickError'));
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
      Alert.alert(t('common.success'), t('common.success'));
    } catch (error) {
      console.error('Failed to publish circle:', error);
      Alert.alert(t('common.error'), t('videoCircles.errorBoost')); // Use generic error or specific one if added
    } finally {
      setPublishing(false);
    }
  };

  const applyInteractionResponse = (circleId: number, response?: any) => {
    if (!response) return;
    setCircles((list) =>
      list.map((item) =>
        item.id === circleId
          ? {
            ...item,
            likeCount: typeof response.likeCount === 'number' ? response.likeCount : item.likeCount,
            commentCount: typeof response.commentCount === 'number' ? response.commentCount : item.commentCount,
            chatCount: typeof response.chatCount === 'number' ? response.chatCount : item.chatCount,
          }
          : item
      )
    );
    if (typeof response.likedByUser === 'boolean') {
      setLikedMap((prevMap) => ({ ...prevMap, [circleId]: response.likedByUser }));
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
      const response = await videoCirclesService.interact(circle.id, type, action);
      applyInteractionResponse(circle.id, response);
    } catch (error) {
      console.error('Failed interaction:', error);
      setCircles(prev);
      if (type === 'like') {
        setLikedMap((prevMap) => ({ ...prevMap, [circle.id]: liked }));
      }
      Alert.alert(t('common.error'), t('videoCircles.errorUpdateReaction'));
    }
  };

  const openCommentModal = (circle: VideoCircle) => {
    setCommentTarget(circle);
    setCommentText('');
    setCommentModalOpen(true);
  };

  const submitComment = async () => {
    if (!commentTarget) return;
    if (!commentText.trim()) {
      Alert.alert(t('common.error'), t('common.loading')); // Simple fallback
      return;
    }

    const target = commentTarget;
    setCommentModalOpen(false);
    setCommentTarget(null);
    setCommentText('');
    await handleInteraction(target, 'comment');
  };

  const handleChatPress = async (circle: VideoCircle) => {
    try {
      await handleInteraction(circle, 'chat');
    } finally {
      if (user?.ID && circle.authorId === user.ID) {
        Alert.alert(t('common.error'), 'Это ваш кружок');
        return;
      }
      navigation.navigate('Chat', { userId: circle.authorId });
    }
  };

  const handleBoost = async (circleId: number) => {
    try {
      await videoCirclesService.boostCircle(circleId, 'premium');
      await loadCircles();
      Alert.alert(t('common.success'), t('videoCircles.successBoost'));
    } catch (error: any) {
      const message = typeof error?.message === 'string' && error.message.includes('INSUFFICIENT_LKM')
        ? t('videoCircles.insufficientLkm')
        : t('videoCircles.errorBoost');
      Alert.alert(t('common.error'), message);
    }
  };

  const premiumPrice = useMemo(() => {
    const item = tariffs.find((tariff) => tariff.code === 'premium_boost' && tariff.isActive);
    return item?.priceLkm ?? null;
  }, [tariffs]);

  const toggleRoleScope = (value: PortalRoleType) => {
    setRoleScope((current) => {
      const hasValue = current.includes(value);
      if (hasValue) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== value);
      }
      return [...current, value];
    });
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
          <Text style={[styles.title, { color: roleColors.textPrimary }]}>{t('videoCircles.title')}</Text>
          <View style={styles.headerActions}>
            {isTariffAdmin && (
              <TouchableOpacity onPress={() => navigation.navigate('VideoTariffsAdminScreen')} style={styles.myBtn}>
                <Text style={{ color: roleColors.textPrimary, fontWeight: '700', fontSize: 11 }}>{t('videoCircles.tariffs')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('MyVideoCirclesScreen')} style={styles.myBtn}>
              <Text style={{ color: roleColors.textPrimary, fontWeight: '700', fontSize: 12 }}>{t('videoCircles.myCircles')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openPublishSourceSheet} style={styles.backButton}>
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
          <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>
            {`scope=${feedScope}`}
          </Text>
          {!!filterCity && <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>{`city=${filterCity}`}</Text>}
          {!!filterMatha && <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>{`matha=${filterMatha}`}</Text>}
          {!!filterCategory && <Text style={[styles.filterStateText, { color: roleColors.textSecondary }]}>{`category=${filterCategory}`}</Text>}
        </View>
        <View style={styles.scopeRow}>
          <TouchableOpacity
            style={[
              styles.scopePill,
              { borderColor: roleColors.border, backgroundColor: feedScope === 'all' ? roleColors.accent : roleColors.surface },
            ]}
            onPress={() => setFeedScope('all')}
          >
            <Text style={{ color: feedScope === 'all' ? '#fff' : roleColors.textPrimary, fontWeight: '600' }}>Лента</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scopePill,
              { borderColor: roleColors.border, backgroundColor: feedScope === 'friends' ? roleColors.accent : roleColors.surface },
            ]}
            onPress={() => setFeedScope('friends')}
          >
            <Text style={{ color: feedScope === 'friends' ? '#fff' : roleColors.textPrimary, fontWeight: '600' }}>Кружки друзей</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.roleScopeRow}>
          {ROLE_FILTER_OPTIONS.map((option) => {
            const selected = roleScope.includes(option.value);
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.roleScopeChip,
                  { borderColor: roleColors.border, backgroundColor: selected ? roleColors.accent : roleColors.surface },
                ]}
                onPress={() => toggleRoleScope(option.value)}
              >
                <Text style={{ color: selected ? '#fff' : roleColors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ),
    [feedScope, filterCategory, filterCity, filterMatha, filterStatus, isTariffAdmin, navigation, roleColors.accent, roleColors.border, roleColors.surface, roleColors.textPrimary, roleColors.textSecondary, roleScope]
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
            <Text style={{ color: roleColors.textSecondary }}>{t('videoCircles.noCircles')}</Text>
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
              {!!item.category && (
                <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>
                  {t(`videoCircles.categories.${item.category}`)}
                </Text>
              )}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleInteraction(item, 'like')}>
                <Heart size={18} color={likedMap[item.id] ? '#ef4444' : roleColors.textPrimary} fill={likedMap[item.id] ? '#ef4444' : 'transparent'} />
                <Text style={{ color: roleColors.textPrimary }}>{item.likeCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => openCommentModal(item)}>
                <MessageSquare size={18} color={roleColors.textPrimary} />
                <Text style={{ color: roleColors.textPrimary }}>{item.commentCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => handleChatPress(item)}>
                <Send size={18} color={roleColors.textPrimary} />
                <Text style={{ color: roleColors.textPrimary }}>{item.chatCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.boostBtn, { backgroundColor: roleColors.accent }]} onPress={() => handleBoost(item.id)}>
                <Sparkles size={15} color="#fff" />
                <Text style={styles.boostText}>
                  {premiumPrice !== null ? `Premium ${premiumPrice} LKM` : t('videoCircles.premiumBoost')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={publishOpen} animationType="slide" transparent onRequestClose={resetPublishForm}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>{t('videoCircles.publishTitle')}</Text>
            <Text style={[styles.modalHint, { color: roleColors.textSecondary }]}>
              {selectedVideo?.fileName || t('chat.uploading')}
            </Text>

            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder={t('videoCircles.cityPlaceholder')}
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <Text style={[styles.categoryLabel, { color: roleColors.textSecondary }]}>{t('videoCircles.mathaLabel')}</Text>
            <View style={styles.categoryChipsWrap}>
              {(() => {
                // For devotee role with matha set - show only their matha (locked)
                const isDevoteeWithMatha = user?.role === 'devotee' && user?.madh;
                const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

                // Devotees with matha see only their tradition (unless admin)
                if (isDevoteeWithMatha && !isAdminOrSuperAdmin) {
                  return (
                    <View
                      style={[
                        styles.categoryChip,
                        {
                          borderColor: roleColors.accent,
                          backgroundColor: roleColors.accent,
                        },
                      ]}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                        {user.madh}
                      </Text>
                    </View>
                  );
                }

                // Everyone else (including admins) - show all traditions
                return DATING_TRADITIONS.map((tradition) => {
                  const selected = matha === tradition;
                  return (
                    <TouchableOpacity
                      key={tradition}
                      style={[
                        styles.categoryChip,
                        {
                          borderColor: selected ? roleColors.accent : roleColors.border,
                          backgroundColor: selected ? roleColors.accent : roleColors.surface,
                        },
                      ]}
                      onPress={() => setMatha(selected ? '' : tradition)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: selected ? '#fff' : roleColors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                        {tradition}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>

            <Text style={[styles.categoryLabel, { color: roleColors.textSecondary }]}>{t('videoCircles.categoryLabel')}</Text>
            <View style={styles.categoryChipsWrap}>
              {CIRCLE_CATEGORIES.map((cat) => {
                const selected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      {
                        borderColor: selected ? roleColors.accent : roleColors.border,
                        backgroundColor: selected ? roleColors.accent : roleColors.surface,
                      },
                    ]}
                    onPress={() => setCategory(selected ? '' : cat.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: selected ? '#fff' : roleColors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: roleColors.border }]} onPress={resetPublishForm} disabled={publishing}>
                <Text style={{ color: roleColors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: roleColors.accent }]} onPress={publishCircle} disabled={publishing}>
                {publishing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('videoCircles.publishBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={commentModalOpen} animationType="slide" transparent onRequestClose={() => setCommentModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>{t('contacts.sendMessage')}</Text>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={roleColors.textSecondary}
              multiline
              style={[
                styles.input,
                styles.commentInput,
                { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface },
              ]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: roleColors.border }]}
                onPress={() => setCommentModalOpen(false)}
              >
                <Text style={{ color: roleColors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: roleColors.accent }]} onPress={submitComment}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>{t('videoCircles.filtersTitle')}</Text>

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
              placeholder={t('registration.city')}
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={filterMatha}
              onChangeText={setFilterMatha}
              placeholder={t('dating.madh')}
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, { color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }]}
            />
            <TextInput
              value={filterCategory}
              onChangeText={setFilterCategory}
              placeholder={t('ads.create.category')}
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
                <Text style={{ color: roleColors.textSecondary }}>{t('videoCircles.reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: roleColors.accent }]}
                onPress={async () => {
                  setFiltersOpen(false);
                  setRefreshing(true);
                  await loadCircles();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('videoCircles.apply')}</Text>
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
  scopeRow: { marginTop: 8, flexDirection: 'row', gap: 8 },
  scopePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleScopeRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleScopeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
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
  commentInput: {
    minHeight: 88,
    textAlignVertical: 'top',
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
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

export default VideoCirclesScreen;
