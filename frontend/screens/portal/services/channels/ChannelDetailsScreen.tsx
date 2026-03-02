import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
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
import { ArrowDown, ArrowLeft, Eye, MapPin, MessageCircle, MoreHorizontal, Pin, PlusCircle, Settings2, Share2, Smile, ThumbsUp, Users, Video } from 'lucide-react-native';
import { channelService, PreacherAnalytics } from '../../../../services/channelService';
import {
  Channel,
  ChannelLiveModerationAction,
  ChannelLiveParticipant,
  ChannelLiveSession,
  ChannelMemberRole,
  ChannelPost,
  ChannelPostComment,
  ChannelPostMediaCircle,
  ChannelPostMediaImage,
  ChannelRoadmapPoint,
  ChannelRoadmapResponse,
  ChannelShowcase,
  PreacherProfile,
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

type SadhuSection = 'overview' | 'live' | 'seminars' | 'questions' | 'roadmap' | 'posts';

const canEditPosts = (role?: ChannelMemberRole) => role === 'owner' || role === 'admin' || role === 'editor';
const canModeratePosts = (role?: ChannelMemberRole) => role === 'owner' || role === 'admin';
const MAX_SHOWCASE_PREVIEW_ITEMS = 4;
const CHANNEL_PROMPT_KEY = 'channels_channel_details_tip_v1';
const POST_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const LIVE_BROADCAST_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Español' },
];
const SADHU_SECTIONS: Array<{ key: SadhuSection; label: string }> = [
  { key: 'overview', label: 'Обзор' },
  { key: 'live', label: 'Эфиры' },
  { key: 'seminars', label: 'Семинары' },
  { key: 'questions', label: 'Вопросы' },
  { key: 'roadmap', label: 'Маршрут' },
  { key: 'posts', label: 'Посты' },
];

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

const roadmapStatusLabel = (status: ChannelRoadmapPoint['status']): string => {
  if (status === 'current') {
    return 'Сейчас';
  }
  if (status === 'past') {
    return 'Был';
  }
  return 'Будет';
};

