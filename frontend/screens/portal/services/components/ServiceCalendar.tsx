/**
 * ServiceCalendar - Компонент календаря для выбора даты/времени записи
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';

interface TimeSlot {
    time: string;
    available: boolean;
    bookedCount?: number;
    maxParticipants?: number;
}

interface ServiceCalendarProps {
    availableSlots: { date: string; slots: TimeSlot[] }[];
    selectedDate: string | null;
    selectedTime: string | null;
    onDateSelect: (date: string) => void;
    onTimeSelect: (time: string) => void;
    loading?: boolean;
    durationMinutes?: number;
}

const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export default function ServiceCalendar({
    availableSlots,
    selectedDate,
    selectedTime,
    onDateSelect,
    onTimeSelect,
    loading = false,
    durationMinutes = 60,
}: ServiceCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const formatDateKey = useCallback((date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    // Use local YYYY-MM-DD keys to avoid UTC day shift around midnight.
    const availableDatesSet = useMemo(() => new Set(availableSlots.map(s => s.date)), [availableSlots]);

    // Generate calendar days
    const getDaysInMonth = useCallback(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();

        const days: { date: Date | null; isCurrentMonth: boolean }[] = [];

        // Add empty cells for days before first of month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ date: null, isCurrentMonth: false });
        }

        // Add days of current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push({ date: new Date(year, month, day), isCurrentMonth: true });
        }

        return days;
    }, [currentMonth]);

    const isDateAvailable = (date: Date): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date < today) return false;

        return availableDatesSet.has(formatDateKey(date));
    };

    const isDateSelected = (date: Date): boolean => {
        return selectedDate === formatDateKey(date);
    };

    const goToPreviousMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleDatePress = (date: Date) => {
        if (!isDateAvailable(date)) return;
        onDateSelect(formatDateKey(date));
    };

    // Get time slots for selected date
    const selectedDateSlots = selectedDate
        ? availableSlots.find(s => s.date === selectedDate)?.slots || []
        : [];

    const days = getDaysInMonth();

    return (
        <View style={styles.container}>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.navCircle}>
                    <ChevronLeft size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>

                <Text style={styles.monthTitle}>
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>

                <TouchableOpacity onPress={goToNextMonth} style={styles.navCircle}>
                    <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.weekHeader}>
                {DAYS_OF_WEEK.map((day, index) => (
                    <View key={index} style={styles.weekDayCell}>
                        <Text style={styles.weekDayText}>{day.toUpperCase()}</Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="rgba(245,158,11,1)" size="large" />
                </View>
            ) : (
                <View style={styles.calendarGrid}>
                    {days.map((item, index) => {
                        if (!item.date) {
                            return <View key={index} style={styles.dayCell} />;
                        }

                        const available = isDateAvailable(item.date);
                        const selected = isDateSelected(item.date);
                        const isToday = formatDateKey(item.date) === formatDateKey(new Date());

                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.8}
                                style={[
                                    styles.dayCell,
                                    selected && styles.dayCellSelected,
                                ]}
                                onPress={() => handleDatePress(item.date!)}
                                disabled={!available}
                            >
                                <View style={[
                                    styles.dayContent,
                                    isToday && styles.dayToday,
                                    selected && styles.daySelected,
                                    !available && styles.dayDisabled,
                                ]}>
                                    <Text style={[
                                        styles.dayText,
                                        selected && styles.dayTextSelected,
                                        !available && styles.dayTextDisabled,
                                    ]}>
                                        {item.date.getDate()}
                                    </Text>
                                    {available && !selected && (
                                        <View style={styles.availableBadge} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Time Slots Mastery */}
            {selectedDate && (
                <View style={styles.timeSlotsContainer}>
                    <View style={styles.timeSlotsHeader}>
                        <View style={styles.headerIndicator} />
                        <Text style={styles.timeSlotsTitle}>Доступное время</Text>
                        <View style={styles.durationBadge}>
                            <Clock size={10} color="rgba(10, 10, 20, 0.6)" />
                            <Text style={styles.durationText}>{durationMinutes}м</Text>
                        </View>
                    </View>

                    {selectedDateSlots.length === 0 ? (
                        <View style={styles.noSlotsBox}>
                            <Text style={styles.noSlotsText}>На этот день записей нет</Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.timeSlotsScroll}
                        >
                            {selectedDateSlots.map((slot, index) => {
                                const isSelected = selectedTime === slot.time;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.timeSlot,
                                            isSelected && styles.timeSlotSelected,
                                            !slot.available && styles.timeSlotUnavailable,
                                        ]}
                                        onPress={() => slot.available && onTimeSelect(slot.time)}
                                        disabled={!slot.available}
                                    >
                                        <Text style={[
                                            styles.timeSlotText,
                                            isSelected && styles.timeSlotTextSelected,
                                            !slot.available && styles.timeSlotTextUnavailable,
                                        ]}>
                                            {slot.time}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    navCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    monthTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'Cinzel-Bold',
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    weekDayCell: {
        flex: 1,
        alignItems: 'center',
    },
    weekDayText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    loadingContainer: {
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayContent: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    dayToday: {
        borderColor: 'rgba(245,158,11,1)',
    },
    daySelected: {
        backgroundColor: 'rgba(255,255,255,1)',
        borderColor: 'rgba(255,255,255,1)',
    },
    dayDisabled: {
        opacity: 0.2,
    },
    dayText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 15,
        fontWeight: '700',
    },
    dayTextSelected: {
        color: 'rgba(0,0,0,1)',
        fontWeight: '900',
    },
    dayTextDisabled: {
        fontWeight: '500',
    },
    availableBadge: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(245,158,11,1)',
        position: 'absolute',
        bottom: 6,
    },
    dayCellSelected: {
        // Handled in dayContent
    },
    timeSlotsContainer: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    timeSlotsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerIndicator: {
        width: 4,
        height: 12,
        backgroundColor: 'rgba(245,158,11,1)',
        borderRadius: 2,
        marginRight: 10,
    },
    timeSlotsTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 14,
        fontWeight: '800',
        flex: 1,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245,158,11,1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    durationText: {
        color: 'rgba(0,0,0,1)',
        fontSize: 11,
        fontWeight: '900',
    },
    noSlotsBox: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    noSlotsText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
    },
    timeSlotsScroll: {
        gap: 12,
        paddingBottom: 4,
    },
    timeSlot: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        minWidth: 80,
        alignItems: 'center',
    },
    timeSlotSelected: {
        backgroundColor: 'rgba(255,255,255,1)',
        borderColor: 'rgba(255,255,255,1)',
    },
    timeSlotUnavailable: {
        opacity: 0.1,
    },
    timeSlotText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 15,
        fontWeight: '800',
    },
    timeSlotTextSelected: {
        color: 'rgba(0,0,0,1)',
    },
    timeSlotTextUnavailable: {
        // Matches opacity
    },
});
