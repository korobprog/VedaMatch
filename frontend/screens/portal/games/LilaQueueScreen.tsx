import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Clock3, ScrollText, Sparkles, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
    getCachedLilaBootstrap,
    getLilaBootstrap,
    getLilaModeConfig,
    getLilaModePlayerCount,
    getLilaSiddhis,
    isLilaActiveQueueStatus,
    joinLilaQueue,
    leaveLilaQueue,
} from '../../../services/lilaGameService';
import type { LilaBootstrap } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import {
    LILA_COLORS,
    LilaCard,
    LilaMetric,
    LilaPhaseRail,
    LilaPill,
    LilaPrimaryButton,
    LilaProgressBar,
    LilaScreenLayout,
    LilaSectionTitle,
} from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaQueue'>;

const LilaQueueScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const mode = route.params?.mode || 'duel';
    const config = getLilaModeConfig(mode);
    const siddhis = getLilaSiddhis();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(() => getCachedLilaBootstrap(i18n.language));
    const [loading, setLoading] = React.useState(!getCachedLilaBootstrap(i18n.language));
    const [error, setError] = React.useState<string | null>(null);
    const [joining, setJoining] = React.useState(false);
    const [leaving, setLeaving] = React.useState(false);

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

    const queueEntry = bootstrap?.openQueue.find((entry) => entry.mode === mode && isLilaActiveQueueStatus(entry.status)) || null;
    const liveMatch = bootstrap?.openMatches.find((match) => match.mode === mode) || null;
    const queueStatusLabel = queueEntry
        ? t(`portal.lila.queue.statuses.${queueEntry.status}`, { defaultValue: queueEntry.status })
        : null;
    const tutorialState = bootstrap?.tutorialState;
    const latestReward = bootstrap?.recentRewards[0] || null;
    const questHighlights = React.useMemo(
        () => ([...(bootstrap?.dailyQuestProgress || []).slice(0, 2), ...(bootstrap?.weeklyQuestProgress || []).slice(0, 1)]),
        [bootstrap?.dailyQuestProgress, bootstrap?.weeklyQuestProgress],
    );
    const phaseSteps = React.useMemo(() => ([
        {
            id: 'queue',
            label: t('portal.lila.phases.queue'),
            helper: queueEntry ? queueStatusLabel || undefined : t('portal.lila.queue.phaseSearching'),
            active: !liveMatch,
            done: false,
        },
        {
            id: 'lobby',
            label: t('portal.lila.phases.lobby'),
            helper: t('portal.lila.queue.phaseLobby'),
            active: Boolean(liveMatch && liveMatch.status === 'lobby'),
            done: Boolean(liveMatch),
        },
        {
            id: 'round',
            label: t('portal.lila.phases.question_open'),
            helper: t('portal.lila.queue.phaseBattle'),
            active: Boolean(liveMatch && liveMatch.status === 'active'),
            done: Boolean(liveMatch && liveMatch.status === 'finished'),
        },
        {
            id: 'results',
            label: t('portal.lila.phases.match_finished'),
            helper: t('portal.lila.queue.phaseRewards'),
            active: Boolean(liveMatch && liveMatch.status === 'finished'),
            done: Boolean(liveMatch && liveMatch.status === 'finished'),
        },
    ]), [liveMatch, queueEntry, queueStatusLabel, t]);
    const renderModeFocus = () => {
        if (mode === 'sabha') {
            return (
                <LilaCard>
                    <Text style={styles.inlineTitle}>{t('portal.lila.queue.modeFocus.sabhaTitle')}</Text>
                    <Text style={styles.inlineBody}>{t('portal.lila.queue.modeFocus.sabhaBody')}</Text>
                </LilaCard>
            );
        }
        if (mode === 'survival') {
            return (
                <LilaCard>
                    <Text style={styles.inlineTitle}>{t('portal.lila.queue.modeFocus.survivalTitle')}</Text>
                    <Text style={styles.inlineBody}>{t('portal.lila.queue.modeFocus.survivalBody')}</Text>
                </LilaCard>
            );
        }
        return (
            <LilaCard>
                <Text style={styles.inlineTitle}>{t('portal.lila.queue.modeFocus.duelTitle')}</Text>
                <Text style={styles.inlineBody}>{t('portal.lila.queue.modeFocus.duelBody')}</Text>
            </LilaCard>
        );
    };

    React.useEffect(() => {
        if (liveMatch) {
            navigation.replace(liveMatch.status === 'active' ? 'LilaMatch' : liveMatch.status === 'finished' ? 'LilaResults' : 'LilaLobby', {
                mode,
                matchCode: liveMatch.code,
            });
        }
    }, [liveMatch, mode, navigation]);

    React.useEffect(() => {
        if (!queueEntry || liveMatch) {
            return undefined;
        }
        const timer = setInterval(() => {
            loadBootstrap().catch(() => undefined);
        }, 3000);
        return () => clearInterval(timer);
    }, [loadBootstrap, liveMatch, queueEntry]);

    const handleJoin = React.useCallback(async () => {
        try {
            setJoining(true);
            setError(null);
            const response = await joinLilaQueue(mode, config.location);
            if (response.match?.code) {
                navigation.replace('LilaLobby', { mode, matchCode: response.match.code });
                return;
            }
            await loadBootstrap();
        } catch (joinError: any) {
            setError(joinError?.response?.data?.error || joinError?.message || t('common.error'));
        } finally {
            setJoining(false);
        }
    }, [config.location, loadBootstrap, mode, navigation, t]);

    const handleLeave = React.useCallback(async () => {
        try {
            setLeaving(true);
            setError(null);
            await leaveLilaQueue(mode);
            await loadBootstrap();
        } catch (leaveError: any) {
            setError(leaveError?.response?.data?.error || leaveError?.message || t('common.error'));
        } finally {
            setLeaving(false);
        }
    }, [loadBootstrap, mode, t]);

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.queue.title')}
            subtitle={t('portal.lila.queue.subtitle')}
            headerRight={<LilaPill label={t(`portal.lila.modes.${mode}.title`)} tone="gold" />}
        >
            <LilaCard>
                <View style={styles.header}>
                    <Text style={styles.title}>{t(`portal.lila.modes.${mode}.title`)}</Text>
                    <View style={styles.headerMeta}>
                        <LilaPill label={t(`portal.lila.locations.${config.location}`)} tone="night" />
                    </View>
                </View>
                <Text style={styles.body}>{t(`portal.lila.modes.${mode}.detail`)}</Text>
                <View style={styles.metrics}>
                    <LilaMetric label={t('portal.lila.queue.estWait')} value={`${config.waitSeconds}s`} />
                    <LilaMetric label={t('portal.lila.queue.rounds')} value={String(config.rounds)} />
                    <LilaMetric label={t('portal.lila.queue.players')} value={String(getLilaModePlayerCount(bootstrap, mode))} />
                    <LilaMetric label={t('portal.lila.home.streakLabel')} value={String(bootstrap?.activeStreak || 0)} />
                </View>
            </LilaCard>

            {!tutorialState?.completed ? (
                <LilaCard>
                    <View style={styles.lineItem}>
                        <Sparkles size={16} color={LILA_COLORS.saffron} />
                        <Text style={styles.inlineTitle}>{t('portal.lila.home.onboardingTitle')}</Text>
                    </View>
                    <Text style={styles.inlineBody}>{t('portal.lila.queue.firstMatchHint')}</Text>
                </LilaCard>
            ) : null}

            <LilaSectionTitle title={t('portal.lila.queue.rotationTitle')} subtitle={t('portal.lila.queue.rotationSubtitle')} />
            <LilaCard tone="night">
                {loading && !bootstrap ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.lineText}>{t('common.loading')}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.lineItem}>
                            <Clock3 size={16} color={LILA_COLORS.parchment} />
                            <Text style={styles.lineText}>{t('portal.lila.queue.estWaitLine', { amount: config.waitSeconds })}</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <Users size={16} color={LILA_COLORS.parchment} />
                            <Text style={styles.lineText}>{t('portal.lila.queue.teamLine', { amount: config.teamSize })}</Text>
                        </View>
                        <View style={styles.lineItem}>
                            <ScrollText size={16} color={LILA_COLORS.parchment} />
                            <Text style={styles.lineText}>{t('portal.lila.queue.rewardLine', { amount: config.rewardBonus })}</Text>
                        </View>
                        <View style={styles.phaseRailWrap}>
                            <LilaPhaseRail steps={phaseSteps} />
                        </View>
                    </>
                )}
            </LilaCard>

            {renderModeFocus()}

            <LilaSectionTitle title={t('portal.lila.queue.progressTitle')} subtitle={t('portal.lila.queue.progressSubtitle')} />
            <LilaCard>
                {questHighlights.length ? (
                    <View style={styles.progressWrap}>
                        {questHighlights.map((quest) => (
                            <View key={quest.code} style={styles.progressEntry}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressTitle}>{quest.title}</Text>
                                    <Text style={styles.progressMeta}>{`${quest.current}/${quest.target}`}</Text>
                                </View>
                                <LilaProgressBar progress={Math.max(0, Math.min(quest.current / Math.max(quest.target, 1), 1))} accent={LILA_COLORS.lotus} />
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.inlineBody}>{t('portal.lila.queue.progressEmpty')}</Text>
                )}
                {latestReward ? (
                    <View style={styles.rewardRow}>
                        <Sparkles size={16} color={LILA_COLORS.saffron} />
                        <Text style={styles.rewardText}>
                            {t('portal.lila.queue.latestRewardLine', {
                                reward: latestReward.title,
                                amount: latestReward.amount > 0 ? `+${latestReward.amount}` : String(latestReward.amount),
                                currency: latestReward.currency,
                            })}
                        </Text>
                    </View>
                ) : null}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.queue.loadoutTitle')} subtitle={t('portal.lila.queue.loadoutSubtitle')} />
            <LilaCard>
                <View style={styles.pillWrap}>
                    {siddhis.map((siddhi) => (
                        <LilaPill key={siddhi} label={t(`portal.lila.siddhis.${siddhi}`)} tone="surface" />
                    ))}
                </View>
            </LilaCard>

            <LilaCard tone="gold">
                <View style={styles.lineItem}>
                    <Sparkles size={16} color={LILA_COLORS.parchment} />
                    <Text style={styles.lineTextGold}>
                        {queueEntry
                            ? t('portal.lila.queue.queueState', { status: queueStatusLabel })
                            : t('portal.lila.queue.serverAuthority')}
                    </Text>
                </View>
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => { loadBootstrap().catch(() => undefined); }} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={joining || leaving ? t('common.loading') : queueEntry ? t('common.cancel') : t('portal.lila.actions.join')}
                onPress={queueEntry
                    ? () => { handleLeave().catch(() => undefined); }
                    : () => { handleJoin().catch(() => undefined); }}
                tone={queueEntry ? 'night' : 'gold'}
            />
            <LilaPrimaryButton
                label={tutorialState?.completed ? t('portal.lila.actions.pass') : t('portal.lila.actions.store')}
                tone="night"
                onPress={() => navigation.navigate(tutorialState?.completed ? 'LilaPass' : 'LilaStore')}
            />
        </LilaScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        gap: 12,
    },
    headerMeta: {
        alignItems: 'flex-start',
    },
    title: {
        color: LILA_COLORS.ink,
        fontSize: 21,
        fontWeight: '700',
    },
    body: {
        marginTop: 8,
        color: 'rgba(42,24,16,0.74)',
        fontSize: 14,
        lineHeight: 20,
    },
    metrics: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    lineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    lineText: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    lineTextGold: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },
    phaseRailWrap: {
        marginTop: 10,
    },
    pillWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    inlineTitle: {
        color: LILA_COLORS.ink,
        fontSize: 16,
        fontWeight: '700',
    },
    inlineBody: {
        marginTop: 6,
        color: 'rgba(42,24,16,0.72)',
        fontSize: 14,
        lineHeight: 20,
    },
    progressWrap: {
        gap: 12,
    },
    progressEntry: {
        gap: 6,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    progressTitle: {
        flex: 1,
        color: LILA_COLORS.ink,
        fontSize: 14,
        fontWeight: '700',
    },
    progressMeta: {
        color: 'rgba(42,24,16,0.6)',
        fontSize: 12,
        fontWeight: '700',
    },
    rewardRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rewardText: {
        flex: 1,
        color: 'rgba(42,24,16,0.72)',
        fontSize: 13,
        lineHeight: 18,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaQueueScreen;
