import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Flame, Sparkles, Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import {
    getCachedLilaBootstrap,
    getLilaBootstrap,
    getLilaMatch,
    getLilaModeConfig,
    primeLilaBootstrap,
} from '../../../services/lilaGameService';
import type { LilaBootstrap, LilaMatchSnapshot } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaMetric, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaResults'>;

const LilaResultsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { mode, matchCode } = route.params;
    const [snapshot, setSnapshot] = React.useState<LilaMatchSnapshot | null>(null);
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(() => getCachedLilaBootstrap(i18n.language));
    const [loading, setLoading] = React.useState(!getCachedLilaBootstrap(i18n.language));
    const [error, setError] = React.useState<string | null>(null);
    const currentUserId = user?.ID || 0;

    const loadData = React.useCallback(async () => {
        if (!matchCode) {
            setError(t('common.error'));
            setLoading(false);
            return;
        }
        try {
            setError(null);
            const [nextMatch, nextBootstrap] = await Promise.all([
                getLilaMatch(matchCode, i18n.language),
                getLilaBootstrap(i18n.language, { force: true }),
            ]);
            setSnapshot(nextMatch);
            setBootstrap(nextBootstrap);
            primeLilaBootstrap(i18n.language, nextBootstrap);
        } catch (loadError: any) {
            setError(loadError?.response?.data?.error || loadError?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [i18n.language, matchCode, t]);

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            loadData().catch(() => undefined);
        }, [loadData]),
    );

    const scoreboard = React.useMemo(() => snapshot?.scoreboard || [], [snapshot?.scoreboard]);
    const winnerUserId = snapshot?.match.winnerUserId || scoreboard[0]?.userId || 0;
    const winnerLabel = winnerUserId === currentUserId
        ? t('common.me')
        : t('contacts.userFallback', { id: winnerUserId });
    const myEntry = scoreboard.find((entry) => entry.userId === currentUserId) || scoreboard[0];
    const bonusEarned = winnerUserId === currentUserId ? getLilaModeConfig(mode).rewardBonus : 0;
    const latestReward = bootstrap?.recentRewards[0] || null;
    const survivalStanding = [...scoreboard].sort((left, right) => right.score - left.score).findIndex((entry) => entry.userId === currentUserId) + 1;
    const sabhaTeams = React.useMemo(() => {
        const grouped = new Map<string, { label: string; score: number; members: number }>();
        scoreboard.forEach((entry) => {
            const key = entry.teamKey || t('portal.lila.match.teamFallback');
            const current = grouped.get(key) || { label: key, score: 0, members: 0 };
            current.score += entry.score || 0;
            current.members += 1;
            grouped.set(key, current);
        });
        return Array.from(grouped.values()).sort((left, right) => right.score - left.score);
    }, [scoreboard, t]);
    const myTeam = sabhaTeams.find((team) => team.label === (myEntry?.teamKey || t('portal.lila.match.teamFallback'))) || sabhaTeams[0];
    const renderModeResult = () => {
        if (mode === 'sabha') {
            return (
                <LilaCard>
                    <View style={styles.progressHeader}>
                        <Trophy size={18} color={LILA_COLORS.saffron} />
                        <Text style={styles.progressTitle}>{t('portal.lila.results.modeSummary.sabhaTitle')}</Text>
                    </View>
                    <Text style={styles.modeBody}>
                        {t('portal.lila.results.modeSummary.sabhaBody', {
                            team: myTeam?.label || t('portal.lila.match.teamFallback'),
                            score: myTeam?.score || 0,
                        })}
                    </Text>
                </LilaCard>
            );
        }
        if (mode === 'survival') {
            return (
                <LilaCard>
                    <View style={styles.progressHeader}>
                        <Trophy size={18} color={LILA_COLORS.saffron} />
                        <Text style={styles.progressTitle}>{t('portal.lila.results.modeSummary.survivalTitle')}</Text>
                    </View>
                    <Text style={styles.modeBody}>
                        {t('portal.lila.results.modeSummary.survivalBody', {
                            place: survivalStanding || scoreboard.length || 1,
                            total: scoreboard.length || 1,
                        })}
                    </Text>
                </LilaCard>
            );
        }
        return (
            <LilaCard>
                <View style={styles.progressHeader}>
                    <Trophy size={18} color={LILA_COLORS.saffron} />
                    <Text style={styles.progressTitle}>{t('portal.lila.results.modeSummary.duelTitle')}</Text>
                </View>
                <Text style={styles.modeBody}>
                    {t('portal.lila.results.modeSummary.duelBody', {
                        delta: Math.max(0, (scoreboard[0]?.score || 0) - (scoreboard[1]?.score || 0)),
                    })}
                </Text>
            </LilaCard>
        );
    };

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.results.title')}
            subtitle={t('portal.lila.results.subtitle')}
        >
            <LilaCard tone="gold">
                {loading && !snapshot ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.winnerHeader}>
                            <Sparkles size={18} color={LILA_COLORS.parchment} />
                            <Text style={styles.winnerText}>{t('portal.lila.results.winner', { winner: winnerLabel })}</Text>
                        </View>
                        <View style={styles.metricRow}>
                            <LilaMetric label={t('portal.lila.results.karmaDelta')} value={String(myEntry?.score ?? 0)} tone="light" />
                            <LilaMetric label={t('portal.lila.results.punnyaEarned')} value={`+${Math.max(0, myEntry?.score ?? 0)}`} tone="light" />
                            <LilaMetric label={t('portal.lila.results.bonusEarned')} value={`+${bonusEarned}`} tone="light" />
                            <LilaMetric label={t('portal.lila.home.streakLabel')} value={String(bootstrap?.activeStreak || 0)} tone="light" />
                        </View>
                    </>
                )}
            </LilaCard>

            <LilaCard>
                <View style={styles.progressHeader}>
                    <Trophy size={18} color={LILA_COLORS.saffron} />
                    <Text style={styles.progressTitle}>{t('portal.lila.results.rankProgress')}</Text>
                </View>
                <LilaProgressBar progress={bootstrap?.profile?.nextRankProgress || 0} accent={LILA_COLORS.lotus} />
            </LilaCard>

            {renderModeResult()}

            {latestReward ? (
                <LilaCard>
                    <View style={styles.progressHeader}>
                        <Flame size={18} color={LILA_COLORS.saffron} />
                        <Text style={styles.progressTitle}>{t('portal.lila.results.recentRewardTitle')}</Text>
                    </View>
                    <Text style={styles.rewardTitle}>{latestReward.title}</Text>
                    <Text style={styles.rewardMeta}>
                        {latestReward.amount > 0 ? `+${latestReward.amount}` : latestReward.amount} {latestReward.currency}
                    </Text>
                </LilaCard>
            ) : null}

            <LilaSectionTitle title={t('portal.lila.results.progressTitle')} subtitle={t('portal.lila.results.progressSubtitle')} />
            <LilaCard tone="night">
                {(bootstrap?.dailyQuestProgress || []).slice(0, 2).map((entry) => (
                    <View key={entry.code} style={styles.progressRow}>
                        <Text style={styles.progressLabelLight}>{entry.title}</Text>
                        <LilaProgressBar progress={Math.max(0, Math.min(entry.current / Math.max(entry.target, 1), 1))} accent={LILA_COLORS.lotus} />
                    </View>
                ))}
                {(bootstrap?.weeklyQuestProgress || []).slice(0, 1).map((entry) => (
                    <View key={entry.code} style={styles.progressRow}>
                        <Text style={styles.progressLabelLight}>{entry.title}</Text>
                        <LilaProgressBar progress={Math.max(0, Math.min(entry.current / Math.max(entry.target, 1), 1))} accent={LILA_COLORS.emerald} />
                    </View>
                ))}
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => { loadData().catch(() => undefined); }} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton label={t('portal.lila.actions.replay')} onPress={() => navigation.replace('LilaQueue', { mode: bootstrap?.recommendedMode || mode })} />
            <LilaPrimaryButton label={t('portal.lila.actions.backHome')} tone="night" onPress={() => navigation.navigate('LilaBattleOfSagesHome')} />
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
    winnerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    winnerText: {
        color: LILA_COLORS.parchment,
        fontSize: 22,
        fontWeight: '700',
        flex: 1,
    },
    metricRow: {
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    progressHeader: {
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressTitle: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        fontWeight: '700',
    },
    rewardTitle: {
        color: LILA_COLORS.ink,
        fontSize: 16,
        fontWeight: '700',
    },
    rewardMeta: {
        marginTop: 6,
        color: LILA_COLORS.saffron,
        fontSize: 14,
        fontWeight: '700',
    },
    modeBody: {
        color: 'rgba(42,24,16,0.74)',
        fontSize: 14,
        lineHeight: 20,
    },
    progressRow: {
        marginBottom: 12,
        gap: 8,
    },
    progressLabelLight: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaResultsScreen;
