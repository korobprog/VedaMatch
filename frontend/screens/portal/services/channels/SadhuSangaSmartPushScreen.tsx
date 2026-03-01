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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, BellRing, Clock3, Globe2, Languages, MapPin, Sparkles } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';

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
  const [topics, setTopics] = useState('');
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
      const preference = await channelService.getSadhuSangaPushPreference();
      if (!mountedRef.current) {
        return;
      }
      setEnabled(Boolean(preference.enabled));
      setReminder1h(Boolean(preference.reminder1h ?? true));
      setReminder10m(Boolean(preference.reminder10m ?? true));
      setCity(preference.city || '');
      setLanguage(preference.language || '');
      setTopics((preference.topics || []).join(', '));
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
      }
    }
  }, []);

  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  const savePreference = useCallback(async () => {
    if (saving) {
      return;
    }

    const normalizedStart = clampHour(startHour, 8);
    const normalizedEnd = clampHour(endHour, 22);
    const normalizedTopics = topics
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const updated = await channelService.updateSadhuSangaPushPreference({
        enabled,
        reminder1h,
        reminder10m,
        city: city.trim(),
        language: language.trim(),
        topics: normalizedTopics,
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
      setCity(updated.city || '');
      setLanguage(updated.language || '');
      setTopics((updated.topics || []).join(', '));
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
              <View style={styles.inputRow}>
                <MapPin size={16} color={colors.textSecondary} />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Город"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputRow}>
                <Languages size={16} color={colors.textSecondary} />
                <TextInput
                  value={language}
                  onChangeText={setLanguage}
                  placeholder="Язык"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputRow}>
                <Sparkles size={16} color={colors.textSecondary} />
                <TextInput
                  value={topics}
                  onChangeText={setTopics}
                  placeholder="Темы (через запятую)"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>
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
});
