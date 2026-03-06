import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Film, ChevronLeft, ChevronRight, Camera } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import { useSettings } from '../../context/SettingsContext';
import { VideoCircle, videoCirclesService } from '../../services/videoCirclesService';
import { getAndroidVisualPolicy, getBlurAmountForPolicy, resolveEffectivePerformanceMode } from '../../utils/androidVisualPolicy';
import { useTranslation } from 'react-i18next';

type CirclesScope = 'all' | 'friends';
type CirclesCacheEntry = {
  circles: VideoCircle[];
  cachedAt: number;
};

const DEFAULT_CACHE_TTL_MS = 90_000;
const FETCH_TIMEOUT_MS = Platform.OS === 'android' ? 900 : 1_500;
const circlesCache = new Map<CirclesScope, CirclesCacheEntry>();
const circlesInFlight = new Map<CirclesScope, Promise<VideoCircle[]>>();

const getCachedCircles = (scope: CirclesScope, ttlMs: number): VideoCircle[] | null => {
  const cacheEntry = circlesCache.get(scope);
  if (!cacheEntry) return null;

  const isExpired = Date.now() - cacheEntry.cachedAt > ttlMs;
  if (isExpired) {
    circlesCache.delete(scope);
    return null;
  }

  console.log(`[circles_widget_cache_hit] scope=${scope}`);
  return cacheEntry.circles;
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('circles_widget_timeout'));
    }, timeoutMs);
  });

  return Promise.race<T>([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};

const loadCircles = async (scope: CirclesScope, cacheTtlMs: number): Promise<VideoCircle[]> => {
  const cached = getCachedCircles(scope, cacheTtlMs);
  if (cached) return cached;

  const existingInFlight = circlesInFlight.get(scope);
  if (existingInFlight) {
    return existingInFlight;
  }

  const startedAt = Date.now();
  const requestPromise = (async () => {
    try {
      const response = await withTimeout(
        videoCirclesService.getVideoCircles({
          status: 'active',
          limit: Platform.OS === 'android' ? 4 : 5,
          scope,
        }),
        FETCH_TIMEOUT_MS,
      );
      const circles = (response.circles || []).slice(0, Platform.OS === 'android' ? 3 : 4);
      circlesCache.set(scope, { circles, cachedAt: Date.now() });
      console.log(`[circles_widget_fetch_ms] scope=${scope} ms=${Date.now() - startedAt}`);
      return circles;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      console.warn(`[circles_widget_fetch_error] scope=${scope} message=${message}`);
      const fallback = getCachedCircles(scope, cacheTtlMs);
      return fallback || [];
    } finally {
      circlesInFlight.delete(scope);
    }
  })();

  circlesInFlight.set(scope, requestPromise);
  return requestPromise;
};

interface CirclesPanelWidgetProps {
  isVisible?: boolean;
  cacheTtlMs?: number;
}

export const CirclesPanelWidget: React.FC<CirclesPanelWidgetProps> = ({
  isVisible = true,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
}) => {
  const navigation = useNavigation<any>();
  const { i18n } = useTranslation();
  const { vTheme, isDarkMode, portalBackgroundType, portalIconStyle, performanceMode, runtimePerformanceState } = useSettings();
  const [circles, setCircles] = useState<VideoCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CirclesScope>('all');
  const isPhotoBg = portalBackgroundType === 'image';
  const isVedaMatch = portalIconStyle === 'vedamatch';
  const androidVisualPolicy = useMemo(
    () => getAndroidVisualPolicy(performanceMode, runtimePerformanceState),
    [performanceMode, runtimePerformanceState],
  );
  const effectivePerformanceMode = useMemo(
    () => resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState),
    [performanceMode, runtimePerformanceState],
  );
  const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
  const allowWidgetBlur = androidVisualPolicy.enableBlur && !isAndroidReducedEffects;
  const copy = i18n.language?.startsWith('ru')
    ? {
        feed: 'Кружки: Лента',
        friends: 'Кружки: Друзья',
        record: 'Снять',
        circle: 'Кружок',
        empty: 'Нет кружков',
      }
    : i18n.language?.startsWith('hi')
      ? {
          feed: 'सर्कल: फ़ीड',
          friends: 'सर्कल: मित्र',
          record: 'रिकॉर्ड',
          circle: 'सर्कल',
          empty: 'कोई सर्कल नहीं',
        }
      : {
          feed: 'Circles: Feed',
          friends: 'Circles: Friends',
          record: 'Record',
          circle: 'Circle',
          empty: 'No circles',
        };

  useEffect(() => {
    if (!isVisible) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const cached = getCachedCircles(filter, cacheTtlMs);
    if (cached) {
      setCircles(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const load = async () => {
      const payload = await loadCircles(filter, cacheTtlMs);
      if (!mounted) return;
      setCircles(payload);
      setLoading(false);
    };

    load();

    return () => { mounted = false; };
  }, [filter, isVisible, cacheTtlMs]);

  const toggleFilter = () => {
    setFilter(prev => prev === 'all' ? 'friends' : 'all');
  };

  const primaryTextStyle = { color: isVedaMatch ? '#FFDF00' : isPhotoBg ? '#ffffff' : vTheme.colors.text };
  const secondaryTextStyle = { color: isVedaMatch ? '#D4AF37' : isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isVedaMatch
            ? '#121212'
            : isPhotoBg
              ? 'transparent'
              : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'),
          borderColor: isVedaMatch
            ? '#D4AF37'
            : isPhotoBg
              ? 'rgba(255,255,255,0.3)'
              : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'),
          borderWidth: isVedaMatch ? 1 : 1,
          ...(isVedaMatch ? {
            shadowColor: '#D4AF37',
            shadowOpacity: 0.5,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
            elevation: 6,
          } : {}),
        },
      ]}
    >

      {(isPhotoBg || isDarkMode) && !isVedaMatch && allowWidgetBlur && (
        <BlurView
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          blurType={isDarkMode ? "dark" : "light"}
          blurAmount={getBlurAmountForPolicy(androidVisualPolicy, 10)}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
        />
      )}

      {/* Header matches CalendarWidget layout */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleFilter} style={styles.navButton}>
          <ChevronLeft size={16} color={isVedaMatch ? '#D4AF37' : isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.titleText, primaryTextStyle]}>
          {filter === 'all' ? copy.feed : copy.friends}
        </Text>
        <TouchableOpacity onPress={toggleFilter} style={styles.navButton}>
          <ChevronRight size={16} color={isVedaMatch ? '#D4AF37' : isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.circlesGrid}>
        {/* Create button slot */}
        <TouchableOpacity
          style={styles.circleSlot}
          onPress={() => navigation.navigate('VideoCirclesScreen', { openPublish: true })}
        >
          <View style={[styles.createIcon, {
            backgroundColor: isVedaMatch ? '#121212' : '#EA580C20',
            borderColor: isVedaMatch ? '#D4AF37' : isPhotoBg ? 'rgba(255,255,255,0.4)' : '#EA580C40',
            borderStyle: isVedaMatch ? 'solid' as any : 'dashed' as any,
          }]}>
            <Camera size={18} color={isVedaMatch ? '#FFDF00' : isPhotoBg ? '#ffffff' : '#EA580C'} />
          </View>
          <Text style={[styles.slotLabel, secondaryTextStyle]}>{copy.record}</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={vTheme.colors.primary} />
          </View>
        ) : circles.length > 0 ? (
          circles.map((circle) => (
            <TouchableOpacity
              key={circle.id}
              style={styles.circleSlot}
              onPress={() => navigation.navigate('VideoCirclesScreen', { initialCircleId: circle.id })}
            >
              <View style={[styles.avatarContainer, {
                borderColor: circle.premiumBoostActive ? '#FFD700' : isVedaMatch ? '#D4AF37' : (isPhotoBg ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'),
                backgroundColor: isVedaMatch ? '#121212' : 'transparent',
              }]}>
                {circle.thumbnailUrl ? (
                  <Image source={{ uri: circle.thumbnailUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.placeholderAvatar, { backgroundColor: isVedaMatch ? 'transparent' : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Film size={14} color={isVedaMatch ? '#FFDF00' : isPhotoBg ? '#ffffff' : '#EA580C'} />
                  </View>
                )}
              </View>
              <Text style={[styles.slotLabel, secondaryTextStyle]} numberOfLines={1}>
                {circle.matha || copy.circle}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, secondaryTextStyle]}>{copy.empty}</Text>
          </View>
        )}
      </View>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    width: 168,
    height: 168,
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    margin: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 4,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  circlesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  circleSlot: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 10,
  },
  createIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    padding: 1.5,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotLabel: {
    fontSize: 8,
    marginTop: 3,
    fontWeight: '500',
  },
  loaderContainer: {
    width: '66%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    width: '66%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 9,
    fontStyle: 'italic',
  }
});
