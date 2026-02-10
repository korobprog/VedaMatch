import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Clock,
  Heart,
  MapPin,
  MessageSquare,
  Play,
  Plus,
  Send,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Video,
} from 'lucide-react-native';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { VideoCircle, VideoTariff, videoCirclesService } from '../../services/videoCirclesService';
import { RootStackParamList } from '../../types/navigation';
import { DATING_TRADITIONS } from '../../constants/DatingConstants';

type PortalRoleType = 'user' | 'in_goodness' | 'yogi' | 'devotee';
type VideoCirclesRouteParams = RootStackParamList['VideoCirclesScreen'];

const ROLE_DOT_COLORS: Record<PortalRoleType, string> = {
  user: '#3B82F6',
  in_goodness: '#22C55E',
  yogi: '#F59E0B',
  devotee: '#EF4444',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');



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

  const fabAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);

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

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const goingDown = currentY > lastScrollY.current && currentY > 60;
    lastScrollY.current = currentY;

    Animated.timing(fabAnim, {
      toValue: goingDown ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fabAnim]);

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
          <View style={styles.titleRow}>
            <Video size={20} color={roleColors.accent} />
            <Text style={[styles.title, { color: roleColors.textPrimary }]}>{t('videoCircles.title')}</Text>
          </View>
          <View style={styles.headerActions}>
            {isTariffAdmin && (
              <TouchableOpacity onPress={() => navigation.navigate('VideoTariffsAdminScreen')} style={styles.myBtn}>
                <Text style={{ color: roleColors.accent, fontWeight: '700', fontSize: 11 }}>{t('videoCircles.tariffs')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('MyVideoCirclesScreen')}
              style={[styles.myBtn, { backgroundColor: roleColors.accentSoft }]}
            >
              <Text style={{ color: roleColors.accent, fontWeight: '700', fontSize: 12 }}>{t('videoCircles.myCircles')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltersOpen(true)} style={styles.iconBtn}>
              <SlidersHorizontal size={18} color={roleColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scopeRow}>
          {(['all', 'friends'] as const).map((scope) => {
            const active = feedScope === scope;
            return (
              <TouchableOpacity
                key={scope}
                style={[
                  styles.scopePill,
                  {
                    backgroundColor: active ? roleColors.accent : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                    borderColor: active ? roleColors.accent : roleColors.border,
                    ...(active && Platform.OS === 'ios' ? {
                      shadowColor: roleColors.accent,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    } : {}),
                  },
                ]}
                onPress={() => setFeedScope(scope)}
                activeOpacity={0.7}
              >
                <Text style={[styles.scopePillText, { color: active ? '#fff' : roleColors.textPrimary }]}>
                  {scope === 'all' ? t('videoCircles.feed') || 'Лента' : t('videoCircles.friendsCircles') || 'Кружки друзей'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.roleScopeRow}>
          {ROLE_FILTER_OPTIONS.map((option) => {
            const selected = roleScope.includes(option.value);
            const dotColor = ROLE_DOT_COLORS[option.value];
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.roleScopeChip,
                  {
                    borderColor: selected ? dotColor : roleColors.border,
                    backgroundColor: selected
                      ? (isDarkMode ? `${dotColor}22` : `${dotColor}18`)
                      : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'),
                  },
                ]}
                onPress={() => toggleRoleScope(option.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.roleDot, { backgroundColor: dotColor, opacity: selected ? 1 : 0.4 }]} />
                <Text style={{
                  color: selected ? (isDarkMode ? '#fff' : dotColor) : roleColors.textSecondary,
                  fontSize: 13,
                  fontWeight: selected ? '700' : '500',
                  letterSpacing: 0.2,
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ),
    [feedScope, isDarkMode, isTariffAdmin, navigation, roleColors, roleScope, t]
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
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Video size={32} color={roleColors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: roleColors.textPrimary }]}>{t('videoCircles.noCircles')}</Text>
            <Text style={[styles.emptyHint, { color: roleColors.textSecondary }]}>
              {t('videoCircles.noCirclesHint') || 'Запишите первый видео-кружок!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[
            styles.card,
            {
              backgroundColor: roleColors.surfaceElevated,
              borderColor: roleColors.border,
              ...(Platform.OS === 'ios' ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDarkMode ? 0.4 : 0.12,
                shadowRadius: 12,
              } : { elevation: 6 }),
            },
          ]}>
            <View style={styles.mediaWrap}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
                  <Play size={40} color={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'} />
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.mediaGradient}
              />
              <View style={styles.topBadges}>
                <View style={styles.badgeWrap}>
                  <Clock size={10} color="#fff" />
                  <Text style={styles.badge}>60s</Text>
                </View>
                <View style={[styles.badgeWrap, styles.timerBadge]}>
                  <Text style={styles.badge}>{renderTime(item.remainingSec)}</Text>
                </View>
              </View>
              <View style={styles.playOverlay}>
                <View style={styles.playBtn}>
                  <Play size={22} color="#fff" fill="#fff" />
                </View>
              </View>
            </View>

            <View style={styles.cardBody}>
              {(!!item.city || !!item.matha || !!item.category) && (
                <View style={styles.metaRow}>
                  {!!item.city && (
                    <View style={[styles.metaPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                      <MapPin size={11} color={roleColors.textSecondary} />
                      <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>{item.city}</Text>
                    </View>
                  )}
                  {!!item.matha && (
                    <View style={[styles.metaPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                      <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>{item.matha}</Text>
                    </View>
                  )}
                  {!!item.category && (
                    <View style={[styles.metaPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                      <Tag size={11} color={roleColors.textSecondary} />
                      <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>
                        {t(`videoCircles.categories.${item.category}`)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleInteraction(item, 'like')} activeOpacity={0.7}>
                  <Heart
                    size={20}
                    color={likedMap[item.id] ? '#EF4444' : roleColors.textSecondary}
                    fill={likedMap[item.id] ? '#EF4444' : 'transparent'}
                  />
                  <Text style={[styles.actionCount, { color: likedMap[item.id] ? '#EF4444' : roleColors.textSecondary }]}>
                    {item.likeCount}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => openCommentModal(item)} activeOpacity={0.7}>
                  <MessageSquare size={20} color={roleColors.textSecondary} />
                  <Text style={[styles.actionCount, { color: roleColors.textSecondary }]}>{item.commentCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleChatPress(item)} activeOpacity={0.7}>
                  <Send size={19} color={roleColors.textSecondary} />
                  <Text style={[styles.actionCount, { color: roleColors.textSecondary }]}>{item.chatCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boostBtn, { backgroundColor: roleColors.accent }]}
                  onPress={() => handleBoost(item.id)}
                  activeOpacity={0.8}
                >
                  <Sparkles size={14} color="#fff" />
                  <Text style={styles.boostText}>
                    {premiumPrice !== null ? `${premiumPrice} LKM` : t('videoCircles.premiumBoost')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <Animated.View
        style={[
          styles.fab,
          {
            opacity: fabAnim,
            transform: [{
              translateY: fabAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            }],
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={openPublishSourceSheet}
          activeOpacity={0.85}
          style={[
            styles.fabButton,
            {
              backgroundColor: roleColors.accent,
              ...(Platform.OS === 'ios' ? {
                shadowColor: roleColors.accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
              } : { elevation: 8 }),
            },
          ]}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>

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
  listContent: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header Styles
  headerWrap: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scope & Role Chips
  scopeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  scopePill: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scopePillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleScopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleScopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Video Card Styles
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaWrap: {
    height: SCREEN_WIDTH * 0.65,
    position: 'relative',
    backgroundColor: '#000',
  },
  thumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  topBadges: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  timerBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  badge: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  cardBody: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  boostBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  boostText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    left: 20,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyWrap: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalCard: {
    borderRadius: 28,
    padding: 24,
    gap: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusPill: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  commentInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VideoCirclesScreen;
