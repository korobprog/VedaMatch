import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Eye, MessageCircle, MoreHorizontal, Pin, PlusCircle, Settings2, Share2, Smile, ThumbsUp, Video } from 'lucide-react-native';
import { channelService, PreacherAnalytics } from '../../../../services/channelService';
import {
  Channel,
  ChannelMemberRole,
  ChannelPost,
  ChannelPostComment,
  ChannelPostMediaCircle,
  ChannelPostMediaImage,
  ChannelShowcase,
} from '../../../../types/channel';
import { marketService } from '../../../../services/marketService';
import { Service, getSchedules, getServiceById, getServices } from '../../../../services/serviceService';
import type { Product } from '../../../../types/market';
import { VideoCircle, videoCirclesService } from '../../../../services/videoCirclesService';
import { useSettings } from '../../../../context/SettingsContext';
import { useUser } from '../../../../context/UserContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { getChannelPostCtaLabel, handleChannelPostCta } from './channelCta';
import { supportService, SupportPreacherQuestion } from '../../../../services/supportService';

type RouteParams = {
  ChannelDetails: {
    channelId: number;
    source?: 'sadhu_sanga';
    focusSection?: 'seminars';
  };
};

const canEditPosts = (role?: ChannelMemberRole) => role === 'owner' || role === 'admin' || role === 'editor';
const canModeratePosts = (role?: ChannelMemberRole) => role === 'owner' || role === 'admin';
const MAX_SHOWCASE_PREVIEW_ITEMS = 4;
const CHANNEL_PROMPT_KEY = 'channels_channel_details_tip_v1';
const POST_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type ParsedPostMedia = {
  images: ChannelPostMediaImage[];
  circles: ChannelPostMediaCircle[];
};

type ShowcaseFilterPayload = {
  category?: string;
  shopId?: number;
  productIds?: number[];
  serviceIds?: number[];
  limit?: number;
};

type SeminarPreview = {
  service: Service;
  nextAt: Date | null;
  formatLabel: string;
  venueLabel: string;
};

