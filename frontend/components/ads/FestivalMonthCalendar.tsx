import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FestivalCalendarResponse } from '../../types/ads';
import { useSettings } from '../../context/SettingsContext';

interface FestivalMonthCalendarProps {
    monthDate: Date;
    selectedDate: string;
    calendar?: FestivalCalendarResponse | null;
    onSelectDate: (date: string) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

const weekDayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const toDayISO = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const FestivalMonthCalendar: React.FC<FestivalMonthCalendarProps> = ({
    monthDate,
    selectedDate,
    calendar,
    onSelectDate,
    onPrevMonth,
    onNextMonth,
}) => {
    const { i18n } = useTranslation();
    const { vTheme } = useSettings();
    const colors = vTheme.colors;

    const dayCountMap = useMemo(() => {
        const next = new Map<string, number>();
        (calendar?.days || []).forEach((item) => {
            next.set(item.date, item.count);
        });
        return next;
    }, [calendar?.days]);

    const days = useMemo(() => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const first = new Date(year, month, 1);
        const firstWeekday = (first.getDay() + 6) % 7; // Monday-first
        const totalDays = new Date(year, month + 1, 0).getDate();

        const cells: Array<{ date?: Date }> = [];
        for (let i = 0; i < firstWeekday; i += 1) {
            cells.push({});
        }
        for (let day = 1; day <= totalDays; day += 1) {
            cells.push({ date: new Date(year, month, day) });
        }
        return cells;
    }, [monthDate]);

    const monthTitle = monthDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.surface || '#fff' }]}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={onPrevMonth} style={styles.navButton}>
                    <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.monthTitle, { color: colors.text }]}>{monthTitle}</Text>
                <TouchableOpacity onPress={onNextMonth} style={styles.navButton}>
                    <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.weekHeader}>
                {weekDayLabels.map((label) => (
                    <Text key={label} style={[styles.weekLabel, { color: colors.textSecondary }]}>
                        {label}
                    </Text>
                ))}
            </View>

            <View style={styles.grid}>
                {days.map((cell, index) => {
                    if (!cell.date) {
                        return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }
                    const dateISO = toDayISO(cell.date);
                    const dayCount = dayCountMap.get(dateISO) || 0;
                    const isSelected = selectedDate === dateISO;

                    return (
                        <TouchableOpacity
                            key={dateISO}
                            style={[
                                styles.dayCell,
                                isSelected && { backgroundColor: colors.primary + '20', borderRadius: 12 },
                            ]}
                            onPress={() => onSelectDate(dateISO)}
                        >
                            <Text style={[styles.dayText, { color: isSelected ? colors.primary : colors.text }]}>
                                {cell.date.getDate()}
                            </Text>
                            {dayCount > 0 && (
                                <View style={[styles.marker, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.markerText}>{dayCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    navButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitle: {
        fontSize: 15,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    weekLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.285%',
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
    },
    marker: {
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        marginTop: 2,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
});
