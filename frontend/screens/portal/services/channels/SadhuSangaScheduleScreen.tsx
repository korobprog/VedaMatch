import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Clock3 } from 'lucide-react-native';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { Service, ServiceSchedule, getSchedules, getServices } from '../../../../services/serviceService';
import SadhuSangaLayout from './components/SadhuSangaLayout';

type SeminarPreview = {
  service: Service;
  nextAt: Date | null;
  formatLabel: string;
  venueLabel: string;
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

export default function SadhuSangaScheduleScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [seminarsOnlyWithDate, setSeminarsOnlyWithDate] = useState(true);
  const [upcomingSeminars, setUpcomingSeminars] = useState<SeminarPreview[]>([]);

  const openTab = useCallback((tab: 'home' | 'schedule' | 'live' | 'profile') => {
    const tabRouteMap: Record<typeof tab, 'SadhuSangaHub' | 'SadhuSangaSchedule' | 'SadhuSangaLive' | 'SadhuSangaProfile'> = {
      home: 'SadhuSangaHub',
      schedule: 'SadhuSangaSchedule',
      live: 'SadhuSangaLive',
      profile: 'SadhuSangaProfile',
    };
    const targetRoute = tabRouteMap[tab];
    if (targetRoute === 'SadhuSangaSchedule') {
      return;
    }
    navigation.replace(targetRoute);
  }, [navigation]);

  const loadUpcomingSeminars = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getServices({
        page: 1,
        limit: 50,
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
        .slice(0, 16);

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

      const filteredByDate = seminarsOnlyWithDate
        ? resolved.filter(item => Boolean(item.nextAt))
        : resolved;

      const sorted = filteredByDate.sort((a, b) => {
        if (a.nextAt && b.nextAt) {
          return a.nextAt.getTime() - b.nextAt.getTime();
        }
        if (a.nextAt) return -1;
        if (b.nextAt) return 1;
        return b.service.id - a.service.id;
      });

      setUpcomingSeminars(sorted.slice(0, 8));
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Не удалось загрузить расписание';
      Alert.alert('Ошибка', message);
      setUpcomingSeminars([]);
    } finally {
      setLoading(false);
    }
  }, [seminarsOnlyWithDate]);

  useEffect(() => {
    void loadUpcomingSeminars();
  }, [loadUpcomingSeminars]);

  const scheduleChips = useMemo(() => {
    const now = new Date();
    const result = [
      { key: 'today', label: 'Сегодня' },
      { key: 'tomorrow', label: 'Завтра' },
    ];
    for (let i = 2; i <= 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      result.push({
        key: `d-${i}`,
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
      });
    }
    return result;
  }, []);

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

  return (
    <SadhuSangaLayout
      colors={colors}
      subtitle="Расписание лекций и семинаров"
      activeTab="schedule"
      onBack={() => navigation.goBack()}
      onNotificationsPress={() => navigation.navigate('SadhuSangaSmartPush')}
      onTabPress={openTab}
    >
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tabPaneWrap}>
            <Text style={styles.tabPaneTitle}>Расписание</Text>

            <View style={styles.scheduleChipRow}>
              {scheduleChips.map((chip, index) => (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.scheduleChip, index === 0 && styles.scheduleChipActive]}
                >
                  <Text style={[styles.scheduleChipText, index === 0 && styles.scheduleChipTextActive]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.seminarsDateFilterButton,
                seminarsOnlyWithDate ? styles.seminarsDateFilterButtonActive : styles.seminarsDateFilterButtonInactive,
              ]}
              onPress={() => setSeminarsOnlyWithDate(prev => !prev)}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.seminarsDateFilterButtonText,
                  seminarsOnlyWithDate ? styles.seminarsDateFilterButtonTextActive : styles.seminarsDateFilterButtonTextInactive,
                ]}
              >
                Только с датой
              </Text>
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : upcomingSeminars.length === 0 ? (
              <Text style={styles.emptyText}>Пока нет ближайших семинаров</Text>
            ) : (
              upcomingSeminars.map((item) => (
                <View
                  key={`schedule-${item.service.id}`}
                  style={styles.scheduleCard}
                >
                  <TouchableOpacity
                    style={styles.scheduleCardPress}
                    onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.service.id })}
                  >
                    <View style={styles.scheduleTimeCol}>
                      <Text style={styles.scheduleTimeMain} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
                        {item.nextAt ? item.nextAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </Text>
                      <Text style={styles.scheduleTimeSub}>MSK</Text>
                    </View>
                    <View style={styles.scheduleCardBody}>
                      <Text style={[styles.schedulePill, item.service.channel === 'offline' ? styles.schedulePillCity : styles.schedulePillOnline]}>
                        {item.service.channel === 'offline' ? 'МОСКВА' : 'ОНЛАЙН'}
                      </Text>
                      <Text style={styles.scheduleCardTitle} numberOfLines={2}>{item.service.title}</Text>
                      <Text style={styles.scheduleCardSub} numberOfLines={1}>{item.venueLabel}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.scheduleActionsRow}>
                    <TouchableOpacity
                      style={styles.scheduleActionButton}
                      onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.service.id })}
                    >
                      <Text style={styles.scheduleActionButtonText}>Записаться</Text>
                    </TouchableOpacity>
                    {item.service.channel === 'offline' ? (
                      <TouchableOpacity
                        style={styles.scheduleRouteButton}
                        onPress={() => void openSeminarRoute(item.service)}
                      >
                        <Text style={styles.scheduleRouteButtonText}>Маршрут</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}

            <View style={styles.scheduleNoticeCard}>
              <Clock3 size={28} color="#E7B70D" />
              <Text style={styles.scheduleNoticeTitle}>Не пропустите важное</Text>
              <Text style={styles.scheduleNoticeText}>Включите уведомления, чтобы сервис подсказывал вам вовремя.</Text>
              <TouchableOpacity
                style={styles.scheduleNoticeButton}
                onPress={() => navigation.navigate('SadhuSangaSmartPush')}
              >
                <Text style={styles.scheduleNoticeButtonText}>Включить уведомления</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  tabPaneWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  tabPaneTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
  scheduleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scheduleChipActive: {
    borderColor: '#FFAA00',
    backgroundColor: '#FFAA00',
  },
  scheduleChipText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleChipTextActive: {
    color: '#FFFFFF',
  },
  seminarsDateFilterButton: {
    alignSelf: 'flex-start',
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
  loaderWrap: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  scheduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    gap: 10,
  },
  scheduleCardPress: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleTimeCol: {
    width: 98,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: 12,
  },
  scheduleTimeMain: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  scheduleTimeSub: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  scheduleCardBody: {
    flex: 1,
    gap: 6,
  },
  schedulePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  schedulePillOnline: {
    color: '#EA3A5A',
    backgroundColor: '#FDE8EC',
  },
  schedulePillCity: {
    color: '#0D9B6C',
    backgroundColor: '#DEF4EC',
  },
  scheduleCardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  scheduleCardSub: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  scheduleActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleActionButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scheduleActionButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleRouteButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scheduleRouteButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleNoticeCard: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFE3B0',
    backgroundColor: '#FFF9E8',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
    gap: 8,
  },
  scheduleNoticeTitle: {
    color: '#2A2323',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  scheduleNoticeText: {
    color: '#6B6464',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  scheduleNoticeButton: {
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: '#FFAA00',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scheduleNoticeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
