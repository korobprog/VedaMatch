import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { ekadashiService } from '../../services/ekadashiService';
import type { EkadashiDay, EkadashiOrganization } from '../../types/ekadashi';
import {
    canAccessVedicCalendarRole,
    findCalendarEventsForCell,
    formatEkadashiDateTime,
    getCalendarEventBackgroundColor,
    getCalendarEventLabelKey,
    getCalendarEventMarkerColor,
    getCalendarGridDays,
    getEkadashiProviderNoticeKey,
    resolveOrganizationOption,
} from '../../utils/ekadashiCalendar';

interface CalendarWidgetProps {
    size?: '2x2';
    onDatePress?: (date: Date) => void;
}

const localeFromLanguage = (language: string): string => {
    if (language === 'ru') return 'ru-RU';
    if (language === 'hi') return 'hi-IN';
    return 'en-US';
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
    size: _size = '2x2',
    onDatePress,
}) => {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { vTheme, isDarkMode, portalBackgroundType, portalIconStyle } = useSettings();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const canUseEkadashi = canAccessVedicCalendarRole(user?.role, {
        godModeEnabled: user?.godModeEnabled,
        currentPlan: user?.currentPlan,
    });
    const [mode, setMode] = useState<'gregorian' | 'ekadashi'>(canUseEkadashi ? 'ekadashi' : 'gregorian');
    const [calendarEvents, setCalendarEvents] = useState<EkadashiDay[]>([]);
    const [selectedEvents, setSelectedEvents] = useState<EkadashiDay[]>([]);
    const [organizations, setOrganizations] = useState<EkadashiOrganization[]>([resolveOrganizationOption('iskcon')]);
    const [organizationId, setOrganizationId] = useState('iskcon');
    const [providerNoticeKey, setProviderNoticeKey] = useState<string | null>(null);
    const today = useMemo(() => new Date(), []);
    const isPhotoBg = portalBackgroundType === 'image';
    const isVedaMatch = portalIconStyle === 'vedamatch';
    const isLightCanvasTheme = !isPhotoBg && !isDarkMode && !isVedaMatch;
    const locale = localeFromLanguage(i18n.language);
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const textColor = isVedaMatch ? '#FFDF00' : isPhotoBg ? '#ffffff' : vTheme.colors.text;
    const secondaryTextColor = isVedaMatch ? '#D4AF37' : isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary;
    const containerStyle = {
        backgroundColor: isVedaMatch
            ? '#121212'
            : isPhotoBg
                ? 'transparent'
                : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF'),
        borderColor: isVedaMatch
            ? '#D4AF37'
            : isPhotoBg
                ? 'rgba(255,255,255,0.3)'
                : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.14)'),
        ...(isLightCanvasTheme ? {
            shadowColor: '#0F172A',
            shadowOpacity: 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
        } : {}),
    };
    const modalCardStyle = { backgroundColor: isDarkMode ? '#101828' : '#FFFFFF' };

    const monthTitle = useMemo(() => (
        currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    ), [currentMonth, locale]);

    const weekDays = useMemo(() => ([
        t('portal.serviceCalendar.days.mon'),
        t('portal.serviceCalendar.days.tue'),
        t('portal.serviceCalendar.days.wed'),
        t('portal.serviceCalendar.days.thu'),
        t('portal.serviceCalendar.days.fri'),
        t('portal.serviceCalendar.days.sat'),
        t('portal.serviceCalendar.days.sun'),
    ]), [t]);

    const days = useMemo(() => getCalendarGridDays(currentMonth), [currentMonth]);

    useEffect(() => {
        let mounted = true;
        if (!canUseEkadashi || mode !== 'ekadashi') {
            setCalendarEvents([]);
            return;
        }

        (async () => {
            try {
                const [storedOrganizationId, orgs] = await Promise.all([
                    ekadashiService.getSelectedOrganizationId(),
                    ekadashiService.getOrganizations(),
                ]);
                if (!mounted) return;
                const resolvedOrganizationId = storedOrganizationId || organizationId;
                setOrganizations(orgs.length ? orgs : [resolveOrganizationOption(resolvedOrganizationId)]);
                setOrganizationId(resolvedOrganizationId);
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const response = await ekadashiService.getCalendar({
                    month: monthKey,
                    organizationId: resolvedOrganizationId,
                    timezone,
                    city: user?.city || '',
                    country: '',
                });
                if (!mounted) return;
                setCalendarEvents(response.events?.length ? response.events : (response.days || []));
                setProviderNoticeKey(getEkadashiProviderNoticeKey(response.providerDecision));
            } catch (error) {
                console.warn('Failed to load calendar widget data:', error);
                if (mounted) {
                    setCalendarEvents([]);
                    setProviderNoticeKey('portal.ekadashiCalendar.providerNotices.liveUnavailable');
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [canUseEkadashi, mode, monthKey, organizationId, user?.city]);

    const isToday = (day: number | null): boolean => {
        if (!day) return false;
        return (
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
        );
    };

    const navigateMonth = (direction: number) => {
        setCurrentMonth((prev) => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const cycleOrganization = useCallback(async () => {
        if (!canUseEkadashi || organizations.length === 0) return;
        const currentIndex = organizations.findIndex((item) => item.id === organizationId);
        const next = organizations[(currentIndex + 1) % organizations.length] || organizations[0];
        setOrganizationId(next.id);
        await ekadashiService.setSelectedOrganizationId(next.id);
    }, [canUseEkadashi, organizationId, organizations]);

    const handleDatePress = (day: number | null) => {
        if (!day) return;
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        if (mode === 'gregorian') {
            onDatePress?.(selectedDate);
            return;
        }
        const dayEvents = findCalendarEventsForCell(calendarEvents, currentMonth, day);
        if (dayEvents.length > 0) {
            setSelectedEvents(dayEvents);
        }
    };

    const primaryTextStyle = { color: textColor };

    return (
        <View style={[styles.container, containerStyle]}>
            {(isPhotoBg || isDarkMode) && !isVedaMatch && (
                <BlurView
                    style={[StyleSheet.absoluteFill, styles.absoluteFillRounded]}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={10}
                    reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                />
            )}

            <View style={styles.modeRow}>
                <TouchableOpacity
                    style={[styles.modeChip, mode === 'gregorian' && styles.modeChipActive]}
                    onPress={() => setMode('gregorian')}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.modeChipText, primaryTextStyle]}>{t('portal.widgets.calendar.modes.gregorian')}</Text>
                </TouchableOpacity>
                {canUseEkadashi ? (
                    <TouchableOpacity
                        style={[styles.modeChip, mode === 'ekadashi' && styles.modeChipActive]}
                        onPress={() => setMode('ekadashi')}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.modeChipText, primaryTextStyle]}>{t('portal.widgets.calendar.modes.ekadashi')}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
                    <ChevronLeft size={16} color={secondaryTextColor} />
                </TouchableOpacity>
                <Text style={[styles.monthYear, primaryTextStyle]} numberOfLines={1}>
                    {monthTitle}
                </Text>
                <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
                    <ChevronRight size={16} color={secondaryTextColor} />
                </TouchableOpacity>
            </View>

            {mode === 'ekadashi' && canUseEkadashi ? (
                <View style={styles.ekadashiMeta}>
                    <TouchableOpacity style={styles.organizationChip} onPress={() => { cycleOrganization().catch(() => undefined); }} activeOpacity={0.85}>
                        <Text style={[styles.organizationChipText, primaryTextStyle]} numberOfLines={1}>
                            {resolveOrganizationOption(organizationId).name}
                        </Text>
                    </TouchableOpacity>
                    {providerNoticeKey ? (
                        <Text style={[styles.providerHintText, primaryTextStyle]} numberOfLines={2}>
                            {t(providerNoticeKey)}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            <View style={styles.weekDays}>
                {weekDays.map((day, index) => {
                    const weekDayTextStyle = {
                        color: index >= 5
                            ? (isVedaMatch ? '#EF4444' : vTheme.colors.primary)
                            : (isVedaMatch ? 'rgba(255,223,0,0.6)' : isPhotoBg ? 'rgba(255,255,255,0.6)' : vTheme.colors.textSecondary),
                    };
                    return (
                        <View key={day} style={styles.dayCell}>
                            <Text style={[styles.weekDayText, weekDayTextStyle]}>{day}</Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.daysGrid}>
                {days.map((day, index) => {
                    const dayEvents = mode === 'ekadashi' ? findCalendarEventsForCell(calendarEvents, currentMonth, day) : [];
                    const primaryEvent = dayEvents[0] || null;
                    const todayStyle = isToday(day) ? { backgroundColor: isVedaMatch ? '#D4AF37' : vTheme.colors.primary } : null;
                    const eventStyle = primaryEvent && !isToday(day)
                        ? {
                            backgroundColor: getCalendarEventBackgroundColor(primaryEvent),
                            borderWidth: 1,
                            borderColor: getCalendarEventMarkerColor(primaryEvent),
                        }
                        : null;
                    const dayTextColor = isToday(day)
                        ? (isVedaMatch ? '#121212' : '#FFF')
                        : day
                            ? textColor
                            : 'transparent';
                    return (
                        <TouchableOpacity
                            key={`${day}-${index}`}
                            style={styles.dayCell}
                            onPress={() => handleDatePress(day)}
                            disabled={!day}
                        >
                            <View style={[styles.dayCircle, todayStyle, eventStyle]}>
                                <Text style={[styles.dayText, { color: dayTextColor }]}>{day || ''}</Text>
                                {primaryEvent ? <View style={[styles.markerDot, { backgroundColor: getCalendarEventMarkerColor(primaryEvent) }]} /> : null}
                                {dayEvents.length > 1 ? (
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>{dayEvents.length}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Modal visible={selectedEvents.length > 0} transparent animationType="fade" onRequestClose={() => setSelectedEvents([])}>
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedEvents([])} />
                    {selectedEvents.length > 0 ? (
                        <View style={[styles.modalCard, modalCardStyle]}>
                            <Text style={styles.modalDayTitle}>
                                {new Date(`${selectedEvents[0].date}T00:00:00Z`).toLocaleDateString(locale, { month: 'long', day: 'numeric' })}
                            </Text>
                            {selectedEvents.map((event) => (
                                <View key={event.eventId} style={styles.modalEventCard}>
                                    <View style={styles.modalEventHeader}>
                                        <View style={[styles.modalMarker, { backgroundColor: getCalendarEventMarkerColor(event) }]} />
                                        <View style={styles.modalEventText}>
                                            <Text style={styles.modalType}>{t(getCalendarEventLabelKey(event.eventType))}</Text>
                                            <Text style={styles.modalTitle}>{event.title || event.displayTitle}</Text>
                                            {!!(event.subtitle || event.displaySubtitle) && (
                                                <Text style={styles.modalSubtitle}>{event.subtitle || event.displaySubtitle}</Text>
                                            )}
                                        </View>
                                    </View>
                                    {(event.isEkadashi || event.isMahadvadashi) ? (
                                        <>
                                            <Text style={styles.modalLine}>{t('portal.ekadashiCalendar.fastStarts')}: {formatEkadashiDateTime(event.fastStartAt, locale) || t('portal.ekadashiCalendar.notAvailable')}</Text>
                                            <Text style={styles.modalLine}>{t('portal.ekadashiCalendar.parana')}: {formatEkadashiDateTime(event.paranaStartAt, locale) || t('portal.ekadashiCalendar.noParanaTime')}</Text>
                                        </>
                                    ) : null}
                                    <Text style={styles.modalNotes}>{event.notes || event.observanceNotes}</Text>
                                    {event.providerDecision?.mode === 'fallback' ? (
                                        <Text style={styles.modalNotes}>
                                            {t(getEkadashiProviderNoticeKey(event.providerDecision) || 'portal.ekadashiCalendar.providerNotices.fallbackActive')}
                                        </Text>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 8,
        margin: 4,
        overflow: 'hidden',
        width: 168,
        height: 168,
    },
    absoluteFillRounded: {
        borderRadius: 20,
    },
    modeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 6,
    },
    modeChip: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    modeChipActive: {
        backgroundColor: 'rgba(212,175,55,0.18)',
    },
    modeChipText: {
        fontSize: 9,
        fontWeight: '700',
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
        flex: 1,
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginHorizontal: 4,
    },
    organizationChip: {
        alignSelf: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.08)',
        maxWidth: '100%',
    },
    ekadashiMeta: {
        alignItems: 'center',
        marginBottom: 6,
        gap: 4,
    },
    organizationChipText: {
        fontSize: 9,
        fontWeight: '700',
    },
    providerHintText: {
        fontSize: 8,
        lineHeight: 10,
        textAlign: 'center',
        opacity: 0.78,
        paddingHorizontal: 6,
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
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    dayText: {
        fontSize: 11,
        fontWeight: '500',
    },
    markerDot: {
        position: 'absolute',
        bottom: -1,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    countBadge: {
        position: 'absolute',
        top: -5,
        right: -6,
        minWidth: 12,
        height: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2,
        backgroundColor: '#111827',
    },
    countBadgeText: {
        color: '#FFFFFF',
        fontSize: 7,
        fontWeight: '800',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.48)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 16,
        gap: 8,
    },
    modalDayTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 2,
    },
    modalEventCard: {
        borderRadius: 14,
        paddingVertical: 4,
        gap: 4,
    },
    modalEventHeader: {
        flexDirection: 'row',
        gap: 8,
    },
    modalEventText: {
        flex: 1,
    },
    modalMarker: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    modalType: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    modalTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    modalLine: {
        fontSize: 13,
        color: '#111827',
    },
    modalNotes: {
        marginTop: 2,
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 16,
    },
});
