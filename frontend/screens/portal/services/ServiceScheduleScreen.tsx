/**
 * ServiceScheduleScreen - Экран настройки расписания сервиса
 */
import React, { useState, useEffect, useCallback } from 'react';
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
import {
    ArrowLeft,
    Save,
    Clock,
    Calendar,
    Plus,
    Trash2,
    Copy,
} from 'lucide-react-native';
import {
    ServiceSchedule,
    getServiceSchedule,
    updateServiceSchedule,
    CreateScheduleRequest,
} from '../../../services/serviceService';

type RouteParams = {
    params: {
        serviceId: number;
    };
};

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

export default function ServiceScheduleScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'params'>>();
    const serviceId = route.params?.serviceId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');

    const [schedule, setSchedule] = useState<Record<DayOfWeek, DaySchedule>>({
        monday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
        tuesday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
        wednesday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
        thursday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
        friday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] },
    });

    const [slotDuration, setSlotDuration] = useState(60); // minutes
    const [breakBetween, setBreakBetween] = useState(0); // minutes
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState(0); // 0 = unlimited

    // Load existing schedule
    useEffect(() => {
        if (serviceId) {
            loadSchedule();
        }
    }, [serviceId]);

    const loadSchedule = async () => {
        try {
            const data = await getServiceSchedule(serviceId);
            if (data && data.weeklySlots) {
                // Parse backend format to our format
                const parsed: Record<DayOfWeek, DaySchedule> = { ...schedule };

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
                if (data.slotDuration) setSlotDuration(data.slotDuration);
                if (data.breakBetween) setBreakBetween(data.breakBetween);
                if (data.maxBookingsPerDay) setMaxBookingsPerDay(data.maxBookingsPerDay);
            }
        } catch (error) {
            console.error('Failed to load schedule:', error);
            // Use defaults if no schedule exists
        } finally {
            setLoading(false);
        }
    };

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
        setSaving(true);
        try {
            const weeklySlots: Record<string, any> = {};
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
        } catch (error: any) {
            console.error('Save failed:', error);
            Alert.alert('Ошибка', error.message || 'Не удалось сохранить');
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

    const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2);
        const minutes = (i % 2) * 30;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    });

    const currentDaySchedule = schedule[selectedDay];

    if (loading) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Расписание</Text>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#1a1a2e" />
                        ) : (
                            <Save size={20} color="#1a1a2e" />
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Week Days Selector */}
                    <View style={styles.daysRow}>
                        {DAYS.map(({ key, shortLabel }) => {
                            const isSelected = selectedDay === key;
                            const isEnabled = schedule[key].enabled;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.dayButton,
                                        isSelected && styles.dayButtonSelected,
                                        !isEnabled && styles.dayButtonDisabled,
                                    ]}
                                    onPress={() => setSelectedDay(key)}
                                >
                                    <Text style={[
                                        styles.dayButtonText,
                                        isSelected && styles.dayButtonTextSelected,
                                        !isEnabled && styles.dayButtonTextDisabled,
                                    ]}>
                                        {shortLabel}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selected Day Settings */}
                    <View style={styles.dayCard}>
                        <View style={styles.dayCardHeader}>
                            <Calendar size={18} color="#FFD700" />
                            <Text style={styles.dayCardTitle}>
                                {DAYS.find(d => d.key === selectedDay)?.label}
                            </Text>
                            <Switch
                                value={currentDaySchedule.enabled}
                                onValueChange={() => handleToggleDay(selectedDay)}
                                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255, 215, 0, 0.4)' }}
                                thumbColor={currentDaySchedule.enabled ? '#FFD700' : '#888'}
                            />
                        </View>

                        {currentDaySchedule.enabled ? (
                            <>
                                <Text style={styles.slotsLabel}>Рабочие часы</Text>

                                {currentDaySchedule.slots.map((slot, index) => (
                                    <View key={index} style={styles.slotRow}>
                                        <View style={styles.timeSelector}>
                                            <Clock size={14} color="rgba(255,255,255,0.5)" />
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => showTimePicker(selectedDay, index, 'startTime', slot.startTime)}
                                            >
                                                <Text style={styles.timeText}>{slot.startTime}</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.timeSeparator}>—</Text>
                                            <TouchableOpacity
                                                style={styles.timeButton}
                                                onPress={() => showTimePicker(selectedDay, index, 'endTime', slot.endTime)}
                                            >
                                                <Text style={styles.timeText}>{slot.endTime}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {currentDaySchedule.slots.length > 1 && (
                                            <TouchableOpacity
                                                style={styles.removeSlotButton}
                                                onPress={() => handleRemoveSlot(selectedDay, index)}
                                            >
                                                <Trash2 size={16} color="#F44336" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}

                                <View style={styles.slotActions}>
                                    <TouchableOpacity
                                        style={styles.addSlotButton}
                                        onPress={() => handleAddSlot(selectedDay)}
                                    >
                                        <Plus size={16} color="#FFD700" />
                                        <Text style={styles.addSlotText}>Добавить период</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.copyButton}
                                        onPress={handleCopyToAllDays}
                                    >
                                        <Copy size={16} color="rgba(255,255,255,0.7)" />
                                        <Text style={styles.copyText}>Копировать на все дни</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <View style={styles.dayOffMessage}>
                                <Text style={styles.dayOffText}>Выходной день</Text>
                                <Text style={styles.dayOffHint}>Включите переключатель, чтобы принимать записи</Text>
                            </View>
                        )}
                    </View>

                    {/* Global Settings */}
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>Настройки записи</Text>

                        <View style={styles.settingRow}>
                            <Text style={styles.settingLabel}>Длительность слота</Text>
                            <View style={styles.settingOptions}>
                                {[30, 45, 60, 90, 120].map(mins => (
                                    <TouchableOpacity
                                        key={mins}
                                        style={[
                                            styles.durationOption,
                                            slotDuration === mins && styles.durationOptionActive,
                                        ]}
                                        onPress={() => setSlotDuration(mins)}
                                    >
                                        <Text style={[
                                            styles.durationOptionText,
                                            slotDuration === mins && styles.durationOptionTextActive,
                                        ]}>
                                            {mins} мин
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.settingRow}>
                            <Text style={styles.settingLabel}>Перерыв между записями</Text>
                            <View style={styles.settingOptions}>
                                {[0, 5, 10, 15, 30].map(mins => (
                                    <TouchableOpacity
                                        key={mins}
                                        style={[
                                            styles.durationOption,
                                            breakBetween === mins && styles.durationOptionActive,
                                        ]}
                                        onPress={() => setBreakBetween(mins)}
                                    >
                                        <Text style={[
                                            styles.durationOptionText,
                                            breakBetween === mins && styles.durationOptionTextActive,
                                        ]}>
                                            {mins === 0 ? 'Нет' : `${mins} мин`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.settingRow}>
                            <Text style={styles.settingLabel}>Макс. записей в день</Text>
                            <View style={styles.settingOptions}>
                                {[0, 3, 5, 8, 10].map(count => (
                                    <TouchableOpacity
                                        key={count}
                                        style={[
                                            styles.durationOption,
                                            maxBookingsPerDay === count && styles.durationOptionActive,
                                        ]}
                                        onPress={() => setMaxBookingsPerDay(count)}
                                    >
                                        <Text style={[
                                            styles.durationOptionText,
                                            maxBookingsPerDay === count && styles.durationOptionTextActive,
                                        ]}>
                                            {count === 0 ? '∞' : count}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Preview */}
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>Предпросмотр недели</Text>
                        <View style={styles.previewGrid}>
                            {DAYS.map(({ key, shortLabel }) => {
                                const dayData = schedule[key];
                                return (
                                    <View key={key} style={styles.previewDay}>
                                        <Text style={[
                                            styles.previewDayLabel,
                                            dayData.enabled && styles.previewDayLabelActive,
                                        ]}>
                                            {shortLabel}
                                        </Text>
                                        {dayData.enabled ? (
                                            dayData.slots.map((slot, i) => (
                                                <Text key={i} style={styles.previewSlot}>
                                                    {slot.startTime}
                                                </Text>
                                            ))
                                        ) : (
                                            <Text style={styles.previewOff}>—</Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <View style={{ height: 32 }} />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );

    function showTimePicker(day: DayOfWeek, slotIndex: number, field: 'startTime' | 'endTime', currentValue: string) {
        // Simple picker using Alert (replace with proper time picker in production)
        const currentHour = parseInt(currentValue.split(':')[0]);
        const options = TIME_OPTIONS.filter(t => {
            const h = parseInt(t.split(':')[0]);
            if (field === 'startTime') return h >= 6 && h < 23;
            return h > parseInt(schedule[day].slots[slotIndex].startTime.split(':')[0]);
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
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 12,
    },
    saveButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    content: {
        flex: 1,
    },
    daysRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 6,
    },
    dayButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
    },
    dayButtonSelected: {
        backgroundColor: '#FFD700',
    },
    dayButtonDisabled: {
        opacity: 0.4,
    },
    dayButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    dayButtonTextSelected: {
        color: '#1a1a2e',
    },
    dayButtonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.5)',
    },
    dayCard: {
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    dayCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    dayCardTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    slotsLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginBottom: 10,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    timeSelector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    timeText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },
    timeSeparator: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
    },
    removeSlotButton: {
        padding: 8,
        marginLeft: 8,
    },
    slotActions: {
        marginTop: 8,
        gap: 8,
    },
    addSlotButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingVertical: 10,
        borderRadius: 10,
    },
    addSlotText: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '500',
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    copyText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
    },
    dayOffMessage: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    dayOffText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 15,
        marginBottom: 4,
    },
    dayOffHint: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 12,
    },
    settingsCard: {
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    settingsTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    settingRow: {
        marginBottom: 16,
    },
    settingLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        marginBottom: 10,
    },
    settingOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    durationOption: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    durationOptionActive: {
        backgroundColor: '#FFD700',
    },
    durationOptionText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '500',
    },
    durationOptionTextActive: {
        color: '#1a1a2e',
    },
    previewCard: {
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
    },
    previewTitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginBottom: 12,
        textAlign: 'center',
    },
    previewGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    previewDay: {
        alignItems: 'center',
    },
    previewDayLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 6,
    },
    previewDayLabelActive: {
        color: '#FFD700',
    },
    previewSlot: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        marginBottom: 2,
    },
    previewOff: {
        color: 'rgba(255, 255, 255, 0.2)',
        fontSize: 10,
    },
});
