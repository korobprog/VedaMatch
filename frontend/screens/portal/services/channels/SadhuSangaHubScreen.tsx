import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Sparkles, MessageCircle, CalendarDays, Radio, PlayCircle, MapPin, Clock3, Heart } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel, ChannelFacetsResponse } from '../../../../types/channel';
import { Service, ServiceSchedule, getSchedules, getServices } from '../../../../services/serviceService';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import SadhuSangaLayout from './components/SadhuSangaLayout';

type FollowState = {
  isFollowing: boolean;
  followersCount: number;
};

type SeminarPreview = {
  service: Service;
  nextAt: Date | null;
  formatLabel: string;
  venueLabel: string;
};
type ServiceTab = 'home' | 'schedule' | 'live' | 'profile';
type RecommendedPreacher = {
  channel: Channel;
  score: number;
  reason: string;
};
type FacetType = 'city' | 'language' | 'topic';

const parseServiceFormats = (raw: string): string[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(item => String(item || '').toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
};

const parseTimeParts = (timeStart: string): { hours: number; minutes: number } => {
  const [hh, mm] = String(timeStart || '00:00').split(':');
  const hours = Math.max(0, Math.min(23, Number(hh) || 0));
  const minutes = Math.max(0, Math.min(59, Number(mm) || 0));
  return { hours, minutes };
};

const resolveNextStartForSchedule = (schedule: ServiceSchedule, now: Date): Date | null => {
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

const resolveNearestScheduleDate = (schedules: ServiceSchedule[], now: Date): Date | null => {
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

const languageLabels: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  hi: 'Hindi',
};

const formatFacetLabel = (value: string, type: FacetType): string => {
  const clean = String(value || '').trim();
  if (!clean) {
    return '';
  }
  const normalized = clean.toLowerCase();
  if (type === 'language') {
    return languageLabels[normalized] || normalized.toUpperCase();
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const facetTitleByType: Record<FacetType, string> = {
  city: 'Выберите город',
  language: 'Выберите язык',
  topic: 'Выберите тему',
};

export default function SadhuSangaHubScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const normalizedPlan = String(user?.currentPlan || '').trim().toLowerCase();
  const isBypassMode = Boolean(user?.godModeEnabled)
    || normalizedRole === 'superadmin'
    || normalizedRole === 'admin'
    || normalizedPlan === 'admin'
    || normalizedPlan.includes('pro');
  const isMathProfileMissing = !isBypassMode && String(user?.madh || '').trim().length === 0;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [topic, setTopic] = useState('');
  const [facets, setFacets] = useState<ChannelFacetsResponse>({
    cities: [],
    languages: [],
    topics: [],
    mathas: [],
  });
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [activeFacetPicker, setActiveFacetPicker] = useState<FacetType | null>(null);
  const [followStateByChannel, setFollowStateByChannel] = useState<Record<number, FollowState>>({});
  const [recommendedPreachers, setRecommendedPreachers] = useState<RecommendedPreacher[]>([]);
  const [upcomingSeminars, setUpcomingSeminars] = useState<SeminarPreview[]>([]);
  const [seminarsLoading, setSeminarsLoading] = useState(false);
  const [seminarsOnlyWithDate, setSeminarsOnlyWithDate] = useState(true);
  const [liveJoinLoadingChannelId, setLiveJoinLoadingChannelId] = useState<number | null>(null);
  const isSearchMode = search.trim().length > 0;

  const mountedRef = useRef(true);
  const latestReqRef = useRef(0);
  const latestFacetsReqRef = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestReqRef.current += 1;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const loadChannels = useCallback(async (isRefresh: boolean) => {
    const reqId = ++latestReqRef.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const listParams = {
        page: 1,
        limit: 60,
        search: search.trim() || undefined,
        city: city.trim() || undefined,
        language: language.trim() || undefined,
        topic: topic.trim() || undefined,
        sadhuSanga: true,
      };

      const [response, recommendations] = await Promise.all([
        channelService.getChannels(listParams),
        channelService.getSadhuSangaRecommendations({
          limit: 3,
          search: listParams.search,
          city: listParams.city,
          language: listParams.language,
          topic: listParams.topic,
        }),
      ]);

      if (!mountedRef.current || reqId !== latestReqRef.current) {
        return;
      }

      const nextChannels = response.channels || [];
      const nextRecommendations: RecommendedPreacher[] = (recommendations.items || []).map((item) => ({
        channel: item.channel,
        score: item.score,
        reason: item.reason,
      }));
      setChannels(nextChannels);
      setRecommendedPreachers(nextRecommendations);

      const nextFollowState: Record<number, FollowState> = {};
      const captureFollowState = (channel: Channel) => {
        nextFollowState[channel.ID] = {
          isFollowing: Boolean(channel.isFollowing),
          followersCount: Math.max(0, Number(channel.followersCount) || 0),
        };
      };

      nextChannels.forEach(captureFollowState);
      nextRecommendations.forEach((item) => captureFollowState(item.channel));
      setFollowStateByChannel(nextFollowState);
    } catch (error: any) {
      if (mountedRef.current && reqId === latestReqRef.current) {
        const status = error?.response?.status ?? 'n/a';
        const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить список';
        console.warn(`[SadhuSangaHub] Load failed (status=${status}): ${message}`);
        setRecommendedPreachers([]);
        Alert.alert('Ошибка', message);
      }
    } finally {
      if (mountedRef.current && reqId === latestReqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [city, language, search, topic]);

  const loadFacets = useCallback(async () => {
    const reqId = ++latestFacetsReqRef.current;
    setFacetsLoading(true);
    try {
      const response = await channelService.getSadhuSangaFacets();
      if (!mountedRef.current || reqId !== latestFacetsReqRef.current) {
        return;
      }
      setFacets({
        cities: Array.isArray(response?.cities) ? response.cities : [],
        languages: Array.isArray(response?.languages) ? response.languages : [],
        topics: Array.isArray(response?.topics) ? response.topics : [],
        mathas: Array.isArray(response?.mathas) ? response.mathas : [],
      });
    } catch (error: any) {
      if (!mountedRef.current || reqId !== latestFacetsReqRef.current) {
        return;
      }
      const status = error?.response?.status ?? 'n/a';
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить фильтры';
      console.warn(`[SadhuSangaHub] Facets failed (status=${status}): ${message}`);
      setFacets({
        cities: [],
        languages: [],
        topics: [],
        mathas: [],
      });
    } finally {
      if (mountedRef.current && reqId === latestFacetsReqRef.current) {
        setFacetsLoading(false);
      }
    }
  }, []);

  const loadUpcomingSeminars = useCallback(async () => {
    setSeminarsLoading(true);
    try {
      const response = await getServices({
        page: 1,
        limit: 50,
        language: language.trim() || undefined,
      });

      const now = new Date();
      const baseCandidates = (response.services || [])
        .filter((service) => {
          const formats = parseServiceFormats(service.formats);
          return (
            formats.includes('event')
            || service.scheduleType === 'fixed'
            || service.scheduleType === 'live'
          );
        })
        .slice(0, 12);

      const resolved = await Promise.all(baseCandidates.map(async (service) => {
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

      const filteredByCity = city.trim()
        ? resolved.filter(item =>
          item.venueLabel.toLowerCase().includes(city.trim().toLowerCase())
          || item.service.title.toLowerCase().includes(city.trim().toLowerCase())
        )
        : resolved;

      const filteredByDate = seminarsOnlyWithDate
        ? filteredByCity.filter(item => Boolean(item.nextAt))
        : filteredByCity;

      const sorted = filteredByDate.sort((a, b) => {
        if (a.nextAt && b.nextAt) {
          return a.nextAt.getTime() - b.nextAt.getTime();
        }
        if (a.nextAt) return -1;
        if (b.nextAt) return 1;
        return b.service.id - a.service.id;
      });

      if (mountedRef.current) {
        setUpcomingSeminars(sorted.slice(0, 5));
      }
    } catch (error: any) {
      const status = error?.response?.status ?? 'n/a';
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить семинары';
      console.warn(`[SadhuSangaHub] Upcoming seminars failed (status=${status}): ${message}`);
      if (mountedRef.current) {
        setUpcomingSeminars([]);
      }
    } finally {
      if (mountedRef.current) {
        setSeminarsLoading(false);
      }
    }
  }, [city, language, seminarsOnlyWithDate]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      void loadChannels(false);
    }, 350);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [search, city, language, topic, loadChannels]);

  useEffect(() => {
    void loadUpcomingSeminars();
  }, [loadUpcomingSeminars]);

  useEffect(() => {
    void loadFacets();
  }, [loadFacets]);

  const onRefresh = () => {
    if (loading || refreshing) {
      return;
    }
    void Promise.all([loadChannels(true), loadFacets()]);
  };

  const toggleFollow = useCallback(async (channel: Channel) => {
    if (!user?.ID || channel.ownerId === user.ID) {
      return;
    }
    const current = followStateByChannel[channel.ID] || {
      isFollowing: Boolean(channel.isFollowing),
      followersCount: Math.max(0, Number(channel.followersCount) || 0),
    };
    const optimistic: FollowState = {
      isFollowing: !current.isFollowing,
      followersCount: Math.max(0, current.followersCount + (current.isFollowing ? -1 : 1)),
    };
    setFollowStateByChannel(prev => ({ ...prev, [channel.ID]: optimistic }));

    try {
      if (current.isFollowing) {
        await channelService.unfollowChannel(channel.ID);
      } else {
        await channelService.followChannel(channel.ID);
      }
      const status = await channelService.getFollowStatus(channel.ID);
      if (!mountedRef.current) {
        return;
      }
      setFollowStateByChannel(prev => ({
        ...prev,
        [channel.ID]: {
          isFollowing: Boolean(status.isFollowing),
          followersCount: Math.max(0, Number(status.followersCount) || 0),
        },
      }));
    } catch (error: any) {
      if (!mountedRef.current) {
        return;
      }
      setFollowStateByChannel(prev => ({ ...prev, [channel.ID]: current }));
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось обновить подписку');
    }
  }, [followStateByChannel, user?.ID]);

  const openSeminarRoute = useCallback(async (service: Service) => {
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

  const facetOptions = useMemo(() => {
    const sanitize = (items: { value: string; count: number }[]) => {
      const seen = new Set<string>();
      return items
        .map(item => ({ value: String(item.value || '').trim().toLowerCase(), count: Math.max(0, Number(item.count) || 0) }))
        .filter(item => item.value.length > 0)
        .filter(item => {
          if (seen.has(item.value)) {
            return false;
          }
          seen.add(item.value);
          return true;
        });
    };

    const cities = sanitize(facets.cities || []);
    const languages = sanitize(facets.languages || []);
    const topics = sanitize(facets.topics || []);

    const myCity = String(user?.city || '').trim().toLowerCase();
    if (myCity && !cities.some(option => option.value === myCity)) {
      cities.unshift({ value: myCity, count: 0 });
    }

    return { cities, languages, topics };
  }, [facets.cities, facets.languages, facets.topics, user?.city]);

  const activeFacetOptions = useMemo(() => {
    if (activeFacetPicker === 'city') {
      return facetOptions.cities;
    }
    if (activeFacetPicker === 'language') {
      return facetOptions.languages;
    }
    if (activeFacetPicker === 'topic') {
      return facetOptions.topics;
    }
    return [];
  }, [activeFacetPicker, facetOptions.cities, facetOptions.languages, facetOptions.topics]);

  const activeFacetValue = useMemo(() => {
    if (activeFacetPicker === 'city') {
      return city.trim().toLowerCase();
    }
    if (activeFacetPicker === 'language') {
      return language.trim().toLowerCase();
    }
    if (activeFacetPicker === 'topic') {
      return topic.trim().toLowerCase();
    }
    return '';
  }, [activeFacetPicker, city, language, topic]);

  const setFacetValue = useCallback((facet: FacetType, value: string) => {
    if (facet === 'city') {
      setCity(value);
    } else if (facet === 'language') {
      setLanguage(value);
    } else {
      setTopic(value);
    }
    setActiveFacetPicker(null);
  }, []);

  const renderChannelCard = ({ item }: { item: Channel }) => {
    const followState = followStateByChannel[item.ID] || {
      isFollowing: Boolean(item.isFollowing),
      followersCount: Math.max(0, Number(item.followersCount) || 0),
    };
    const canFollow = Boolean(user?.ID) && item.ownerId !== user?.ID;

    return (
      <TouchableOpacity
        style={styles.channelCard}
        onPress={() => navigation.navigate('ChannelDetails', { channelId: item.ID, source: 'sadhu_sanga' })}
        activeOpacity={0.9}
      >
        <View style={styles.channelRowTop}>
          <View style={styles.channelTitleBox}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.channelAvatar} />
            ) : (
              <View style={styles.channelAvatar} />
            )}
            <View style={styles.channelTitleTextWrap}>
              <Text style={styles.channelTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.channelMeta}>@{item.slug}</Text>
            </View>
          </View>
          {canFollow ? (
            <TouchableOpacity
              style={[styles.followButton, followState.isFollowing && styles.followButtonActive]}
              onPress={() => void toggleFollow(item)}
            >
              <Text style={styles.followButtonText}>
                {followState.isFollowing ? 'Вы подписаны' : 'Подписаться'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.channelDescription} numberOfLines={2}>
          {item.description || 'Описание пока не заполнено'}
        </Text>
        <Text style={styles.channelFollowers}>Подписчиков: {followState.followersCount}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('SupportTicketForm', {
              entryPoint: 'sadhu_sanga_question',
              targetPreacherId: item.ownerId,
              targetPreacherName: item.title,
            })}
          >
            <MessageCircle size={14} color={colors.accent} />
            <Text style={styles.secondaryActionText}>Вопрос</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('ChannelDetails', {
              channelId: item.ID,
              source: 'sadhu_sanga',
              focusSection: 'seminars',
            })}
          >
            <CalendarDays size={14} color={colors.accent} />
            <Text style={styles.secondaryActionText}>Семинары</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const liveChannels = useMemo(() => {
    return channels
      .filter((channel) => channel.currentLiveSession && (channel.liveStatus === 'live' || channel.liveStatus === 'scheduled'))
      .sort((a, b) => {
        const aPriority = a.liveStatus === 'live' ? 0 : 1;
        const bPriority = b.liveStatus === 'live' ? 0 : 1;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        const aTs = Date.parse(a.currentLiveSession?.startedAt || a.currentLiveSession?.scheduledAt || '');
        const bTs = Date.parse(b.currentLiveSession?.startedAt || b.currentLiveSession?.scheduledAt || '');
        if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
          return bTs - aTs;
        }
        return b.ID - a.ID;
      })
      .slice(0, 3);
  }, [channels]);

  const handleJoinLive = useCallback(async (item: Channel) => {
    const session = item.currentLiveSession;
    if (!session || session.status !== 'live') {
      Alert.alert('Эфир', 'Сейчас эфир не активен.');
      return;
    }
    const followState = followStateByChannel[item.ID] || {
      isFollowing: Boolean(item.isFollowing),
      followersCount: Math.max(0, Number(item.followersCount) || 0),
    };
    const canJoin = Boolean(user?.ID) && (item.ownerId === user?.ID || followState.isFollowing);
    if (!canJoin) {
      Alert.alert('Требуется подписка', 'Подпишитесь на проповедника, чтобы смотреть эфир.');
      return;
    }
    if (liveJoinLoadingChannelId === item.ID) {
      return;
    }
    setLiveJoinLoadingChannelId(item.ID);
    try {
      const join = await channelService.joinChannelLive(item.ID, session.id, {
        participantName: user?.spiritualName || user?.karmicName || '',
        metadata: { platform: 'mobile' },
      });
      navigation.navigate('RoomChat', {
        roomId: join.roomId,
        roomName: `${item.title} · Live`,
        autoStartCall: true,
        liveChannelId: item.ID,
        liveId: session.id,
      });
    } catch (error: any) {
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось подключиться к эфиру');
      void loadChannels(true);
    } finally {
      if (mountedRef.current) {
        setLiveJoinLoadingChannelId(null);
      }
    }
  }, [followStateByChannel, liveJoinLoadingChannelId, loadChannels, navigation, user?.ID, user?.karmicName, user?.spiritualName]);

  const openServiceTab = useCallback((tab: ServiceTab) => {
    const tabRouteMap: Record<ServiceTab, 'SadhuSangaHub' | 'SadhuSangaSchedule' | 'SadhuSangaLive' | 'SadhuSangaProfile'> = {
      home: 'SadhuSangaHub',
      schedule: 'SadhuSangaSchedule',
      live: 'SadhuSangaLive',
      profile: 'SadhuSangaProfile',
    };
    const targetRoute = tabRouteMap[tab];
    if (targetRoute === 'SadhuSangaHub') {
      return;
    }
    navigation.replace(targetRoute);
  }, [navigation]);

  const openFeatureCard = useCallback((feature: 'live' | 'seminars' | 'qa' | 'schedule') => {
    if (feature === 'live') {
      const firstLive = liveChannels[0];
      if (!firstLive) {
        Alert.alert('Прямые эфиры', 'Сейчас нет активных эфиров. Проверьте запланированные трансляции ниже.');
        return;
      }
      navigation.navigate('ChannelDetails', { channelId: firstLive.ID, source: 'sadhu_sanga' });
      return;
    }
    if (feature === 'seminars') {
      const firstSeminar = upcomingSeminars[0];
      if (!firstSeminar) {
        Alert.alert('Семинары', 'Ближайшие семинары появятся здесь немного позже.');
        return;
      }
      navigation.navigate('ServiceDetail', { serviceId: firstSeminar.service.id });
      return;
    }
    if (feature === 'qa') {
      const firstChannel = channels[0];
      if (!firstChannel) {
        Alert.alert('Вопрос-ответ', 'Сначала выберите проповедника в каталоге.');
        return;
      }
      navigation.navigate('SupportTicketForm', {
        entryPoint: 'sadhu_sanga_question',
        targetPreacherId: firstChannel.ownerId,
        targetPreacherName: firstChannel.title,
      });
      return;
    }
    void openServiceTab('schedule');
  }, [channels, liveChannels, navigation, openServiceTab, upcomingSeminars]);

  return (
    <SadhuSangaLayout
      colors={colors}
      subtitle="Лекции, эфиры и живая санга каждый день"
      activeTab="home"
      onBack={() => navigation.goBack()}
      onNotificationsPress={() => navigation.navigate('SadhuSangaSmartPush')}
      onTabPress={openServiceTab}
    >
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
        <View style={styles.filtersBlock}>
            <View style={styles.searchRow}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск проповедника"
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
              />
            </View>

            {!isSearchMode ? (
              <>
                <View style={styles.heroCard}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>Новый сервис</Text>
                  </View>
                  <View style={styles.heroRow}>
                    <View style={styles.heroTextWrap}>
                      <Text style={styles.heroTitle}>Пространство общения</Text>
                      <Text style={styles.heroSubtitle}>
                        Будьте ближе к проповедникам, лекциям и живому общению каждый день.
                      </Text>
                      <TouchableOpacity
                        style={styles.heroActionButton}
                        onPress={() => Alert.alert('Садху Санга', 'Листайте ниже: эфиры, семинары, вопросы и подписки уже доступны.')}
                      >
                        <Text style={styles.heroActionText}>Узнать больше</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.heroIconWrap}>
                      <Heart size={54} color="#F6C766" />
                    </View>
                  </View>
                </View>

                <View style={styles.featuresSection}>
                  <Text style={styles.featuresTitle}>Возможности Садху Санга</Text>
                  <View style={styles.featuresGrid}>
                    <TouchableOpacity style={styles.featureCard} onPress={() => openFeatureCard('live')}>
                      <View style={[styles.featureIconWrap, styles.featureIconLive]}>
                        <PlayCircle size={18} color="#2F67F6" />
                      </View>
                      <Text style={styles.featureCardTitle}>Прямые эфиры</Text>
                      <Text style={styles.featureCardSub}>Смотрите вживую и в записи</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.featureCard} onPress={() => openFeatureCard('seminars')}>
                      <View style={[styles.featureIconWrap, styles.featureIconSeminar]}>
                        <MapPin size={18} color="#0D9B6C" />
                      </View>
                      <Text style={styles.featureCardTitle}>Семинары</Text>
                      <Text style={styles.featureCardSub}>Онлайн и офлайн в вашем городе</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.featureCard} onPress={() => openFeatureCard('qa')}>
                      <View style={[styles.featureIconWrap, styles.featureIconQuestion]}>
                        <MessageCircle size={18} color="#8A2BE2" />
                      </View>
                      <Text style={styles.featureCardTitle}>Вопрос-ответ</Text>
                      <Text style={styles.featureCardSub}>Задайте вопрос проповеднику</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.featureCard} onPress={() => openFeatureCard('schedule')}>
                      <View style={[styles.featureIconWrap, styles.featureIconSchedule]}>
                        <Clock3 size={18} color="#E64173" />
                      </View>
                      <Text style={styles.featureCardTitle}>Расписание</Text>
                      <Text style={styles.featureCardSub}>Уведомления по вашим фильтрам</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.inlineFilters}>
              <TouchableOpacity
                style={[styles.inlineFilterButton, city && styles.inlineFilterButtonActive]}
                onPress={() => setActiveFacetPicker('city')}
              >
                <Text style={[styles.inlineFilterButtonText, city && styles.inlineFilterButtonTextActive]} numberOfLines={1}>
                  {city ? formatFacetLabel(city, 'city') : 'Город'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inlineFilterButton, language && styles.inlineFilterButtonActive]}
                onPress={() => setActiveFacetPicker('language')}
              >
                <Text style={[styles.inlineFilterButtonText, language && styles.inlineFilterButtonTextActive]} numberOfLines={1}>
                  {language ? formatFacetLabel(language, 'language') : 'Язык'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inlineFilterButton, topic && styles.inlineFilterButtonActive]}
                onPress={() => setActiveFacetPicker('topic')}
              >
                <Text style={[styles.inlineFilterButtonText, topic && styles.inlineFilterButtonTextActive]} numberOfLines={1}>
                  {topic ? formatFacetLabel(topic, 'topic') : 'Тема'}
                </Text>
              </TouchableOpacity>
            </View>
            {facetsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
          </View>

          <>
            {!isSearchMode ? (
              <View style={styles.seminarsSection}>
              <View style={styles.liveSection}>
                <View style={styles.liveHeaderRow}>
                  <Text style={styles.liveTitle}>Прямой эфир</Text>
                </View>
                {liveChannels.length === 0 ? (
                  <Text style={styles.liveEmpty}>Скоро здесь появятся эфиры проповедников</Text>
                ) : (
                  <View style={styles.liveList}>
                    {liveChannels.map((item) => {
                      const session = item.currentLiveSession!;
                      const isLive = session.status === 'live';
                      const languageCode = String(session.broadcastLanguage || 'ru').trim().toUpperCase();
                      const actionLoading = liveJoinLoadingChannelId === item.ID;
                      return (
                        <View key={`live-${item.ID}-${session.id}`} style={styles.liveCard}>
                          <View style={styles.liveCardRow}>
                            <View style={styles.liveTitleWrap}>
                              <Text style={styles.liveCardTitle} numberOfLines={1}>{item.title}</Text>
                              <Text style={[styles.liveBadge, isLive ? styles.liveBadgeActive : styles.liveBadgeScheduled]}>
                                {isLive ? `В эфире • ${languageCode}` : `Запланировано • ${languageCode}`}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.liveActionButton,
                                !isLive && styles.liveActionButtonDisabled,
                                actionLoading && styles.liveActionButtonDisabled,
                              ]}
                              disabled={!isLive || actionLoading}
                              onPress={() => void handleJoinLive(item)}
                            >
                              {actionLoading ? (
                                <ActivityIndicator size="small" color={colors.textPrimary} />
                              ) : (
                                <>
                                  <Radio size={14} color={colors.textPrimary} />
                                  <Text style={styles.liveActionButtonText}>Смотреть эфир</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.liveCardMeta} numberOfLines={1}>{session.title || 'Эфир'}</Text>
                          {(session.startedAt || session.scheduledAt) ? (
                            <Text style={styles.liveCardDate}>
                              {new Date(session.startedAt || session.scheduledAt || '').toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.seminarsHeaderRow}>
                <Text style={styles.seminarsTitle}>Ближайшие семинары</Text>
                <View style={styles.seminarsHeaderActions}>
                  {seminarsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
                  <TouchableOpacity
                    style={[
                      styles.seminarsDateFilterButton,
                      seminarsOnlyWithDate
                        ? styles.seminarsDateFilterButtonActive
                        : styles.seminarsDateFilterButtonInactive,
                    ]}
                    onPress={() => setSeminarsOnlyWithDate(prev => !prev)}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.seminarsDateFilterButtonText,
                        seminarsOnlyWithDate
                          ? styles.seminarsDateFilterButtonTextActive
                          : styles.seminarsDateFilterButtonTextInactive,
                      ]}
                    >
                      Только с датой
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {upcomingSeminars.length === 0 ? (
                <Text style={styles.seminarsEmpty}>Пока нет ближайших семинаров</Text>
              ) : (
                <View style={styles.seminarsList}>
                  {upcomingSeminars.map((item) => (
                    <View key={`seminar-${item.service.id}`} style={styles.seminarCard}>
                      <View style={styles.seminarTopRow}>
                        <Text style={styles.seminarTitle} numberOfLines={1}>{item.service.title}</Text>
                        <Text style={styles.seminarFormat}>{item.formatLabel}</Text>
                      </View>
                      <Text style={styles.seminarDate}>
                        {item.nextAt
                          ? item.nextAt.toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : 'Дата уточняется'}
                      </Text>
                      <Text style={styles.seminarVenue} numberOfLines={1}>{item.venueLabel}</Text>
                      <View style={styles.seminarActionsRow}>
                        <TouchableOpacity
                          style={styles.seminarBookButton}
                          onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.service.id })}
                        >
                          <Text style={styles.seminarBookButtonText}>Записаться</Text>
                        </TouchableOpacity>
                        {item.service.channel === 'offline' ? (
                          <TouchableOpacity
                            style={styles.seminarRouteButton}
                            onPress={() => void openSeminarRoute(item.service)}
                          >
                            <Text style={styles.seminarRouteButtonText}>Маршрут</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
                )}
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <>
                {!isSearchMode && recommendedPreachers.length > 0 ? (
                  <View style={styles.recommendedSection}>
                    <View style={styles.recommendedHeader}>
                      <Text style={styles.recommendedTitleMain}>Рекомендуем вам</Text>
                      <Text style={styles.recommendedHeaderMeta}>Персональная подборка</Text>
                    </View>
                    <View style={styles.recommendedList}>
                      {recommendedPreachers.map((item) => {
                        const channel = item.channel;
                        const followState = followStateByChannel[channel.ID] || {
                          isFollowing: Boolean(channel.isFollowing),
                          followersCount: Math.max(0, Number(channel.followersCount) || 0),
                        };
                        const canFollow = Boolean(user?.ID) && channel.ownerId !== user?.ID;

                        return (
                          <View key={`recommend-${channel.ID}`} style={styles.recommendedCard}>
                            <View style={styles.recommendedCardTop}>
                              <View style={styles.recommendedCardHead}>
                                <Text style={styles.recommendedCardTitle} numberOfLines={1}>{channel.title}</Text>
                                <Text style={styles.recommendedCardReason} numberOfLines={1}>{item.reason}</Text>
                              </View>
                              <Text style={styles.recommendedCardFollowers}>Подписчики: {followState.followersCount}</Text>
                            </View>
                            <Text style={styles.recommendedCardDesc} numberOfLines={2}>
                              {channel.description || 'Подключитесь к каналу, чтобы смотреть эфиры и семинары.'}
                            </Text>
                            <View style={styles.recommendedActionsRow}>
                              <TouchableOpacity
                                style={styles.recommendedOpenButton}
                                onPress={() => navigation.navigate('ChannelDetails', { channelId: channel.ID, source: 'sadhu_sanga' })}
                              >
                                <Text style={styles.recommendedOpenButtonText}>Открыть</Text>
                              </TouchableOpacity>
                              {canFollow ? (
                                <TouchableOpacity
                                  style={[
                                    styles.recommendedFollowButton,
                                    followState.isFollowing && styles.recommendedFollowButtonActive,
                                  ]}
                                  onPress={() => void toggleFollow(channel)}
                                >
                                  <Text style={styles.recommendedFollowButtonText}>
                                    {followState.isFollowing ? 'Вы подписаны' : 'Подписаться'}
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View style={styles.preachersHeader}>
                  <Text style={styles.preachersTitle}>{isSearchMode ? 'Результаты поиска' : 'Проповедники'}</Text>
                  <Text style={styles.preachersCount}>{isSearchMode ? `Найдено · ${channels.length}` : `Все · ${channels.length}`}</Text>
                </View>
                {isMathProfileMissing ? (
                  <View style={styles.mathHintCard}>
                    <Text style={styles.mathHintTitle}>Укажите матх в профиле</Text>
                    <Text style={styles.mathHintSubtitle}>
                      Чтобы видеть рекомендованных проповедников вашего направления, заполните поле «Мой матх» в профиле.
                    </Text>
                  </View>
                ) : null}
                {channels.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Sparkles size={26} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>{isMathProfileMissing ? 'Список пока пуст' : 'Проповедники не найдены'}</Text>
                    <Text style={styles.emptySubtitle}>
                      {isMathProfileMissing
                        ? 'Заполните поле «Мой матх» в профиле или включите расширенный режим.'
                        : 'Попробуйте изменить фильтры поиска'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.listContent}>
                    {channels.map((item) => (
                      <View key={item.ID.toString()}>
                        {renderChannelCard({ item })}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        </ScrollView>
        <Modal
          visible={activeFacetPicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveFacetPicker(null)}
        >
          <View style={styles.filterModalBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setActiveFacetPicker(null)} />
            <View style={styles.filterModalCard}>
              <Text style={styles.filterModalTitle}>
                {activeFacetPicker ? facetTitleByType[activeFacetPicker] : ''}
              </Text>
              <ScrollView style={styles.filterOptionsList} contentContainerStyle={styles.filterOptionsListContent}>
                {activeFacetPicker ? (
                  <TouchableOpacity
                    style={[
                      styles.filterOptionButton,
                      !activeFacetValue && styles.filterOptionButtonActive,
                    ]}
                    onPress={() => setFacetValue(activeFacetPicker, '')}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        !activeFacetValue && styles.filterOptionTextActive,
                      ]}
                    >
                      Все
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {activeFacetPicker === 'city' && user?.city ? (
                  <TouchableOpacity
                    style={[
                      styles.filterOptionButton,
                      activeFacetValue === String(user.city || '').trim().toLowerCase() && styles.filterOptionButtonActive,
                    ]}
                    onPress={() => setFacetValue('city', String(user.city || '').trim().toLowerCase())}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        activeFacetValue === String(user.city || '').trim().toLowerCase() && styles.filterOptionTextActive,
                      ]}
                    >
                      Мой город: {formatFacetLabel(String(user.city || ''), 'city')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {activeFacetOptions.map(option => (
                  <TouchableOpacity
                    key={`${activeFacetPicker || 'facet'}-${option.value}`}
                    style={[
                      styles.filterOptionButton,
                      option.value === activeFacetValue && styles.filterOptionButtonActive,
                    ]}
                    onPress={() => {
                      if (!activeFacetPicker) {
                        return;
                      }
                      setFacetValue(activeFacetPicker, option.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        option.value === activeFacetValue && styles.filterOptionTextActive,
                      ]}
                    >
                      {formatFacetLabel(option.value, activeFacetPicker || 'city')}
                    </Text>
                    <Text style={styles.filterOptionCount}>{option.count}</Text>
                  </TouchableOpacity>
                ))}
                {activeFacetOptions.length === 0 ? (
                  <Text style={styles.filterOptionEmpty}>Пока нет доступных значений</Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
    </SadhuSangaLayout>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) => StyleSheet.create({
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 110,
  },
  filtersBlock: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 12,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#FFA300',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.34)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTextWrap: {
    flex: 1,
    gap: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  heroActionButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  heroActionText: {
    color: '#E45400',
    fontSize: 15,
    fontWeight: '800',
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresSection: {
    gap: 10,
  },
  featuresTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 7,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconLive: {
    backgroundColor: '#E4EDFF',
  },
  featureIconSeminar: {
    backgroundColor: '#DFF4EC',
  },
  featureIconQuestion: {
    backgroundColor: '#EFE5FA',
  },
  featureIconSchedule: {
    backgroundColor: '#FBE8EE',
  },
  featureCardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  featureCardSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  seminarsSection: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 8,
  },
  liveSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
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
    fontSize: 16,
    fontWeight: '900',
  },
  liveEmpty: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  liveList: {
    gap: 8,
  },
  liveCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 9,
    gap: 6,
  },
  liveCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  liveTitleWrap: {
    flex: 1,
    gap: 3,
  },
  liveCardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  liveBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  liveBadgeActive: {
    color: colors.accent,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  liveBadgeScheduled: {
    color: colors.textSecondary,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  liveActionButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveActionButtonDisabled: {
    opacity: 0.55,
  },
  liveActionButtonText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  liveCardMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  liveCardDate: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  seminarsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seminarsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seminarsTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  seminarsDateFilterButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  seminarsDateFilterButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  seminarsDateFilterButtonInactive: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  seminarsDateFilterButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seminarsDateFilterButtonTextActive: {
    color: colors.accent,
  },
  seminarsDateFilterButtonTextInactive: {
    color: colors.textSecondary,
  },
  seminarsEmpty: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  seminarsList: {
    gap: 8,
  },
  seminarCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: 10,
    gap: 6,
  },
  seminarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  seminarTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  seminarFormat: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  seminarDate: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  seminarVenue: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  seminarBookButton: {
    alignSelf: 'flex-start',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seminarBookButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  seminarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seminarRouteButton: {
    alignSelf: 'flex-start',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seminarRouteButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  inlineFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineFilterButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineFilterButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  inlineFilterButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  inlineFilterButtonTextActive: {
    color: colors.accent,
  },
  filterModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  filterModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxHeight: '70%',
    paddingTop: 14,
    paddingBottom: 16,
  },
  filterModalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filterOptionsList: {
    width: '100%',
  },
  filterOptionsListContent: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 16,
  },
  filterOptionButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterOptionButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  filterOptionText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  filterOptionCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterOptionEmpty: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  preachersHeader: {
    marginHorizontal: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preachersTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
  },
  preachersCount: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  recommendedSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 8,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recommendedTitleMain: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  recommendedHeaderMeta: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  recommendedList: {
    gap: 8,
  },
  recommendedCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: 10,
    gap: 6,
  },
  recommendedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recommendedCardHead: {
    flex: 1,
    gap: 2,
  },
  recommendedCardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  recommendedCardReason: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  recommendedCardFollowers: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  recommendedCardDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  recommendedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendedOpenButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recommendedOpenButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  recommendedFollowButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recommendedFollowButtonActive: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  recommendedFollowButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  channelCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  channelRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  channelTitleBox: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  channelAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#EBDD9C',
    backgroundColor: colors.surfaceElevated,
  },
  channelTitleTextWrap: {
    flex: 1,
    gap: 2,
  },
  channelTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  channelMeta: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  followButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  followButtonActive: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  followButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  channelDescription: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  channelFollowers: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  secondaryActionText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 56,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  mathHintCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mathHintTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mathHintSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
