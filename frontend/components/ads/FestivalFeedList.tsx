import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, MapPin, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FestivalItem } from '../../types/ads';
import { useSettings } from '../../context/SettingsContext';

interface FestivalFeedListProps {
    items: FestivalItem[];
    loading: boolean;
    refreshing: boolean;
    hasMore: boolean;
    hasActiveFilters: boolean;
    onRefresh: () => void;
    onEndReached: () => void;
    onOpenDetails: (item: FestivalItem) => void;
    onOpenMap: (item: FestivalItem) => void;
    onResetFilters: () => void;
}

const formatDateTime = (iso: string, timezone?: string): string => {
    if (!iso) {
        return '';
    }
    try {
        return new Date(iso).toLocaleString('ru-RU', {
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

const isOngoing = (item: FestivalItem): boolean => {
    if (!item.startAt) {
        return false;
    }
    const now = Date.now();
    const startAt = Date.parse(item.startAt);
    if (!Number.isFinite(startAt) || startAt > now) {
        return false;
    }
    if (!item.endAt) {
        return true;
    }
    const endAt = Date.parse(item.endAt);
    if (!Number.isFinite(endAt)) {
        return true;
    }
    return endAt >= now;
};

const truncatePreachers = (names: string[]): string => {
    if (names.length <= 2) {
        return names.join(', ');
    }
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
};

export const FestivalFeedList: React.FC<FestivalFeedListProps> = ({
    items,
    loading,
    refreshing,
    hasMore,
    hasActiveFilters,
    onRefresh,
    onEndReached,
    onOpenDetails,
    onOpenMap,
    onResetFilters,
}) => {
    const { t } = useTranslation();
    const { vTheme } = useSettings();
    const colors = vTheme.colors;

    return (
        <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
                if (!loading && hasMore) {
                    onEndReached();
                }
            }}
            renderItem={({ item }) => {
                const sourceLabel = item.source === 'ad' ? t('ads.festivals.sourceAd') : t('ads.festivals.sourceSadhu');
                const ongoing = isOngoing(item);
                const locationLabel = [item.venueAddress || item.venueName, item.city].filter(Boolean).join(' • ');
                const preacherNames = (item.preachers || []).map((p) => p.name).filter(Boolean);
                const mapAvailable = Boolean(
                    (typeof item.venueLat === 'number' && typeof item.venueLng === 'number')
                    || (item.venueAddress && item.venueAddress.trim().length > 0)
                    || (item.city && item.city.trim().length > 0)
                );

                return (
                    <View style={[styles.card, { backgroundColor: colors.surface || '#fff' }]}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                            <View style={[styles.sourceBadge, { borderColor: colors.primary }]}>
                                <Text style={[styles.sourceBadgeText, { color: colors.primary }]}>{sourceLabel}</Text>
                            </View>
                        </View>

                        <View style={styles.metaRow}>
                            <CalendarDays size={14} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                {ongoing ? t('ads.festivals.ongoing') : formatDateTime(item.startAt, item.timezone)}
                            </Text>
                        </View>

                        {locationLabel ? (
                            <View style={styles.metaRow}>
                                <MapPin size={14} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={2}>
                                    {locationLabel}
                                </Text>
                            </View>
                        ) : null}

                        {preacherNames.length > 0 ? (
                            <View style={styles.metaRow}>
                                <UserRound size={14} color={colors.textSecondary} />
                                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {t('ads.festivals.preachers')}: {truncatePreachers(preacherNames)}
                                </Text>
                            </View>
                        ) : null}

                        <View style={styles.ctaRow}>
                            <TouchableOpacity
                                style={[styles.ctaButton, { borderColor: colors.primary }]}
                                onPress={() => onOpenDetails(item)}
                            >
                                <Text style={[styles.ctaText, { color: colors.primary }]}>{t('common.details')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.ctaButton,
                                    { borderColor: mapAvailable ? colors.primary : colors.textSecondary + '66' },
                                ]}
                                onPress={() => {
                                    if (mapAvailable) {
                                        onOpenMap(item);
                                    }
                                }}
                                disabled={!mapAvailable}
                            >
                                <Text style={[styles.ctaText, { color: mapAvailable ? colors.primary : colors.textSecondary }]}>
                                    {t('ads.festivals.openMap')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            }}
            ListEmptyComponent={
                loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : (
                    <View style={styles.emptyWrap}>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('ads.festivals.emptyFeed')}</Text>
                        {hasActiveFilters ? (
                            <TouchableOpacity onPress={onResetFilters}>
                                <Text style={[styles.resetText, { color: colors.primary }]}>{t('ads.festivals.resetFilters')}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )
            }
            ListFooterComponent={
                loading && items.length > 0 ? (
                    <View style={styles.footerLoader}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : null
            }
        />
    );
};

const styles = StyleSheet.create({
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 90,
        gap: 10,
    },
    loadingWrap: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyWrap: {
        alignItems: 'center',
        marginTop: 40,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    resetText: {
        fontSize: 14,
        fontWeight: '700',
    },
    card: {
        borderRadius: 14,
        padding: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
    },
    sourceBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    sourceBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    metaRow: {
        marginTop: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        flex: 1,
        fontSize: 13,
    },
    ctaRow: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 8,
    },
    ctaButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: 'center',
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '700',
    },
    footerLoader: {
        paddingVertical: 14,
        alignItems: 'center',
    },
});
