import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Crown, ScrollText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
    getCachedLilaBootstrap,
    getLilaBootstrap,
    purchaseLilaStoreItem,
} from '../../../services/lilaGameService';
import type { LilaBootstrap } from '../../../types/lila';
import { LILA_COLORS, LilaCard, LilaPill, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

const renderRewardEntries = (record: Record<string, unknown>): Array<{ code: string; value: string }> => (
    Object.entries(record || {}).map(([key, value]) => ({
        code: key,
        value: String(value),
    }))
);

const LilaPassScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(() => getCachedLilaBootstrap(i18n.language));
    const [loading, setLoading] = React.useState(!getCachedLilaBootstrap(i18n.language));
    const [busy, setBusy] = React.useState(false);
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

    const activeSeason = bootstrap?.activeSeason;
    const progress = bootstrap?.passProgress || null;
    const passItem = React.useMemo(
        () => bootstrap?.storeItems.find((item) => item.code === 'sadhana_pass_premium') || null,
        [bootstrap?.storeItems],
    );
    const freeRewards = activeSeason ? renderRewardEntries(activeSeason.dailyBonus) : [];
    const premiumRewards = activeSeason ? renderRewardEntries(activeSeason.premiumReward) : [];
    const displayProgress = progress
        ? Math.max(0, Math.min((progress.currentPoints || 0) / 100, 1))
        : bootstrap?.profile?.nextRankProgress || 0;
    const passUnlocked = Boolean(progress?.premiumUnlockedAt) && progress?.status !== 'expired';
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

    const handlePrimaryAction = React.useCallback(async () => {
        if (!activeSeason || busy) {
            return;
        }
        if (!passUnlocked) {
            const realPrice = passItem?.realPrice
                || activeSeason.premiumPriceReal
                || 0;
            if (realPrice <= 0) {
                setError(t('portal.lila.store.priceUnavailable'));
                return;
            }
            Alert.alert(
                t('portal.lila.store.confirmTitle'),
                t('portal.lila.pass.confirmUnlockMessage', {
                    amount: t('portal.lila.store.realPrice', { amount: realPrice }),
                }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('portal.lila.store.confirmAction'),
                        onPress: () => {
                            (async () => {
                                try {
                                    setBusy(true);
                                    setError(null);
                                    await purchaseLilaStoreItem('sadhana_pass_premium', 'real');
                                    await loadBootstrap();
                                } catch (actionError: any) {
                                    setError(actionError?.response?.data?.error || actionError?.message || t('common.error'));
                                } finally {
                                    setBusy(false);
                                }
                            })();
                        },
                    },
                ],
            );
            return;
        }
        Alert.alert(
            t('portal.lila.pass.passUnlocked'),
            t('portal.lila.pass.openUntil', { date: formatDate(progress?.expiresAt || activeSeason.endsAt) }),
        );
    }, [activeSeason, busy, formatDate, loadBootstrap, passItem?.realPrice, passUnlocked, progress?.expiresAt, t]);

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.pass.title')}
            subtitle={t('portal.lila.pass.subtitle')}
        >
            <LilaCard tone="gold">
                {loading && !activeSeason ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.seasonTitle}>{activeSeason?.name || t('portal.lila.pass.title')}</Text>
                        <Text style={styles.seasonBody}>
                            {activeSeason?.description || t('portal.lila.pass.progressCopy')}
                        </Text>
                        {activeSeason ? (
                            <Text style={styles.seasonMeta}>
                                {t('portal.lila.pass.seasonDates', {
                                    start: formatDate(activeSeason.startsAt),
                                    end: formatDate(activeSeason.endsAt),
                                })}
                            </Text>
                        ) : null}
                        <LilaProgressBar progress={displayProgress} accent={LILA_COLORS.parchment} />
                        <View style={styles.metaRow}>
                            <LilaPill
                                label={passUnlocked ? t('portal.lila.pass.passUnlocked') : t('portal.lila.pass.passLocked')}
                                tone={passUnlocked ? 'gold' : 'surface'}
                            />
                            <LilaPill label={`${t('portal.lila.home.streakLabel')}: ${bootstrap?.activeStreak || 0}`} tone="surface" />
                            {bootstrap?.subscription?.status === 'active' ? (
                                <LilaPill label="Bhakti Premium" tone="surface" />
                            ) : null}
                        </View>
                    </>
                )}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.pass.freeTrack')} subtitle={t('portal.lila.pass.freeSubtitle')} />
            <LilaCard>
                {freeRewards.map((reward) => (
                    <View key={reward.code} style={styles.rewardRow}>
                        <ScrollText size={16} color={LILA_COLORS.saffron} />
                        <Text style={styles.rewardText}>{`${reward.code}: ${reward.value}`}</Text>
                    </View>
                ))}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.pass.premiumTrack')} subtitle={t('portal.lila.pass.premiumSubtitle')} />
            <LilaCard tone="night">
                {premiumRewards.map((reward) => (
                    <View key={reward.code} style={styles.rewardRow}>
                        <Crown size={16} color={LILA_COLORS.parchment} />
                        <Text style={styles.rewardTextLight}>{`${reward.code}: ${reward.value}`}</Text>
                    </View>
                ))}
                <View style={styles.subscriptionRow}>
                    <LilaPill
                        label={passUnlocked ? t('portal.lila.pass.passUnlocked') : t('portal.lila.pass.subscriptionBadge')}
                        tone="gold"
                    />
                </View>
                <Text style={styles.subscriptionText}>
                    {passUnlocked
                        ? t('portal.lila.pass.openUntil', { date: formatDate(progress?.expiresAt || activeSeason?.endsAt) })
                        : t('portal.lila.pass.passLockedCopy')}
                </Text>
                {bootstrap?.subscription ? (
                    <Text style={styles.subscriptionText}>
                        {bootstrap.subscription.status === 'active'
                            ? t('portal.lila.pass.subscriptionSupportActive', { date: formatDate(bootstrap.subscription.endsAt) })
                            : t('portal.lila.pass.subscriptionSupportExpired', { date: formatDate(bootstrap.subscription.endsAt) })}
                    </Text>
                ) : null}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.results.progressTitle')} subtitle={t('portal.lila.results.progressSubtitle')} />
            <LilaCard>
                {(bootstrap?.dailyQuestProgress || []).slice(0, 2).map((entry) => (
                    <View key={entry.code} style={styles.rewardRow}>
                        <ScrollText size={16} color={LILA_COLORS.saffron} />
                        <View style={styles.progressEntry}>
                            <Text style={styles.rewardText}>{entry.title}</Text>
                            <LilaProgressBar progress={Math.max(0, Math.min(entry.current / Math.max(entry.target, 1), 1))} accent={LILA_COLORS.lotus} />
                        </View>
                    </View>
                ))}
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={busy
                    ? t('common.loading')
                    : passUnlocked
                        ? t('portal.lila.pass.openedAction')
                        : t('portal.lila.pass.unlockAction')}
                onPress={handlePrimaryAction}
            />
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
    seasonTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    seasonBody: {
        color: 'rgba(255,244,224,0.82)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    seasonMeta: {
        color: 'rgba(255,244,224,0.72)',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 12,
    },
    metaRow: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    rewardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    rewardText: {
        color: LILA_COLORS.ink,
        fontSize: 14,
        fontWeight: '700',
    },
    progressEntry: {
        flex: 1,
        gap: 8,
    },
    rewardTextLight: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
        fontWeight: '700',
    },
    subscriptionRow: {
        marginTop: 10,
    },
    subscriptionText: {
        marginTop: 8,
        color: 'rgba(255,244,224,0.78)',
        fontSize: 13,
        lineHeight: 19,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
    },
});

export default LilaPassScreen;
