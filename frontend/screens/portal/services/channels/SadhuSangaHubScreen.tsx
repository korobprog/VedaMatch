import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, Search, Sparkles, MessageCircle, CalendarDays, Radio } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel } from '../../../../types/channel';
import { Service, ServiceSchedule, getSchedules, getServices } from '../../../../services/serviceService';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';

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

const detectDeviceTimezone = (): string => {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved || 'UTC';
  } catch {
    return 'UTC';
  }
};

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

export default function SadhuSangaHubScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [topic, setTopic] = useState('');
  const [followStateByChannel, setFollowStateByChannel] = useState<Record<number, FollowState>>({});
  const [upcomingSeminars, setUpcomingSeminars] = useState<SeminarPreview[]>([]);
  const [seminarsLoading, setSeminarsLoading] = useState(false);
  const [seminarsOnlyWithDate, setSeminarsOnlyWithDate] = useState(true);
  const [liveJoinLoadingChannelId, setLiveJoinLoadingChannelId] = useState<number | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushReminder1h, setPushReminder1h] = useState(true);
  const [pushReminder10m, setPushReminder10m] = useState(true);
  const [pushCity, setPushCity] = useState('');
  const [pushLanguage, setPushLanguage] = useState('');
  const [pushTopic, setPushTopic] = useState('');
  const [pushUseTimeWindow, setPushUseTimeWindow] = useState(false);
  const [pushStartHour, setPushStartHour] = useState('8');
  const [pushEndHour, setPushEndHour] = useState('22');
  const [pushTimezone, setPushTimezone] = useState(detectDeviceTimezone());
  const [smartPushLoading, setSmartPushLoading] = useState(false);
  const [smartPushSaving, setSmartPushSaving] = useState(false);

  const mountedRef = useRef(true);
  const latestReqRef = useRef(0);
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
      const response = await channelService.getChannels({
        page: 1,
        limit: 60,
        search: search.trim() || undefined,
        city: city.trim() || undefined,
        language: language.trim() || undefined,
        topic: topic.trim() || undefined,
      });

      if (!mountedRef.current || reqId !== latestReqRef.current) {
        return;
      }

      const nextChannels = response.channels || [];
      setChannels(nextChannels);

      const nextFollowState: Record<number, FollowState> = {};
      nextChannels.forEach((channel) => {
        nextFollowState[channel.ID] = {
          isFollowing: Boolean(channel.isFollowing),
          followersCount: Math.max(0, Number(channel.followersCount) || 0),
        };
      });
      setFollowStateByChannel(nextFollowState);
    } catch (error: any) {
      if (mountedRef.current && reqId === latestReqRef.current) {
        const status = error?.response?.status ?? 'n/a';
        const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить список';
        console.warn(`[SadhuSangaHub] Load failed (status=${status}): ${message}`);
        Alert.alert('Ошибка', message);
      }
    } finally {
      if (mountedRef.current && reqId === latestReqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [city, language, search, topic]);

  const loadSmartPushPreference = useCallback(async () => {
    setSmartPushLoading(true);
    try {
      const preference = await channelService.getSadhuSangaPushPreference();
      if (!mountedRef.current) {
        return;
      }
      setPushEnabled(Boolean(preference.enabled));
      setPushReminder1h(Boolean(preference.reminder1h ?? true));
      setPushReminder10m(Boolean(preference.reminder10m ?? true));
      setPushCity(preference.city || '');
      setPushLanguage(preference.language || '');
      setPushTopic((preference.topics || []).join(', '));
      setPushUseTimeWindow(Boolean(preference.useTimeWindow));
      setPushStartHour(String(preference.startHour ?? 8));
      setPushEndHour(String(preference.endHour ?? 22));
      setPushTimezone(preference.timezone || detectDeviceTimezone());
    } catch (error: any) {
      if (mountedRef.current) {
        console.warn(`[SadhuSangaHub] Smart push preference load failed: ${error?.message || 'unknown'}`);
      }
    } finally {
      if (mountedRef.current) {
        setSmartPushLoading(false);
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
    void loadSmartPushPreference();
  }, [loadSmartPushPreference]);

  const onRefresh = () => {
    if (loading || refreshing) {
      return;
    }
    void loadChannels(true);
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

  const saveSmartPushPreference = useCallback(async () => {
    if (smartPushSaving) {
      return;
    }
    const startHour = Math.max(0, Math.min(23, Number(pushStartHour) || 0));
    const endHour = Math.max(0, Math.min(23, Number(pushEndHour) || 0));
    const topics = pushTopic
      .split(',')
      .map(topicItem => topicItem.trim())
      .filter(Boolean);

    setSmartPushSaving(true);
    try {
      const updated = await channelService.updateSadhuSangaPushPreference({
        enabled: pushEnabled,
        reminder1h: pushReminder1h,
        reminder10m: pushReminder10m,
        city: pushCity.trim(),
        language: pushLanguage.trim(),
        topics,
        useTimeWindow: pushUseTimeWindow,
        startHour,
        endHour,
        timezone: pushTimezone.trim() || detectDeviceTimezone(),
      });
      if (!mountedRef.current) {
        return;
      }
      setPushEnabled(Boolean(updated.enabled));
      setPushReminder1h(Boolean(updated.reminder1h ?? true));
      setPushReminder10m(Boolean(updated.reminder10m ?? true));
      setPushCity(updated.city || '');
      setPushLanguage(updated.language || '');
      setPushTopic((updated.topics || []).join(', '));
      setPushUseTimeWindow(Boolean(updated.useTimeWindow));
      setPushStartHour(String(updated.startHour ?? startHour));
      setPushEndHour(String(updated.endHour ?? endHour));
      setPushTimezone(updated.timezone || detectDeviceTimezone());
      Alert.alert('Готово', 'Умные пуши сохранены.');
    } catch (error: any) {
      if (mountedRef.current) {
        Alert.alert('Ошибка', error?.response?.data?.error || error?.message || 'Не удалось сохранить умные пуши');
      }
    } finally {
      if (mountedRef.current) {
        setSmartPushSaving(false);
      }
    }
  }, [pushCity, pushEnabled, pushEndHour, pushLanguage, pushReminder10m, pushReminder1h, pushStartHour, pushTimezone, pushTopic, pushUseTimeWindow, smartPushSaving]);

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
            <Text style={styles.channelTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.channelMeta}>@{item.slug}</Text>
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

  return (
    <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Садху-санга</Text>
            <Text style={styles.headerSubtitle}>Каталог проповедников и лекций</Text>
          </View>
        </View>

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

          <View style={styles.inlineFilters}>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Город"
              placeholderTextColor={colors.textSecondary}
              style={styles.inlineFilterInput}
            />
            <TextInput
              value={language}
              onChangeText={setLanguage}
              placeholder="Язык"
              placeholderTextColor={colors.textSecondary}
              style={styles.inlineFilterInput}
            />
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="Тема"
              placeholderTextColor={colors.textSecondary}
              style={styles.inlineFilterInput}
            />
          </View>

          <View style={styles.smartPushBlock}>
            <View style={styles.smartPushHeader}>
              <Text style={styles.smartPushTitle}>Умные пуши</Text>
              {smartPushLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>
            <Text style={styles.smartPushHint}>Город, язык, темы и временное окно для уведомлений Садху-санга.</Text>
            <View style={styles.smartPushInlineRow}>
              <TextInput
                value={pushCity}
                onChangeText={setPushCity}
                placeholder="Город пушей"
                placeholderTextColor={colors.textSecondary}
                style={styles.smartPushInput}
              />
              <TextInput
                value={pushLanguage}
                onChangeText={setPushLanguage}
                placeholder="Язык пушей"
                placeholderTextColor={colors.textSecondary}
                style={styles.smartPushInput}
              />
              <TextInput
                value={pushTopic}
                onChangeText={setPushTopic}
                placeholder="Темы (через ,)"
                placeholderTextColor={colors.textSecondary}
                style={styles.smartPushInput}
              />
            </View>
            <View style={styles.smartPushControlsRow}>
              <TouchableOpacity
                style={[styles.smartPushToggleButton, pushEnabled ? styles.smartPushToggleButtonActive : styles.smartPushToggleButtonInactive]}
                onPress={() => setPushEnabled(prev => !prev)}
              >
                <Text style={[styles.smartPushToggleText, pushEnabled ? styles.smartPushToggleTextActive : styles.smartPushToggleTextInactive]}>
                  {pushEnabled ? 'Пуши: Вкл' : 'Пуши: Выкл'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smartPushToggleButton, pushUseTimeWindow ? styles.smartPushToggleButtonActive : styles.smartPushToggleButtonInactive]}
                onPress={() => setPushUseTimeWindow(prev => !prev)}
              >
                <Text style={[styles.smartPushToggleText, pushUseTimeWindow ? styles.smartPushToggleTextActive : styles.smartPushToggleTextInactive]}>
                  {pushUseTimeWindow ? 'Окно: Вкл' : 'Окно: Выкл'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smartPushToggleButton, pushReminder1h ? styles.smartPushToggleButtonActive : styles.smartPushToggleButtonInactive]}
                onPress={() => setPushReminder1h(prev => !prev)}
              >
                <Text style={[styles.smartPushToggleText, pushReminder1h ? styles.smartPushToggleTextActive : styles.smartPushToggleTextInactive]}>
                  1ч
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smartPushToggleButton, pushReminder10m ? styles.smartPushToggleButtonActive : styles.smartPushToggleButtonInactive]}
                onPress={() => setPushReminder10m(prev => !prev)}
              >
                <Text style={[styles.smartPushToggleText, pushReminder10m ? styles.smartPushToggleTextActive : styles.smartPushToggleTextInactive]}>
                  10м
                </Text>
              </TouchableOpacity>
              <TextInput
                value={pushStartHour}
                onChangeText={setPushStartHour}
                keyboardType="number-pad"
                placeholder="с"
                placeholderTextColor={colors.textSecondary}
                style={styles.smartPushHourInput}
                maxLength={2}
              />
              <TextInput
                value={pushEndHour}
                onChangeText={setPushEndHour}
                keyboardType="number-pad"
                placeholder="до"
                placeholderTextColor={colors.textSecondary}
                style={styles.smartPushHourInput}
                maxLength={2}
              />
            </View>
            <TextInput
              value={pushTimezone}
              onChangeText={setPushTimezone}
              placeholder="Timezone (например Europe/Moscow)"
              placeholderTextColor={colors.textSecondary}
              style={styles.smartPushTimezoneInput}
            />
            <TouchableOpacity
              style={[styles.smartPushSaveButton, smartPushSaving && styles.smartPushSaveButtonDisabled]}
              onPress={() => void saveSmartPushPreference()}
              disabled={smartPushSaving}
            >
              <Text style={styles.smartPushSaveButtonText}>{smartPushSaving ? 'Сохраняем...' : 'Сохранить умные пуши'}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
                  const actionLoading = liveJoinLoadingChannelId === item.ID;
                  return (
                    <View key={`live-${item.ID}-${session.id}`} style={styles.liveCard}>
                      <View style={styles.liveCardRow}>
                        <View style={styles.liveTitleWrap}>
                          <Text style={styles.liveCardTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={[styles.liveBadge, isLive ? styles.liveBadgeActive : styles.liveBadgeScheduled]}>
                            {isLive ? 'В эфире' : 'Запланировано'}
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

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={channels}
            keyExtractor={item => item.ID.toString()}
            renderItem={renderChannelCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Sparkles size={26} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Проповедники не найдены</Text>
                <Text style={styles.emptySubtitle}>Попробуйте изменить фильтры поиска</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  filtersBlock: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 8,
  },
  seminarsSection: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 8,
  },
  liveSection: {
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '800',
  },
  liveEmpty: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  liveList: {
    gap: 8,
  },
  liveCard: {
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '800',
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
    borderRadius: 10,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  inlineFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineFilterInput: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 12,
    paddingHorizontal: 10,
  },
  smartPushBlock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: 9,
    gap: 8,
  },
  smartPushHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smartPushTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  smartPushHint: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  smartPushInlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smartPushInput: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 11,
    paddingHorizontal: 8,
  },
  smartPushControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  smartPushToggleButton: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  smartPushToggleButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  smartPushToggleButtonInactive: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  smartPushToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  smartPushToggleTextActive: {
    color: colors.accent,
  },
  smartPushToggleTextInactive: {
    color: colors.textSecondary,
  },
  smartPushHourInput: {
    width: 42,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  smartPushTimezoneInput: {
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 11,
    paddingHorizontal: 8,
  },
  smartPushSaveButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  smartPushSaveButtonDisabled: {
    opacity: 0.7,
  },
  smartPushSaveButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
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
    borderRadius: 14,
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
    gap: 2,
  },
  channelTitle: {
    color: colors.textPrimary,
    fontSize: 16,
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
});
