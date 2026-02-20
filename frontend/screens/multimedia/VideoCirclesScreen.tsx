import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
  ViewToken,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import RNVideo from 'react-native-video';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { UploadVideoCirclePayload, VideoCircle, VideoTariff, videoCirclesService } from '../../services/videoCirclesService';
import { RootStackParamList, VideoCirclePlayerPayload } from '../../types/navigation';
import { DATING_TRADITIONS } from '../../constants/DatingConstants';

type PortalRoleType = 'user' | 'in_goodness' | 'yogi' | 'devotee';
type VideoCirclesRouteParams = RootStackParamList['VideoCirclesScreen'];
type VideoCirclesNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VideoCirclesRouteProp = RouteProp<RootStackParamList, 'VideoCirclesScreen'>;

const ROLE_DOT_COLORS: Record<PortalRoleType, string> = {
  user: '#3B82F6',
  in_goodness: '#22C55E',
  yogi: '#F59E0B',
  devotee: '#EF4444',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CIRCLE_PREVIEW_DURATION_SEC = 3;
const CIRCLE_PREVIEW_RESTART_COOLDOWN_MS = 8000;
const CIRCLE_PREVIEW_VIEWABILITY_CONFIG = {
  viewAreaCoveragePercentThreshold: 70,
};



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
  const navigation = useNavigation<VideoCirclesNavigationProp>();
  const route = useRoute<VideoCirclesRouteProp>();
  const { t } = useTranslation();
  const routeParams: VideoCirclesRouteParams = route?.params;
  const routeChannelId = routeParams?.channelId;
  const { isDarkMode } = useSettings();
  const { user } = useUser();
  const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
  const openPublishHandled = useRef(false);
  const latestCirclesRequestRef = useRef(0);
  const latestTariffsRequestRef = useRef(0);
  const lastPreviewAtByIdRef = useRef<Record<number, number>>({});
  const viewabilityConfigRef = useRef(CIRCLE_PREVIEW_VIEWABILITY_CONFIG);
  const isMountedRef = useRef(true);
  const interactionLocksRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circles, setCircles] = useState<VideoCircle[]>([]);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [tariffs, setTariffs] = useState<VideoTariff[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [boostingCircleIds, setBoostingCircleIds] = useState<number[]>([]);
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
  const [isWifiConnected, setIsWifiConnected] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [activeVisibleCircleId, setActiveVisibleCircleId] = useState<number | null>(null);
  const [playingPreviewCircleId, setPlayingPreviewCircleId] = useState<number | null>(null);
  const [previewBlockedIds, setPreviewBlockedIds] = useState<number[]>([]);
  const [backgroundPublishing, setBackgroundPublishing] = useState(false);
  const [backgroundPublishLabel, setBackgroundPublishLabel] = useState('');
  const isTariffAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isProMode = !!(user?.godModeEnabled || user?.role === 'superadmin');
  const profileMatha = useMemo(() => (user?.madh || '').trim(), [user?.madh]);

  const fabAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const topVisible = [...viewableItems]
      .filter((token) => token.isViewable && token.item && typeof token.index === 'number')
      .sort(
        (a, b) =>
          (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER)
      )[0];
    const nextVisibleId = topVisible ? (topVisible.item as VideoCircle).id : null;
    setActiveVisibleCircleId((currentId) => (currentId === nextVisibleId ? currentId : nextVisibleId));
  });

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
  const myBtnTariffTextStyle = useMemo(() => ({ color: roleColors.accent }), [roleColors.accent]);
  const emptyIconBackgroundStyle = useMemo(
    () => ({ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }),
    [isDarkMode]
  );
  const placeholderThumbStyle = useMemo(
    () => ({ backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }),
    [isDarkMode]
  );
  const metaPillStyle = useMemo(
    () => ({ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }),
    [isDarkMode]
  );

  const loadCircles = useCallback(async () => {
    const requestId = ++latestCirclesRequestRef.current;
    const mathaForRequest = isProMode ? filterMatha.trim() : profileMatha;
    try {
      const res = await videoCirclesService.getVideoCircles({
        channelId: routeChannelId,
        status: filterStatus,
        city: filterCity.trim() || undefined,
        matha: mathaForRequest || undefined,
        category: filterCategory.trim() || undefined,
        roleScope,
        scope: feedScope,
        limit: 30,
        sort: 'newest',
      });
      if (requestId === latestCirclesRequestRef.current && isMountedRef.current) {
        setCircles(Array.isArray(res?.circles) ? res.circles : []);
      }
    } catch (error) {
      console.error('Failed to load video circles:', error);
      if (requestId === latestCirclesRequestRef.current && isMountedRef.current) {
        Alert.alert(t('common.error'), t('videoCircles.errorLoad'));
      }
    } finally {
      if (requestId === latestCirclesRequestRef.current && isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [feedScope, filterCategory, filterCity, filterMatha, filterStatus, isProMode, profileMatha, roleScope, routeChannelId, t]);

  const loadTariffs = useCallback(async () => {
    const requestId = ++latestTariffsRequestRef.current;
    try {
      const list = await videoCirclesService.getVideoTariffs();
      if (requestId === latestTariffsRequestRef.current && isMountedRef.current) {
        setTariffs(list);
      }
    } catch (error) {
      console.error('Failed to load video tariffs:', error);
    }
  }, []);

  useEffect(() => {
    loadCircles();
    loadTariffs();
  }, [loadCircles, loadTariffs]);

  useEffect(() => {
    const applyNetworkState = (state: NetInfoState) => {
      const onWifi = state.isConnected === true && state.type === 'wifi';
      setIsWifiConnected(onWifi);
    };

    let active = true;
    NetInfo.fetch()
      .then((state) => {
        if (active) {
          applyNetworkState(state);
        }
      })
      .catch(() => {
        if (active) {
          setIsWifiConnected(false);
        }
      });

    const unsubscribe = NetInfo.addEventListener(applyNetworkState);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      latestCirclesRequestRef.current += 1;
      latestTariffsRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (routeParams?.scope === 'friends') {
      setFeedScope('friends');
    }
  }, [routeParams?.scope]);

  useEffect(() => {
    if (roleScope.length > 0) {
      return;
    }
    if (isProMode) {
      return;
    }
    setRoleScope([normalizePortalRole(user?.role)]);
  }, [isProMode, roleScope.length, user?.role]);

  useEffect(() => {
    if (!isProMode) {
      setFilterMatha(profileMatha);
      setMatha(profileMatha);
    }
  }, [isProMode, profileMatha]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCircles((prev) => {
        const updated = prev.map((item) => ({
          ...item,
          remainingSec: Math.max(item.remainingSec - 1, 0),
        }));
        if (filterStatus === 'active') {
          return updated.filter((item) => item.remainingSec > 0);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [filterStatus]);

  useEffect(() => {
    if (!circles.length) {
      setActiveVisibleCircleId(null);
      setPlayingPreviewCircleId(null);
      return;
    }

    if (activeVisibleCircleId === null) {
      setActiveVisibleCircleId(circles[0].id);
      return;
    }

    if (!circles.some((circle) => circle.id === activeVisibleCircleId)) {
      setActiveVisibleCircleId(circles[0].id);
    }
  }, [activeVisibleCircleId, circles]);

  useEffect(() => {
    if (!isAppActive || !isWifiConnected || activeVisibleCircleId === null) {
      setPlayingPreviewCircleId((currentId) => {
        if (currentId !== null) {
          lastPreviewAtByIdRef.current[currentId] = Date.now();
        }
        return null;
      });
      return;
    }

    const activeCircle = circles.find((circle) => circle.id === activeVisibleCircleId);
    const activeMediaUrl = (activeCircle?.mediaUrl || '').trim();

    if (!activeCircle || !activeMediaUrl || previewBlockedIds.includes(activeVisibleCircleId)) {
      setPlayingPreviewCircleId((currentId) => {
        if (currentId !== null) {
          lastPreviewAtByIdRef.current[currentId] = Date.now();
        }
        return null;
      });
      return;
    }

    const lastPreviewAt = lastPreviewAtByIdRef.current[activeVisibleCircleId] || 0;
    const inCooldown = Date.now() - lastPreviewAt < CIRCLE_PREVIEW_RESTART_COOLDOWN_MS;

    if (inCooldown) {
      setPlayingPreviewCircleId((currentId) => {
        if (currentId !== null) {
          lastPreviewAtByIdRef.current[currentId] = Date.now();
        }
        return null;
      });
      return;
    }

    setPlayingPreviewCircleId((currentId) => {
      if (currentId !== null && currentId !== activeVisibleCircleId) {
        lastPreviewAtByIdRef.current[currentId] = Date.now();
      }
      return currentId === activeVisibleCircleId ? currentId : activeVisibleCircleId;
    });
  }, [activeVisibleCircleId, circles, isAppActive, isWifiConnected, previewBlockedIds]);

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

  const finishPreview = useCallback((circleId: number, blockPreview = false) => {
    if (blockPreview) {
      setPreviewBlockedIds((current) =>
        current.includes(circleId) ? current : [...current, circleId]
      );
    }

    lastPreviewAtByIdRef.current[circleId] = Date.now();
    setPlayingPreviewCircleId((currentId) => (currentId === circleId ? null : currentId));
  }, []);

  const handlePreviewProgress = useCallback(
    (circleId: number, currentTime: number) => {
      if (playingPreviewCircleId !== circleId) {
        return;
      }
      if (currentTime >= CIRCLE_PREVIEW_DURATION_SEC) {
        finishPreview(circleId);
      }
    },
    [finishPreview, playingPreviewCircleId]
  );

  const handlePreviewEnd = useCallback(
    (circleId: number) => {
      finishPreview(circleId);
    },
    [finishPreview]
  );

  const handlePreviewError = useCallback(
    (circleId: number, error: unknown) => {
      console.warn('Video circle preview failed:', error);
      finishPreview(circleId, true);
    },
    [finishPreview]
  );

  const openVideoPicker = useCallback(async (source: 'camera' | 'gallery') => {
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
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
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
        return;
      }
      const asset = result.assets[0];
      if ((asset.fileSize || 0) > 250 * 1024 * 1024) {
        Alert.alert('Слишком большой файл', 'Максимальный размер видео для кружка — 250MB');
        return;
      }
      if (!isMountedRef.current) {
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
  }, [t]);

  const openPublishSourceSheet = useCallback(() => {
    Alert.alert(t('videoCircles.publishTitle'), t('chat.chooseAction'), [
      { text: t('contacts.takePhoto'), onPress: () => openVideoPicker('camera') },
      { text: t('chat.customImage'), onPress: () => openVideoPicker('gallery') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [openVideoPicker, t]);

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
    setMatha(profileMatha);
    setCategory('');
  };

  // Pre-fill form with user profile data when opening publish modal
  useEffect(() => {
    if (publishOpen && selectedVideo) {
      if (!city && user?.city) setCity(user.city);
      if (!matha && profileMatha) setMatha(profileMatha);
    }
  }, [city, matha, profileMatha, publishOpen, selectedVideo, user?.city]);

  const prependCircleToFeed = useCallback((circle: VideoCircle) => {
    setCircles((current) => [circle, ...current.filter((item) => item.id !== circle.id)]);
  }, []);

  const getPublishErrorMessage = useCallback((error: unknown) => {
    const errorText = error instanceof Error ? error.message : '';
    const normalizedError = errorText.toLowerCase();
    if (normalizedError.includes('upload_timeout')) {
      return t('videoCircles.errorUploadTimeout');
    }
    if (normalizedError.includes('category is required')) {
      return t('videoCircles.requiredCategory');
    }
    if (normalizedError.includes('matha is required')) {
      return t('videoCircles.requiredMatha');
    }
    return t('videoCircles.errorPublish');
  }, [t]);

  const runBackgroundPublish = useCallback(async (payload: UploadVideoCirclePayload) => {
    try {
      const createdCircle = await videoCirclesService.uploadAndCreateCircle(payload);
      if (!isMountedRef.current) {
        return;
      }

      prependCircleToFeed(createdCircle);
      setRefreshing(true);
      await loadCircles();
    } catch (error) {
      console.error('Failed to publish circle:', error);
      if (!isMountedRef.current) {
        return;
      }
      Alert.alert(t('common.error'), getPublishErrorMessage(error));
    } finally {
      if (isMountedRef.current) {
        setPublishing(false);
        setBackgroundPublishing(false);
        setBackgroundPublishLabel('');
      }
    }
  }, [getPublishErrorMessage, loadCircles, prependCircleToFeed, t]);

  const publishCircle = async () => {
    if (publishing) {
      return;
    }
    if (!selectedVideo?.uri) {
      Alert.alert(t('common.error'), t('chat.imagePickError'));
      return;
    }
    if (!isProMode && !profileMatha) {
      Alert.alert(t('common.error'), t('videoCircles.profileMathaRequired'));
      return;
    }

    const publishMatha = isProMode ? matha.trim() : profileMatha;
    if (!publishMatha) {
      Alert.alert(t('common.error'), t('videoCircles.requiredMatha'));
      return;
    }
    if (!category.trim()) {
      Alert.alert(t('common.error'), t('videoCircles.requiredCategory'));
      return;
    }

    const payload: UploadVideoCirclePayload = {
      video: {
        uri: selectedVideo.uri,
        name: selectedVideo.fileName || `circle_${Date.now()}.mp4`,
        type: selectedVideo.type || 'video/mp4',
      },
      channelId: routeChannelId,
      city: city.trim() || undefined,
      matha: publishMatha || undefined,
      category: category.trim() || undefined,
      durationSec: 60,
    };

    setPublishing(true);
    setBackgroundPublishing(true);
    setBackgroundPublishLabel(selectedVideo.fileName || t('videoCircles.publishInBackground'));
    resetPublishForm();

    void runBackgroundPublish(payload);
  };

  const applyInteractionResponse = (
    circleId: number,
    response?: {
      likeCount?: number;
      commentCount?: number;
      chatCount?: number;
      likedByUser?: boolean;
    }
  ) => {
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
    const likedByUser = response.likedByUser;
    if (typeof likedByUser === 'boolean') {
      setLikedMap((prevMap) => ({ ...prevMap, [circleId]: likedByUser }));
    }
  };

  const handleInteraction = async (circle: VideoCircle, type: 'like' | 'comment' | 'chat') => {
    const lockKey = `${circle.id}:${type}`;
    if (interactionLocksRef.current.has(lockKey)) {
      return;
    }
    interactionLocksRef.current.add(lockKey);

    let previousCircle: VideoCircle | undefined;
    const liked = !!likedMap[circle.id];

    setCircles((list) => {
      previousCircle = list.find((item) => item.id === circle.id);
      return list.map((item) => {
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
      });
    });

    if (type === 'like') {
      setLikedMap((prevMap) => ({ ...prevMap, [circle.id]: !liked }));
    }

    try {
      const action = type === 'like' ? 'toggle' : 'add';
      const response = await videoCirclesService.interact(circle.id, type, action);
      if (!isMountedRef.current) {
        return;
      }
      applyInteractionResponse(circle.id, response);
    } catch (error) {
      console.error('Failed interaction:', error);
      if (!isMountedRef.current) {
        return;
      }
      if (previousCircle) {
        setCircles((list) => list.map((item) => (item.id === circle.id ? previousCircle as VideoCircle : item)));
      }
      if (type === 'like') {
        setLikedMap((prevMap) => ({ ...prevMap, [circle.id]: liked }));
      }
      Alert.alert(t('common.error'), t('videoCircles.errorUpdateReaction'));
    } finally {
      interactionLocksRef.current.delete(lockKey);
    }
  };

  const openCommentModal = (circle: VideoCircle) => {
    setCommentTarget(circle);
    setCommentText('');
    setCommentModalOpen(true);
  };

  const closeCommentModal = () => {
    setCommentModalOpen(false);
    setCommentTarget(null);
    setCommentText('');
  };

  const submitComment = async () => {
    if (!commentTarget) return;
    if (!commentText.trim()) {
      Alert.alert(t('common.error'), t('videoCircles.commentPlaceholder') || 'Введите комментарий');
      return;
    }

    const target = commentTarget;
    closeCommentModal();
    await handleInteraction(target, 'comment');
  };

  const handleChatPress = async (circle: VideoCircle) => {
    if (user?.ID && circle.authorId === user.ID) {
      return;
    }

    try {
      await handleInteraction(circle, 'chat');
    } catch {
      // Ignore interaction logging failure to keep chat entry available.
    }
    navigation.navigate('Chat', { userId: circle.authorId });
  };

  const openCirclePlayer = (circle: VideoCircle) => {
    const mediaUrl = (circle.mediaUrl || '').trim();
    if (!mediaUrl) {
      Alert.alert(t('common.error'), t('videoCircles.errorPlay'));
      return;
    }

    const circlePayload: VideoCirclePlayerPayload = {
      id: circle.id,
      authorId: circle.authorId,
      mediaUrl: mediaUrl,
      thumbnailUrl: circle.thumbnailUrl,
      city: circle.city,
      matha: circle.matha,
      category: circle.category,
      likeCount: circle.likeCount || 0,
      commentCount: circle.commentCount || 0,
      chatCount: circle.chatCount || 0,
    };

    navigation.navigate('VideoPlayer', {
      video: {
        id: circle.id,
        url: mediaUrl,
        title: t(`videoCircles.categories.${circle.category}`, { defaultValue: t('videoCircles.title') }),
        artist: circle.matha || t('videoCircles.title'),
        description: [circle.city, circle.matha].filter(Boolean).join(' • '),
        viewCount: 0,
        likeCount: circle.likeCount || 0,
      },
      source: 'video_circles',
      circle: circlePayload,
    });
  };

  const handleBoost = async (circleId: number) => {
    if (boostingCircleIds.includes(circleId)) {
      return;
    }
    setBoostingCircleIds((prev) => [...prev, circleId]);
    try {
      await videoCirclesService.boostCircle(circleId, 'premium');
      if (!isMountedRef.current) {
        return;
      }
      await loadCircles();
      Alert.alert(t('common.success'), t('videoCircles.successBoost'));
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }
      const message = error instanceof Error && error.message.includes('INSUFFICIENT_LKM')
        ? t('videoCircles.insufficientLkm')
        : t('videoCircles.errorBoost');
      Alert.alert(t('common.error'), message);
    } finally {
      if (isMountedRef.current) {
        setBoostingCircleIds((prev) => prev.filter((id) => id !== circleId));
      }
    }
  };

  const premiumPrice = useMemo(() => {
    const item = tariffs.find((tariff) => tariff.code === 'premium_boost' && tariff.isActive);
    return item?.priceLkm ?? null;
  }, [tariffs]);
  const roleTextSecondaryStyle = useMemo(() => ({ color: roleColors.textSecondary }), [roleColors.textSecondary]);
  const roleTextPrimaryStyle = useMemo(() => ({ color: roleColors.textPrimary }), [roleColors.textPrimary]);
  const roleAccentBackgroundStyle = useMemo(() => ({ backgroundColor: roleColors.accent }), [roleColors.accent]);
  const myBtnAccentSoftStyle = useMemo(() => ({ backgroundColor: roleColors.accentSoft }), [roleColors.accentSoft]);
  const inputSurfaceStyle = useMemo(
    () => ({ color: roleColors.textPrimary, borderColor: roleColors.border, backgroundColor: roleColors.surface }),
    [roleColors.border, roleColors.surface, roleColors.textPrimary]
  );
  const modalCardStyle = useMemo(
    () => ({ backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }),
    [roleColors.border, roleColors.surfaceElevated]
  );
  const publishBlockedByMatha = !isProMode && !profileMatha;
  const publishSubmitDisabled = publishing || publishBlockedByMatha;

  const getRoleDotStyle = useCallback(
    (selected: boolean, dotColor: string) => ({ backgroundColor: dotColor, opacity: selected ? 1 : 0.4 }),
    []
  );

  const getRoleScopeTextStyle = useCallback(
    (selected: boolean, dotColor: string) => [
      styles.roleScopeText,
      selected ? (isDarkMode ? styles.roleScopeTextSelectedDark : { color: dotColor, fontWeight: '700' as const }) : roleTextSecondaryStyle,
    ],
    [isDarkMode, roleTextSecondaryStyle]
  );

  const getStatusTextStyle = useCallback(
    (status: 'active' | 'expired' | 'deleted') => [
      styles.statusText,
      filterStatus === status ? styles.statusTextActive : roleTextPrimaryStyle,
    ],
    [filterStatus, roleTextPrimaryStyle]
  );

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
              <TouchableOpacity
                onPress={() => navigation.navigate('VideoTariffsAdminScreen')}
                style={styles.myBtn}
                testID="video-circles-promotion-btn"
              >
                <Text style={[styles.myBtnTariffText, myBtnTariffTextStyle]}>{t('videoCircles.tariffs')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('MyVideoCirclesScreen')}
              style={[styles.myBtn, myBtnAccentSoftStyle]}
            >
              <Text style={[styles.myBtnText, myBtnTariffTextStyle]}>{t('videoCircles.myCircles')}</Text>
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
                <Text style={active ? styles.scopePillTextActive : [styles.scopePillText, roleTextPrimaryStyle]}>
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
                <View style={[styles.roleDot, getRoleDotStyle(selected, dotColor)]} />
                <Text style={getRoleScopeTextStyle(selected, dotColor)}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ),
    [
      ROLE_FILTER_OPTIONS,
      feedScope,
      getRoleDotStyle,
      getRoleScopeTextStyle,
      isDarkMode,
      isTariffAdmin,
      myBtnAccentSoftStyle,
      myBtnTariffTextStyle,
      navigation,
      roleColors,
      roleScope,
      roleTextPrimaryStyle,
      t,
    ]
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
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfigRef.current}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconWrap, emptyIconBackgroundStyle]}>
              <Video size={32} color={roleColors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: roleColors.textPrimary }]}>{t('videoCircles.noCircles')}</Text>
            <Text style={[styles.emptyHint, { color: roleColors.textSecondary }]}>
              {t('videoCircles.noCirclesHint') || 'Запишите первый видео-кружок!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const shouldRenderPreview =
            playingPreviewCircleId === item.id &&
            activeVisibleCircleId === item.id &&
            isAppActive &&
            isWifiConnected &&
            !previewBlockedIds.includes(item.id) &&
            !!(item.mediaUrl || '').trim();

          return (
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
              <TouchableOpacity
                style={styles.mediaWrap}
                activeOpacity={0.9}
                onPress={() => openCirclePlayer(item)}
                testID={`video-circle-media-${item.id}`}
              >
                {shouldRenderPreview ? (
                  <RNVideo
                    source={{ uri: item.mediaUrl }}
                    style={styles.thumb}
                    muted
                    controls={false}
                    repeat={false}
                    paused={false}
                    resizeMode="cover"
                    playInBackground={false}
                    ignoreSilentSwitch="ignore"
                    testID={`video-circle-preview-${item.id}`}
                    onProgress={(progress) => handlePreviewProgress(item.id, progress.currentTime)}
                    onEnd={() => handlePreviewEnd(item.id)}
                    onError={(error) => handlePreviewError(item.id, error)}
                  />
                ) : item.thumbnailUrl ? (
                  <Image testID={`video-circle-thumb-${item.id}`} source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
                ) : (
                  <View testID={`video-circle-thumb-${item.id}`} style={[styles.thumb, placeholderThumbStyle]}>
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
                {!shouldRenderPreview && (
                  <View style={styles.playOverlay}>
                    <View style={styles.playBtn}>
                      <Play size={22} color="#fff" fill="#fff" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.cardBody}>
              {(!!item.city || !!item.matha || !!item.category) && (
                <View style={styles.metaRow}>
                  {!!item.city && (
                    <View style={[styles.metaPill, metaPillStyle]}>
                      <MapPin size={11} color={roleColors.textSecondary} />
                      <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>{item.city}</Text>
                    </View>
                  )}
                  {!!item.matha && (
                    <View style={[styles.metaPill, metaPillStyle]}>
                      <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>{item.matha}</Text>
                    </View>
                  )}
                  {!!item.category && (
                    <View style={[styles.metaPill, metaPillStyle]}>
                      <Tag size={11} color={roleColors.textSecondary} />
                      <Text style={[styles.metaText, { color: roleColors.textSecondary }]}>
                        {t(`videoCircles.categories.${item.category}`, { defaultValue: item.category })}
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
                  <Text style={likedMap[item.id] ? styles.actionCountLiked : [styles.actionCount, roleTextSecondaryStyle]}>
                    {item.likeCount}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => openCommentModal(item)} activeOpacity={0.7}>
                  <MessageSquare size={20} color={roleColors.textSecondary} />
                  <Text style={[styles.actionCount, { color: roleColors.textSecondary }]}>{item.commentCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, (user?.ID != null && item.authorId === user.ID) ? styles.disabledAction : undefined]}
                  onPress={() => handleChatPress(item)}
                  activeOpacity={0.7}
                  disabled={Boolean(user?.ID != null && item.authorId === user.ID)}
                >
                  <Send size={19} color={roleColors.textSecondary} />
                  <Text style={[styles.actionCount, { color: roleColors.textSecondary }]}>{item.chatCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.boostBtn,
                    { backgroundColor: roleColors.accent },
                    boostingCircleIds.includes(item.id) && styles.disabledAction,
                  ]}
                  onPress={() => handleBoost(item.id)}
                  activeOpacity={0.8}
                  disabled={boostingCircleIds.includes(item.id)}
                >
                  {boostingCircleIds.includes(item.id) ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Sparkles size={14} color="#fff" />
                  )}
                  <Text style={styles.boostText}>
                    {premiumPrice !== null ? `${premiumPrice} LKM` : t('videoCircles.premiumBoost')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          );
        }}
      />

      {backgroundPublishing && (
        <View
          style={[
            styles.backgroundPublishBanner,
            { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border },
          ]}
          testID="video-circle-background-publish-indicator"
        >
          <ActivityIndicator size="small" color={roleColors.accent} />
          <Text style={[styles.backgroundPublishText, { color: roleColors.textPrimary }]}>
            {backgroundPublishLabel || t('videoCircles.publishInBackground')}
          </Text>
        </View>
      )}

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
          testID="video-circle-open-publish-btn"
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
        <View style={styles.modalOverlay} testID="video-circle-publish-modal">
          <View style={[styles.modalCard, modalCardStyle]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>{t('videoCircles.publishTitle')}</Text>
            <Text style={[styles.modalHint, { color: roleColors.textSecondary }]}>
              {selectedVideo?.fileName || t('chat.uploading')}
            </Text>

            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder={t('videoCircles.cityPlaceholder')}
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, inputSurfaceStyle]}
            />
            <Text style={[styles.categoryLabel, { color: roleColors.textSecondary }]}>{t('videoCircles.mathaLabel')}</Text>
            <View style={styles.categoryChipsWrap}>
              {(() => {
                if (!isProMode) {
                  if (!profileMatha) {
                    return (
                      <View style={styles.mathaWarningWrap}>
                        <Text style={[styles.mathaWarningText, { color: roleColors.warning }]}>
                          {t('videoCircles.profileMathaRequired')}
                        </Text>
                      </View>
                    );
                  }
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
                      <Text style={styles.categoryChipTextActiveSmall}>
                        {profileMatha}
                      </Text>
                    </View>
                  );
                }

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
                      <Text style={selected ? styles.categoryChipTextActiveSmall : [styles.categoryChipTextSmall, roleTextPrimaryStyle]}>
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
                    <Text style={selected ? styles.categoryChipTextActive : [styles.categoryChipText, roleTextPrimaryStyle]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: roleColors.border }]} onPress={resetPublishForm} disabled={publishing}>
                <Text style={roleTextSecondaryStyle}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  roleAccentBackgroundStyle,
                  publishSubmitDisabled && styles.disabledAction,
                ]}
                onPress={publishCircle}
                disabled={publishSubmitDisabled}
                testID="video-circle-publish-submit-btn"
              >
                {publishing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('videoCircles.publishBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={commentModalOpen} animationType="slide" transparent onRequestClose={closeCommentModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={[styles.modalCard, modalCardStyle, styles.commentModalCard]}>
            <Text style={[styles.modalTitle, { color: roleColors.textPrimary }]}>{t('contacts.sendMessage')}</Text>
            <View style={[styles.commentComposer, { borderColor: roleColors.border, backgroundColor: roleColors.surface }]}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={roleColors.textSecondary}
                multiline
                autoFocus
                style={[
                  styles.commentComposerInput,
                  { color: roleColors.textPrimary },
                ]}
              />
              <TouchableOpacity style={[styles.commentSendBtn, roleAccentBackgroundStyle]} onPress={submitComment}>
                <Send size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: roleColors.border }]} onPress={closeCommentModal}>
                <Text style={roleTextSecondaryStyle}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, modalCardStyle]}>
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
                  <Text style={getStatusTextStyle(status)}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={filterCity}
              onChangeText={setFilterCity}
              placeholder={t('registration.city')}
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, inputSurfaceStyle]}
            />
            <TextInput
              value={isProMode ? filterMatha : profileMatha}
              onChangeText={setFilterMatha}
              placeholder={t('dating.madh')}
              placeholderTextColor={roleColors.textSecondary}
              editable={isProMode}
              style={[styles.input, inputSurfaceStyle, !isProMode && styles.inputReadonly]}
            />
            {!isProMode && !profileMatha && (
              <Text style={[styles.mathaWarningText, { color: roleColors.warning }]}>
                {t('videoCircles.profileMathaRequired')}
              </Text>
            )}
            <TextInput
              value={filterCategory}
              onChangeText={setFilterCategory}
              placeholder={t('ads.create.category')}
              placeholderTextColor={roleColors.textSecondary}
              style={[styles.input, inputSurfaceStyle]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: roleColors.border }]}
                onPress={() => {
                  setFilterStatus('active');
                  setFilterCity('');
                  setFilterMatha(isProMode ? '' : profileMatha);
                  setFilterCategory('');
                }}
              >
                <Text style={roleTextSecondaryStyle}>{t('videoCircles.reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, roleAccentBackgroundStyle]}
                onPress={async () => {
                  setFiltersOpen(false);
                  setRefreshing(true);
                  await loadCircles();
                }}
              >
                <Text style={styles.primaryBtnText}>{t('videoCircles.apply')}</Text>
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
  backgroundPublishBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 112 : 98,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backgroundPublishText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },

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
  myBtnTariffText: {
    fontWeight: '700',
    fontSize: 11,
  },
  myBtnText: {
    fontWeight: '700',
    fontSize: 12,
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
  scopePillTextActive: {
    color: '#fff',
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
  roleScopeText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  roleScopeTextSelectedDark: {
    color: '#fff',
    fontWeight: '700',
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
  actionCountLiked: {
    color: '#EF4444',
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
  disabledAction: {
    opacity: 0.6,
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
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  statusTextActive: {
    fontWeight: '800',
    opacity: 1,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputReadonly: {
    opacity: 0.75,
  },
  commentInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  commentModalCard: {
    gap: 12,
  },
  commentComposer: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentComposerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    fontSize: 16,
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
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
  mathaWarningWrap: {
    width: '100%',
    paddingVertical: 8,
  },
  mathaWarningText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActiveSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default VideoCirclesScreen;
