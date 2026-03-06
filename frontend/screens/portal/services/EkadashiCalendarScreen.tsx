import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { ekadashiService } from '../../../services/ekadashiService';
import type { EkadashiDay, EkadashiOrganization, EkadashiPushPreference } from '../../../types/ekadashi';
import {
    findEkadashiDayForCell,
    formatEkadashiDateTime,
    getCalendarGridDays,
    getEkadashiProviderNoticeKey,
    isDevoteeRole,
    resolveOrganizationOption,
} from '../../../utils/ekadashiCalendar';

const localeFromLanguage = (language: string): string => {
    if (language === 'ru') return 'ru-RU';
    if (language === 'hi') return 'hi-IN';
    return 'en-US';
};

const buildMonthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const defaultPreference = (organizationId: string, city: string, country: string, timezone: string): Omit<EkadashiPushPreference, 'userId'> => ({
    enabled: false,
    fastStartReminder: true,
    paranaReminder: true,
    organizationId,
    city,
    country,
    timezone,
    useQuietHours: false,
    quietStartHour: 22,
    quietEndHour: 7,
});

const EkadashiCalendarScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);

    const canUseEkadashi = isDevoteeRole(user?.role);
    const locale = localeFromLanguage(i18n.language);
    const initialCity = user?.city || '';
    const initialCountry = '';
    const initialTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [organizations, setOrganizations] = useState<EkadashiOrganization[]>([resolveOrganizationOption('iskcon')]);
    const [organizationId, setOrganizationId] = useState('iskcon');
    const [days, setDays] = useState<EkadashiDay[]>([]);
    const [selectedDay, setSelectedDay] = useState<EkadashiDay | null>(null);
    const [providerNoticeKey, setProviderNoticeKey] = useState<string | null>(null);
    const [city, setCity] = useState(initialCity);
    const [country, setCountry] = useState(initialCountry);
    const [timezone, setTimezone] = useState(initialTimezone);
    const [preferences, setPreferences] = useState<Omit<EkadashiPushPreference, 'userId'>>(
        defaultPreference('iskcon', initialCity, initialCountry, initialTimezone),
    );
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const monthTitle = useMemo(
        () => currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        [currentMonth, locale],
    );
    const monthKey = useMemo(() => buildMonthKey(currentMonth), [currentMonth]);
    const gridDays = useMemo(() => getCalendarGridDays(currentMonth), [currentMonth]);
    const weekDays = useMemo(() => ([
        t('portal.serviceCalendar.days.mon'),
        t('portal.serviceCalendar.days.tue'),
        t('portal.serviceCalendar.days.wed'),
        t('portal.serviceCalendar.days.thu'),
        t('portal.serviceCalendar.days.fri'),
        t('portal.serviceCalendar.days.sat'),
        t('portal.serviceCalendar.days.sun'),
    ]), [t]);

    const loadCalendar = useCallback(async (nextOrganizationId: string, nextTimezone: string, nextCity: string, nextCountry: string) => {
        setLoading(true);
        try {
            const response = await ekadashiService.getCalendar({
                month: monthKey,
                organizationId: nextOrganizationId,
                timezone: nextTimezone,
                city: nextCity,
                country: nextCountry,
            });
            setDays(response.days || []);
            setProviderNoticeKey(getEkadashiProviderNoticeKey(response.providerDecision));
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.ekadashiCalendar.alerts.loadFailed'));
            setDays([]);
            setProviderNoticeKey('portal.ekadashiCalendar.providerNotices.liveUnavailable');
        } finally {
            setLoading(false);
        }
    }, [monthKey, t]);

    useEffect(() => {
        if (!canUseEkadashi) return;
        let mounted = true;

        (async () => {
            try {
                const [storedOrganizationId, orgs, preference] = await Promise.all([
                    ekadashiService.getSelectedOrganizationId(),
                    ekadashiService.getOrganizations(),
                    ekadashiService.getPushPreference().catch(() => null),
                ]);
                if (!mounted) return;
                const resolvedOrganizationId = preference?.organizationId || storedOrganizationId || 'iskcon';
                const resolvedCity = preference?.city || initialCity;
                const resolvedCountry = preference?.country || initialCountry;
                const resolvedTimezone = preference?.timezone || initialTimezone;

                setOrganizations(orgs.length > 0 ? orgs : [resolveOrganizationOption(resolvedOrganizationId)]);
                setOrganizationId(resolvedOrganizationId);
                setCity(resolvedCity);
                setCountry(resolvedCountry);
                setTimezone(resolvedTimezone);
                setPreferences(preference || defaultPreference(resolvedOrganizationId, resolvedCity, resolvedCountry, resolvedTimezone));

                await ekadashiService.setSelectedOrganizationId(resolvedOrganizationId);
                await loadCalendar(resolvedOrganizationId, resolvedTimezone, resolvedCity, resolvedCountry);
            } catch {
                if (!mounted) return;
                setOrganizations([resolveOrganizationOption('iskcon')]);
                setPreferences(defaultPreference('iskcon', initialCity, initialCountry, initialTimezone));
                await loadCalendar('iskcon', initialTimezone, initialCity, initialCountry);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [canUseEkadashi, initialCity, initialCountry, initialTimezone, loadCalendar]);

    useEffect(() => {
        if (!canUseEkadashi) return;
        loadCalendar(organizationId, timezone, city, country).catch(() => undefined);
    }, [canUseEkadashi, organizationId, timezone, city, country, monthKey, loadCalendar]);

    const navigateMonth = (direction: number) => {
        setCurrentMonth((prev) => {
            const next = new Date(prev);
            next.setMonth(prev.getMonth() + direction);
            return next;
        });
    };

    const handleOrganizationChange = async () => {
        if (organizations.length === 0) return;
        const currentIndex = organizations.findIndex((item) => item.id === organizationId);
        const next = organizations[(currentIndex + 1) % organizations.length] || organizations[0];
        setOrganizationId(next.id);
        setPreferences((prev) => ({ ...prev, organizationId: next.id }));
        await ekadashiService.setSelectedOrganizationId(next.id);
    };

    const handleSavePreferences = async () => {
        setSaving(true);
        try {
            const payload = {
                ...preferences,
                organizationId,
                city,
                country,
                timezone,
            };
            const saved = await ekadashiService.updatePushPreference(payload);
            setPreferences({
                enabled: saved.enabled,
                fastStartReminder: saved.fastStartReminder,
                paranaReminder: saved.paranaReminder,
                organizationId: saved.organizationId,
                city: saved.city,
                country: saved.country,
                timezone: saved.timezone,
                useQuietHours: saved.useQuietHours,
                quietStartHour: saved.quietStartHour,
                quietEndHour: saved.quietEndHour,
            });
            Alert.alert(t('common.success'), t('portal.ekadashiCalendar.alerts.preferencesSaved'));
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.response?.data?.error || t('portal.ekadashiCalendar.alerts.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (!canUseEkadashi) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={[styles.headerButton, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>{t('portal.ekadashiCalendar.title')}</Text>
                <Text style={[styles.lockedText, { color: colors.textSecondary }]}>{t('portal.ekadashiCalendar.onlyForDevotees')}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <View style={[styles.topBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                <TouchableOpacity style={[styles.headerButton, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.topBarText}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{t('portal.ekadashiCalendar.title')}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('portal.ekadashiCalendar.subtitle')}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.monthRow}>
                        <TouchableOpacity style={[styles.monthButton, { borderColor: colors.border }]} onPress={() => navigateMonth(-1)}>
                            <ChevronLeft size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>{monthTitle}</Text>
                        <TouchableOpacity style={[styles.monthButton, { borderColor: colors.border }]} onPress={() => navigateMonth(1)}>
                            <ChevronRight size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.organizationButton, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
                        onPress={() => {
                            handleOrganizationChange().catch(() => undefined);
                        }}
                    >
                        <Text style={[styles.organizationLabel, { color: colors.textSecondary }]}>{t('portal.ekadashiCalendar.organizationLabel')}</Text>
                        <Text style={[styles.organizationValue, { color: colors.textPrimary }]}>
                            {(organizations.find((item) => item.id === organizationId) || resolveOrganizationOption(organizationId)).name}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.weekRow}>
                        {weekDays.map((day) => (
                            <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>
                                {day}
                            </Text>
                        ))}
                    </View>

                    <View style={styles.grid}>
                        {gridDays.map((day, index) => {
                            const entry = findEkadashiDayForCell(days, currentMonth, day);
                            const isToday =
                                day != null &&
                                day === new Date().getDate() &&
                                currentMonth.getMonth() === new Date().getMonth() &&
                                currentMonth.getFullYear() === new Date().getFullYear();
                            const dayCircleStyle = isToday
                                ? { backgroundColor: colors.accent }
                                : entry?.isEkadashi
                                    ? {
                                        backgroundColor: entry.isMahadvadashi ? '#F59E0B22' : colors.accentSoft,
                                        borderWidth: 1,
                                        borderColor: entry.isMahadvadashi ? '#F59E0B' : colors.accent,
                                    }
                                    : null;
                            const dayTextStyle = {
                                color: isToday
                                    ? '#FFFFFF'
                                    : day
                                        ? colors.textPrimary
                                        : 'transparent',
                            };
                            return (
                                <TouchableOpacity
                                    key={`${day}-${index}`}
                                    style={styles.dayButton}
                                    disabled={!day}
                                    onPress={() => setSelectedDay(entry)}
                                >
                                    <View
                                        style={[
                                            styles.dayCircle,
                                            dayCircleStyle,
                                        ]}
                                    >
                                        <Text style={[styles.dayText, dayTextStyle]}>
                                            {day ?? ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {loading ? <Text style={[styles.helperText, { color: colors.textSecondary }]}>{t('common.loading')}</Text> : null}
                    {providerNoticeKey ? (
                        <View style={[styles.noticeBox, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                            <Text style={[styles.noticeText, { color: colors.textPrimary }]}>{t(providerNoticeKey)}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('portal.ekadashiCalendar.locationTitle')}</Text>
                    <TextInput
                        value={city}
                        onChangeText={setCity}
                        placeholder={t('portal.ekadashiCalendar.cityPlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                    />
                    <TextInput
                        value={country}
                        onChangeText={setCountry}
                        placeholder={t('portal.ekadashiCalendar.countryPlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                    />
                    <TextInput
                        value={timezone}
                        onChangeText={setTimezone}
                        placeholder={t('portal.ekadashiCalendar.timezonePlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                    />
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                        onPress={() => {
                            loadCalendar(organizationId, timezone, city, country).catch(() => undefined);
                        }}
                    >
                        <Text style={styles.primaryButtonText}>{t('portal.ekadashiCalendar.refreshCalendar')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('portal.ekadashiCalendar.notificationTitle')}</Text>
                    <View style={styles.switchRow}>
                        <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('portal.ekadashiCalendar.subscribe')}</Text>
                        <Switch
                            value={preferences.enabled}
                            onValueChange={(value) => setPreferences((prev) => ({ ...prev, enabled: value }))}
                            trackColor={{ true: colors.accent }}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('portal.ekadashiCalendar.fastStarts')}</Text>
                        <Switch
                            value={preferences.fastStartReminder}
                            onValueChange={(value) => setPreferences((prev) => ({ ...prev, fastStartReminder: value }))}
                            trackColor={{ true: colors.accent }}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{t('portal.ekadashiCalendar.parana')}</Text>
                        <Switch
                            value={preferences.paranaReminder}
                            onValueChange={(value) => setPreferences((prev) => ({ ...prev, paranaReminder: value }))}
                            trackColor={{ true: colors.accent }}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.accent }, saving && styles.primaryButtonDisabled]}
                        onPress={() => {
                            handleSavePreferences().catch(() => undefined);
                        }}
                        disabled={saving}
                    >
                        <Text style={styles.primaryButtonText}>{t('common.done')}</Text>
                    </TouchableOpacity>
                </View>

                {selectedDay ? (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{selectedDay.displayTitle}</Text>
                        <Text style={[styles.detailLine, { color: colors.textSecondary }]}>{selectedDay.organizationName}</Text>
                        <Text style={[styles.detailLine, { color: colors.textPrimary }]}>
                            {t('portal.ekadashiCalendar.fastStarts')}: {formatEkadashiDateTime(selectedDay.fastStartAt, locale) || t('portal.ekadashiCalendar.notAvailable')}
                        </Text>
                        <Text style={[styles.detailLine, { color: colors.textPrimary }]}>
                            {t('portal.ekadashiCalendar.parana')}: {formatEkadashiDateTime(selectedDay.paranaStartAt, locale) || t('portal.ekadashiCalendar.noParanaTime')}
                        </Text>
                        <Text style={[styles.detailLine, { color: colors.textPrimary }]}>
                            {t('portal.ekadashiCalendar.paranaWindowEnd')}: {formatEkadashiDateTime(selectedDay.paranaEndAt, locale) || t('portal.ekadashiCalendar.notAvailable')}
                        </Text>
                        <Text style={[styles.notesTitle, { color: colors.textSecondary }]}>{t('portal.ekadashiCalendar.observanceNotes')}</Text>
                        <Text style={[styles.notesText, { color: colors.textPrimary }]}>{selectedDay.observanceNotes || t('portal.ekadashiCalendar.notAvailable')}</Text>
                        {selectedDay.providerDecision?.mode === 'fallback' ? (
                            <>
                                <Text style={[styles.notesTitle, { color: colors.textSecondary }]}>{t('portal.ekadashiCalendar.dataSourceTitle')}</Text>
                                <Text style={[styles.notesText, { color: colors.textPrimary }]}>
                                    {t(getEkadashiProviderNoticeKey(selectedDay.providerDecision) || 'portal.ekadashiCalendar.providerNotices.fallbackActive')}
                                </Text>
                            </>
                        ) : null}
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        gap: 12,
    },
    topBarText: {
        flex: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
    },
    content: {
        padding: 16,
        gap: 16,
    },
    card: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
        gap: 12,
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    monthButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    organizationButton: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    organizationLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    organizationValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    weekDay: {
        width: `${100 / 7}%`,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayButton: {
        width: `${100 / 7}%`,
        alignItems: 'center',
        marginBottom: 8,
    },
    dayCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '700',
    },
    helperText: {
        fontSize: 13,
    },
    noticeBox: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    noticeText: {
        fontSize: 13,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    input: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    primaryButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    switchLabel: {
        flex: 1,
        marginRight: 12,
        fontSize: 15,
        fontWeight: '600',
    },
    detailLine: {
        fontSize: 14,
        lineHeight: 20,
    },
    notesTitle: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    notesText: {
        fontSize: 14,
        lineHeight: 20,
    },
    lockedTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    lockedText: {
        maxWidth: 280,
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 21,
    },
});

export default EkadashiCalendarScreen;
