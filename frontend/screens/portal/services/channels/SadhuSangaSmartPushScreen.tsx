import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, BellRing, Clock3, Globe2, Languages, MapPin, Sparkles } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { ChannelFacetsResponse } from '../../../../types/channel';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';

type FacetType = 'city' | 'language' | 'topic';

const languageLabels: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  hi: 'Hindi',
};

const facetTitleByType: Record<FacetType, string> = {
  city: 'Выберите город',
  language: 'Выберите язык',
  topic: 'Выберите темы',
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

const detectDeviceTimezone = (): string => {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolved || 'UTC';
  } catch {
    return 'UTC';
  }
};

const clampHour = (value: string, fallback: number): number => {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(0, Math.min(23, Math.trunc(raw)));
};

export default function SadhuSangaSmartPushScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const screenGradient = useMemo<[string, string, string]>(() => {
    return [colors.background, colors.background, colors.background];
  }, [colors.background]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [reminder1h, setReminder1h] = useState(true);
  const [reminder10m, setReminder10m] = useState(true);
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [facets, setFacets] = useState<ChannelFacetsResponse>({
    cities: [],
    languages: [],
    topics: [],
    mathas: [],
  });
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [activeFacetPicker, setActiveFacetPicker] = useState<FacetType | null>(null);
  const [facetSearch, setFacetSearch] = useState('');
  const [useTimeWindow, setUseTimeWindow] = useState(false);
  const [startHour, setStartHour] = useState('8');
  const [endHour, setEndHour] = useState('22');
  const [timezone, setTimezone] = useState(detectDeviceTimezone());

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPreference = useCallback(async () => {
    setLoading(true);
    try {
      setFacetsLoading(true);
      const [preference, facetPayload] = await Promise.all([
        channelService.getSadhuSangaPushPreference(),
        channelService.getSadhuSangaFacets().catch(() => ({ cities: [], languages: [], topics: [], mathas: [] })),
      ]);
      if (!mountedRef.current) {
        return;
      }
      setFacets({
        cities: Array.isArray(facetPayload?.cities) ? facetPayload.cities : [],
        languages: Array.isArray(facetPayload?.languages) ? facetPayload.languages : [],
        topics: Array.isArray(facetPayload?.topics) ? facetPayload.topics : [],
        mathas: Array.isArray(facetPayload?.mathas) ? facetPayload.mathas : [],
      });
      setEnabled(Boolean(preference.enabled));
      setReminder1h(Boolean(preference.reminder1h ?? true));
      setReminder10m(Boolean(preference.reminder10m ?? true));
      setCity(String(preference.city || '').trim().toLowerCase());
      setLanguage(String(preference.language || '').trim().toLowerCase());
      setTopics((preference.topics || []).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
      setUseTimeWindow(Boolean(preference.useTimeWindow));
      setStartHour(String(preference.startHour ?? 8));
      setEndHour(String(preference.endHour ?? 22));
      setTimezone(preference.timezone || detectDeviceTimezone());
    } catch (error: any) {
      if (mountedRef.current) {
        Alert.alert('Ошибка', error?.response?.data?.error || error?.message || 'Не удалось загрузить настройки пушей');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setFacetsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  const facetOptions = useMemo(() => {
    const sanitize = (items: { value: string; count: number }[]) => {
      const seen = new Set<string>();
      return items
        .map((item) => ({ value: String(item.value || '').trim().toLowerCase(), count: Math.max(0, Number(item.count) || 0) }))
        .filter((item) => item.value.length > 0)
        .filter((item) => {
          if (seen.has(item.value)) {
            return false;
          }
          seen.add(item.value);
          return true;
        });
    };

    const cities = sanitize(facets.cities || []);
    const languages = sanitize(facets.languages || []);
    const topicsFacet = sanitize(facets.topics || []);

    const myCity = String(user?.city || '').trim().toLowerCase();
    if (myCity && !cities.some((option) => option.value === myCity)) {
      cities.unshift({ value: myCity, count: 0 });
    }
    return { cities, languages, topics: topicsFacet };
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
      return '';
    }
    return '';
  }, [activeFacetPicker, city, language]);

  const selectedTopicsSet = useMemo(() => new Set(topics.map((topic) => topic.trim().toLowerCase()).filter(Boolean)), [topics]);

  const filteredFacetOptions = useMemo(() => {
    const needle = facetSearch.trim().toLowerCase();
    const base = !needle
      ? activeFacetOptions
      : activeFacetOptions.filter((option) => {
        const raw = String(option.value || '').toLowerCase();
        const pretty = formatFacetLabel(option.value, activeFacetPicker || 'city').toLowerCase();
        return raw.includes(needle) || pretty.includes(needle);
      });
    if (activeFacetPicker !== 'topic') {
      return base;
    }
    return [...base].sort((a, b) => {
      const aSelected = selectedTopicsSet.has(a.value) ? 1 : 0;
      const bSelected = selectedTopicsSet.has(b.value) ? 1 : 0;
      if (aSelected !== bSelected) {
        return bSelected - aSelected;
      }
      return a.value.localeCompare(b.value, 'ru');
    });
  }, [activeFacetOptions, activeFacetPicker, facetSearch, selectedTopicsSet]);

  const setFacetValue = useCallback((facet: Exclude<FacetType, 'topic'>, value: string) => {
    if (facet === 'city') {
      setCity(value);
    } else {
      setLanguage(value);
    }
    setActiveFacetPicker(null);
  }, []);

  const toggleTopicValue = useCallback((value: string) => {
    setTopics((prev) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (!normalized) {
        return prev;
      }
      const has = prev.includes(normalized);
      if (has) {
        return prev.filter((item) => item !== normalized);
      }
      return [...prev, normalized];
    });
  }, []);

  const savePreference = useCallback(async () => {
    if (saving) {
      return;
    }

    const normalizedStart = clampHour(startHour, 8);
    const normalizedEnd = clampHour(endHour, 22);
    setSaving(true);
    try {
      const updated = await channelService.updateSadhuSangaPushPreference({
        enabled,
        reminder1h,
        reminder10m,
        city: city.trim(),
        language: language.trim(),
        topics: topics.map((topic) => topic.trim()).filter(Boolean),
        useTimeWindow,
        startHour: normalizedStart,
        endHour: normalizedEnd,
        timezone: timezone.trim() || detectDeviceTimezone(),
      });

      if (!mountedRef.current) {
        return;
      }

      setEnabled(Boolean(updated.enabled));
      setReminder1h(Boolean(updated.reminder1h ?? true));
      setReminder10m(Boolean(updated.reminder10m ?? true));
      setCity(String(updated.city || '').trim().toLowerCase());
      setLanguage(String(updated.language || '').trim().toLowerCase());
      setTopics((updated.topics || []).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
      setUseTimeWindow(Boolean(updated.useTimeWindow));
      setStartHour(String(updated.startHour ?? normalizedStart));
      setEndHour(String(updated.endHour ?? normalizedEnd));
      setTimezone(updated.timezone || detectDeviceTimezone());

      Alert.alert('Готово', 'Настройки уведомлений сохранены.');
    } catch (error: any) {
      if (mountedRef.current) {
        Alert.alert('Ошибка', error?.response?.data?.error || error?.message || 'Не удалось сохранить настройки пушей');
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [city, enabled, endHour, language, reminder10m, reminder1h, saving, startHour, timezone, topics, useTimeWindow]);

  return (
    <LinearGradient colors={screenGradient} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Умные пуши</Text>
            <Text style={styles.headerSubtitle}>Настройте уведомления по городу, теме и времени</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <BellRing size={18} color={colors.accent} />
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Режим уведомлений</Text>
                <TouchableOpacity
                  style={[styles.pillButton, enabled ? styles.pillButtonActive : styles.pillButtonInactive]}
                  onPress={() => setEnabled((prev) => !prev)}
                >
                  <Text style={[styles.pillButtonText, enabled ? styles.pillButtonTextActive : styles.pillButtonTextInactive]}>
                    {enabled ? 'Включено' : 'Выключено'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardHint}>Если выключить, уведомления о лекциях и эфирах не будут приходить.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Фильтры аудитории</Text>
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => {
                  setFacetSearch('');
                  setActiveFacetPicker('city');
                }}
                activeOpacity={0.85}
              >
                <MapPin size={16} color={colors.textSecondary} />
                <Text style={[styles.inputValue, !city && styles.inputPlaceholder]}>
                  {city ? formatFacetLabel(city, 'city') : 'Город'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => {
                  setFacetSearch('');
                  setActiveFacetPicker('language');
                }}
                activeOpacity={0.85}
              >
                <Languages size={16} color={colors.textSecondary} />
                <Text style={[styles.inputValue, !language && styles.inputPlaceholder]}>
                  {language ? formatFacetLabel(language, 'language') : 'Язык'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => {
                  setFacetSearch('');
                  setActiveFacetPicker('topic');
                }}
                activeOpacity={0.85}
              >
                <Sparkles size={16} color={colors.textSecondary} />
                <Text style={[styles.inputValue, topics.length === 0 && styles.inputPlaceholder]}>
                  {topics.length > 0 ? `Темы выбраны: ${topics.length}` : 'Темы'}
                </Text>
              </TouchableOpacity>
              {topics.length > 0 ? (
                <View style={styles.topicChipsRow}>
                  {topics.slice(0, 6).map((topic) => (
                    <View key={`topic-chip-${topic}`} style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{formatFacetLabel(topic, 'topic')}</Text>
                    </View>
                  ))}
                  {topics.length > 6 ? (
                    <View style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{`+${topics.length - 6}`}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {facetsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Напоминания</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleButton, reminder1h ? styles.toggleButtonActive : styles.toggleButtonInactive]}
                  onPress={() => setReminder1h((prev) => !prev)}
                >
                  <Text style={[styles.toggleButtonText, reminder1h ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive]}>
                    За 1 час
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, reminder10m ? styles.toggleButtonActive : styles.toggleButtonInactive]}
                  onPress={() => setReminder10m((prev) => !prev)}
                >
                  <Text style={[styles.toggleButtonText, reminder10m ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive]}>
                    За 10 минут
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardHint}>Сервис отправит напоминания только по выбранным вами фильтрам.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Временное окно</Text>
                <TouchableOpacity
                  style={[styles.pillButton, useTimeWindow ? styles.pillButtonActive : styles.pillButtonInactive]}
                  onPress={() => setUseTimeWindow((prev) => !prev)}
                >
                  <Text style={[styles.pillButtonText, useTimeWindow ? styles.pillButtonTextActive : styles.pillButtonTextInactive]}>
                    {useTimeWindow ? 'Включено' : 'Выключено'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeWindowRow}>
                <View style={styles.hourInputWrap}>
                  <Clock3 size={14} color={colors.textSecondary} />
                  <TextInput
                    value={startHour}
                    onChangeText={setStartHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="8"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.hourInput}
                  />
                </View>
                <Text style={styles.timeDash}>до</Text>
                <View style={styles.hourInputWrap}>
                  <Clock3 size={14} color={colors.textSecondary} />
                  <TextInput
                    value={endHour}
                    onChangeText={setEndHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="22"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.hourInput}
                  />
                </View>
              </View>
              <View style={styles.inputRow}>
                <Globe2 size={16} color={colors.textSecondary} />
                <TextInput
                  value={timezone}
                  onChangeText={setTimezone}
                  placeholder="Timezone (например Europe/Moscow)"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={() => void savePreference()}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Сохраняем...' : 'Сохранить настройки'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
        <Modal
          visible={activeFacetPicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setFacetSearch('');
            setActiveFacetPicker(null);
          }}
        >
          <View style={styles.filterModalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                setFacetSearch('');
                setActiveFacetPicker(null);
              }}
            />
            <View style={styles.filterModalCard}>
              <Text style={styles.filterModalTitle}>
                {activeFacetPicker ? facetTitleByType[activeFacetPicker] : ''}
              </Text>
              <View style={styles.filterSearchRow}>
                <TextInput
                  value={facetSearch}
                  onChangeText={setFacetSearch}
                  placeholder="Поиск"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>
              <ScrollView style={styles.filterOptionsList} contentContainerStyle={styles.filterOptionsListContent}>
                {activeFacetPicker === 'city' || activeFacetPicker === 'language' ? (
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
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.filterOptionButton,
                      topics.length === 0 && styles.filterOptionButtonActive,
                    ]}
                    onPress={() => setTopics([])}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        topics.length === 0 && styles.filterOptionTextActive,
                      ]}
                    >
                      Все темы
                    </Text>
                  </TouchableOpacity>
                )}
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
                {filteredFacetOptions.map((option) => {
                  const selected = activeFacetPicker === 'topic'
                    ? selectedTopicsSet.has(option.value)
                    : option.value === activeFacetValue;
                  return (
                    <TouchableOpacity
                      key={`${activeFacetPicker || 'facet'}-${option.value}`}
                      style={[
                        styles.filterOptionButton,
                        selected && styles.filterOptionButtonActive,
                      ]}
                      onPress={() => {
                        if (activeFacetPicker === 'topic') {
                          toggleTopicValue(option.value);
                          return;
                        }
                        if (activeFacetPicker === 'city' || activeFacetPicker === 'language') {
                          setFacetValue(activeFacetPicker, option.value);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selected && styles.filterOptionTextActive,
                        ]}
                      >
                        {formatFacetLabel(option.value, activeFacetPicker || 'city')}
                      </Text>
                      <Text style={styles.filterOptionCount}>{option.count}</Text>
                    </TouchableOpacity>
                  );
                })}
                {filteredFacetOptions.length === 0 ? (
                  <Text style={styles.filterOptionEmpty}>Пока нет доступных значений</Text>
                ) : null}
              </ScrollView>
              {activeFacetPicker === 'topic' ? (
                <TouchableOpacity
                  style={styles.modalDoneButton}
                  onPress={() => {
                    setFacetSearch('');
                    setActiveFacetPicker(null);
                  }}
                >
                  <Text style={styles.modalDoneButtonText}>Готово</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  cardHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  inputValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputPlaceholder: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  topicChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicChipText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  toggleButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  toggleButtonInactive: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  toggleButtonTextActive: {
    color: colors.accent,
  },
  toggleButtonTextInactive: {
    color: colors.textSecondary,
  },
  pillButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  pillButtonInactive: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  pillButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pillButtonTextActive: {
    color: colors.accent,
  },
  pillButtonTextInactive: {
    color: colors.textSecondary,
  },
  timeWindowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hourInputWrap: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  hourInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  timeDash: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  filterModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 28, 0.4)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  filterModalCard: {
    maxHeight: '72%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  filterModalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  filterSearchRow: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  filterOptionsList: {
    maxHeight: 360,
  },
  filterOptionsListContent: {
    gap: 8,
    paddingBottom: 4,
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
    fontWeight: '800',
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
    paddingVertical: 8,
  },
  modalDoneButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalDoneButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
