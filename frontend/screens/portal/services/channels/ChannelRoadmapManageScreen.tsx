import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowDown, ArrowLeft, ArrowUp, MapPin, Save, Trash2 } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { Channel, ChannelMemberRole, ChannelRoadmapPoint, ChannelRoadmapResponse, ChannelRoadmapStatus } from '../../../../types/channel';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { mapService } from '../../../../services/mapService';

type RouteParams = {
  ChannelRoadmapManage: {
    channelId: number;
    source?: 'sadhu_sanga';
    pointId?: number;
  };
};

type LocationSuggestion = {
  id: string;
  formatted: string;
  city: string;
  lat?: number;
  lon?: number;
};

const canManageRoadmapByRole = (role?: ChannelMemberRole): boolean =>
  role === 'owner' || role === 'admin' || role === 'editor';

const statusLabelKey = (status: ChannelRoadmapStatus): string => {
  if (status === 'current') {
    return 'portal.channelRoadmapManage.status.current';
  }
  if (status === 'past') {
    return 'portal.channelRoadmapManage.status.past';
  }
  return 'portal.channelRoadmapManage.status.future';
};

const sortTimelineForManage = (roadmap: ChannelRoadmapResponse | null): ChannelRoadmapPoint[] => {
  if (!roadmap) {
    return [];
  }
  const current = roadmap.current ? [roadmap.current] : [];
  return [...current, ...(roadmap.future || []), ...(roadmap.past || [])];
};

const parseAutocompleteSuggestions = (raw: any): LocationSuggestion[] => {
  const features = Array.isArray(raw?.features) ? raw.features : [];
  return features
    .map((feature: any, index: number) => {
      const props = feature?.properties || {};
      const formatted = String(props.formatted || '').trim();
      const city = String(props.city || '').trim();
      const lat = Number(props.lat);
      const lon = Number(props.lon);
      return {
        id: String(feature?.properties?.place_id || `${formatted}-${index}`),
        formatted,
        city,
        lat: Number.isFinite(lat) ? lat : undefined,
        lon: Number.isFinite(lon) ? lon : undefined,
      } as LocationSuggestion;
    })
    .filter((item: LocationSuggestion) => item.formatted.length > 0)
    .slice(0, 6);
};

