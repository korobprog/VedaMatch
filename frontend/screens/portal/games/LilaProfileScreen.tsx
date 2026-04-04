import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Crown, HeartHandshake, ScrollText, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getCachedLilaBootstrap, getLilaBootstrap } from '../../../services/lilaGameService';
import type { LilaBootstrap } from '../../../types/lila';
import { LILA_COLORS, LilaCard, LilaPill, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

const LilaProfileScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(() => getCachedLilaBootstrap(i18n.language));
    const [loading, setLoading] = React.useState(!getCachedLilaBootstrap(i18n.language));
    const [error, setError] = React.useState<string | null>(null);

    const loadBootstrap = React.useCallback(async () => {
        try {
            setError(null);
            const next = await getLilaBootstrap(i18n.language, { force: true });
            setBootstrap(next);
        } catch (loadError: any) {
            setError(loadError?.response?.data?.error || loadError?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [i18n.language, t]);

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            loadBootstrap().catch(() => undefined);
        }, [loadBootstrap]),
    );

    const profile = bootstrap?.profile;
    const passProgress = bootstrap?.passProgress;
    const formatDate = React.useCallback((value?: string | null) => {
        if (!value) {
            return '—';
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }
        return parsed.toLocaleDateString(i18n.language || 'ru');
    }, [i18n.language]);

    const getStateLabel = React.useCallback((state?: string) => {
        switch (state) {
        case 'equipped':
            return t('portal.lila.states.equipped');
        case 'active':
            return t('portal.lila.states.active');
        case 'stored':
            return t('portal.lila.states.stored');
        case 'expired':
            return t('portal.lila.states.expired');
        case 'sent':
            return t('portal.lila.states.sent');
        default:
            return t('portal.lila.states.owned');
        }
    }, [t]);

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.profile.title')}
            subtitle={t('portal.lila.profile.subtitle')}
        >
            <LilaCard tone="gold">
                {loading && !profile ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : profile ? (
                    <>
                        <View style={styles.header}>
                            <Crown size={18} color={LILA_COLORS.parchment} />
                            <Text style={styles.rankTitle}>{profile.title || t(`portal.lila.ranks.${profile.rank}`)}</Text>
                        </View>
                        <Text style={styles.rankBody}>{t('portal.lila.profile.rankStory')}</Text>
                        <View style={styles.statWrap}>
                            <LilaPill label={`LVL ${profile.level}`} tone="surface" />
                            <LilaPill label={`XP ${profile.experience}`} tone="surface" />
                            <LilaPill label={`W ${profile.winCount}`} tone="surface" />
                            <LilaPill label={`L ${profile.loseCount}`} tone="surface" />
                        </View>
                        <Text style={styles.progressLabel}>{t('portal.lila.results.rankProgress')}</Text>
                        <LilaProgressBar progress={profile.nextRankProgress} accent={LILA_COLORS.parchment} />
                    </>
                ) : (
                    <Text style={styles.rankBody}>{t('common.error')}</Text>
                )}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.mentorTitle')} subtitle={t('portal.lila.profile.mentorSubtitle')} />
            <LilaCard>
                <View style={styles.header}>
                    <HeartHandshake size={18} color={LILA_COLORS.saffron} />
                    <Text style={styles.sectionTitle}>
                        {bootstrap?.subscription?.status === 'active' ? 'Bhakti Premium' : t('portal.lila.profile.guildTitle')}
                    </Text>
                </View>
                <Text style={styles.sectionBody}>
                    {bootstrap?.subscription?.status === 'active'
                        ? t('portal.lila.profile.subscriptionActiveUntil', { date: formatDate(bootstrap.subscription.endsAt) })
                        : passProgress?.premiumUnlockedAt
                            ? t('portal.lila.profile.passActiveUntil', { date: formatDate(passProgress.expiresAt || bootstrap?.activeSeason?.endsAt) })
                            : t('portal.lila.profile.guruBody')}
                </Text>
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.questsTitle')} subtitle={t('portal.lila.profile.questsSubtitle')} />
            <LilaCard tone="night">
                {[...(bootstrap?.dailyQuestProgress || []), ...(bootstrap?.weeklyQuestProgress || [])].map((quest) => (
                    <View key={quest.code} style={styles.questRow}>
                        <View style={styles.header}>
                            <ScrollText size={16} color={LILA_COLORS.parchment} />
                            <Text style={styles.questTitle}>{quest.title}</Text>
                        </View>
                        <Text style={styles.questDescription}>
                            {quest.isDaily ? t('portal.lila.home.dailySubtitle') : t('portal.lila.results.progressSubtitle')}
                        </Text>
                        <LilaProgressBar progress={Math.max(0, Math.min(quest.current / Math.max(quest.target, 1), 1))} accent={LILA_COLORS.lotus} />
                    </View>
                ))}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.results.recentRewardTitle')} subtitle={t('portal.lila.results.progressSubtitle')} />
            <LilaCard>
                {(bootstrap?.recentRewards || []).length ? (
                    (bootstrap?.recentRewards || []).slice(0, 4).map((reward) => (
                        <View key={`${reward.kind}-${reward.awardedAt}`} style={styles.timelineRow}>
                            <Text style={styles.timelineTitle}>{reward.title}</Text>
                            <Text style={styles.timelineMeta}>{`${reward.amount > 0 ? '+' : ''}${reward.amount} ${reward.currency}`}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.sectionBody}>{t('portal.lila.profile.purchasesEmpty')}</Text>
                )}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.inventoryTitle')} subtitle={t('portal.lila.profile.inventorySubtitle')} />
            <LilaCard>
                {(bootstrap?.ownedItems || []).length ? (
                    <View style={styles.inventoryList}>
                        {(bootstrap?.ownedItems || []).map((item) => (
                            <View key={`${item.code}-${item.source}`} style={styles.timelineRow}>
                                <Text style={styles.timelineTitle}>{item.name}</Text>
                                <Text style={styles.timelineMeta}>
                                    {`${getStateLabel(item.state)} · ${item.expiresAt ? formatDate(item.expiresAt) : formatDate(item.ownedAt)}`}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.sectionBody}>{t('portal.lila.profile.inventoryEmpty')}</Text>
                )}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.purchasesTitle')} subtitle={t('portal.lila.profile.purchasesSubtitle')} />
            <LilaCard tone="night">
                {(bootstrap?.purchaseHistory || []).length ? (
                    (bootstrap?.purchaseHistory || []).slice(0, 4).map((entry) => (
                        <View key={entry.purchaseId} style={styles.timelineRow}>
                            <Text style={styles.timelineTitleLight}>{entry.itemName}</Text>
                            <Text style={styles.timelineMetaLight}>
                                {`${getStateLabel(entry.state)} · ${formatDate(entry.expiresAt || entry.fulfilledAt || entry.purchasedAt)}`}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.questDescription}>{t('portal.lila.profile.purchasesEmpty')}</Text>
                )}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.giftsTitle')} subtitle={t('portal.lila.profile.giftsSubtitle')} />
            <LilaCard>
                {(bootstrap?.giftHistory || []).length ? (
                    (bootstrap?.giftHistory || []).slice(0, 4).map((gift) => (
                        <View key={gift.giftId} style={styles.timelineRow}>
                            <Text style={styles.timelineTitle}>{gift.itemName}</Text>
                            <Text style={styles.timelineMeta}>
                                {`${getStateLabel(gift.status)} · ${formatDate(gift.deliveredAt || gift.sentAt)}`}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.sectionBody}>{t('portal.lila.profile.giftsEmpty')}</Text>
                )}
            </LilaCard>

            <LilaCard tone="gold">
                <View style={styles.header}>
                    <Sparkles size={18} color={LILA_COLORS.parchment} />
                    <Text style={styles.rankTitle}>{t('portal.lila.profile.guildTitle')}</Text>
                </View>
                <Text style={styles.rankBody}>{t('portal.lila.profile.guildBody')}</Text>
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                </LilaCard>
            ) : null}
        </LilaScreenLayout>
    );
};

const styles = StyleSheet.create({
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rankTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 20,
        fontWeight: '700',
    },
    rankBody: {
        marginTop: 8,
        color: 'rgba(255,244,224,0.82)',
        fontSize: 14,
        lineHeight: 20,
    },
    statWrap: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    progressLabel: {
        marginTop: 14,
        marginBottom: 8,
        color: 'rgba(255,244,224,0.82)',
        fontSize: 12,
        fontWeight: '700',
    },
    sectionTitle: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        fontWeight: '700',
    },
    sectionBody: {
        marginTop: 8,
        color: 'rgba(42,24,16,0.72)',
        fontSize: 14,
        lineHeight: 20,
    },
    questRow: {
        gap: 10,
        marginBottom: 12,
    },
    questTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 15,
        fontWeight: '700',
    },
    questDescription: {
        color: 'rgba(255,244,224,0.78)',
        fontSize: 13,
        lineHeight: 18,
    },
    pillWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    inventoryList: {
        gap: 10,
    },
    timelineRow: {
        gap: 4,
        paddingVertical: 6,
    },
    timelineTitle: {
        color: LILA_COLORS.ink,
        fontSize: 14,
        fontWeight: '700',
    },
    timelineTitleLight: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
        fontWeight: '700',
    },
    timelineMeta: {
        color: 'rgba(42,24,16,0.64)',
        fontSize: 12,
        lineHeight: 18,
    },
    timelineMetaLight: {
        color: 'rgba(255,244,224,0.74)',
        fontSize: 12,
        lineHeight: 18,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
    },
});

export default LilaProfileScreen;