const getRoadmapPointMapUrl = (point: ChannelRoadmapPoint): string => {
  const fromAPI = String(point.mapUrl || '').trim();
  if (fromAPI) {
    return fromAPI;
  }
  const hasCoords = Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
  if (hasCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  }
  const address = String(`${point.city || ''} ${point.address || ''}` || '').trim();
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

const resolveLiveLanguageLabel = (code?: string): string => {
  const normalized = String(code || 'ru').trim().toLowerCase() || 'ru';
  const found = LIVE_BROADCAST_LANGUAGES.find(item => item.code === normalized);
  if (found) {
    return found.label;
  }
  return normalized.toUpperCase();
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
  const [preacherProfile, setPreacherProfile] = useState<PreacherProfile | null>(null);
  const [preacherProfileLoading, setPreacherProfileLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<ChannelRoadmapResponse | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [liveSession, setLiveSession] = useState<ChannelLiveSession | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveParticipants, setLiveParticipants] = useState<ChannelLiveParticipant[]>([]);
  const [liveParticipantsLoading, setLiveParticipantsLoading] = useState(false);
  const [liveModerationBusyUserId, setLiveModerationBusyUserId] = useState<number | null>(null);
  const [activeSadhuSection, setActiveSadhuSection] = useState<SadhuSection>('overview');
  const seminarsSectionYRef = useRef(0);
  const contentListRef = useRef<ScrollView | null>(null);

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

  const loadRoadmap = useCallback(async (targetChannelID: number, reqId: number) => {
    if (!targetChannelID || targetChannelID <= 0) {
      setRoadmap(null);
      return;
    }
    setRoadmapLoading(true);
    try {
      const response = await channelService.getRoadmap(targetChannelID);
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      setRoadmap(response);
    } catch (error: any) {
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить дорожную карту';
      console.warn(`[ChannelDetails] Failed to load roadmap: ${message}`);
      setRoadmap(null);
    } finally {
      if (mountedRef.current && reqId === latestLoadRef.current) {
        setRoadmapLoading(false);
      }
    }
  }, []);

  const loadPreacherProfile = useCallback(async (targetChannelID: number, reqId: number) => {
    if (!targetChannelID || targetChannelID <= 0) {
      setPreacherProfile(null);
      return;
    }
    setPreacherProfileLoading(true);
    try {
      const response = await channelService.getPreacherProfile(targetChannelID);
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      setPreacherProfile(response);
    } catch (error: any) {
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить профиль';
      console.warn(`[ChannelDetails] Failed to load preacher profile: ${message}`);
      setPreacherProfile(null);
    } finally {
      if (mountedRef.current && reqId === latestLoadRef.current) {
        setPreacherProfileLoading(false);
      }
    }
  }, []);

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
        try {
          const live = await channelService.getChannelLive(channelId);
          if (mountedRef.current && reqId === latestLoadRef.current) {
            setLiveSession(live.session);
          }
        } catch {
          if (mountedRef.current && reqId === latestLoadRef.current) {
            setLiveSession(channelResponse.channel.currentLiveSession || null);
          }
        }
        void loadRoadmap(channelId, reqId);
        void loadPreacherProfile(channelId, reqId);
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
        setLiveSession(null);
        setRoadmap(null);
        setPreacherProfile(null);
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
  }, [channelId, includeDraft, isSadhuSangaMode, loadPreacherAnalytics, loadPreacherProfile, loadPreacherQuestions, loadPreacherSeminars, loadRoadmap, user?.ID]);

  useEffect(() => {
    if (!isSadhuSangaMode || focusSection !== 'seminars') {
      return;
    }
    setActiveSadhuSection('seminars');
    const timer = setTimeout(() => {
      contentListRef.current?.scrollTo({
        y: Math.max(0, seminarsSectionYRef.current - 110),
        animated: true,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [focusSection, isSadhuSangaMode, preacherSeminars.length]);

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
  const canManageLive = isSadhuSangaMode && isEditor;
  const canManageRoadmap = isSadhuSangaMode && isEditor;
  const canJoinLive = isSadhuSangaMode && (viewerRole === 'subscriber' || viewerRole === 'editor' || viewerRole === 'admin' || viewerRole === 'owner');
  const roadmapTimeline = useMemo<ChannelRoadmapPoint[]>(() => {
    if (!roadmap) {
      return [];
    }
    const current = roadmap.current ? [roadmap.current] : [];
    return [...current, ...(roadmap.future || []), ...(roadmap.past || [])];
  }, [roadmap]);
  const liveLanguageLabel = resolveLiveLanguageLabel(liveSession?.broadcastLanguage);
  const liveStatusLabel = liveSession?.status === 'live'
    ? 'В эфире'
    : liveSession?.status === 'scheduled'
      ? 'Запланировано'
      : liveSession?.status === 'ended'
        ? 'Завершено'
        : liveSession?.status === 'cancelled'
          ? 'Отменено'
          : 'Эфир не активен';

  const openRoadmapPointOnMap = useCallback(async (point: ChannelRoadmapPoint) => {
    const mapUrl = getRoadmapPointMapUrl(point);
    if (!mapUrl) {
      Alert.alert('Локация', 'Для этой точки не указаны координаты или адрес.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(mapUrl);
      if (!supported) {
        Alert.alert('Локация', 'Не удалось открыть карту на устройстве.');
        return;
      }
      await Linking.openURL(mapUrl);
    } catch {
      Alert.alert('Локация', 'Не удалось открыть маршрут.');
    }
  }, []);

  const handleCreateLive = useCallback(async () => {
    if (!channelId || !canManageLive || liveBusy) {
      return;
    }
    setLiveBusy(true);
    try {
      const scheduled = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const created = await channelService.createChannelLive(channelId, {
        title: `${channel?.title || 'Канал'} — прямой эфир`,
        description: 'Анонс эфира',
        broadcastLanguage: String(user?.language || 'ru').trim().toLowerCase() || 'ru',
        scheduledAt: scheduled,
        accessPolicy: 'followers',
      });
      setLiveSession(created);
      Alert.alert('Готово', 'Эфир запланирован.');
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось создать эфир');
    } finally {
      if (mountedRef.current) {
        setLiveBusy(false);
      }
    }
  }, [canManageLive, channel?.title, channelId, liveBusy, user?.language]);

  const handleSetLiveLanguage = useCallback(async (languageCode: string) => {
    if (!channelId || !liveSession?.id || !canManageLive || liveBusy) {
      return;
    }
    const normalized = String(languageCode || '').trim().toLowerCase();
    if (!normalized || normalized === String(liveSession.broadcastLanguage || 'ru').trim().toLowerCase()) {
      return;
    }
    setLiveBusy(true);
    try {
      const updated = await channelService.updateChannelLive(channelId, liveSession.id, {
        broadcastLanguage: normalized,
      });
      setLiveSession(updated);
      Alert.alert('Язык эфира', `Установлен язык: ${resolveLiveLanguageLabel(normalized)}.`);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить язык эфира');
    } finally {
      if (mountedRef.current) {
        setLiveBusy(false);
      }
    }
  }, [canManageLive, channelId, liveBusy, liveSession?.broadcastLanguage, liveSession?.id]);

  const openLiveLanguagePicker = useCallback(() => {
    if (!canManageLive || !liveSession?.id || liveBusy) {
      return;
    }
    const buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = LIVE_BROADCAST_LANGUAGES.map(item => ({
      text: item.label + (item.code === String(liveSession.broadcastLanguage || 'ru').trim().toLowerCase() ? ' ✓' : ''),
      onPress: () => {
        void handleSetLiveLanguage(item.code);
      },
    }));
    buttons.push({ text: 'Отмена', style: 'cancel' as const });
    Alert.alert('Язык трансляции', 'Выберите язык текущего эфира', buttons);
  }, [canManageLive, handleSetLiveLanguage, liveBusy, liveSession?.broadcastLanguage, liveSession?.id]);

  const handleStartLive = useCallback(async () => {
    if (!channelId || !liveSession?.id || !canManageLive || liveBusy) {
      return;
    }
    setLiveBusy(true);
    try {
      const started = await channelService.startChannelLive(channelId, liveSession.id);
      setLiveSession(started);
      Alert.alert('Эфир запущен', 'Подписчики получили уведомление о старте.');
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось запустить эфир');
    } finally {
      if (mountedRef.current) {
        setLiveBusy(false);
      }
    }
  }, [canManageLive, channelId, liveBusy, liveSession?.id]);

  const handleEndLive = useCallback(async () => {
    if (!channelId || !liveSession?.id || !canManageLive || liveBusy) {
      return;
    }
    setLiveBusy(true);
    try {
      const ended = await channelService.endChannelLive(channelId, liveSession.id);
      setLiveSession(ended);
      Alert.alert('Эфир завершен', 'Сессия остановлена.');
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось завершить эфир');
    } finally {
      if (mountedRef.current) {
        setLiveBusy(false);
      }
    }
  }, [canManageLive, channelId, liveBusy, liveSession?.id]);

  const handleCancelLive = useCallback(async () => {
    if (!channelId || !liveSession?.id || !canManageLive || liveBusy) {
      return;
    }
    setLiveBusy(true);
    try {
      const cancelled = await channelService.cancelChannelLive(channelId, liveSession.id);
      setLiveSession(cancelled);
      Alert.alert('Анонс отменен', 'Эфир отменен.');
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось отменить эфир');
    } finally {
      if (mountedRef.current) {
        setLiveBusy(false);
      }
    }
  }, [canManageLive, channelId, liveBusy, liveSession?.id]);

  const handleJoinLive = useCallback(async () => {
    if (!channelId || !liveSession?.id || liveBusy) {
      return;
    }
    setLiveBusy(true);
    try {
      const join = await channelService.joinChannelLive(channelId, liveSession.id, {
        participantName: user?.spiritualName || user?.karmicName || '',
        metadata: { platform: 'mobile' },
      });
      navigation.navigate('RoomChat', {
        roomId: join.roomId,
        roomName: `${channel?.title || 'Эфир'} · Live`,
        autoStartCall: true,
        liveChannelId: channelId,
        liveId: liveSession.id,
      });
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось подключиться к эфиру');
      void loadData(true);
    } finally {
      if (mountedRef.current) {
        setLiveBusy(false);
      }
    }
  }, [channel?.title, channelId, liveBusy, liveSession?.id, loadData, navigation, user?.karmicName, user?.spiritualName]);

  const loadLiveParticipants = useCallback(async () => {
    if (!channelId || !liveSession?.id || !canManageLive) {
      setLiveParticipants([]);
      return;
    }
    setLiveParticipantsLoading(true);
    try {
      const response = await channelService.listChannelLiveParticipants(channelId, liveSession.id);
      if (!mountedRef.current) {
        return;
      }
      setLiveParticipants(response.participants || []);
    } catch (error: any) {
      if (mountedRef.current) {
        setLiveParticipants([]);
      }
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить участников эфира';
      console.warn(`[ChannelDetails] Failed to load live participants: ${message}`);
    } finally {
      if (mountedRef.current) {
        setLiveParticipantsLoading(false);
      }
    }
  }, [canManageLive, channelId, liveSession?.id]);

  useEffect(() => {
    if (!isSadhuSangaMode || !canManageLive || !liveSession?.id || liveSession.status !== 'live') {
      setLiveParticipants([]);
      return;
    }
    void loadLiveParticipants();
  }, [canManageLive, isSadhuSangaMode, liveSession?.id, liveSession?.status, loadLiveParticipants]);

  const applyLiveModeration = useCallback(async (targetUserId: number, action: ChannelLiveModerationAction, reason = '') => {
    if (!channelId || !liveSession?.id || !canManageLive || liveModerationBusyUserId !== null) {
      return;
    }
    setLiveModerationBusyUserId(targetUserId);
    try {
      const response = await channelService.moderateChannelLiveParticipant(channelId, liveSession.id, {
        targetUserId,
        action,
        reason: reason.trim(),
      });
      if (mountedRef.current) {
        setLiveParticipants(response.participants || []);
      }
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось выполнить действие модерации');
    } finally {
      if (mountedRef.current) {
        setLiveModerationBusyUserId(null);
      }
    }
  }, [canManageLive, channelId, liveModerationBusyUserId, liveSession?.id]);

  const openParticipantModerationMenu = useCallback((participant: ChannelLiveParticipant) => {
    if (!canManageLive) {
      return;
    }
    const displayName = participant.spiritualName || participant.karmicName || `ID ${participant.userId}`;
    Alert.alert(
      'Модерация эфира',
      displayName,
      [
        {
          text: participant.isMuted ? 'Снять mute' : 'Mute',
          onPress: () => void applyLiveModeration(
            participant.userId,
            participant.isMuted ? 'unmute' : 'mute',
          ),
        },
        {
          text: participant.isBlocked ? 'Разблокировать' : 'Заблокировать',
          onPress: () => void applyLiveModeration(
            participant.userId,
            participant.isBlocked ? 'unblock' : 'block',
          ),
        },
        {
          text: 'Кик из эфира',
          onPress: () => void applyLiveModeration(participant.userId, 'kick'),
          style: 'destructive',
        },
        {
          text: 'Отмена',
          style: 'cancel',
        },
      ],
    );
  }, [applyLiveModeration, canManageLive]);

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
  const channelNameLabel = useMemo(() => {
    const title = String(channel?.title || '').trim();
    return title.length > 0 ? title : 'канала';
  }, [channel?.title]);
  const preacherBioHeading = useMemo(() => `О ${channelNameLabel}`, [channelNameLabel]);
  const canManagePreacherBio = canEditPosts(viewerRole);
  const showSadhuLive = !isSadhuSangaMode || activeSadhuSection === 'live';
  const showSadhuRoadmap = !isSadhuSangaMode || activeSadhuSection === 'roadmap';
  const showSadhuQuestions = !isSadhuSangaMode || activeSadhuSection === 'questions';
  const showSadhuSeminars = !isSadhuSangaMode || activeSadhuSection === 'seminars';
  const showSadhuPosts = !isSadhuSangaMode || activeSadhuSection === 'overview' || activeSadhuSection === 'posts';

  const visibleRoadmapTimeline = useMemo(() => {
    if (activeSadhuSection === 'overview') {
      return roadmapTimeline.slice(0, 3);
    }
    return roadmapTimeline;
  }, [activeSadhuSection, roadmapTimeline]);
  const visibleQuestions = useMemo(() => {
    if (activeSadhuSection === 'overview') {
      return preacherQuestions.slice(0, 1);
    }
    return preacherQuestions;
  }, [activeSadhuSection, preacherQuestions]);
  const visibleSeminars = useMemo(() => {
    return preacherSeminars;
  }, [preacherSeminars]);
  const visiblePosts = useMemo(() => {
    if (!isSadhuSangaMode) {
      return posts;
    }
    if (activeSadhuSection === 'overview') {
      return posts.slice(0, 3);
    }
    if (activeSadhuSection === 'posts') {
      return posts;
    }
    return [];
  }, [activeSadhuSection, isSadhuSangaMode, posts]);
  const overviewQuestionTop = useMemo(() => {
    if (!preacherQuestions.length) {
      return null;
    }
    return preacherQuestions[0];
  }, [preacherQuestions]);
  const overviewRoadmapPoint = useMemo(() => {
    if (roadmap?.current) {
      return roadmap.current;
    }
    if ((roadmap?.future || []).length > 0) {
      return roadmap?.future?.[0] || null;
    }
    if ((roadmap?.past || []).length > 0) {
      return roadmap?.past?.[0] || null;
    }
    return null;
  }, [roadmap?.current, roadmap?.future, roadmap?.past]);
  const visiblePreacherEvents = useMemo(() => {
    if (!preacherProfile?.events?.length) {
      return [];
    }
    const sorted = [...preacherProfile.events].sort((a, b) => {
      const posDiff = (Number(a.position) || 0) - (Number(b.position) || 0);
      if (posDiff !== 0) {
        return posDiff;
      }
      const leftTs = Date.parse(a.eventDate || '');
      const rightTs = Date.parse(b.eventDate || '');
      if (Number.isFinite(leftTs) && Number.isFinite(rightTs) && leftTs !== rightTs) {
        return leftTs - rightTs;
      }
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
    return activeSadhuSection === 'overview' ? sorted.slice(0, 3) : sorted;
  }, [activeSadhuSection, preacherProfile?.events]);
  const hasPreacherBioContent = useMemo(() => {
    if (!preacherProfile) {
      return false;
    }
    return Boolean(
      String(preacherProfile.bio || '').trim()
      || String(preacherProfile.birthDate || '').trim()
      || String(preacherProfile.birthPlace || '').trim()
      || String(preacherProfile.departureDate || '').trim()
      || String(preacherProfile.organizationName || '').trim()
      || String(preacherProfile.mathKey || '').trim()
      || (preacherProfile.events || []).length > 0,
    );
  }, [preacherProfile]);
  const nextSeminarPreview = useMemo(() => {
    if (!preacherSeminars.length) {
      return null;
    }
    return preacherSeminars.find((item) => Boolean(item.nextAt)) || preacherSeminars[0];
  }, [preacherSeminars]);
  const sadhuHeroStatus = useMemo(() => {
    if (!isSadhuSangaMode) {
      return '';
    }
    if (liveSession?.status === 'live') {
      return `LIVE сейчас • ${resolveLiveLanguageLabel(liveSession.broadcastLanguage)}`;
    }
    if (liveSession?.status === 'scheduled' && liveSession.scheduledAt) {
      return `Эфир запланирован: ${new Date(liveSession.scheduledAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    if (nextSeminarPreview?.nextAt) {
      return `Ближайший семинар: ${nextSeminarPreview.nextAt.toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    return 'Подпишитесь, чтобы получать анонсы эфиров и семинаров';
  }, [isSadhuSangaMode, liveSession?.broadcastLanguage, liveSession?.scheduledAt, liveSession?.status, nextSeminarPreview]);

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
  const showStickySadhuCta = isSadhuSangaMode && canFollow;
  const stickySadhuCtaLabel = channel?.isFollowing ? 'Открыть расписание' : 'Подписаться';

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

  const handleStickySadhuCta = useCallback(() => {
    if (!showStickySadhuCta) {
      return;
    }
    if (channel?.isFollowing) {
      navigation.navigate('SadhuSangaSchedule');
      return;
    }
    void handleFollowToggle();
  }, [channel?.isFollowing, handleFollowToggle, navigation, showStickySadhuCta]);

  const openSadhuQuestionForm = useCallback(() => {
    if (!channel?.ownerId || channel.ownerId <= 0) {
      return;
    }
    navigation.navigate('SupportTicketForm', {
      entryPoint: 'sadhu_sanga_question',
      targetPreacherId: channel.ownerId,
      targetPreacherName: channel?.title,
    });
  }, [channel?.ownerId, channel?.title, navigation]);

  const handleSadhuQuickLive = useCallback(() => {
    if (liveSession?.status === 'live' && canJoinLive) {
      void handleJoinLive();
      return;
    }
    setActiveSadhuSection('live');
    contentListRef.current?.scrollTo({ y: 0, animated: true });
  }, [canJoinLive, handleJoinLive, liveSession?.status]);

  const handleSadhuQuickSeminars = useCallback(() => {
    setActiveSadhuSection('seminars');
    contentListRef.current?.scrollTo({ y: Math.max(0, seminarsSectionYRef.current - 110), animated: true });
  }, []);

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
                  onPress={() => navigation.navigate('ChannelTeam', { channelId, source: isSadhuSangaMode ? 'sadhu_sanga' : undefined })}
                >
                  <Users size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : null}
              {isModerator ? (
                <TouchableOpacity
                  style={[styles.headerButton, styles.manageButton]}
                  onPress={() => navigation.navigate('ChannelManage', { channelId })}
                >
                  <Settings2 size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : null}
              {canManageRoadmap ? (
                <TouchableOpacity
                  style={[styles.headerButton, styles.manageButton]}
                  onPress={() => navigation.navigate('ChannelRoadmapManage', { channelId, source: isSadhuSangaMode ? 'sadhu_sanga' : undefined })}
                >
                  <MapPin size={16} color={colors.textPrimary} />
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

        <ScrollView
          ref={(instance) => {
            contentListRef.current = instance;
          }}
          style={styles.contentScroll}
          contentContainerStyle={[
            styles.contentScrollContainer,
            showStickySadhuCta && styles.contentScrollContainerWithStickyCta,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.channelIntro}>
          <Text style={styles.channelDescription}>{channel?.description || 'Описание канала не заполнено'}</Text>
          <View style={styles.channelStatsRow}>
            <Text style={styles.channelMeta}>@{channel?.slug || 'channel'}</Text>
            <Text style={styles.channelMetaSecondary}>
              Подписчиков: {Math.max(0, Number(channel?.followersCount) || 0)}
            </Text>
          </View>
          {isSadhuSangaMode ? (
            <View style={styles.sadhuHeroCard}>
              <Text style={styles.sadhuHeroStatus}>{sadhuHeroStatus}</Text>
              <View style={styles.sadhuHeroActionsRow}>
                <TouchableOpacity style={styles.sadhuHeroActionButton} onPress={handleSadhuQuickLive}>
                  <Text style={styles.sadhuHeroActionText}>
                    {liveSession?.status === 'live' ? 'Смотреть эфир' : 'Эфиры'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sadhuHeroActionButton} onPress={handleSadhuQuickSeminars}>
                  <Text style={styles.sadhuHeroActionText}>Семинары</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sadhuHeroActionButton,
                    !(channel?.ownerId && channel.ownerId > 0) && styles.sadhuHeroActionButtonDisabled,
                  ]}
                  onPress={openSadhuQuestionForm}
                  disabled={!(channel?.ownerId && channel.ownerId > 0)}
                >
                  <Text style={styles.sadhuHeroActionText}>Вопрос</Text>
                </TouchableOpacity>
              </View>
            </View>
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

        {isSadhuSangaMode ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sadhuSectionsRow}
            style={styles.sadhuSectionsWrap}
          >
            {SADHU_SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.key}
                style={[
                  styles.sadhuSectionChip,
                  activeSadhuSection === section.key && styles.sadhuSectionChipActive,
                ]}
                onPress={() => setActiveSadhuSection(section.key)}
              >
                <Text
                  style={[
                    styles.sadhuSectionChipText,
                    activeSadhuSection === section.key && styles.sadhuSectionChipTextActive,
                  ]}
                >
                  {section.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {isSadhuSangaMode && activeSadhuSection === 'overview' ? (
          <View style={styles.overviewGridSection}>
            <Text style={styles.overviewGridTitle}>Быстрый доступ</Text>
            <View style={styles.overviewGrid}>
              <TouchableOpacity style={styles.overviewCard} onPress={handleSadhuQuickLive}>
                <Text style={styles.overviewCardTitle}>Эфир</Text>
                <Text style={styles.overviewCardValue} numberOfLines={2}>
                  {liveSession?.status === 'live'
                    ? 'Сейчас в эфире'
                    : liveSession?.status === 'scheduled'
                      ? 'Запланирован'
                      : 'Пока не активен'}
                </Text>
                <Text style={styles.overviewCardHint}>
                  {liveSession?.status === 'live' ? 'Открыть трансляцию' : 'Открыть раздел'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.overviewCard} onPress={handleSadhuQuickSeminars}>
                <Text style={styles.overviewCardTitle}>Семинары</Text>
                <Text style={styles.overviewCardValue} numberOfLines={2}>
                  {nextSeminarPreview?.nextAt
                    ? nextSeminarPreview.nextAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
                    : 'Пока нет дат'}
                </Text>
                <Text style={styles.overviewCardHint}>Открыть список</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.overviewCard} onPress={() => setActiveSadhuSection('questions')}>
                <Text style={styles.overviewCardTitle}>Вопросы</Text>
                <Text style={styles.overviewCardValue} numberOfLines={2}>
                  {preacherQuestions.length > 0
                    ? `Голосов: ${Math.max(0, Number(overviewQuestionTop?.voteCount) || 0)}`
                    : 'Пока нет вопросов'}
                </Text>
                <Text style={styles.overviewCardHint}>
                  {preacherQuestions.length > 0 ? 'Открыть раздел' : 'Задать вопрос'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.overviewCard} onPress={() => setActiveSadhuSection('roadmap')}>
                <Text style={styles.overviewCardTitle}>Маршрут</Text>
                <Text style={styles.overviewCardValue} numberOfLines={2}>
                  {overviewRoadmapPoint
                    ? [overviewRoadmapPoint.city, overviewRoadmapPoint.address].filter(Boolean).join(', ') || 'Локация есть'
                    : 'Пока не заполнен'}
                </Text>
                <Text style={styles.overviewCardHint}>Открыть карту</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {isSadhuSangaMode && (activeSadhuSection === 'overview' || activeSadhuSection === 'posts') ? (
          <View style={styles.preacherBioSection}>
            <View style={styles.preacherBioHeader}>
              <Text style={styles.preacherBioTitle}>{preacherBioHeading}</Text>
              {preacherProfileLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>

            {hasPreacherBioContent ? (
              <>
                {String(preacherProfile?.bio || '').trim() ? (
                  activeSadhuSection === 'overview' ? (
                    <Text style={styles.preacherBioText} numberOfLines={4}>
                      {String(preacherProfile?.bio || '').trim()}
                    </Text>
                  ) : (
                    <Text style={styles.preacherBioText}>
                      {String(preacherProfile?.bio || '').trim()}
                    </Text>
                  )
                ) : null}

                <View style={styles.preacherBioMetaList}>
                  {preacherProfile?.birthDate || preacherProfile?.birthPlace ? (
                    <Text style={styles.preacherBioMetaRow}>
                      {`Рождение: ${
                        preacherProfile.birthDate
                          ? new Date(preacherProfile.birthDate).toLocaleDateString('ru-RU')
                          : 'дата не указана'
                      }${preacherProfile.birthPlace ? ` • ${preacherProfile.birthPlace}` : ''}`}
                    </Text>
                  ) : null}
                  {preacherProfile?.departureDate ? (
                    <Text style={styles.preacherBioMetaRow}>
                      {`Дата ухода: ${new Date(preacherProfile.departureDate).toLocaleDateString('ru-RU')}`}
                    </Text>
                  ) : null}
                  {String(preacherProfile?.organizationName || preacherProfile?.mathKey || '').trim() ? (
                    <Text style={styles.preacherBioMetaRow}>
                      {`Организация / Матх: ${String(preacherProfile?.organizationName || preacherProfile?.mathKey || '').trim()}`}
                    </Text>
                  ) : null}
                </View>

                {visiblePreacherEvents.length > 0 ? (
                  <View style={styles.preacherBioEventsWrap}>
                    <Text style={styles.preacherBioEventsTitle}>Знаковые события</Text>
                    {visiblePreacherEvents.map((event) => (
                      <View key={`preacher-event-${event.id}`} style={styles.preacherBioEventRow}>
                        <Text style={styles.preacherBioEventTitle} numberOfLines={2}>{event.title}</Text>
                        {event.eventDate ? (
                          <Text style={styles.preacherBioEventDate}>
                            {new Date(event.eventDate).toLocaleDateString('ru-RU')}
                          </Text>
                        ) : null}
                        {event.description ? (
                          <Text style={styles.preacherBioEventDescription} numberOfLines={2}>{event.description}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.preacherBioEmpty}>Биография пока не заполнена</Text>
            )}

            {canManagePreacherBio ? (
              <TouchableOpacity
                style={styles.preacherBioManageButton}
                onPress={() => navigation.navigate('ChannelPreacherBioManage', { channelId, source: 'sadhu_sanga' })}
              >
                <Text style={styles.preacherBioManageButtonText}>Редактировать био</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {isSadhuSangaMode && showSadhuLive ? (
          <View style={styles.liveSection}>
            <View style={styles.liveHeaderRow}>
              <Text style={styles.liveTitle}>Прямой эфир</Text>
              {liveBusy ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>
            <Text style={[
              styles.liveStatus,
              liveSession?.status === 'live' && styles.liveStatusLive,
            ]}>
              {liveStatusLabel}
            </Text>
            {liveSession ? (
              <Text style={styles.liveLanguageCaption}>Язык трансляции: {liveLanguageLabel}</Text>
            ) : null}
            {liveSession ? (
              <View style={styles.liveCard}>
                <Text style={styles.liveCardTitle} numberOfLines={1}>{liveSession.title || 'Эфир канала'}</Text>
                <View style={styles.liveLanguageRow}>
                  <View style={styles.liveLanguageChip}>
                    <Text style={styles.liveLanguageChipText}>{(liveSession.broadcastLanguage || 'ru').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.liveCardMeta}>{liveLanguageLabel}</Text>
                  {canManageLive ? (
                    <TouchableOpacity style={styles.liveLanguageAction} onPress={openLiveLanguagePicker} disabled={liveBusy}>
                      <Text style={styles.liveLanguageActionText}>Изменить язык</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {liveSession.scheduledAt ? (
                  <Text style={styles.liveCardMeta}>
                    План: {new Date(liveSession.scheduledAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                ) : null}
                {liveSession.startedAt ? (
                  <Text style={styles.liveCardMeta}>
                    Старт: {new Date(liveSession.startedAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                ) : null}
                <View style={styles.liveActionsRow}>
                  {liveSession.status === 'live' && canJoinLive ? (
                    <TouchableOpacity style={styles.liveJoinButton} onPress={() => void handleJoinLive()} disabled={liveBusy}>
                      <Text style={styles.liveJoinButtonText}>Войти в эфир</Text>
                    </TouchableOpacity>
                  ) : null}
                  {liveSession.status === 'live' && canManageLive ? (
                    <TouchableOpacity style={styles.liveSecondaryButton} onPress={() => void handleEndLive()} disabled={liveBusy}>
                      <Text style={styles.liveSecondaryButtonText}>Завершить</Text>
                    </TouchableOpacity>
                  ) : null}
                  {liveSession.status === 'scheduled' && canManageLive ? (
                    <>
                      <TouchableOpacity style={styles.livePrimaryButton} onPress={() => void handleStartLive()} disabled={liveBusy}>
                        <Text style={styles.livePrimaryButtonText}>Старт</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.liveSecondaryButton} onPress={() => void handleCancelLive()} disabled={liveBusy}>
                        <Text style={styles.liveSecondaryButtonText}>Отменить</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
                {!canJoinLive ? (
                  <Text style={styles.liveHint}>Подпишитесь на канал, чтобы смотреть эфир.</Text>
                ) : null}
                {canManageLive && liveSession.status === 'live' ? (
                  <View style={styles.liveParticipantsSection}>
                    <View style={styles.liveParticipantsHeader}>
                      <Text style={styles.liveParticipantsTitle}>Участники эфира</Text>
                      {liveParticipantsLoading ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <TouchableOpacity
                          style={styles.liveParticipantsRefreshButton}
                          onPress={() => void loadLiveParticipants()}
                          disabled={liveParticipantsLoading}
                        >
                          <Text style={styles.liveParticipantsRefreshText}>Обновить</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {(liveParticipants || []).length === 0 ? (
                      <Text style={styles.liveHintSecondary}>Пока нет подключенных участников.</Text>
                    ) : (
                      (liveParticipants || []).slice(0, 20).map((participant) => {
                        const displayName = participant.spiritualName || participant.karmicName || `ID ${participant.userId}`;
                        const metaParts = [
                          participant.isActive ? 'онлайн' : 'офлайн',
                          participant.isMuted ? 'mute' : null,
                          participant.isBlocked ? 'blocked' : null,
                          `входов: ${Math.max(0, Number(participant.joinCount) || 0)}`,
                        ].filter(Boolean);
                        const busy = liveModerationBusyUserId === participant.userId;
                        return (
                          <TouchableOpacity
                            key={`live-participant-${participant.userId}`}
                            style={styles.liveParticipantRow}
                            onPress={() => openParticipantModerationMenu(participant)}
                            disabled={busy}
                          >
                            <View style={styles.liveParticipantBody}>
                              <Text style={styles.liveParticipantName}>{displayName}</Text>
                              <Text style={styles.liveParticipantMeta}>{metaParts.join(' · ')}</Text>
                            </View>
                            {busy ? <ActivityIndicator size="small" color={colors.accent} /> : null}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.liveCard}>
                <Text style={styles.liveHint}>Сейчас нет активного эфира</Text>
                {canManageLive ? (
                  <TouchableOpacity style={styles.livePrimaryButton} onPress={() => void handleCreateLive()} disabled={liveBusy}>
                    <Text style={styles.livePrimaryButtonText}>Анонсировать эфир</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.liveHintSecondary}>Скоро здесь появятся анонсы эфиров</Text>
                )}
              </View>
            )}
          </View>
        ) : null}

        {isSadhuSangaMode && showSadhuRoadmap ? (
          <View style={styles.roadmapSection}>
            <View style={styles.roadmapHeader}>
              <View style={styles.roadmapHeaderTextWrap}>
                <Text style={styles.roadmapTitle}>Дорожная карта</Text>
                <Text style={styles.roadmapSubtitle}>Где был, где сейчас, куда направляется дальше</Text>
              </View>
              {roadmapLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>

            {visibleRoadmapTimeline.length === 0 ? (
              <View style={styles.roadmapEmptyWrap}>
                <Text style={styles.roadmapEmptyText}>Маршрут пока не заполнен</Text>
                {canManageRoadmap ? (
                  <TouchableOpacity
                    style={styles.roadmapManageButton}
                    onPress={() => navigation.navigate('ChannelRoadmapManage', { channelId, source: 'sadhu_sanga' })}
                  >
                    <Text style={styles.roadmapManageButtonText}>Добавить первую точку</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.roadmapTimeline}>
                {visibleRoadmapTimeline.map((point, index) => (
                  <View key={`roadmap-point-${point.id}`} style={styles.roadmapItemRow}>
                    <View style={styles.roadmapTrack}>
                      <View style={[
                        styles.roadmapDot,
                        point.status === 'current' && styles.roadmapDotCurrent,
                      ]} />
                      {index !== visibleRoadmapTimeline.length - 1 ? (
                        <>
                          <View style={styles.roadmapLine} />
                          <ArrowDown size={12} color={colors.textSecondary} style={styles.roadmapArrow} />
                        </>
                      ) : null}
                    </View>
                    <View style={styles.roadmapCard}>
                      <View style={styles.roadmapCardTop}>
                        <Text style={styles.roadmapCardTitle} numberOfLines={1}>{point.title}</Text>
                        <View style={[
                          styles.roadmapStatusBadge,
                          point.status === 'current'
                            ? styles.roadmapStatusBadgeCurrent
                            : point.status === 'future'
                              ? styles.roadmapStatusBadgeFuture
                              : styles.roadmapStatusBadgePast,
                        ]}>
                          <Text style={[
                            styles.roadmapStatusBadgeText,
                            point.status === 'current' && styles.roadmapStatusBadgeTextCurrent,
                          ]}>
                            {roadmapStatusLabel(point.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.roadmapLocationText} numberOfLines={2}>
                        {[point.city, point.address].filter(Boolean).join(', ') || 'Локация уточняется'}
                      </Text>
                      {point.eventAt ? (
                        <Text style={styles.roadmapEventText}>
                          {new Date(point.eventAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      ) : null}
                      {point.note ? (
                        <Text style={styles.roadmapNoteText} numberOfLines={2}>{point.note}</Text>
                      ) : null}
                      <View style={styles.roadmapCardActions}>
                        <TouchableOpacity
                          style={styles.roadmapOpenMapButton}
                          onPress={() => void openRoadmapPointOnMap(point)}
                        >
                          <Text style={styles.roadmapOpenMapButtonText}>Открыть на карте</Text>
                        </TouchableOpacity>
                        {canManageRoadmap ? (
                          <TouchableOpacity
                            style={styles.roadmapEditInlineButton}
                            onPress={() => navigation.navigate('ChannelRoadmapManage', { channelId, source: 'sadhu_sanga', pointId: point.id })}
                          >
                            <Text style={styles.roadmapEditInlineButtonText}>Редактировать</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {canManageRoadmap && visibleRoadmapTimeline.length > 0 ? (
              <TouchableOpacity
                style={styles.roadmapManageButton}
                onPress={() => navigation.navigate('ChannelRoadmapManage', { channelId, source: 'sadhu_sanga' })}
              >
                <Text style={styles.roadmapManageButtonText}>Редактировать маршрут</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {canViewPreacherAnalytics && (!isSadhuSangaMode || activeSadhuSection === 'overview') ? (
          <View style={styles.preacherAnalyticsSection}>
            <View style={styles.preacherAnalyticsHeader}>
              <Text style={styles.preacherAnalyticsTitle}>Аналитика</Text>
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
            <View style={styles.preacherAnalyticsStatsGrid}>
              <View style={styles.preacherAnalyticsStatCard}>
                <Text style={styles.preacherAnalyticsStatValue}>
                  {Math.max(0, Number(preacherAnalytics?.liveSessionsTotal) || 0).toLocaleString('ru-RU')}
                </Text>
                <Text style={styles.preacherAnalyticsStatLabel}>Live-сессии</Text>
              </View>
              <View style={styles.preacherAnalyticsStatCard}>
                <Text style={styles.preacherAnalyticsStatValue}>
                  {Math.max(0, Number(preacherAnalytics?.liveUniqueViewersTotal) || 0).toLocaleString('ru-RU')}
                </Text>
                <Text style={styles.preacherAnalyticsStatLabel}>Уникальные зрители</Text>
              </View>
              <View style={styles.preacherAnalyticsStatCard}>
                <Text style={styles.preacherAnalyticsStatValue}>
                  {Math.max(0, Number(preacherAnalytics?.liveWatchMinutesTotal) || 0).toLocaleString('ru-RU')}
                </Text>
                <Text style={styles.preacherAnalyticsStatLabel}>Минуты просмотра</Text>
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

        {isSadhuSangaMode && showSadhuQuestions ? (
          <View style={styles.preacherQuestionsSection}>
            <View style={styles.preacherQuestionsHeader}>
              <Text style={styles.preacherQuestionsTitle}>Вопросы</Text>
              {preacherQuestionsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>
            {visibleQuestions.length === 0 ? (
              <Text style={styles.preacherQuestionsEmpty}>Пока нет вопросов для голосования</Text>
            ) : (
              <View style={styles.preacherQuestionsList}>
                {visibleQuestions.map((question) => (
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

        {isSadhuSangaMode && showSadhuSeminars ? (
          <View
            style={styles.preacherSeminarsSection}
            onLayout={(event) => {
              seminarsSectionYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View style={styles.preacherSeminarsHeader}>
              <Text style={styles.preacherSeminarsTitle}>Семинары</Text>
              {preacherSeminarsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>
            {visibleSeminars.length === 0 ? (
              <Text style={styles.preacherSeminarsEmpty}>Пока нет анонсированных семинаров</Text>
            ) : (
              <View style={styles.preacherSeminarsList}>
                {visibleSeminars.map((item) => (
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

        {showSadhuPosts ? (
        <View style={styles.listContent}>
          {visiblePosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Постов пока нет</Text>
              <Text style={styles.emptySubtitle}>Создайте первую публикацию в канале</Text>
            </View>
          ) : (
            visiblePosts.map((item) => (
              <View key={item.ID.toString()}>
                {renderPost({ item })}
              </View>
            ))
          )}
          {isSadhuSangaMode && activeSadhuSection === 'overview' && posts.length > visiblePosts.length ? (
            <TouchableOpacity
              style={styles.preacherSeminarMoreButton}
              onPress={() => setActiveSadhuSection('posts')}
            >
              <Text style={styles.preacherSeminarMoreText}>Показать все посты</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        ) : null}
        </ScrollView>

        {showStickySadhuCta ? (
          <View style={styles.stickySadhuCtaWrap}>
            <TouchableOpacity
              style={[
                styles.stickySadhuCtaButton,
                followLoading && styles.stickySadhuCtaButtonDisabled,
              ]}
              onPress={handleStickySadhuCta}
              disabled={followLoading}
            >
              <Text style={styles.stickySadhuCtaText}>{stickySadhuCtaLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
    contentScroll: {
      flex: 1,
    },
    contentScrollContainer: {
      paddingBottom: 24,
    },
    contentScrollContainerWithStickyCta: {
      paddingBottom: 96,
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
    sadhuHeroCard: {
      marginTop: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      gap: 8,
    },
    sadhuHeroStatus: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    sadhuHeroActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sadhuHeroActionButton: {
      flex: 1,
      minHeight: 34,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    sadhuHeroActionButtonDisabled: {
      opacity: 0.6,
    },
    sadhuHeroActionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    liveSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    liveHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    liveTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    liveStatus: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    liveLanguageCaption: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: -2,
    },
    liveStatusLive: {
      color: colors.accent,
    },
    liveCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      gap: 6,
    },
    liveCardTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    liveCardMeta: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    liveLanguageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    liveLanguageChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    liveLanguageChipText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '900',
    },
    liveLanguageAction: {
      marginLeft: 'auto',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    liveLanguageActionText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    liveActionsRow: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    livePrimaryButton: {
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    livePrimaryButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    liveSecondaryButton: {
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    liveSecondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    liveJoinButton: {
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    liveJoinButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    liveHint: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    liveHintSecondary: {
      color: colors.textSecondary,
      fontSize: 12,
      fontStyle: 'italic',
    },
    liveParticipantsSection: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    liveParticipantsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    liveParticipantsTitle: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    liveParticipantsRefreshButton: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    liveParticipantsRefreshText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    liveParticipantRow: {
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    liveParticipantBody: {
      flex: 1,
      gap: 2,
    },
    liveParticipantName: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    liveParticipantMeta: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    roadmapSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 10,
    },
    roadmapHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    roadmapHeaderTextWrap: {
      flex: 1,
      gap: 2,
    },
    roadmapTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    roadmapSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    roadmapEmptyWrap: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
    },
    roadmapEmptyText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    roadmapTimeline: {
      gap: 8,
    },
    roadmapItemRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
    },
    roadmapTrack: {
      width: 20,
      alignItems: 'center',
      paddingTop: 12,
    },
    roadmapDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    roadmapDotCurrent: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    roadmapLine: {
      width: 1,
      flex: 1,
      backgroundColor: colors.border,
      marginTop: 4,
      marginBottom: 2,
    },
    roadmapArrow: {
      marginBottom: -2,
    },
    roadmapCard: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    roadmapCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    roadmapCardTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    roadmapStatusBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    roadmapStatusBadgeCurrent: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    roadmapStatusBadgeFuture: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    roadmapStatusBadgePast: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    roadmapStatusBadgeText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '800',
    },
    roadmapStatusBadgeTextCurrent: {
      color: colors.accent,
    },
    roadmapLocationText: {
      color: colors.textPrimary,
      fontSize: 12,
      lineHeight: 17,
    },
    roadmapEventText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    roadmapNoteText: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
    roadmapCardActions: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    roadmapOpenMapButton: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    roadmapOpenMapButtonText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
    },
    roadmapEditInlineButton: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    roadmapEditInlineButtonText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    roadmapManageButton: {
      alignSelf: 'flex-start',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    roadmapManageButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
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
    preacherQuestionMoreButton: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    preacherQuestionMoreText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
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
    stickySadhuCtaWrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 12,
    },
    stickySadhuCtaButton: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    stickySadhuCtaButtonDisabled: {
      opacity: 0.7,
    },
    stickySadhuCtaText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    overviewGridSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
      gap: 8,
    },
    overviewGridTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    overviewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    overviewCard: {
      width: '48.5%',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 5,
      minHeight: 92,
    },
    overviewCardTitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    overviewCardValue: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 17,
    },
    overviewCardHint: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
    },
    preacherBioSection: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 10,
    },
    preacherBioHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    preacherBioTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    preacherBioText: {
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    preacherBioMetaList: {
      gap: 4,
    },
    preacherBioMetaRow: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    preacherBioEventsWrap: {
      gap: 8,
    },
    preacherBioEventsTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    preacherBioEventRow: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 3,
    },
    preacherBioEventTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    preacherBioEventDate: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    preacherBioEventDescription: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    preacherBioEmpty: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    preacherBioManageButton: {
      marginTop: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.surfaceElevated,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    preacherBioManageButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '800',
    },
    sadhuSectionsWrap: {
      marginHorizontal: 16,
      marginBottom: 10,
    },
    sadhuSectionsRow: {
      gap: 8,
      paddingRight: 16,
    },
    sadhuSectionChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    sadhuSectionChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    sadhuSectionChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    sadhuSectionChipTextActive: {
      color: colors.accent,
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
    preacherSeminarMoreButton: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    preacherSeminarMoreText: {
      color: colors.accent,
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
