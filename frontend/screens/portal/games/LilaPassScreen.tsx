import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Crown, ScrollText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
    activateLilaSubscription,
    claimLilaPassReward,
    getLilaBootstrap,
} from '../../../services/lilaGameService';
import type { LilaBootstrap, LilaPassProgress } from '../../../types/lila';
import { LILA_COLORS, LilaCard, LilaPill, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

const renderRewardEntries = (record: Record<string, unknown>): Array<{ code: string; value: string }> => (
    Object.entries(record || {}).map(([key, value]) => ({
        code: key,
        value: String(value),
    }))
);

const LilaPassScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(null);
    const [progress, setProgress] = React.useState<LilaPassProgress | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const loadBootstrap = React.useCallback(async () => {
        try {
            setError(null);
            const next = await getLilaBootstrap(i18n.language);
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
            void loadBootstrap();
        }, [loadBootstrap]),
    );

    const activeSeason = bootstrap?.activeSeason;
    const freeRewards = activeSeason ? renderRewardEntries(activeSeason.dailyBonus) : [];
    const premiumRewards = activeSeason ? renderRewardEntries(activeSeason.premiumReward) : [];
    const displayProgress = progress
        ? Math.max(0, Math.min((progress.currentPoints || 0) / 100, 1))
        : bootstrap?.profile?.nextRankProgress || 0;

    const handlePrimaryAction = React.useCallback(async () => {
        if (!activeSeason || busy) {
            return;
        }
        try {
            setBusy(true);
            setError(null);
            if (bootstrap?.subscription?.status === 'active') {
                const nextProgress = await claimLilaPassReward(activeSeason.code, 10, true);
                setProgress(nextProgress);
            } else {
                await activateLilaSubscription('bhakti_premium_monthly');
                await loadBootstrap();
            }
        } catch (actionError: any) {
            setError(actionError?.response?.data?.error || actionError?.message || t('common.error'));
        } finally {
            setBusy(false);
        }
    }, [activeSeason, bootstrap?.subscription?.status, busy, loadBootstrap, t]);

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
                        <LilaProgressBar progress={displayProgress} accent={LILA_COLORS.parchment} />
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
                        label={bootstrap?.subscription?.status === 'active'
                            ? 'Bhakti Premium'
                            : t('portal.lila.pass.subscriptionBadge')}
                        tone="gold"
                    />
                </View>
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={busy
                    ? t('common.loading')
                    : bootstrap?.subscription?.status === 'active'
                        ? t('portal.lila.pass.claimAction')
                        : t('portal.lila.pass.subscribeAction')}
                onPress={() => void handlePrimaryAction()}
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
    rewardTextLight: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
        fontWeight: '700',
    },
    subscriptionRow: {
        marginTop: 10,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
    },
});

export default LilaPassScreen;