const buildSeminarRouteUrl = (service: Service): string => {
  const hasCoords = Number.isFinite(service.offlineLat) && Number.isFinite(service.offlineLng);
  if (hasCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${service.offlineLat},${service.offlineLng}`;
  }
  const address = String(service.offlineAddress || '').trim();
  if (!address) {
    return '';
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const sortPreacherQuestions = (items: SupportPreacherQuestion[]): SupportPreacherQuestion[] =>
  [...items].sort((a, b) => {
    const votesDiff = (Number(b.voteCount) || 0) - (Number(a.voteCount) || 0);
    if (votesDiff !== 0) {
      return votesDiff;
    }
    const aTs = Date.parse(a.createdAt || '');
    const bTs = Date.parse(b.createdAt || '');
    if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
      return bTs - aTs;
    }
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

const toPositiveInt = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed > 0 ? Math.floor(parsed) : 0;
};

const parseShowcaseFilter = (raw: string): ShowcaseFilterPayload => {
  if (!raw || !raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed as ShowcaseFilterPayload;
  } catch {
    return {};
  }
};

const parseTimeParts = (timeStart: string): { hours: number; minutes: number } => {
  const [hh, mm] = String(timeStart || '00:00').split(':');
  const hours = Math.max(0, Math.min(23, Number(hh) || 0));
  const minutes = Math.max(0, Math.min(59, Number(mm) || 0));
  return { hours, minutes };
};

const resolveNextStartForSchedule = (schedule: { isActive?: boolean; specificDate?: string; dayOfWeek?: number; timeStart: string }, now: Date): Date | null => {
  if (!schedule?.isActive) {
    return null;
  }
  const { hours, minutes } = parseTimeParts(schedule.timeStart);

  if (schedule.specificDate) {
    const date = new Date(schedule.specificDate);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    date.setHours(hours, minutes, 0, 0);
    if (date.getTime() < now.getTime()) {
      return null;
    }
    return date;
  }

  if (typeof schedule.dayOfWeek === 'number' && schedule.dayOfWeek >= 0 && schedule.dayOfWeek <= 6) {
    const currentDay = now.getDay();
    let dayOffset = schedule.dayOfWeek - currentDay;
    if (dayOffset < 0) {
      dayOffset += 7;
    }
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + dayOffset);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() < now.getTime()) {
      candidate.setDate(candidate.getDate() + 7);
    }
    return candidate;
  }

  return null;
};

const resolveNearestScheduleDate = (schedules: Array<{ isActive?: boolean; specificDate?: string; dayOfWeek?: number; timeStart: string }>, now: Date): Date | null => {
  let best: Date | null = null;
  schedules.forEach((schedule) => {
    const next = resolveNextStartForSchedule(schedule, now);
    if (!next) {
      return;
    }
    if (!best || next.getTime() < best.getTime()) {
      best = next;
    }
  });
  return best;
};

const resolvePreviewLimit = (filter: ShowcaseFilterPayload): number => {
  const value = toPositiveInt(filter.limit);
  if (value > 0 && value <= 12) {
    return value;
  }
  return MAX_SHOWCASE_PREVIEW_ITEMS;
};

const parsePostMedia = (raw: string): ParsedPostMedia => {
  const fallback: ParsedPostMedia = { images: [], circles: [] };
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed) as { images?: ChannelPostMediaImage[]; circles?: ChannelPostMediaCircle[] };
    const images = Array.isArray(parsed?.images)
      ? parsed.images.filter(item => item && item.url)
      : [];
    const circles = Array.isArray(parsed?.circles)
      ? parsed.circles.filter(item => item && Number(item.id) > 0 && item.mediaUrl)
      : [];
    return {
      images: images.slice(0, 5),
      circles: circles.slice(0, 10),
    };
  } catch {
    return fallback;
  }
};

const isAuthorEditAllowed = (post: ChannelPost): boolean => {
  if (post.status !== 'published') {
    return true;
  }
  const publishedRaw = post.publishedAt || post.CreatedAt;
  if (!publishedRaw) {
    return false;
  }
  const publishedAt = new Date(publishedRaw);
  if (Number.isNaN(publishedAt.getTime())) {
    return false;
  }
  return Date.now() - publishedAt.getTime() <= POST_EDIT_WINDOW_MS;
};

export default function ChannelDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ChannelDetails'>>();
  const channelId = route.params?.channelId;
  const isSadhuSangaMode = route.params?.source === 'sadhu_sanga';
  const focusSection = route.params?.focusSection;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const screenGradient = useMemo<[string, string, string]>(
    () => (isDarkMode
      ? roleTheme.gradient
      : [colors.background, colors.surface, colors.background]),
    [isDarkMode, roleTheme.gradient, colors.background, colors.surface],
  );

  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewerRole, setViewerRole] = useState<ChannelMemberRole | undefined>(undefined);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [showcases, setShowcases] = useState<ChannelShowcase[]>([]);
  const [channelStories, setChannelStories] = useState<VideoCircle[]>([]);
  const [showcaseProducts, setShowcaseProducts] = useState<Record<number, Product[]>>({});
  const [showcaseServices, setShowcaseServices] = useState<Record<number, Service[]>>({});
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [showGuidePrompt, setShowGuidePrompt] = useState(false);
  const [includeDraft, setIncludeDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyPostId, setBusyPostId] = useState<number | null>(null);
  const [commentsSheetVisible, setCommentsSheetVisible] = useState(false);
  const [commentsSheetPost, setCommentsSheetPost] = useState<ChannelPost | null>(null);
  const [commentsSheetItems, setCommentsSheetItems] = useState<ChannelPostComment[]>([]);
  const [commentsSheetCursor, setCommentsSheetCursor] = useState<number | undefined>(undefined);
  const [commentsSheetLoading, setCommentsSheetLoading] = useState(false);
  const [commentsSheetSubmitting, setCommentsSheetSubmitting] = useState(false);
  const [commentsSheetText, setCommentsSheetText] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [preacherSeminars, setPreacherSeminars] = useState<SeminarPreview[]>([]);
  const [preacherSeminarsLoading, setPreacherSeminarsLoading] = useState(false);
  const [preacherQuestions, setPreacherQuestions] = useState<SupportPreacherQuestion[]>([]);
  const [preacherQuestionsLoading, setPreacherQuestionsLoading] = useState(false);
  const [questionVoteLoadingId, setQuestionVoteLoadingId] = useState<number | null>(null);
  const [preacherAnalytics, setPreacherAnalytics] = useState<PreacherAnalytics | null>(null);
  const [preacherAnalyticsLoading, setPreacherAnalyticsLoading] = useState(false);
  const seminarsSectionYRef = useRef(0);
  const contentListRef = useRef<FlatList<ChannelPost> | null>(null);

  const mountedRef = useRef(true);
  const latestLoadRef = useRef(0);
  const latestShowcaseReqRef = useRef(0);
  const includeDraftLoadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestLoadRef.current += 1;
    };
  }, []);

  const loadPreacherSeminars = useCallback(async (ownerID: number) => {
    if (!ownerID || ownerID <= 0) {
      setPreacherSeminars([]);
      return;
    }
    setPreacherSeminarsLoading(true);
    try {
      const response = await getServices({ page: 1, limit: 80 });
      const mine = (response.services || []).filter(service => service.ownerId === ownerID);
      const candidates = mine.filter(service => service.scheduleType === 'fixed' || service.scheduleType === 'live');
      const now = new Date();

      const resolved = await Promise.all(candidates.map(async (service) => {
        let schedules = service.schedules || [];
        if (!schedules.length) {
          try {
            const loaded = await getSchedules(service.id);
            schedules = loaded.schedules || [];
          } catch {
            schedules = [];
          }
        }
        const nextAt = resolveNearestScheduleDate(schedules, now);
        return {
          service,
          nextAt,
          formatLabel: service.channel === 'offline' ? 'Оффлайн' : 'Онлайн',
          venueLabel: service.channel === 'offline'
            ? (service.offlineAddress || 'Адрес уточняется')
            : (service.channelLink || 'Ссылка после записи'),
        } as SeminarPreview;
      }));

      const sorted = resolved.sort((a, b) => {
        if (a.nextAt && b.nextAt) {
          return a.nextAt.getTime() - b.nextAt.getTime();
        }
        if (a.nextAt) return -1;
        if (b.nextAt) return 1;
        return b.service.id - a.service.id;
      });
      if (mountedRef.current) {
        setPreacherSeminars(sorted.slice(0, 8));
      }
    } catch (error: any) {
      const status = error?.response?.status ?? 'n/a';
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить семинары';
      console.warn(`[ChannelDetails] Failed to load preacher seminars (status=${status}): ${message}`);
      if (mountedRef.current) {
        setPreacherSeminars([]);
      }
    } finally {
      if (mountedRef.current) {
        setPreacherSeminarsLoading(false);
      }
    }
  }, []);

  const loadPreacherQuestions = useCallback(async (ownerID: number) => {
    if (!ownerID || ownerID <= 0) {
      setPreacherQuestions([]);
      return;
    }
    setPreacherQuestionsLoading(true);
    try {
      const response = await supportService.getPreacherQuestions(ownerID, 1, 20);
      if (mountedRef.current) {
        setPreacherQuestions(sortPreacherQuestions(response.questions || []));
      }
    } catch (error: any) {
      const message = error?.message || 'Не удалось загрузить вопросы';
      console.warn(`[ChannelDetails] Failed to load preacher questions: ${message}`);
      if (mountedRef.current) {
        setPreacherQuestions([]);
      }
    } finally {
      if (mountedRef.current) {
        setPreacherQuestionsLoading(false);
      }
    }
  }, []);

  const loadPreacherAnalytics = useCallback(async () => {
    if (!channelId || channelId <= 0) {
      setPreacherAnalytics(null);
      return;
    }
    setPreacherAnalyticsLoading(true);
    try {
      const response = await channelService.getPreacherAnalytics(channelId);
      if (mountedRef.current) {
        setPreacherAnalytics(response);
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить аналитику';
      console.warn(`[ChannelDetails] Failed to load preacher analytics: ${message}`);
      if (mountedRef.current) {
        setPreacherAnalytics(null);
      }
    } finally {
      if (mountedRef.current) {
        setPreacherAnalyticsLoading(false);
      }
    }
  }, [channelId]);

  const loadData = useCallback(async (isRefresh: boolean) => {
    if (!channelId) {
      return;
    }

    const reqId = ++latestLoadRef.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setStoriesLoading(true);

    try {
      const channelResponse = await channelService.getChannel(channelId);
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      setChannel(channelResponse.channel);
      if (channelResponse.viewerRole) {
        setViewerRole(channelResponse.viewerRole);
      }
      if (isSadhuSangaMode) {
        void loadPreacherSeminars(channelResponse.channel.ownerId);
        void loadPreacherQuestions(channelResponse.channel.ownerId);
        const resolvedRole = channelResponse.viewerRole || (channelResponse.channel.ownerId === user?.ID ? 'owner' : undefined);
        if (resolvedRole === 'owner' || resolvedRole === 'admin') {
          void loadPreacherAnalytics();
        } else {
          setPreacherAnalytics(null);
        }
      } else {
        setPreacherSeminars([]);
        setPreacherQuestions([]);
        setPreacherAnalytics(null);
      }

      const [postsResponse, showcasesResponse, storiesResponse, promptStatus] = await Promise.all([
        channelService
          .listPosts(channelId, { page: 1, limit: 100, includeDraft })
          .catch((error: any) => {
            const status = error?.response?.status ?? 'n/a';
            const message = error?.response?.data?.error || error?.message || 'unknown';
            console.warn(`[ChannelDetails] Failed to load posts (status=${status}): ${message}`);
            return { posts: [], total: 0, page: 1, limit: 100, totalPages: 1, viewerRole: undefined as ChannelMemberRole | undefined };
          }),
        isSadhuSangaMode ? Promise.resolve({ showcases: [] }) : channelService.listShowcases(channelId),
        isSadhuSangaMode
          ? Promise.resolve({ circles: [] as VideoCircle[], total: 0, page: 1, limit: 20, totalPages: 1 })
          : videoCirclesService
            .getVideoCircles({
              channelId,
              status: 'active',
              limit: 20,
              sort: 'newest',
            })
            .catch(() => ({ circles: [], total: 0, page: 1, limit: 20, totalPages: 1 })),
        isSadhuSangaMode
          ? Promise.resolve({ [CHANNEL_PROMPT_KEY]: true })
          : channelService.getPromptStatus([CHANNEL_PROMPT_KEY]).catch(() => ({ [CHANNEL_PROMPT_KEY]: false })),
      ]);

      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }

      setPosts(postsResponse.posts);
      if (postsResponse.viewerRole) {
        setViewerRole(postsResponse.viewerRole);
      }
      setShowcases(showcasesResponse.showcases || []);
      setChannelStories(storiesResponse.circles || []);
      setShowGuidePrompt(!promptStatus[CHANNEL_PROMPT_KEY]);
    } catch (error: any) {
      const status = error?.response?.status ?? 'n/a';
      const message = error?.response?.data?.error || error?.message || 'unknown';
      console.warn(`[ChannelDetails] Failed to load channel (status=${status}): ${message}`);
      if (mountedRef.current && reqId === latestLoadRef.current) {
        Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось загрузить канал');
      }
    } finally {
      if (mountedRef.current && reqId === latestLoadRef.current) {
        setLoading(false);
        setRefreshing(false);
        setStoriesLoading(false);
      }
    }
  }, [channelId, includeDraft, isSadhuSangaMode, loadPreacherAnalytics, loadPreacherQuestions, loadPreacherSeminars, user?.ID]);

  useEffect(() => {
    if (focusSection !== 'seminars') {
      return;
    }
    const timer = setTimeout(() => {
      contentListRef.current?.scrollToOffset({
        offset: Math.max(0, seminarsSectionYRef.current - 110),
        animated: true,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [focusSection, preacherSeminars.length]);

  useFocusEffect(
    useCallback(() => {
      void loadData(false);
    }, [loadData])
  );

  useEffect(() => {
    if (!includeDraftLoadedRef.current) {
      includeDraftLoadedRef.current = true;
      return;
    }
    void loadData(true);
  }, [includeDraft, loadData]);

  const loadShowcasePreviews = useCallback(async (items: ChannelShowcase[]) => {
    if (!items.length) {
      setShowcaseProducts({});
      setShowcaseServices({});
      setShowcaseLoading(false);
      return;
    }

    const reqId = ++latestShowcaseReqRef.current;
    setShowcaseLoading(true);

    const productsMap: Record<number, Product[]> = {};
    const servicesMap: Record<number, Service[]> = {};

    await Promise.all(
      items.map(async showcase => {
        const kind = (showcase.kind || '').toLowerCase();
        const filter = parseShowcaseFilter(showcase.filterJson);
        const limit = resolvePreviewLimit(filter);

        try {
          if (kind.includes('service')) {
            const serviceIDs = Array.isArray(filter.serviceIds)
              ? filter.serviceIds.map(id => toPositiveInt(id)).filter(id => id > 0).slice(0, limit)
              : [];

            if (serviceIDs.length > 0) {
              const loaded = await Promise.all(
                serviceIDs.map(async serviceId => {
                  try {
                    return await getServiceById(serviceId);
                  } catch {
                    return null;
                  }
                })
              );
              servicesMap[showcase.ID] = loaded.filter((item): item is Service => Boolean(item));
            } else {
              const response = await getServices({
                page: 1,
                limit,
                category: filter.category as any,
              });
              servicesMap[showcase.ID] = response.services || [];
            }
          } else {
            const productIDs = Array.isArray(filter.productIds)
              ? filter.productIds.map(id => toPositiveInt(id)).filter(id => id > 0).slice(0, limit)
              : [];

            if (productIDs.length > 0) {
              const loaded = await Promise.all(
                productIDs.map(async productId => {
                  try {
                    return await marketService.getProduct(productId);
                  } catch {
                    return null;
                  }
                })
              );
              productsMap[showcase.ID] = loaded.filter((item): item is Product => Boolean(item));
            } else {
              const response = await marketService.getProducts({
                page: 1,
                limit,
                category: filter.category as any,
                shopId: toPositiveInt(filter.shopId) || undefined,
              });
              productsMap[showcase.ID] = response.products || [];
            }
          }
        } catch {
          productsMap[showcase.ID] = productsMap[showcase.ID] || [];
          servicesMap[showcase.ID] = servicesMap[showcase.ID] || [];
        }
      })
    );

    if (!mountedRef.current || reqId !== latestShowcaseReqRef.current) {
      return;
    }

    setShowcaseProducts(productsMap);
    setShowcaseServices(servicesMap);
    setShowcaseLoading(false);
  }, []);

  useEffect(() => {
    void loadShowcasePreviews(showcases);
  }, [showcases, loadShowcasePreviews]);

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }
    void loadData(true);
  };

  const handleQuestionVote = useCallback(async (question: SupportPreacherQuestion) => {
    if (!question?.id || questionVoteLoadingId === question.id) {
      return;
    }
    setQuestionVoteLoadingId(question.id);
    try {
      const response = await supportService.votePreacherQuestion(question.id);
      if (!mountedRef.current) {
        return;
      }
      setPreacherQuestions(prev => sortPreacherQuestions(prev.map(item => (
        item.id === question.id
          ? { ...item, myVote: Boolean(response.voted), voteCount: Math.max(0, Number(response.votes) || 0) }
          : item
      ))));
    } catch (error: any) {
      if (mountedRef.current) {
        Alert.alert('Ошибка', error?.message || 'Не удалось обновить голос');
      }
    } finally {
      if (mountedRef.current) {
        setQuestionVoteLoadingId(null);
      }
    }
  }, [questionVoteLoadingId]);

  const handleOpenSeminarRoute = useCallback(async (service: Service) => {
    if (service.channel !== 'offline') {
      Alert.alert('Маршрут', 'Маршрут доступен только для офлайн-семинаров.');
      return;
    }
    const routeUrl = buildSeminarRouteUrl(service);
    if (!routeUrl) {
      Alert.alert('Маршрут', 'Адрес семинара пока не указан.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(routeUrl);
      if (!supported) {
        Alert.alert('Маршрут', 'Не удалось открыть карту на устройстве.');
        return;
      }
      await Linking.openURL(routeUrl);
    } catch {
      Alert.alert('Маршрут', 'Не удалось открыть маршрут.');
    }
  }, []);

  const dismissGuidePrompt = useCallback(() => {
    setShowGuidePrompt(false);
    void channelService.dismissPrompt(CHANNEL_PROMPT_KEY).catch(() => {});
  }, []);

  const isEditor = canEditPosts(viewerRole);
  const isModerator = canModeratePosts(viewerRole);
  const canViewPreacherAnalytics = isSadhuSangaMode && (viewerRole === 'owner' || viewerRole === 'admin');

  const togglePin = async (post: ChannelPost) => {
    if (!channelId || !isModerator || busyPostId !== null) {
      return;
    }
    setBusyPostId(post.ID);
    try {
      if (post.isPinned) {
        await channelService.unpinPost(channelId, post.ID);
      } else {
        await channelService.pinPost(channelId, post.ID);
      }
      await loadData(true);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить закреп');
    } finally {
      if (mountedRef.current) {
        setBusyPostId(null);
      }
    }
  };

  const publishPost = async (post: ChannelPost) => {
    if (!channelId || !isModerator || busyPostId !== null) {
      return;
    }
    setBusyPostId(post.ID);
    try {
      await channelService.publishPost(channelId, post.ID);
      await loadData(true);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось опубликовать пост');
    } finally {
      if (mountedRef.current) {
        setBusyPostId(null);
      }
    }
  };

  const getPostStats = useCallback((post: ChannelPost) => {
    const stats = post.stats;
    return {
      views: stats?.views ?? post.viewCount ?? 0,
      reactions: stats?.reactions ?? post.reactionCount ?? 0,
      comments: stats?.comments ?? post.commentCount ?? 0,
      shares: stats?.shares ?? post.shareCount ?? 0,
    };
  }, []);

  const patchPostInState = useCallback((postID: number, patcher: (post: ChannelPost) => ChannelPost) => {
    setPosts(prev => prev.map(post => (post.ID === postID ? patcher(post) : post)));
  }, []);

  const toggleReaction = useCallback((post: ChannelPost) => {
    if (!channelId) return;

    const reactionEmoji = '❤️';
    const hadReaction = Boolean(post.myReaction);
    const stats = getPostStats(post);

    patchPostInState(post.ID, current => ({
      ...current,
      myReaction: hadReaction ? undefined : reactionEmoji,
      reactionCount: Math.max(0, stats.reactions + (hadReaction ? -1 : 1)),
    }));

    const request = hadReaction
      ? channelService.removeReaction(channelId, post.ID)
      : channelService.setReaction(channelId, post.ID, reactionEmoji);

    void request.catch(() => {
      patchPostInState(post.ID, current => ({
        ...current,
        myReaction: post.myReaction,
        reactionCount: stats.reactions,
      }));
    });
  }, [channelId, getPostStats, patchPostInState]);

  const sharePost = useCallback(async (post: ChannelPost) => {
    if (!channelId) return;

    try {
      await Share.share({
        message: `${post.content || 'Пост в канале'}\n\nКанал: ${channel?.title || `#${post.channelId}`}`,
      });
      patchPostInState(post.ID, current => {
        const stats = getPostStats(current);
        return { ...current, shareCount: stats.shares + 1 };
      });
      await channelService.trackShare(channelId, post.ID);
    } catch {
      // no-op
    }
  }, [channel?.title, channelId, getPostStats, patchPostInState]);

  const loadComments = useCallback(async (post: ChannelPost, cursor?: number, append = false) => {
    setCommentsSheetLoading(true);
    try {
      const response = await channelService.listComments(post.channelId, post.ID, {
        limit: 20,
        ...(cursor ? { cursor } : {}),
      });
      const items = response.comments || [];
      setCommentsSheetItems(prev => (append ? [...prev, ...items] : items));
      setCommentsSheetCursor(response.nextCursor);
    } catch {
      if (!append) {
        setCommentsSheetItems([]);
      }
      Alert.alert('Ошибка', 'Не удалось загрузить комментарии');
    } finally {
      setCommentsSheetLoading(false);
    }
  }, []);

  const openComments = useCallback((post: ChannelPost) => {
    setCommentsSheetPost(post);
    setCommentsSheetVisible(true);
    setCommentsSheetItems([]);
    setCommentsSheetCursor(undefined);
    setCommentsSheetText('');
    void loadComments(post, undefined, false);
  }, [loadComments]);

  const closeComments = useCallback(() => {
    setCommentsSheetVisible(false);
    setCommentsSheetPost(null);
    setCommentsSheetItems([]);
    setCommentsSheetCursor(undefined);
    setCommentsSheetText('');
  }, []);

  const submitComment = useCallback(async () => {
    const post = commentsSheetPost;
    const body = commentsSheetText.trim();
    if (!post || !body || commentsSheetSubmitting) {
      return;
    }

    const optimisticID = Date.now() * -1;
    const optimisticComment: ChannelPostComment = {
      ID: optimisticID,
      postId: post.ID,
      userId: user?.ID || 0,
      body,
      isDeleted: false,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      user: {
        id: user?.ID || 0,
        spiritualName: user?.spiritualName || '',
        karmicName: user?.karmicName || '',
        avatarUrl: user?.avatar || '',
      },
    };

    setCommentsSheetSubmitting(true);
    setCommentsSheetText('');
    setCommentsSheetItems(prev => [optimisticComment, ...prev]);
    patchPostInState(post.ID, current => {
      const stats = getPostStats(current);
      return { ...current, commentCount: stats.comments + 1 };
    });

    try {
      const created = await channelService.addComment(post.channelId, post.ID, body);
      setCommentsSheetItems(prev => prev.map(item => (item.ID === optimisticID ? created : item)));
    } catch (error: any) {
      setCommentsSheetItems(prev => prev.filter(item => item.ID !== optimisticID));
      patchPostInState(post.ID, current => {
        const stats = getPostStats(current);
        return { ...current, commentCount: Math.max(0, stats.comments - 1) };
      });
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось отправить комментарий');
    } finally {
      setCommentsSheetSubmitting(false);
    }
  }, [commentsSheetPost, commentsSheetSubmitting, commentsSheetText, getPostStats, patchPostInState, user]);

  const loadMoreComments = useCallback(() => {
    if (!commentsSheetPost || !commentsSheetCursor || commentsSheetLoading) {
      return;
    }
    void loadComments(commentsSheetPost, commentsSheetCursor, true);
  }, [commentsSheetCursor, commentsSheetLoading, commentsSheetPost, loadComments]);

  const openPostMenu = useCallback((post: ChannelPost) => {
    const editable = isAuthorEditAllowed(post);
    Alert.alert('Пост', editable ? 'Действия с постом' : 'Редактирование опубликованного поста доступно только в первые 24 часа', [
      {
        text: 'Редактировать',
        onPress: () => {
          if (!editable) {
            Alert.alert('Недоступно', 'Окно редактирования этого поста уже закрыто.');
            return;
          }
          navigation.navigate('ChannelPostComposer', {
            channelId: post.channelId,
            mode: 'edit',
            postId: post.ID,
            initialPost: post,
          });
        },
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }, [navigation]);

  const renderMediaBlock = useCallback((post: ChannelPost) => {
    const media = parsePostMedia(post.mediaJson);
    if (media.images.length === 0 && media.circles.length === 0) {
      return null;
    }

    return (
      <View style={styles.mediaBlock}>
        {media.images.length > 0 ? (
          <FlatList
            data={media.images}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaRow}
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={styles.postImage} resizeMode="cover" />
            )}
          />
        ) : null}

        {media.circles.length > 0 ? (
          <FlatList
            data={media.circles}
            keyExtractor={(item) => `circle-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.circleCard}
                onPress={() =>
                  navigation.navigate('VideoPlayer', {
                    video: { uri: item.mediaUrl, title: `Кружок #${item.id}` },
                    source: 'video_circles',
                    circle: {
                      id: item.id,
                      authorId: post.authorId,
                      mediaUrl: item.mediaUrl,
                      thumbnailUrl: item.thumbnailUrl,
                      city: '',
                      matha: '',
                      category: '',
                      likeCount: 0,
                      commentCount: 0,
                      chatCount: 0,
                    },
                  })
                }
              >
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.circleThumb} />
                ) : (
                  <View style={styles.circleThumbFallback}>
                    <Video size={15} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={styles.circleLabel}>Кружок #{item.id}</Text>
              </TouchableOpacity>
            )}
          />
        ) : null}
      </View>
    );
  }, [colors.textSecondary, navigation, styles.circleCard, styles.circleLabel, styles.circleThumb, styles.circleThumbFallback, styles.mediaBlock, styles.mediaRow, styles.postImage]);

  const roleLabel = useMemo(() => {
    if (!viewerRole) {
      return 'Читатель';
    }
    if (viewerRole === 'owner') {
      return 'Owner';
    }
    if (viewerRole === 'admin') {
      return 'Admin';
    }
    if (viewerRole === 'editor') {
      return 'Editor';
    }
    return 'Подписчик';
  }, [viewerRole]);

  const canFollow = useMemo(() => {
    if (!channel || !user?.ID) {
      return false;
    }
    if (channel.ownerId === user.ID) {
      return false;
    }
    if (viewerRole === 'owner' || viewerRole === 'admin' || viewerRole === 'editor') {
      return false;
    }
    return true;
  }, [channel, user?.ID, viewerRole]);

  const handleFollowToggle = useCallback(async () => {
    if (!channelId || !channel || !canFollow || followLoading) {
      return;
    }

    const wasFollowing = Boolean(channel.isFollowing);
    const prevFollowers = Math.max(0, Number(channel.followersCount) || 0);
    const nextFollowers = wasFollowing ? Math.max(0, prevFollowers - 1) : prevFollowers + 1;

    setFollowLoading(true);
    setChannel(prev => (prev ? { ...prev, isFollowing: !wasFollowing, followersCount: nextFollowers } : prev));
    if (!wasFollowing) {
      setViewerRole(prev => (prev ? prev : 'subscriber'));
    } else {
      setViewerRole(prev => (prev === 'subscriber' ? undefined : prev));
    }

    try {
      if (wasFollowing) {
        await channelService.unfollowChannel(channelId);
      } else {
        await channelService.followChannel(channelId);
      }
      const followStatus = await channelService.getFollowStatus(channelId);
      setChannel(prev => (
        prev
          ? {
            ...prev,
            isFollowing: followStatus.isFollowing,
            followersCount: followStatus.followersCount,
          }
          : prev
      ));
      if (followStatus.isFollowing) {
        setViewerRole(prev => (prev ? prev : 'subscriber'));
      } else {
        setViewerRole(prev => (prev === 'subscriber' ? undefined : prev));
      }
    } catch (error: any) {
      setChannel(prev => (prev ? { ...prev, isFollowing: wasFollowing, followersCount: prevFollowers } : prev));
      if (wasFollowing) {
        setViewerRole(prev => (prev ? prev : 'subscriber'));
      } else {
        setViewerRole(prev => (prev === 'subscriber' ? undefined : prev));
      }
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить подписку');
    } finally {
      if (mountedRef.current) {
        setFollowLoading(false);
      }
    }
  }, [canFollow, channel, channelId, followLoading]);

  const renderPost = ({ item }: { item: ChannelPost }) => {
    const ctaLabel = getChannelPostCtaLabel(item);
    const postDate = item.publishedAt || item.scheduledAt || item.CreatedAt;
    const isAuthor = Boolean(user?.ID) && item.authorId === user?.ID;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postMetaRow}>
            {item.isPinned ? (
              <View style={styles.pinTag}>
                <Pin size={12} color={colors.accent} />
                <Text style={styles.pinTagText}>Закреп</Text>
              </View>
            ) : null}
            <Text style={styles.postStatus}>{item.status}</Text>
          </View>
          <View style={styles.postHeaderRight}>
            <Text style={styles.postDate}>{new Date(postDate).toLocaleString('ru-RU')}</Text>
            {isAuthor ? (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => openPostMenu(item)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <MoreHorizontal size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={styles.postContent}>{item.content || 'Без текста'}</Text>
        {renderMediaBlock(item)}

        <View style={styles.postActions}>
          {ctaLabel ? (
            <TouchableOpacity style={styles.primaryAction} onPress={() => handleChannelPostCta(navigation, item)}>
              <Text style={styles.primaryActionText}>{ctaLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <View style={styles.moderationActions}>
            {isModerator && item.status === 'published' ? (
              <TouchableOpacity style={styles.secondaryAction} onPress={() => togglePin(item)}>
                <Text style={styles.secondaryActionText}>{item.isPinned ? 'Открепить' : 'Закрепить'}</Text>
              </TouchableOpacity>
            ) : null}
            {isModerator && item.status !== 'published' ? (
              <TouchableOpacity style={styles.secondaryAction} onPress={() => publishPost(item)}>
                <Text style={styles.secondaryActionText}>Опубликовать</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => toggleReaction(item)}>
            <Smile size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{item.myReaction || '❤️'} {getPostStats(item).reactions}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => openComments(item)}>
            <MessageCircle size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{getPostStats(item).comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => void sharePost(item)}>
            <Share2 size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{getPostStats(item).shares}</Text>
          </TouchableOpacity>
          <View style={styles.actionItem}>
            <Eye size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{getPostStats(item).views}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !channel) {
    return (
      <LinearGradient colors={screenGradient} style={styles.gradient}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={screenGradient} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{channel?.title || 'Канал'}</Text>
            <Text style={styles.headerSubtitle}>{roleLabel}</Text>
          </View>
          {isEditor ? (
            <View style={styles.headerActions}>
              {isModerator ? (
                <TouchableOpacity
                  style={[styles.headerButton, styles.manageButton]}
                  onPress={() => navigation.navigate('ChannelManage', { channelId })}
                >
                  <Settings2 size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.headerButton, styles.createPostButton]}
                onPress={() => navigation.navigate('ChannelPostComposer', { channelId })}
              >
                <PlusCircle size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : canFollow ? (
            <TouchableOpacity
              style={[
                styles.followButton,
                channel?.isFollowing ? styles.followingButton : styles.followDefaultButton,
                followLoading && styles.followButtonDisabled,
              ]}
              onPress={() => void handleFollowToggle()}
              disabled={followLoading}
            >
              <Text style={styles.followButtonText}>
                {channel?.isFollowing ? 'Вы подписаны' : 'Подписаться'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}
        </View>

        <View style={styles.channelIntro}>
          <Text style={styles.channelDescription}>{channel?.description || 'Описание канала не заполнено'}</Text>
          <View style={styles.channelStatsRow}>
            <Text style={styles.channelMeta}>@{channel?.slug || 'channel'}</Text>
            <Text style={styles.channelMetaSecondary}>
              Подписчиков: {Math.max(0, Number(channel?.followersCount) || 0)}
            </Text>
          </View>
          {isSadhuSangaMode ? (
            <TouchableOpacity
              style={[styles.askQuestionButton, !(channel?.ownerId && channel.ownerId > 0) && styles.askQuestionButtonDisabled]}
              onPress={() => {
                if (!channel?.ownerId || channel.ownerId <= 0) {
                  return;
                }
                navigation.navigate('SupportTicketForm', {
                  entryPoint: 'sadhu_sanga_question',
                  targetPreacherId: channel.ownerId,
                  targetPreacherName: channel?.title,
                });
              }}
              disabled={!(channel?.ownerId && channel.ownerId > 0)}
            >
              <Text style={styles.askQuestionButtonText}>Задать вопрос проповеднику</Text>
            </TouchableOpacity>
          ) : null}
          {isModerator && !isSadhuSangaMode ? (
            <TouchableOpacity
              style={styles.crmButton}
              onPress={() =>
                navigation.navigate('SellerOrders', {
                  source: 'channel_post',
                  sourceChannelId: channelId,
                })
              }
            >
              <Text style={styles.crmButtonText}>Открыть CRM-заказы канала</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {showGuidePrompt && !isSadhuSangaMode ? (
          <View style={styles.promptBanner}>
            <Text style={styles.promptBannerText}>
              Подсказка: закрепите ключевой пост и добавьте CTA "Купить" или "Записаться", чтобы вести человека до заказа.
            </Text>
            <TouchableOpacity style={styles.promptBannerAction} onPress={dismissGuidePrompt}>
              <Text style={styles.promptBannerActionText}>Скрыть</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canViewPreacherAnalytics ? (
          <View style={styles.preacherAnalyticsSection}>
            <View style={styles.preacherAnalyticsHeader}>
              <Text style={styles.preacherAnalyticsTitle}>Аналитика проповедника</Text>
              {preacherAnalyticsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>
            <View style={styles.preacherAnalyticsStatsGrid}>
              <View style={styles.preacherAnalyticsStatCard}>
                <Text style={styles.preacherAnalyticsStatValue}>
                  {Math.max(0, Number(preacherAnalytics?.totalLectureViews) || 0).toLocaleString('ru-RU')}
                </Text>
                <Text style={styles.preacherAnalyticsStatLabel}>Просмотры лекций</Text>
              </View>
              <View style={styles.preacherAnalyticsStatCard}>
                <Text style={styles.preacherAnalyticsStatValue}>
                  {Math.max(0, Number(preacherAnalytics?.seminarRegistrations) || 0).toLocaleString('ru-RU')}
                </Text>
                <Text style={styles.preacherAnalyticsStatLabel}>Регистрации на семинары</Text>
              </View>
            </View>
            <View style={styles.preacherAnalyticsCitiesWrap}>
              <Text style={styles.preacherAnalyticsCitiesTitle}>Активные города</Text>
              {(preacherAnalytics?.activeCities || []).length === 0 ? (
                <Text style={styles.preacherAnalyticsCitiesEmpty}>Пока недостаточно данных по городам</Text>
              ) : (
                <View style={styles.preacherAnalyticsCitiesList}>
                  {(preacherAnalytics?.activeCities || []).map((city) => (
                    <View key={`city-${city.city}`} style={styles.preacherAnalyticsCityRow}>
                      <Text style={styles.preacherAnalyticsCityName} numberOfLines={1}>{city.city}</Text>
                      <Text style={styles.preacherAnalyticsCityValue}>{Math.max(0, Number(city.registrations) || 0)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {isSadhuSangaMode ? (
          <View style={styles.preacherQuestionsSection}>
            <View style={styles.preacherQuestionsHeader}>
              <Text style={styles.preacherQuestionsTitle}>Вопросы последователей</Text>
              {preacherQuestionsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>
            {preacherQuestions.length === 0 ? (
              <Text style={styles.preacherQuestionsEmpty}>Пока нет вопросов для голосования</Text>
            ) : (
              <View style={styles.preacherQuestionsList}>
                {preacherQuestions.map((question) => (
                  <View key={`preacher-question-${question.id}`} style={styles.preacherQuestionCard}>
                    <Text style={styles.preacherQuestionSubject} numberOfLines={1}>{question.subject || 'Вопрос к проповеднику'}</Text>
                    <Text style={styles.preacherQuestionExcerpt} numberOfLines={2}>{question.excerpt || 'Описание вопроса недоступно'}</Text>
                    <View style={styles.preacherQuestionBottomRow}>
                      <Text style={styles.preacherQuestionVotes}>Голосов: {Math.max(0, Number(question.voteCount) || 0)}</Text>
                      <TouchableOpacity
                        style={[
                          styles.preacherQuestionVoteButton,
                          question.myVote && styles.preacherQuestionVoteButtonActive,
                          questionVoteLoadingId === question.id && styles.preacherQuestionVoteButtonDisabled,
                        ]}
                        onPress={() => void handleQuestionVote(question)}
                        disabled={questionVoteLoadingId === question.id}
                      >
                        <ThumbsUp size={13} color={question.myVote ? colors.accent : colors.textSecondary} />
                        <Text
                          style={[
                            styles.preacherQuestionVoteText,
                            question.myVote && styles.preacherQuestionVoteTextActive,
                          ]}
                        >
                          {question.myVote ? 'Вы поддержали' : 'Поддержать'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {isSadhuSangaMode ? (
          <View
            style={styles.preacherSeminarsSection}
            onLayout={(event) => {
              seminarsSectionYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View style={styles.preacherSeminarsHeader}>
              <Text style={styles.preacherSeminarsTitle}>Семинары проповедника</Text>
              {preacherSeminarsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>
            {preacherSeminars.length === 0 ? (
              <Text style={styles.preacherSeminarsEmpty}>Пока нет анонсированных семинаров</Text>
            ) : (
              <View style={styles.preacherSeminarsList}>
                {preacherSeminars.map((item) => (
                  <View key={`preacher-seminar-${item.service.id}`} style={styles.preacherSeminarCard}>
                    <View style={styles.preacherSeminarTopRow}>
                      <Text style={styles.preacherSeminarTitle} numberOfLines={1}>{item.service.title}</Text>
                      <Text style={styles.preacherSeminarFormat}>{item.formatLabel}</Text>
                    </View>
                    <Text style={styles.preacherSeminarDate}>
                      {item.nextAt
                        ? item.nextAt.toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : 'Дата уточняется'}
                    </Text>
                    <Text style={styles.preacherSeminarVenue} numberOfLines={1}>{item.venueLabel}</Text>
                    <View style={styles.preacherSeminarActionsRow}>
                      <TouchableOpacity
                        style={styles.preacherSeminarBookButton}
                        onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.service.id })}
                      >
                        <Text style={styles.preacherSeminarBookButtonText}>Записаться</Text>
                      </TouchableOpacity>
                      {item.service.channel === 'offline' ? (
                        <TouchableOpacity
                          style={styles.preacherSeminarRouteButton}
                          onPress={() => void handleOpenSeminarRoute(item.service)}
                        >
                          <Text style={styles.preacherSeminarRouteButtonText}>Маршрут</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {!isSadhuSangaMode ? (
        <View style={styles.storiesSection}>
          <View style={styles.storiesHeaderRow}>
            <Text style={styles.storiesTitle}>Кружки канала</Text>
            {storiesLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.storiesCount}>{channelStories.length}</Text>
            )}
          </View>

          {channelStories.length > 0 ? (
            <View style={styles.storiesRow}>
              {channelStories.slice(0, 5).map(story => (
                <TouchableOpacity
                  key={story.id}
                  style={styles.storyChip}
                  onPress={() => navigation.navigate('VideoCirclesScreen', { channelId })}
                >
                  {story.thumbnailUrl ? (
                    <Image source={{ uri: story.thumbnailUrl }} style={styles.storyThumb} />
                  ) : (
                    <View style={styles.storyThumbPlaceholder}>
                      <Text style={styles.storyThumbPlaceholderText}>▶</Text>
                    </View>
                  )}
                  <Text style={styles.storyLabel} numberOfLines={1}>
                    #{story.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.storiesEmpty}>Пока нет активных кружков</Text>
          )}

          <TouchableOpacity
            style={styles.storiesAction}
            onPress={() => navigation.navigate('VideoCirclesScreen', { channelId })}
          >
            <Text style={styles.storiesActionText}>Открыть все кружки канала</Text>
          </TouchableOpacity>
        </View>
        ) : null}

        {isEditor && !isSadhuSangaMode ? (
          <TouchableOpacity
            style={[styles.draftsToggle, includeDraft && styles.draftsToggleActive]}
            onPress={() => setIncludeDraft(prev => !prev)}
          >
            <Text style={styles.draftsToggleText}>
              {includeDraft ? 'Показываются черновики' : 'Показывать только опубликованные'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!isSadhuSangaMode && showcases.length > 0 ? (
          <View style={styles.showcasesSection}>
            <View style={styles.showcasesHeaderRow}>
              <Text style={styles.showcasesTitle}>Витрины</Text>
              {showcaseLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>

            {showcases.map(showcase => {
              const isServiceShowcase = (showcase.kind || '').toLowerCase().includes('service');

              if (isServiceShowcase) {
                const services = showcaseServices[showcase.ID] || [];
                return (
                  <View key={showcase.ID} style={styles.showcaseCard}>
                    <View style={styles.showcaseCardHeader}>
                      <Text style={styles.showcaseCardTitle}>{showcase.title}</Text>
                      <Text style={styles.showcaseCardKind}>{showcase.kind}</Text>
                    </View>

                    {services.length > 0 ? (
                      <View style={styles.showcaseItemsList}>
                        {services.map(service => (
                          <TouchableOpacity
                            key={service.id}
                            style={styles.showcaseItemRow}
                            onPress={() => navigation.navigate('ServiceDetail', { serviceId: service.id })}
                          >
                            <Text style={styles.showcaseItemTitle} numberOfLines={1}>
                              {service.title}
                            </Text>
                            <Text style={styles.showcaseItemMeta}>{service.category}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.showcaseEmptyText}>Пока нет доступных услуг в этой витрине</Text>
                    )}
                  </View>
                );
              }

              const products = showcaseProducts[showcase.ID] || [];
              return (
                <View key={showcase.ID} style={styles.showcaseCard}>
                  <View style={styles.showcaseCardHeader}>
                    <Text style={styles.showcaseCardTitle}>{showcase.title}</Text>
                    <Text style={styles.showcaseCardKind}>{showcase.kind}</Text>
                  </View>

                  {products.length > 0 ? (
                    <View style={styles.showcaseItemsList}>
                      {products.map(product => (
                        <TouchableOpacity
                          key={product.ID}
                          style={styles.showcaseItemRow}
                          onPress={() => navigation.navigate('ProductDetails', { productId: product.ID })}
                        >
                          <Text style={styles.showcaseItemTitle} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text style={styles.showcaseItemMeta}>
                            {(product.salePrice ?? product.basePrice)} {product.currency || 'RUB'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.showcaseEmptyText}>Пока нет доступных товаров в этой витрине</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {busyPostId ? (
          <View style={styles.busyIndicator}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        <FlatList
          ref={(instance) => {
            contentListRef.current = instance;
          }}
          data={posts}
          keyExtractor={item => item.ID.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Постов пока нет</Text>
              <Text style={styles.emptySubtitle}>Создайте первую публикацию в канале</Text>
            </View>
          }
        />

        <Modal visible={commentsSheetVisible} transparent animationType="slide" onRequestClose={closeComments}>
          <View style={styles.commentsOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeComments} />
            <View style={styles.commentsSheet}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Комментарии</Text>
                <TouchableOpacity style={styles.commentsCloseBtn} onPress={closeComments}>
                  <Text style={styles.commentsCloseText}>Закрыть</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.commentsSubtitle}>
                {commentsSheetPost?.channel?.title || `Канал #${commentsSheetPost?.channelId || ''}`}
              </Text>

              {commentsSheetLoading && commentsSheetItems.length === 0 ? (
                <View style={styles.commentsLoader}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : (
                <FlatList
                  data={commentsSheetItems}
                  keyExtractor={item => item.ID.toString()}
                  style={styles.commentsList}
                  contentContainerStyle={styles.commentsListContent}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>
                        {item.user?.spiritualName || item.user?.karmicName || `User #${item.userId}`}
                      </Text>
                      <Text style={styles.commentBody}>{item.body}</Text>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={styles.commentsEmpty}>Комментариев пока нет</Text>}
                  ListFooterComponent={
                    commentsSheetCursor ? (
                      <TouchableOpacity style={styles.moreCommentsBtn} onPress={loadMoreComments}>
                        <Text style={styles.moreCommentsText}>Загрузить еще</Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              )}

              <View style={styles.commentComposer}>
                <TextInput
                  value={commentsSheetText}
                  onChangeText={setCommentsSheetText}
                  placeholder="Написать комментарий..."
                  placeholderTextColor={colors.textSecondary}
                  style={styles.commentInput}
                  editable={!commentsSheetSubmitting}
                />
                <TouchableOpacity
                  style={[styles.sendCommentBtn, commentsSheetSubmitting && styles.sendCommentBtnDisabled]}
                  onPress={() => void submitComment()}
                  disabled={commentsSheetSubmitting}
                >
                  {commentsSheetSubmitting ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Text style={styles.sendCommentText}>Отправить</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    createPostButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    manageButton: {
      backgroundColor: colors.surfaceElevated,
    },
    followButton: {
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    followDefaultButton: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    followingButton: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    followButtonDisabled: {
      opacity: 0.75,
    },
    followButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerPlaceholder: {
      width: 36,
      height: 36,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    channelIntro: {
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    channelDescription: {
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    channelMeta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    channelStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    channelMetaSecondary: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    askQuestionButton: {
      marginTop: 6,
      alignSelf: 'flex-start',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    askQuestionButtonDisabled: {
      opacity: 0.6,
    },
    askQuestionButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    preacherAnalyticsSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 10,
    },
    preacherAnalyticsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    preacherAnalyticsTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    preacherAnalyticsStatsGrid: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
    },
    preacherAnalyticsStatCard: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 3,
    },
    preacherAnalyticsStatValue: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    preacherAnalyticsStatLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    preacherAnalyticsCitiesWrap: {
      gap: 6,
    },
    preacherAnalyticsCitiesTitle: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    preacherAnalyticsCitiesEmpty: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    preacherAnalyticsCitiesList: {
      gap: 6,
    },
    preacherAnalyticsCityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 9,
      paddingVertical: 7,
      gap: 10,
    },
    preacherAnalyticsCityName: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    preacherAnalyticsCityValue: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    preacherQuestionsSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    preacherQuestionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    preacherQuestionsTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    preacherQuestionsEmpty: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    preacherQuestionsList: {
      gap: 8,
    },
    preacherQuestionCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      gap: 6,
    },
    preacherQuestionSubject: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    preacherQuestionExcerpt: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    preacherQuestionBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    preacherQuestionVotes: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    preacherQuestionVoteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    preacherQuestionVoteButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    preacherQuestionVoteButtonDisabled: {
      opacity: 0.65,
    },
    preacherQuestionVoteText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    preacherQuestionVoteTextActive: {
      color: colors.accent,
    },
    crmButton: {
      marginTop: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    crmButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    promptBanner: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      padding: 10,
      gap: 8,
    },
    promptBannerText: {
      color: colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    promptBannerAction: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: colors.surface,
    },
    promptBannerActionText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    storiesSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    preacherSeminarsSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    preacherSeminarsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    preacherSeminarsTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    preacherSeminarsEmpty: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    preacherSeminarsList: {
      gap: 8,
    },
    preacherSeminarCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      gap: 6,
    },
    preacherSeminarTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    preacherSeminarTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    preacherSeminarFormat: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
    },
    preacherSeminarDate: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    preacherSeminarVenue: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    preacherSeminarBookButton: {
      alignSelf: 'flex-start',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    preacherSeminarBookButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    preacherSeminarActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    preacherSeminarRouteButton: {
      alignSelf: 'flex-start',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    preacherSeminarRouteButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    storiesHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    storiesTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    storiesCount: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    storiesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    storyChip: {
      width: 64,
      alignItems: 'center',
      gap: 4,
    },
    storyThumb: {
      width: 56,
      height: 56,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    storyThumbPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    storyThumbPlaceholderText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    storyLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      textAlign: 'center',
    },
    storiesEmpty: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    storiesAction: {
      marginTop: 2,
      alignSelf: 'flex-start',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    storiesActionText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    draftsToggle: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    draftsToggleActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    draftsToggleText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    showcaseContainer: {
      marginHorizontal: 16,
      marginBottom: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    showcaseChip: {
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    showcaseChipText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    showcasesSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 8,
    },
    showcasesHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    showcasesTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    showcaseCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    showcaseCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    showcaseCardTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    showcaseCardKind: {
      color: colors.textSecondary,
      fontSize: 11,
      textTransform: 'uppercase',
    },
    showcaseItemsList: {
      gap: 6,
    },
    showcaseItemRow: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 8,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    showcaseItemTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    showcaseItemMeta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    showcaseEmptyText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    busyIndicator: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 10,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    postHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    menuButton: {
      width: 26,
      height: 26,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    postMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pinTag: {
      backgroundColor: colors.accentSoft,
      borderRadius: 7,
      paddingVertical: 4,
      paddingHorizontal: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    pinTagText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
    },
    postStatus: {
      color: colors.textSecondary,
      fontSize: 12,
      textTransform: 'uppercase',
    },
    postDate: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    postContent: {
      color: colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
    },
    mediaBlock: {
      gap: 8,
    },
    mediaRow: {
      gap: 8,
    },
    postImage: {
      width: 126,
      height: 158,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    circleCard: {
      width: 92,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    circleThumb: {
      width: 52,
      height: 52,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    circleThumbFallback: {
      width: 52,
      height: 52,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
    },
    postActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    moderationActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    primaryAction: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    primaryActionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    secondaryAction: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryActionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 8,
    },
    actionText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    commentsOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(5, 7, 12, 0.45)',
    },
    commentsSheet: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
      backgroundColor: colors.background,
      minHeight: '45%',
      maxHeight: '80%',
      paddingTop: 14,
      paddingHorizontal: 14,
      paddingBottom: 18,
      gap: 10,
    },
    commentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    commentsTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    commentsCloseBtn: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    commentsCloseText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    commentsSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    commentsLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    commentsList: {
      maxHeight: 320,
    },
    commentsListContent: {
      gap: 8,
      paddingBottom: 4,
    },
    commentItem: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    commentAuthor: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    commentBody: {
      color: colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    commentsEmpty: {
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 16,
    },
    moreCommentsBtn: {
      alignSelf: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 4,
    },
    moreCommentsText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    commentComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    commentInput: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: 10,
      paddingVertical: 9,
      fontSize: 13,
    },
    sendCommentBtn: {
      borderRadius: 10,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 88,
    },
    sendCommentBtnDisabled: {
      opacity: 0.8,
    },
    sendCommentText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
  });
