/**
 * ServiceScheduleScreen - Экран настройки расписания сервиса
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    ArrowLeft,
    Save,
    Clock,
    Plus,
    Trash2,
    Copy,
} from 'lucide-react-native';
import {
    getServiceSchedule,
    updateServiceSchedule,
    CreateScheduleRequest,
} from '../../../services/serviceService';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';

type ServiceScheduleNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TimeSlot {
    startTime: string;
    endTime: string;
}

interface DaySchedule {
    enabled: boolean;
    slots: TimeSlot[];
}

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAYS: { key: DayOfWeek; label: string; shortLabel: string }[] = [
    { key: 'monday', label: 'Понедельник', shortLabel: 'Пн' },
    { key: 'tuesday', label: 'Вторник', shortLabel: 'Вт' },
    { key: 'wednesday', label: 'Среда', shortLabel: 'Ср' },
    { key: 'thursday', label: 'Четверг', shortLabel: 'Чт' },
    { key: 'friday', label: 'Пятница', shortLabel: 'Пт' },
    { key: 'saturday', label: 'Суббота', shortLabel: 'Сб' },
    { key: 'sunday', label: 'Воскресенье', shortLabel: 'Вс' },
];

const DEFAULT_SLOT: TimeSlot = { startTime: '09:00', endTime: '18:00' };
const INITIAL_SCHEDULE: Record<DayOfWeek, DaySchedule> = {
    monday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
    tuesday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
    wednesday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
    thursday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
    friday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] },
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export default function ServiceScheduleScreen() {
    const navigation = useNavigation<ServiceScheduleNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'ServiceSchedule'>>();
    const serviceId = route.params?.serviceId;
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');

    const [schedule, setSchedule] = useState<Record<DayOfWeek, DaySchedule>>(INITIAL_SCHEDULE);

    const [slotDuration, setSlotDuration] = useState(60); // minutes
    const [breakBetween, setBreakBetween] = useState(0); // minutes
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState(0); // 0 = unlimited
    const latestLoadRequestRef = useRef(0);
    const isMountedRef = useRef(true);

    const loadSchedule = useCallback(async () => {
        const requestId = ++latestLoadRequestRef.current;
        try {
            const data = await getServiceSchedule(serviceId);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (data && data.weeklySlots) {
                const parsed: Record<DayOfWeek, DaySchedule> = { ...INITIAL_SCHEDULE };

                DAYS.forEach(({ key }) => {
                    const dayData = data.weeklySlots[key];
                    if (dayData) {
                        parsed[key] = {
                            enabled: dayData.enabled !== false,
                            slots: dayData.slots || [{ ...DEFAULT_SLOT }],
                        };
                    }
                });

                setSchedule(parsed);
                if (typeof data.slotDuration === 'number' && data.slotDuration > 0) setSlotDuration(data.slotDuration);
                if (typeof data.breakBetween === 'number' && data.breakBetween >= 0) setBreakBetween(data.breakBetween);
                if (typeof data.maxBookingsPerDay === 'number' && data.maxBookingsPerDay >= 0) setMaxBookingsPerDay(data.maxBookingsPerDay);
            }
        } catch (error) {
            console.error('Failed to load schedule:', error);
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [serviceId]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
        };
    }, []);

    // Load existing schedule
    useEffect(() => {
        if (serviceId) {
            loadSchedule();
        } else {
            setLoading(false);
            Alert.alert('Ошибка', 'Не указан сервис');
            navigation.goBack();
        }
    }, [serviceId, loadSchedule, navigation]);

    const handleToggleDay = (day: DayOfWeek) => {
        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                enabled: !prev[day].enabled,
                slots: !prev[day].enabled ? [{ ...DEFAULT_SLOT }] : prev[day].slots,
            },
        }));
    };

    const handleAddSlot = (day: DayOfWeek) => {
        const daySchedule = schedule[day];
        if (daySchedule.slots.length >= 5) {
            Alert.alert('Лимит', 'Максимум 5 слотов на день');
            return;
        }

        const lastSlot = daySchedule.slots[daySchedule.slots.length - 1];
        const newStartTime = lastSlot ? incrementTime(lastSlot.endTime, 60) : '09:00';
        const newEndTime = incrementTime(newStartTime, 60);

        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                slots: [...prev[day].slots, { startTime: newStartTime, endTime: newEndTime }],
            },
        }));
    };

    const handleRemoveSlot = (day: DayOfWeek, index: number) => {
        if (schedule[day].slots.length <= 1) {
            Alert.alert('Ошибка', 'Нужен хотя бы один слот');
            return;
        }

        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                slots: prev[day].slots.filter((_, i) => i !== index),
            },
        }));
    };

    const handleSlotChange = (day: DayOfWeek, index: number, field: 'startTime' | 'endTime', value: string) => {
        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                slots: prev[day].slots.map((slot, i) =>
                    i === index ? { ...slot, [field]: value } : slot
                ),
            },
        }));
    };

    const handleCopyToAllDays = () => {
        const sourceDay = schedule[selectedDay];
        Alert.alert(
            'Скопировать расписание?',
            `Скопировать расписание ${DAYS.find(d => d.key === selectedDay)?.label} на все рабочие дни?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Да',
                    onPress: () => {
                        setSchedule(prev => {
                            const updated = { ...prev };
                            DAYS.forEach(({ key }) => {
                                if (key !== selectedDay && prev[key].enabled) {
                                    updated[key] = {
                                        ...updated[key],
                                        slots: sourceDay.slots.map(s => ({ ...s })),
                                    };
                                }
                            });
                            return updated;
                        });
                        Alert.alert('Готово', 'Расписание скопировано');
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        if (saving) {
            return;
        }
        if (!serviceId) {
            Alert.alert('Ошибка', 'Не указан сервис');
            return;
        }

        for (const { key, label } of DAYS) {
            const daySchedule = schedule[key];
            if (!daySchedule.enabled) {
                continue;
            }

            const normalizedSlots = daySchedule.slots
                .map((slot) => ({
                    start: slot.startTime,
                    end: slot.endTime,
                    startMinutes: parseTimeToMinutes(slot.startTime),
                    endMinutes: parseTimeToMinutes(slot.endTime),
                }))
                .sort((a, b) => a.startMinutes - b.startMinutes);

            for (const slot of normalizedSlots) {
                if (slot.startMinutes < 0 || slot.endMinutes < 0 || slot.startMinutes >= slot.endMinutes) {
                    Alert.alert('Ошибка', `Некорректный интервал в "${label}": ${slot.start} - ${slot.end}`);
                    return;
                }
            }

            for (let i = 1; i < normalizedSlots.length; i++) {
                if (normalizedSlots[i].startMinutes < normalizedSlots[i - 1].endMinutes) {
                    Alert.alert('Ошибка', `Пересечение интервалов в "${label}"`);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const weeklySlots: NonNullable<CreateScheduleRequest['weeklySlots']> = {};
            DAYS.forEach(({ key }) => {
                weeklySlots[key] = {
                    enabled: schedule[key].enabled,
                    slots: schedule[key].enabled ? schedule[key].slots : [],
                };
            });

            const request: CreateScheduleRequest = {
                serviceId,
                weeklySlots,
                slotDuration,
                breakBetween,
                maxBookingsPerDay: maxBookingsPerDay > 0 ? maxBookingsPerDay : undefined,
            };

            await updateServiceSchedule(serviceId, request);
            Alert.alert('Готово! ✨', 'Расписание сохранено');
            navigation.goBack();
        } catch (error: unknown) {
            console.error('Save failed:', error);
            const message =
                typeof error === 'object' && error !== null && 'message' in error
                    ? String((error as { message?: string }).message)
                    : '';
            Alert.alert('Ошибка', message || 'Не удалось сохранить');
        } finally {
            setSaving(false);
        }
    };

    const incrementTime = (time: string, minutes: number): string => {
        const [h, m] = time.split(':').map(Number);
        const totalMinutes = h * 60 + m + minutes;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    };

    const parseTimeToMinutes = (time: string): number => {
        const [h, m] = time.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) {
            return -1;
        }
        return h * 60 + m;
    };

    function showTimePicker(day: DayOfWeek, slotIndex: number, field: 'startTime' | 'endTime', _currentValue: string) {
        const [startH, startM] = schedule[day].slots[slotIndex].startTime.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const options = TIME_OPTIONS.filter(t => {
            const [h, m] = t.split(':').map(Number);
            const total = h * 60 + m;
            if (field === 'startTime') return h >= 6 && h < 23;
            return total > startTotal;
        });

        Alert.alert(
            field === 'startTime' ? 'Начало' : 'Окончание',
            'Выберите время',
            [
                ...options.slice(0, 10).map(time => ({
                    text: time,
                    onPress: () => handleSlotChange(day, slotIndex, field, time),
                })),
                { text: 'Отмена', style: 'cancel' },
            ]
        );
    }

    const currentDaySchedule = schedule[selectedDay];

    if (loading) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Fixed Premium Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Настройка времени</Text>
                        <Text style={styles.headerSubtitle}>Управление доступными часами</Text>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.saveCircleButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={colors.textPrimary} />
                        ) : (
                            <Save size={20} color={colors.textPrimary} />
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Week Days Mastery */}
                    <View style={styles.daysContainer}>
                        <Text style={styles.sectionLabel}>Дни недели</Text>
                        <View style={styles.daysRow}>
                            {DAYS.map(({ key, shortLabel }) => {
                                const isSelected = selectedDay === key;
                                const isEnabled = schedule[key].enabled;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.dayTab,
                                            isSelected && styles.dayTabSelected,
                                            !isEnabled && !isSelected && styles.dayTabDisabled,
                                        ]}
                                        onPress={() => setSelectedDay(key)}
                                    >
                                        <Text style={[
                                            styles.dayTabText,
                                            isSelected && styles.dayTabTextSelected,
                                            !isEnabled && !isSelected && styles.dayTabTextDisabled,
                                        ]}>
                                            {shortLabel}
                                        </Text>
                                        {isEnabled && !isSelected && <View style={styles.activeIndicator} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Selected Day settings Immersive */}
                    <View style={styles.mainSettingsCard}>
                        <View style={styles.cardHeaderArea}>
                            <View style={styles.cardIndicator} />
                            <Text style={styles.cardMainTitle}>
                                {DAYS.find(d => d.key === selectedDay)?.label}
                            </Text>
                            <Switch
                                value={currentDaySchedule.enabled}
                                onValueChange={() => handleToggleDay(selectedDay)}
                                trackColor={{ false: 'rgba(255,255,255,0.05)', true: 'rgba(245, 158, 11, 0.4)' }}
                                thumbColor={currentDaySchedule.enabled ? colors.accent : 'rgba(255,255,255,0.2)'}
                                ios_backgroundColor="rgba(0,0,0,0.3)"
                            />
                        </View>

                        {currentDaySchedule.enabled ? (
                            <>
                                <View style={styles.slotsContainer}>
                                    {currentDaySchedule.slots.map((slot, index) => (
                                        <View key={index} style={styles.glassSlotItem}>
                                            <TouchableOpacity
                                                style={styles.timeSelectBox}
                                                onPress={() => showTimePicker(selectedDay, index, 'startTime', slot.startTime)}
                                            >
                                                <Clock size={12} color={colors.accent} />
                                                <Text style={styles.timeValueText}>{slot.startTime}</Text>
                                            </TouchableOpacity>

                                            <View style={styles.timeArrowBox}>
                                                <View style={styles.arrowLine} />
                                            </View>

                                            <TouchableOpacity
                                                style={styles.timeSelectBox}
                                                onPress={() => showTimePicker(selectedDay, index, 'endTime', slot.endTime)}
                                            >
                                                <Clock size={12} color={colors.accent} />
                                                <Text style={styles.timeValueText}>{slot.endTime}</Text>
                                            </TouchableOpacity>

                                            {currentDaySchedule.slots.length > 1 && (
                                                <TouchableOpacity
                                                    style={styles.trashButton}
                                                    onPress={() => handleRemoveSlot(selectedDay, index)}
                                                >
                                                    <Trash2 size={16} color="rgba(244, 67, 54, 0.6)" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.cardActionsRow}>
                                    <TouchableOpacity
                                        style={styles.ghostAddButton}
                                        onPress={() => handleAddSlot(selectedDay)}
                                    >
                                        <Plus size={18} color={colors.accent} />
                                        <Text style={styles.ghostAddText}>Добавить интервал</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.copyButtonGlass}
                                        onPress={handleCopyToAllDays}
                                    >
                                        <Copy size={16} color="rgba(255,255,255,0.4)" />
                                        <Text style={styles.copyButtonText}>Дублировать</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptyDayBox}>
                                <Text style={styles.emptyDayTitle}>Выходной день</Text>
                                <Text style={styles.emptyDayText}>Записи в этот день не принимаются</Text>
                            </View>
                        )}
                    </View>

                    {/* Global Recording Settings */}
                    <View style={styles.globalSettingsCard}>
                        <Text style={styles.globalTitle}>Параметры сессий</Text>

                        <View style={styles.globalItem}>
                            <Text style={styles.globalLabel}>Длительность слота</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
                                {[30, 45, 60, 90, 120].map(mins => (
                                    <TouchableOpacity
                                        key={mins}
                                        style={[
                                            styles.glassOption,
                                            slotDuration === mins && styles.glassOptionActive,
                                        ]}
                                        onPress={() => setSlotDuration(mins)}
                                    >
                                        <Text style={[
                                            styles.glassOptionText,
                                            slotDuration === mins && styles.glassOptionTextActive,
                                        ]}>
                                            {mins} мин
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.globalItem}>
                            <Text style={styles.globalLabel}>Перерыв между записями</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
                                {[0, 5, 10, 15, 30].map(mins => (
                                    <TouchableOpacity
                                        key={mins}
                                        style={[
                                            styles.glassOption,
                                            breakBetween === mins && styles.glassOptionActive,
                                        ]}
                                        onPress={() => setBreakBetween(mins)}
                                    >
                                        <Text style={[
                                            styles.glassOptionText,
                                            breakBetween === mins && styles.glassOptionTextActive,
                                        ]}>
                                            {mins === 0 ? 'Нет' : `${mins} мин`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.globalItem}>
                            <Text style={styles.globalLabel}>Макс. записей в день</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
                                {[0, 3, 5, 8, 10].map(count => (
                                    <TouchableOpacity
                                        key={count}
                                        style={[
                                            styles.glassOption,
                                            maxBookingsPerDay === count && styles.glassOptionActive,
                                        ]}
                                        onPress={() => setMaxBookingsPerDay(count)}
                                    >
                                        <Text style={[
                                            styles.glassOptionText,
                                            maxBookingsPerDay === count && styles.glassOptionTextActive,
                                        ]}>
                                            {count === 0 ? 'Без лимита' : count}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Preview Visualization */}
                    <View style={styles.weekPreviewCard}>
                        <Text style={styles.previewHeading}>Визуализация недели</Text>
                        <View style={styles.visualGrid}>
                            {DAYS.map(({ key, shortLabel }) => {
                                const dayData = schedule[key];
                                return (
                                    <View key={key} style={styles.visualDay}>
                                        <Text style={[
                                            styles.visualDayLabel,
                                            dayData.enabled && styles.visualDayActive,
                                        ]}>
                                            {shortLabel}
                                        </Text>
                                        <View style={styles.dotsContainer}>
                                            {dayData.enabled ? (
                                                dayData.slots.map((_, i) => (
                                                    <View key={i} style={styles.activeDot} />
                                                ))
                                            ) : (
                                                <View style={styles.inactiveDot} />
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    saveCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(245,158,11,1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    content: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionLabel: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    daysContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    daysRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dayTab: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        position: 'relative',
    },
    dayTabSelected: {
        backgroundColor: 'rgba(255,255,255,1)',
        borderColor: 'rgba(255,255,255,1)',
    },
    dayTabDisabled: {
        opacity: 0.3,
    },
    dayTabText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 13,
        fontWeight: '800',
    },
    dayTabTextSelected: {
        color: 'rgba(0,0,0,1)',
        fontWeight: '900',
    },
    dayTabTextDisabled: {
        // Handled in dayTab opacity
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 6,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(245,158,11,1)',
    },
    mainSettingsCard: {
        marginHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    cardHeaderArea: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
        gap: 12,
    },
    cardIndicator: {
        width: 4,
        height: 16,
        backgroundColor: 'rgba(245,158,11,1)',
        borderRadius: 2,
    },
    cardMainTitle: {
        flex: 1,
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    slotsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    glassSlotItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        padding: 12,
        gap: 12,
    },
    timeSelectBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    timeValueText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 15,
        fontWeight: '700',
    },
    timeArrowBox: {
        width: 10,
        justifyContent: 'center',
    },
    arrowLine: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    trashButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(244, 67, 54, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    ghostAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    ghostAddText: {
        color: 'rgba(245,158,11,1)',
        fontSize: 14,
        fontWeight: '800',
    },
    copyButtonGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    copyButtonText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontWeight: '700',
    },
    emptyDayBox: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        borderRadius: 24,
    },
    emptyDayTitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptyDayText: {
        color: 'rgba(255, 255, 255, 0.2)',
        fontSize: 13,
        textAlign: 'center',
    },
    globalSettingsCard: {
        marginHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    globalTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 24,
    },
    globalItem: {
        marginBottom: 24,
    },
    globalLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    optionsScroll: {
        gap: 8,
    },
    glassOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    glassOptionActive: {
        backgroundColor: 'rgba(245,158,11,1)',
        borderColor: 'rgba(245,158,11,1)',
    },
    glassOptionText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 13,
        fontWeight: '700',
    },
    glassOptionTextActive: {
        color: 'rgba(0,0,0,1)',
        fontWeight: '900',
    },
    weekPreviewCard: {
        marginHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    previewHeading: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 20,
    },
    visualGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    visualDay: {
        alignItems: 'center',
    },
    visualDayLabel: {
        color: 'rgba(255, 255, 255, 0.2)',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 10,
    },
    visualDayActive: {
        color: 'rgba(245,158,11,1)',
    },
    dotsContainer: {
        alignItems: 'center',
        gap: 4,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(245,158,11,1)',
    },
    inactiveDot: {
        width: 4,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
});
