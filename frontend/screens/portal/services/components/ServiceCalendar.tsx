/**
 * ServiceCalendar - Компонент календаря для выбора даты/времени записи
 */
import React, { useState, useCallback } from 'react';
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

    // Get dates with available slots
    const availableDatesSet = new Set(availableSlots.map(s => s.date));

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

    const formatDateKey = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

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
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.monthTitle}>
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>

                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <ChevronRight size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.weekHeader}>
                {DAYS_OF_WEEK.map((day, index) => (
                    <View key={index} style={styles.weekDayCell}>
                        <Text style={styles.weekDayText}>{day}</Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFD700" size="large" />
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
                                style={[
                                    styles.dayCell,
                                    available && styles.dayCellAvailable,
                                    selected && styles.dayCellSelected,
                                    isToday && styles.dayCellToday,
                                ]}
                                onPress={() => handleDatePress(item.date!)}
                                disabled={!available}
                            >
                                <Text style={[
                                    styles.dayText,
                                    !available && styles.dayTextDisabled,
                                    selected && styles.dayTextSelected,
                                ]}>
                                    {item.date.getDate()}
                                </Text>
                                {available && !selected && (
                                    <View style={styles.availableDot} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Time Slots */}
            {selectedDate && (
                <View style={styles.timeSlotsContainer}>
                    <View style={styles.timeSlotsHeader}>
                        <Clock size={18} color="#FFD700" />
                        <Text style={styles.timeSlotsTitle}>Выберите время</Text>
                        <Text style={styles.durationBadge}>{durationMinutes} мин</Text>
                    </View>

                    {selectedDateSlots.length === 0 ? (
                        <Text style={styles.noSlotsText}>Нет доступного времени</Text>
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
                                        style={[
                                            styles.timeSlot,
                                            !slot.available && styles.timeSlotUnavailable,
                                            isSelected && styles.timeSlotSelected,
                                        ]}
                                        onPress={() => slot.available && onTimeSelect(slot.time)}
                                        disabled={!slot.available}
                                    >
                                        <Text style={[
                                            styles.timeSlotText,
                                            !slot.available && styles.timeSlotTextUnavailable,
                                            isSelected && styles.timeSlotTextSelected,
                                        ]}>
                                            {slot.time}
                                        </Text>
                                        {slot.maxParticipants && slot.maxParticipants > 1 && (
                                            <Text style={[
                                                styles.participantsText,
                                                isSelected && styles.participantsTextSelected,
                                            ]}>
                                                {slot.bookedCount || 0}/{slot.maxParticipants}
                                            </Text>
                                        )}
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    navButton: {
        padding: 8,
    },
    monthTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekDayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekDayText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    loadingContainer: {
        height: 200,
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    dayCellAvailable: {
        // Available styling
    },
    dayCellSelected: {
        backgroundColor: '#FFD700',
        borderRadius: 50,
    },
    dayCellToday: {
        borderWidth: 1,
        borderColor: '#FFD700',
        borderRadius: 50,
    },
    dayText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    dayTextDisabled: {
        color: 'rgba(255, 255, 255, 0.2)',
    },
    dayTextSelected: {
        color: '#1a1a2e',
        fontWeight: '700',
    },
    availableDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#4CAF50',
        marginTop: 2,
    },
    timeSlotsContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingTop: 16,
    },
    timeSlotsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    timeSlotsTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    durationBadge: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    timeSlotsScroll: {
        gap: 8,
    },
    timeSlot: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 70,
    },
    timeSlotUnavailable: {
        opacity: 0.3,
    },
    timeSlotSelected: {
        backgroundColor: '#FFD700',
    },
    timeSlotText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    timeSlotTextUnavailable: {
        color: 'rgba(255, 255, 255, 0.5)',
    },
    timeSlotTextSelected: {
        color: '#1a1a2e',
    },
    participantsText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        marginTop: 2,
    },
    participantsTextSelected: {
        color: 'rgba(0, 0, 0, 0.5)',
    },
    noSlotsText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
});