export default function ChannelRoadmapManageScreen() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const route = useRoute<RouteProp<RouteParams, 'ChannelRoadmapManage'>>();
  const channelId = route.params?.channelId;
  const initialPointId = route.params?.pointId;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US';
  const screenGradient = useMemo<[string, string, string]>(
    () => (isDarkMode
      ? roleTheme.gradient
      : [colors.background, colors.surface, colors.background]),
    [isDarkMode, roleTheme.gradient, colors.background, colors.surface],
  );

  const [channel, setChannel] = useState<Channel | null>(null);
  const [viewerRole, setViewerRole] = useState<ChannelMemberRole | undefined>(undefined);
  const [orderedPoints, setOrderedPoints] = useState<ChannelRoadmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyPointId, setBusyPointId] = useState<number | null>(null);

  const [editingPointId, setEditingPointId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ChannelRoadmapStatus>('future');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [eventAtInput, setEventAtInput] = useState('');
  const [note, setNote] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const mountedRef = useRef(true);
  const latestLoadRef = useRef(0);
  const latestAutocompleteRef = useRef(0);
  const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canManage = canManageRoadmapByRole(viewerRole);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      latestLoadRef.current += 1;
      latestAutocompleteRef.current += 1;
      if (autocompleteDebounceRef.current) {
        clearTimeout(autocompleteDebounceRef.current);
      }
    };
  }, []);

  const resetForm = useCallback(() => {
    setEditingPointId(null);
    setTitle('');
    setStatus('future');
    setCity('');
    setAddress('');
    setEventAtInput('');
    setNote('');
    setLatitude(undefined);
    setLongitude(undefined);
    setLocationQuery('');
    setLocationSuggestions([]);
  }, []);

  const applyPointToForm = useCallback((point: ChannelRoadmapPoint) => {
    setEditingPointId(point.id);
    setTitle(point.title || '');
    setStatus(point.status || 'future');
    setCity(point.city || '');
    setAddress(point.address || '');
    setEventAtInput(point.eventAt ? new Date(point.eventAt).toISOString() : '');
    setNote(point.note || '');
    setLatitude(point.latitude);
    setLongitude(point.longitude);
    setLocationSuggestions([]);
    setLocationQuery('');
  }, []);

  const loadData = useCallback(async () => {
    if (!channelId) {
      return;
    }
    const reqId = ++latestLoadRef.current;
    setLoading(true);
    try {
      const [channelResponse, roadmapResponse] = await Promise.all([
        channelService.getChannel(channelId),
        channelService.getRoadmap(channelId),
      ]);

      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }

      const resolvedRole = channelResponse.viewerRole || (channelResponse.channel.ownerId === user?.ID ? 'owner' : undefined);
      setChannel(channelResponse.channel);
      setViewerRole(resolvedRole);
      setOrderedPoints(sortTimelineForManage(roadmapResponse));

      if (!canManageRoadmapByRole(resolvedRole)) {
        Alert.alert(t('portal.channelRoadmapManage.alerts.accessDeniedTitle'), t('portal.channelRoadmapManage.alerts.accessDeniedText'));
        navigation.goBack();
        return;
      }

      if (initialPointId) {
        const toEdit = sortTimelineForManage(roadmapResponse).find(point => point.id === initialPointId);
        if (toEdit) {
          applyPointToForm(toEdit);
        }
      }
    } catch (error: any) {
      if (!mountedRef.current || reqId !== latestLoadRef.current) {
        return;
      }
      Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.channelRoadmapManage.alerts.loadFailed'));
      setOrderedPoints([]);
    } finally {
      if (mountedRef.current && reqId === latestLoadRef.current) {
        setLoading(false);
      }
    }
  }, [applyPointToForm, channelId, initialPointId, navigation, t, user?.ID]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const loadLocationSuggestions = useCallback(async (query: string) => {
    const normalized = String(query || '').trim();
    if (normalized.length < 3) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }
    const reqId = ++latestAutocompleteRef.current;
    setLocationLoading(true);
    try {
      const response = await mapService.autocomplete(normalized, undefined, undefined, 6);
      if (!mountedRef.current || reqId !== latestAutocompleteRef.current) {
        return;
      }
      setLocationSuggestions(parseAutocompleteSuggestions(response));
    } catch {
      if (!mountedRef.current || reqId !== latestAutocompleteRef.current) {
        return;
      }
      setLocationSuggestions([]);
    } finally {
      if (mountedRef.current && reqId === latestAutocompleteRef.current) {
        setLocationLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (autocompleteDebounceRef.current) {
      clearTimeout(autocompleteDebounceRef.current);
      autocompleteDebounceRef.current = null;
    }
    if (!canManage) {
      return;
    }
    const normalized = locationQuery.trim();
    if (normalized.length < 3) {
      setLocationSuggestions([]);
      setLocationLoading(false);
      return;
    }

    autocompleteDebounceRef.current = setTimeout(() => {
      void loadLocationSuggestions(normalized);
    }, 260);

    return () => {
      if (autocompleteDebounceRef.current) {
        clearTimeout(autocompleteDebounceRef.current);
        autocompleteDebounceRef.current = null;
      }
    };
  }, [canManage, loadLocationSuggestions, locationQuery]);

  const onSelectSuggestion = useCallback((item: LocationSuggestion) => {
    setLocationSuggestions([]);
    setLocationQuery(item.formatted);
    if (item.city) {
      setCity(item.city);
    }
    setAddress(item.formatted);
    setLatitude(item.lat);
    setLongitude(item.lon);
  }, []);

  const parseEventAt = useCallback((value: string): string | undefined => {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(t('portal.channelRoadmapManage.alerts.invalidDateDetailed'));
    }
    return parsed.toISOString();
  }, [t]);

  const savePoint = useCallback(async () => {
    if (!channelId || !canManage || saving) {
      return;
    }
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 2) {
      Alert.alert(t('common.error'), t('portal.channelRoadmapManage.alerts.invalidTitle'));
      return;
    }

    let parsedEventAt: string | undefined;
    try {
      parsedEventAt = parseEventAt(eventAtInput);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('portal.channelRoadmapManage.alerts.invalidDate'));
      return;
    }

    const payload = {
      title: normalizedTitle,
      status,
      city: city.trim(),
      address: address.trim(),
      eventAt: parsedEventAt,
      note: note.trim(),
      latitude,
      longitude,
    };

    setSaving(true);
    try {
      if (editingPointId) {
        await channelService.updateRoadmapPoint(channelId, editingPointId, payload);
      } else {
        await channelService.createRoadmapPoint(channelId, payload);
      }
      resetForm();
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.channelRoadmapManage.alerts.saveFailed'));
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [address, canManage, channelId, city, editingPointId, eventAtInput, latitude, loadData, longitude, note, parseEventAt, resetForm, saving, status, t, title]);

  const handleDeletePoint = useCallback(async (point: ChannelRoadmapPoint) => {
    if (!channelId || !canManage || busyPointId !== null) {
      return;
    }
    Alert.alert(
      t('portal.channelRoadmapManage.alerts.deleteTitle'),
      t('portal.channelRoadmapManage.alerts.deleteText', { title: point.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setBusyPointId(point.id);
            try {
              await channelService.deleteRoadmapPoint(channelId, point.id);
              if (editingPointId === point.id) {
                resetForm();
              }
              await loadData();
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.channelRoadmapManage.alerts.deleteFailed'));
            } finally {
              if (mountedRef.current) {
                setBusyPointId(null);
              }
            }
          },
        },
      ],
    );
  }, [busyPointId, canManage, channelId, editingPointId, loadData, resetForm, t]);

  const handleSetCurrent = useCallback(async (point: ChannelRoadmapPoint) => {
    if (!channelId || !canManage || busyPointId !== null) {
      return;
    }
    setBusyPointId(point.id);
    try {
      await channelService.setCurrentRoadmapPoint(channelId, point.id);
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.channelRoadmapManage.alerts.setCurrentFailed'));
    } finally {
      if (mountedRef.current) {
        setBusyPointId(null);
      }
    }
  }, [busyPointId, canManage, channelId, loadData, t]);

  const movePoint = useCallback(async (index: number, direction: -1 | 1) => {
    if (!channelId || !canManage || busyPointId !== null) {
      return;
    }
    const target = index + direction;
    if (target < 0 || target >= orderedPoints.length) {
      return;
    }

    const next = [...orderedPoints];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setOrderedPoints(next);

    setBusyPointId(moved.id);
    try {
      await channelService.reorderRoadmapPoints(channelId, next.map(item => item.id));
      await loadData();
    } catch (error: any) {
      setOrderedPoints(orderedPoints);
      Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.channelRoadmapManage.alerts.reorderFailed'));
    } finally {
      if (mountedRef.current) {
        setBusyPointId(null);
      }
    }
  }, [busyPointId, canManage, channelId, loadData, orderedPoints, t]);

  if (loading) {
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
            <Text style={styles.headerTitle} numberOfLines={1}>{t('portal.channelRoadmapManage.headerTitle')}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{channel?.title || t('portal.channelRoadmapManage.channelFallback')}</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{t('portal.channelRoadmapManage.pointsTitle')}</Text>
            {orderedPoints.length === 0 ? (
              <Text style={styles.emptyText}>{t('portal.channelRoadmapManage.empty')}</Text>
            ) : (
              <View style={styles.pointsList}>
                {orderedPoints.map((point, index) => (
                  <View key={`manage-roadmap-${point.id}`} style={styles.pointCard}>
                    <View style={styles.pointTopRow}>
                      <Text style={styles.pointTitle} numberOfLines={1}>{point.title}</Text>
                      <Text style={styles.pointStatus}>{t(statusLabelKey(point.status))}</Text>
                    </View>
                    <Text style={styles.pointLocation} numberOfLines={2}>
                      {[point.city, point.address].filter(Boolean).join(', ') || t('portal.channelRoadmapManage.locationMissing')}
                    </Text>
                    {point.eventAt ? (
                      <Text style={styles.pointDate}>
                        {new Date(point.eventAt).toLocaleString(locale, {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    ) : null}
                    <View style={styles.pointActions}>
                      <TouchableOpacity
                        style={styles.pointActionBtn}
                        onPress={() => applyPointToForm(point)}
                      >
                        <Text style={styles.pointActionText}>{t('common.edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.pointActionBtn}
                        onPress={() => void movePoint(index, -1)}
                        disabled={index === 0 || busyPointId === point.id}
                      >
                        <ArrowUp size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.pointActionBtn}
                        onPress={() => void movePoint(index, 1)}
                        disabled={index === orderedPoints.length - 1 || busyPointId === point.id}
                      >
                        <ArrowDown size={14} color={colors.textPrimary} />
                      </TouchableOpacity>
                      {point.status !== 'current' ? (
                        <TouchableOpacity
                          style={styles.pointActionBtnAccent}
                          onPress={() => void handleSetCurrent(point)}
                          disabled={busyPointId === point.id}
                        >
                          <Text style={styles.pointActionTextAccent}>{t('portal.channelRoadmapManage.setCurrent')}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={styles.pointActionBtnDanger}
                        onPress={() => void handleDeletePoint(point)}
                        disabled={busyPointId === point.id}
                      >
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>
              {editingPointId
                ? t('portal.channelRoadmapManage.editPointTitle')
                : t('portal.channelRoadmapManage.newPointTitle')}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('portal.channelRoadmapManage.placeholders.title')}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <View style={styles.statusRow}>
              {(['past', 'current', 'future'] as ChannelRoadmapStatus[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.statusButton, status === item && styles.statusButtonActive]}
                  onPress={() => setStatus(item)}
                >
                  <Text style={[styles.statusButtonText, status === item && styles.statusButtonTextActive]}>
                    {t(statusLabelKey(item))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder={t('portal.channelRoadmapManage.placeholders.city')}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <TextInput
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                setLocationQuery(value);
              }}
              placeholder={t('portal.channelRoadmapManage.placeholders.address')}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

            {locationLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            {locationSuggestions.length > 0 ? (
              <View style={styles.suggestionsWrap}>
                {locationSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionItem}
                    onPress={() => onSelectSuggestion(item)}
                  >
                    <MapPin size={14} color={colors.accent} />
                    <Text style={styles.suggestionText} numberOfLines={2}>{item.formatted}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <TextInput
              value={eventAtInput}
              onChangeText={setEventAtInput}
              placeholder={t('portal.channelRoadmapManage.placeholders.eventAt')}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('portal.channelRoadmapManage.placeholders.note')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.textArea]}
              multiline
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => void savePoint()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <>
                    <Save size={14} color={colors.textPrimary} />
                    <Text style={styles.saveButtonText}>
                      {editingPointId
                        ? t('portal.channelRoadmapManage.saveChanges')
                        : t('portal.channelRoadmapManage.addPoint')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {editingPointId ? (
                <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
                  <Text style={styles.resetButtonText}>{t('portal.channelRoadmapManage.cancelEdit')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) => StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  block: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 8,
  },
  blockTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  pointsList: {
    gap: 8,
  },
  pointCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: 9,
    gap: 5,
  },
  pointTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pointTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  pointStatus: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  pointLocation: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  pointDate: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  pointActions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pointActionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointActionText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  pointActionBtnAccent: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pointActionTextAccent: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  pointActionBtnDanger: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 13,
    paddingHorizontal: 10,
    height: 42,
  },
  textArea: {
    minHeight: 74,
    height: 74,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  statusButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  statusButtonTextActive: {
    color: colors.accent,
  },
  suggestionsWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
  },
  formActions: {
    marginTop: 2,
    gap: 8,
  },
  saveButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  resetButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
