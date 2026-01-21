// Calendar Widget - displays current month with today highlighted
import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';

interface CalendarWidgetProps {
    size?: '2x2';
    onDatePress?: (date: Date) => void;
}

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
    size = '2x2',
    onDatePress
}) => {
    const { vTheme, isDarkMode } = useSettings();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const today = useMemo(() => new Date(), []);

    const getDaysInMonth = (date: Date): (number | null)[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Adjust for Monday start (0 = Monday, 6 = Sunday)
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const days: (number | null)[] = [];

        // Empty slots for days before first day of month
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }

        // Days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(i);
        }

        return days;
    };

    const isToday = (day: number | null): boolean => {
        if (!day) return false;
        return (
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
        );
    };

    const navigateMonth = (direction: number) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const handleDatePress = (day: number | null) => {
        if (day && onDatePress) {
            const selectedDate = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
            );
            onDatePress(selectedDate);
        }
    };

    const days = getDaysInMonth(currentMonth);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDarkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.9)',
                    borderColor: isDarkMode
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,0,0,0.08)',
                },
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
                    <ChevronLeft size={16} color={vTheme.colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.monthYear, { color: vTheme.colors.text }]}>
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
                    <ChevronRight size={16} color={vTheme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Day names */}
            <View style={styles.weekDays}>
                {DAYS_SHORT.map((day, index) => (
                    <View key={day} style={styles.dayCell}>
                        <Text
                            style={[
                                styles.weekDayText,
                                {
                                    color: index >= 5
                                        ? vTheme.colors.primary
                                        : vTheme.colors.textSecondary
                                }
                            ]}
                        >
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>
                {days.map((day, index) => (
                    <TouchableOpacity
                        key={`${day}-${index}`}
                        style={styles.dayCell}
                        onPress={() => handleDatePress(day)}
                        disabled={!day}
                    >
                        <View
                            style={[
                                styles.dayCircle,
                                isToday(day) && {
                                    backgroundColor: vTheme.colors.primary,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.dayText,
                                    {
                                        color: isToday(day)
                                            ? '#FFF'
                                            : day
                                                ? vTheme.colors.text
                                                : 'transparent',
                                    },
                                ]}
                            >
                                {day || ''}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    navButton: {
        padding: 4,
    },
    monthYear: {
        fontSize: 11,
        fontWeight: '600',
    },
    weekDays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 2,
    },
    weekDayText: {
        fontSize: 8,
        fontWeight: '500',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        fontSize: 9,
        fontWeight: '500',
    },
});
