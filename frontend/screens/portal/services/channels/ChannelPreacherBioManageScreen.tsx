import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import DatePicker from 'react-native-date-picker';
import { ArrowLeft, ArrowDown, ArrowUp, Calendar, ChevronDown, PlusCircle, Save, Trash2 } from 'lucide-react-native';
import { channelService } from '../../../../services/channelService';
import { ChannelMemberRole, PreacherProfileEventUpsertRequest } from '../../../../types/channel';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { DATING_TRADITIONS } from '../../../../constants/DatingConstants';

type RouteParams = {
  ChannelPreacherBioManage: {
    channelId: number;
    source?: 'sadhu_sanga';
  };
};

type EventForm = {
  id: string;
  title: string;
  eventDate: string;
  description: string;
};

const canManageBioByRole = (role?: ChannelMemberRole): boolean =>
  role === 'owner' || role === 'admin' || role === 'editor';

const buildEventId = () => `event-${Date.now()}-${Math.round(Math.random() * 10000)}`;
const DEFAULT_MATH_OPTIONS = DATING_TRADITIONS.filter(item => item !== 'Other');
const REQUIRED_MATH_OPTIONS = ['ISKCON'];
const PRIORITY_MATH_ORDER = ['ISKCON'];

const parseIsoDate = (value: string): Date | null => {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForUi = (value: string): string => {
  const date = parseIsoDate(value);
  if (!date) {
    return 'Выбрать дату';
  }
  return date.toLocaleDateString('ru-RU');
};

export default function ChannelPreacherBioManageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ChannelPreacherBioManage'>>();
  const channelId = route.params?.channelId;

  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const screenGradient = useMemo<[string, string, string]>(
    () => (isDarkMode
      ? roleTheme.gradient
      : [colors.background, colors.surface, colors.background]),
    [isDarkMode, roleTheme.gradient, colors.background, colors.surface],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [hasDepartureDate, setHasDepartureDate] = useState(false);
  const [organizationMath, setOrganizationMath] = useState('');
  const [mathOptions, setMathOptions] = useState<string[]>(DEFAULT_MATH_OPTIONS);
  const [mathSearch, setMathSearch] = useState('');
  const [showMathPicker, setShowMathPicker] = useState(false);
  const [openBirthDatePicker, setOpenBirthDatePicker] = useState(false);
  const [openDepartureDatePicker, setOpenDepartureDatePicker] = useState(false);
  const [eventDatePickerFor, setEventDatePickerFor] = useState<string | null>(null);
  const [events, setEvents] = useState<EventForm[]>([]);

  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!channelId) {
      return;
    }
    setLoading(true);
    try {
      const [channelResponse, facetsResponse] = await Promise.all([
        channelService.getChannel(channelId),
        channelService.getSadhuSangaFacets().catch(() => null),
      ]);

      if (!mountedRef.current) {
        return;
      }

      const resolvedRole = channelResponse.viewerRole || (channelResponse.channel.ownerId === user?.ID ? 'owner' : undefined);
      if (!canManageBioByRole(resolvedRole)) {
        Alert.alert('Доступ ограничен', 'Только owner/admin/editor могут редактировать био.');
        navigation.goBack();
        return;
      }

      let profileResponse = null;
      try {
        profileResponse = await channelService.getPreacherProfile(channelId);
      } catch (error: any) {
        const status = Number(error?.response?.status || 0);
        const message = String(error?.response?.data?.error || error?.message || '');
        const isNotImplementedYet = status === 404 || message.includes('Cannot GET');
        if (!isNotImplementedYet) {
          throw error;
        }
      }

      if (!mountedRef.current) {
        return;
      }

      if (!profileResponse) {
        setBio('');
        setBirthDate('');
        setBirthPlace('');
        setDepartureDate('');
        setHasDepartureDate(false);
        setOrganizationMath('');
        setMathOptions(DEFAULT_MATH_OPTIONS);
        setEvents([]);
        return;
      }

      const profileOrganizationMath = String(profileResponse.organizationName || profileResponse.mathKey || '').trim();
      const facetMathOptions = Array.isArray(facetsResponse?.mathas)
        ? facetsResponse.mathas.map(item => String(item?.value || '').trim()).filter(Boolean)
        : [];
      const normalizedMathOptions = Array.from(
        new Set([...REQUIRED_MATH_OPTIONS, ...DEFAULT_MATH_OPTIONS, ...facetMathOptions, profileOrganizationMath].filter(Boolean)),
      ).sort((a, b) => {
        const rankA = PRIORITY_MATH_ORDER.indexOf(a);
        const rankB = PRIORITY_MATH_ORDER.indexOf(b);
        if (rankA >= 0 && rankB >= 0) {
          return rankA - rankB;
        }
        if (rankA >= 0) {
          return -1;
        }
        if (rankB >= 0) {
          return 1;
        }
        return a.localeCompare(b, 'ru');
      });

      setBio(String(profileResponse.bio || ''));
      setBirthDate(String(profileResponse.birthDate || ''));
      setBirthPlace(String(profileResponse.birthPlace || ''));
      setDepartureDate(String(profileResponse.departureDate || ''));
      setHasDepartureDate(Boolean(profileResponse.departureDate));
      setOrganizationMath(profileOrganizationMath);
      setMathOptions(normalizedMathOptions.length > 0 ? normalizedMathOptions : DEFAULT_MATH_OPTIONS);
      setEvents((profileResponse.events || []).map((event, index) => ({
        id: `event-${event.id || index}`,
        title: String(event.title || ''),
        eventDate: String(event.eventDate || ''),
        description: String(event.description || ''),
      })));
    } catch (error: any) {
      if (!mountedRef.current) {
        return;
      }
      Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось загрузить био');
      navigation.goBack();
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [channelId, navigation, user?.ID]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      void loadData();
      return () => {
        mountedRef.current = false;
      };
    }, [loadData]),
  );

  const addEvent = useCallback(() => {
    setEvents(prev => [
      ...prev,
      {
        id: buildEventId(),
        title: '',
        eventDate: '',
        description: '',
      },
    ]);
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<EventForm>) => {
    setEvents(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(item => item.id !== id));
  }, []);

  const moveEvent = useCallback((id: string, direction: -1 | 1) => {
    setEvents(prev => {
      const currentIndex = prev.findIndex(item => item.id === id);
      if (currentIndex < 0) {
        return prev;
      }
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [current] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, current);
      return next;
    });
  }, []);

  const validateDate = useCallback((value: string): string | undefined => {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return undefined;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(normalized)) {
      throw new Error('Используйте формат даты YYYY-MM-DD');
    }
    return normalized;
  }, []);

  const save = useCallback(async () => {
    if (!channelId || saving) {
      return;
    }

    let payloadEvents: PreacherProfileEventUpsertRequest[] = [];
    try {
      payloadEvents = events
        .map((event, index) => {
          const title = String(event.title || '').trim();
          if (title.length === 0) {
            return null;
          }
          return {
            title,
            eventDate: validateDate(event.eventDate),
            description: String(event.description || '').trim() || undefined,
            position: index,
          } as PreacherProfileEventUpsertRequest;
        })
        .filter((item): item is PreacherProfileEventUpsertRequest => Boolean(item));
    } catch (error: any) {
      Alert.alert('Ошибка', error?.message || 'Проверьте формат дат в событиях');
      return;
    }

    let normalizedBirthDate: string | undefined;
    let normalizedDepartureDate: string | undefined;
    try {
      normalizedBirthDate = validateDate(birthDate);
      normalizedDepartureDate = validateDate(departureDate);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.message || 'Проверьте формат дат');
      return;
    }

    setSaving(true);
    try {
      const normalizedOrganizationMath = String(organizationMath || '').trim();
      await channelService.updatePreacherProfile(channelId, {
        bio: String(bio || '').trim(),
        birthDate: normalizedBirthDate,
        birthPlace: String(birthPlace || '').trim(),
        departureDate: hasDepartureDate ? normalizedDepartureDate : undefined,
        organizationName: normalizedOrganizationMath || undefined,
        mathKey: normalizedOrganizationMath || undefined,
        events: payloadEvents,
      });
      Alert.alert('Сохранено', 'Биография обновлена.');
      navigation.goBack();
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const message = String(error?.response?.data?.error || error?.message || '');
      const isNotImplementedYet = status === 404 || message.includes('Cannot PUT') || message.includes('Cannot GET');
      if (isNotImplementedYet) {
        Alert.alert('Бэкенд не обновлен', 'Эндпоинт bio пока недоступен на текущем сервере. Обновите backend и повторите.');
      } else {
        Alert.alert('Ошибка', error?.response?.data?.error || 'Не удалось сохранить био');
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [bio, birthDate, birthPlace, channelId, departureDate, events, hasDepartureDate, navigation, organizationMath, saving, validateDate]);

  const filteredMathOptions = useMemo(() => {
    const query = mathSearch.trim().toLowerCase();
    if (!query) {
      return mathOptions;
    }
    return mathOptions.filter(item => item.toLowerCase().includes(query));
  }, [mathOptions, mathSearch]);

  const selectedEventDate = useMemo(() => {
    if (!eventDatePickerFor) {
      return new Date();
    }
    const event = events.find(item => item.id === eventDatePickerFor);
    const parsed = parseIsoDate(String(event?.eventDate || ''));
    return parsed || new Date();
  }, [eventDatePickerFor, events]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient colors={screenGradient} style={StyleSheet.absoluteFill} />
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Биография проповедника</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Био</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              style={[styles.input, styles.textArea]}
              placeholder="Кратко о служении и пути"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <Text style={styles.label}>Дата рождения</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setOpenBirthDatePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.selectInputLeft}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={[styles.selectInputText, !birthDate && styles.selectInputPlaceholder]}>
                  {formatDateForUi(birthDate)}
                </Text>
              </View>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.label}>Место рождения</Text>
            <TextInput
              value={birthPlace}
              onChangeText={setBirthPlace}
              style={styles.input}
              placeholder="Город, страна"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Дата ухода</Text>
              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleChip, hasDepartureDate && styles.toggleChipActive]}
                  onPress={() => setHasDepartureDate(true)}
                >
                  <Text style={[styles.toggleChipText, hasDepartureDate && styles.toggleChipTextActive]}>Указать</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleChip, !hasDepartureDate && styles.toggleChipActive]}
                  onPress={() => {
                    setHasDepartureDate(false);
                    setDepartureDate('');
                  }}
                >
                  <Text style={[styles.toggleChipText, !hasDepartureDate && styles.toggleChipTextActive]}>Не указывать</Text>
                </TouchableOpacity>
              </View>
            </View>

            {hasDepartureDate ? (
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setOpenDepartureDatePicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectInputLeft}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={[styles.selectInputText, !departureDate && styles.selectInputPlaceholder]}>
                    {formatDateForUi(departureDate)}
                  </Text>
                </View>
                <ChevronDown size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}

            <Text style={styles.label}>Организация / Матх</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowMathPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.selectInputText, !organizationMath && styles.selectInputPlaceholder]}>
                {organizationMath || 'Выберите из списка'}
              </Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.eventsHeader}>
              <Text style={styles.eventsTitle}>Знаковые события</Text>
              <TouchableOpacity style={styles.addEventButton} onPress={addEvent}>
                <PlusCircle size={16} color={colors.textPrimary} />
                <Text style={styles.addEventButtonText}>Добавить</Text>
              </TouchableOpacity>
            </View>

            {events.length === 0 ? (
              <Text style={styles.emptyText}>Пока нет событий</Text>
            ) : (
              events.map((event, index) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventToolbar}>
                    <Text style={styles.eventIndex}>Событие #{index + 1}</Text>
                    <View style={styles.eventToolbarButtons}>
                      <TouchableOpacity style={styles.eventIconButton} onPress={() => moveEvent(event.id, -1)} disabled={index === 0}>
                        <ArrowUp size={14} color={index === 0 ? colors.textSecondary : colors.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.eventIconButton} onPress={() => moveEvent(event.id, 1)} disabled={index === events.length - 1}>
                        <ArrowDown size={14} color={index === events.length - 1 ? colors.textSecondary : colors.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.eventIconButton} onPress={() => removeEvent(event.id)}>
                        <Trash2 size={14} color="#D24B4B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TextInput
                    value={event.title}
                    onChangeText={(value) => updateEvent(event.id, { title: value })}
                    style={styles.input}
                    placeholder="Название события"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setEventDatePickerFor(event.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectInputLeft}>
                      <Calendar size={16} color={colors.textSecondary} />
                      <Text style={[styles.selectInputText, !event.eventDate && styles.selectInputPlaceholder]}>
                        {event.eventDate ? formatDateForUi(event.eventDate) : 'Дата события'}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    value={event.description}
                    onChangeText={(value) => updateEvent(event.id, { description: value })}
                    style={[styles.input, styles.eventDescriptionInput]}
                    placeholder="Описание"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={() => void save()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <Save size={16} color={colors.textPrimary} />
                <Text style={styles.saveButtonText}>Сохранить</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      <DatePicker
        modal
        open={openBirthDatePicker}
        date={parseIsoDate(birthDate) || new Date()}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(value) => {
          setBirthDate(toIsoDate(value));
          setOpenBirthDatePicker(false);
        }}
        onCancel={() => setOpenBirthDatePicker(false)}
      />
      <DatePicker
        modal
        open={openDepartureDatePicker}
        date={parseIsoDate(departureDate) || new Date()}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(value) => {
          setDepartureDate(toIsoDate(value));
          setHasDepartureDate(true);
          setOpenDepartureDatePicker(false);
        }}
        onCancel={() => setOpenDepartureDatePicker(false)}
      />
      <DatePicker
        modal
        open={Boolean(eventDatePickerFor)}
        date={selectedEventDate}
        mode="date"
        onConfirm={(value) => {
          if (eventDatePickerFor) {
            updateEvent(eventDatePickerFor, { eventDate: toIsoDate(value) });
          }
          setEventDatePickerFor(null);
        }}
        onCancel={() => setEventDatePickerFor(null)}
      />

      <Modal
        visible={showMathPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMathPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMathPicker(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Выберите организацию/матх</Text>
            <TextInput
              value={mathSearch}
              onChangeText={setMathSearch}
              style={styles.input}
              placeholder="Поиск по списку"
              placeholderTextColor={colors.textSecondary}
            />
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              <TouchableOpacity
                style={styles.modalOptionButton}
                onPress={() => {
                  setOrganizationMath('');
                  setShowMathPicker(false);
                  setMathSearch('');
                }}
              >
                <Text style={styles.modalOptionText}>Не выбрано</Text>
              </TouchableOpacity>
              {filteredMathOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionButton}
                  onPress={() => {
                    setOrganizationMath(option);
                    setShowMathPicker(false);
                    setMathSearch('');
                  }}
                >
                  <Text style={styles.modalOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
  },
  headerSpacer: {
    width: 42,
    height: 42,
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
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectInput: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectInputText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  selectInputPlaceholder: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 94,
    textAlignVertical: 'top',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  toggleChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleChipTextActive: {
    color: colors.accent,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventsTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addEventButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: 10,
    gap: 8,
  },
  eventToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventIndex: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  eventToolbarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventIconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDescriptionInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 2,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 18, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  modalList: {
    maxHeight: 320,
  },
  modalListContent: {
    gap: 8,
    paddingBottom: 4,
  },
  modalOptionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modalOptionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
