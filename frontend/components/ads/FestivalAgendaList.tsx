import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, MapPin, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FestivalItem } from '../../types/ads';
import { useSettings } from '../../context/SettingsContext';

interface FestivalAgendaListProps {
    items: FestivalItem[];
    loading?: boolean;
    onOpenAd?: (adId: number) => void;
}

const formatDateTime = (iso: string, locale: string, timezone?: string): string => {
    if (!iso) {
        return '';
    }
    try {
        return new Date(iso).toLocaleString(locale, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone || 'Europe/Moscow',
        });
    } catch {
        return iso;
    }
};

export const FestivalAgendaList: React.FC<FestivalAgendaListProps> = ({ items, loading = false, onOpenAd }) => {
    const { t, i18n } = useTranslation();
    const { vTheme } = useSettings();
    const colors = vTheme.colors;
    const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US';

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (items.length === 0) {
        return (
            <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('ads.festivals.emptyDay')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.listWrap}>
            {items.map((item) => {
                const canOpen = typeof item.adId === 'number' && Boolean(onOpenAd);
                const sourceLabel = item.source === 'ad' ? t('ads.festivals.sourceAd') : t('ads.festivals.sourceSadhu');

                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.card, { backgroundColor: colors.surface || '#fff' }]}
                        activeOpacity={canOpen ? 0.8 : 1}
                        onPress={() => {
                            if (canOpen && item.adId) {
                                onOpenAd?.(item.adId);
                            }
                        }}
                    >
                        <View style={styles.rowBetween}>
                            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                            <View style={[styles.badge, { borderColor: colors.primary }]}>
                                <Text style={[styles.badgeText, { color: colors.primary }]}>{sourceLabel}</Text>
                            </View>
                        </View>

                        <View style={styles.metaRow}>
                            <CalendarDays size={14} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                {formatDateTime(item.startAt, locale, item.timezone)}
                            </Text>
                        </View>

                        {item.organizerName ? (
                            <View style={styles.metaRow}>
                                <UserRound size={14} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.organizerName}</Text>
                            </View>
                        ) : null}

                        {item.venueAddress || item.city ? (
                            <View style={styles.metaRow}>
                                <MapPin size={14} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                    {[item.venueAddress, item.city].filter(Boolean).join(' • ')}
                                </Text>
                            </View>
                        ) : null}

                        {item.preachers?.length ? (
                            <Text style={[styles.preachers, { color: colors.textSecondary }]} numberOfLines={2}>
                                {t('ads.festivals.preachers')}: {item.preachers.map((p) => p.name).join(', ')}
                            </Text>
                        ) : null}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    loadingWrap: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyWrap: {
        marginHorizontal: 16,
        marginTop: 10,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    },
    listWrap: {
        paddingHorizontal: 16,
        paddingBottom: 90,
        gap: 10,
    },
    card: {
        borderRadius: 14,
        padding: 12,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    badge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    metaRow: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        flex: 1,
    },
    preachers: {
        marginTop: 8,
        fontSize: 12,
    },
});
