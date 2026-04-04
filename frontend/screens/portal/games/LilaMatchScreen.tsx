import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, Sparkles, TimerReset, Wifi, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import { useLilaMatchSession } from '../../../hooks/useLilaMatchSession';
import {
    getLilaMatch,
    getLilaSiddhis,
    submitLilaAnswer,
    useLilaSiddhi as activateLilaSiddhi,
} from '../../../services/lilaGameService';
import type { LilaQuestionView, LilaRealtimeConnectionState } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import {
    LILA_COLORS,
    LilaCard,
    LilaMetric,
    LilaPill,
    LilaPrimaryButton,
    LilaProgressBar,
    LilaScreenLayout,
    LilaSectionTitle,
} from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaMatch'>;

const PHASE_TICK_MS = 250;

const getConnectionMeta = (state: LilaRealtimeConnectionState, t: (key: string, options?: any) => string) => {
    switch (state) {
    case 'live':
        return { label: t('portal.lila.realtime.live'), icon: Wifi };
    case 'reconnecting':
    case 'connecting':
        return { label: t('portal.lila.realtime.reconnecting'), icon: WifiOff };
    case 'fallback_polling':
        return { label: t('portal.lila.realtime.fallbackPolling'), icon: WifiOff };
    default:
        return { label: t('portal.lila.realtime.connecting'), icon: WifiOff };
    }
};

const getAnswerPreview = (question: LilaQuestionView | null, selectedAnswer: string | null, selectedOrdering: string[]): string => {
    if (!question) {
        return '';
    }
    if (question.type === 'ordering') {
        return selectedOrdering.join(' -> ');
    }
    return selectedAnswer || '';
};

const LilaMatchScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { mode, matchCode } = route.params;
    const { snapshot, connectionState, recoverSnapshot, setInitialSnapshot } = useLilaMatchSession(matchCode, i18n.language);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
    const [selectedOrdering, setSelectedOrdering] = React.useState<string[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [activeSiddhi, setActiveSiddhi] = React.useState<string | null>(null);
    const [now, setNow] = React.useState(Date.now());
    const siddhis = getLilaSiddhis();
    const currentUserId = user?.ID || 0;

    const loadSnapshot = React.useCallback(async () => {
        if (!matchCode) {
            setError(t('common.error'));
            setLoading(false);
            return;
        }
        try {
            setError(null);
            const next = await getLilaMatch(matchCode, i18n.language);
            setInitialSnapshot(next);
        } catch (loadError: any) {
            setError(loadError?.response?.data?.error || loadError?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [i18n.language, matchCode, setInitialSnapshot, t]);

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            loadSnapshot().catch(() => undefined);
        }, [loadSnapshot]),
    );

    React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), PHASE_TICK_MS);
        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        if (connectionState !== 'fallback_polling' || !matchCode) {
            return undefined;
        }
        const timer = setInterval(() => {
            recoverSnapshot().catch(() => undefined);
        }, 2500);
        return () => clearInterval(timer);
    }, [connectionState, matchCode, recoverSnapshot]);

    React.useEffect(() => {
        if (snapshot?.match.status === 'finished') {
            navigation.replace('LilaResults', { mode, matchCode });
        }
    }, [matchCode, mode, navigation, snapshot?.match.status]);

    React.useEffect(() => {
        setSelectedAnswer(null);
        setSelectedOrdering([]);
    }, [snapshot?.currentRound?.id]);

    const currentSnapshot = snapshot;
    const currentQuestion = currentSnapshot?.currentQuestion || null;
    const currentRound = currentSnapshot?.currentRound || null;
    const alreadyAnswered = Boolean(currentUserId && currentSnapshot?.answeredUserIds.includes(currentUserId));

    const phaseTarget = currentSnapshot?.nextPhaseAt
        || (currentSnapshot?.phase === 'round_intro' ? currentRound?.introEndsAt : undefined)
        || ((currentSnapshot?.phase === 'question_open' || currentSnapshot?.phase === 'answer_locked') ? currentRound?.endsAt : undefined)
        || (currentSnapshot?.phase === 'round_resolved' ? currentRound?.revealEndsAt : undefined)
        || undefined;
    const remainingSeconds = phaseTarget
        ? Math.max(0, Math.ceil((new Date(phaseTarget).getTime() - now) / 1000))
        : 0;

    const scoreboard = React.useMemo(() => currentSnapshot?.scoreboard || [], [currentSnapshot?.scoreboard]);
    const myEntry = scoreboard.find((entry) => entry.userId === currentUserId) || scoreboard[0];
    const rivalEntries = scoreboard.filter((entry) => entry.userId !== currentUserId);
    const connectionMeta = getConnectionMeta(connectionState, t);
    const ConnectionIcon = connectionMeta.icon;
    const answerPreview = getAnswerPreview(currentQuestion, selectedAnswer, selectedOrdering);
    const topScores = [...scoreboard].sort((left, right) => right.score - left.score);
    const leadDelta = topScores.length >= 2 ? Math.max(0, topScores[0].score - topScores[1].score) : Math.max(0, topScores[0]?.score || 0);
    const survivalAliveCount = scoreboard.filter((entry) => !entry.isEliminated).length;
    const survivalEliminatedCount = scoreboard.filter((entry) => entry.isEliminated).length;
    const sabhaTeams = React.useMemo(() => {
        const grouped = new Map<string, { label: string; score: number; ready: number; active: number; members: number }>();
        scoreboard.forEach((entry) => {
            const key = entry.teamKey || t('portal.lila.match.teamFallback');
            const current = grouped.get(key) || {
                label: key,
                score: 0,
                ready: 0,
                active: 0,
                members: 0,
            };
            current.score += entry.score || 0;
            current.ready += entry.isReady ? 1 : 0;
            current.active += entry.isEliminated ? 0 : 1;
            current.members += 1;
            grouped.set(key, current);
        });
        return Array.from(grouped.values()).sort((left, right) => right.score - left.score);
    }, [scoreboard, t]);

    const renderModeSummary = () => {
        if (mode === 'sabha') {
            return (
                <LilaCard>
                    <Text style={styles.insightTitle}>{t('portal.lila.match.modeFocus.sabhaTitle')}</Text>
                    <Text style={styles.modeSummaryBody}>{t('portal.lila.match.modeFocus.sabhaBody')}</Text>
                    <View style={styles.teamSummaryList}>
                        {sabhaTeams.map((team) => (
                            <View key={team.label} style={styles.teamSummaryCard}>
                                <Text style={styles.teamSummaryTitle}>{team.label}</Text>
                                <View style={styles.metricRowCompact}>
                                    <LilaMetric label={t('portal.lila.match.teamScore')} value={String(team.score)} />
                                    <LilaMetric label={t('portal.lila.match.teamReady')} value={`${team.ready}/${team.members}`} />
                                    <LilaMetric label={t('portal.lila.match.teamAlive')} value={`${team.active}/${team.members}`} />
                                </View>
                            </View>
                        ))}
                    </View>
                </LilaCard>
            );
        }

        if (mode === 'survival') {
            return (
                <LilaCard>
                    <Text style={styles.insightTitle}>{t('portal.lila.match.modeFocus.survivalTitle')}</Text>
                    <Text style={styles.modeSummaryBody}>{t('portal.lila.match.modeFocus.survivalBody')}</Text>
                    <View style={styles.metricRowCompact}>
                        <LilaMetric label={t('portal.lila.match.teamAlive')} value={String(survivalAliveCount)} />
                        <LilaMetric label={t('portal.lila.match.eliminationCount')} value={String(survivalEliminatedCount)} />
                        <LilaMetric label={t('portal.lila.match.pressureLevel')} value={`W${currentRound?.number || 0}`} />
                    </View>
                </LilaCard>
            );
        }

        return (
            <LilaCard>
                <Text style={styles.insightTitle}>{t('portal.lila.match.modeFocus.duelTitle')}</Text>
                <Text style={styles.modeSummaryBody}>{t('portal.lila.match.modeFocus.duelBody')}</Text>
                <View style={styles.metricRowCompact}>
                    <LilaMetric label={t('portal.lila.match.leadDelta')} value={String(leadDelta)} />
                    <LilaMetric label={t('portal.lila.match.teamAlive')} value={`${scoreboard.filter((entry) => !entry.isEliminated).length}/${scoreboard.length || 1}`} />
                </View>
            </LilaCard>
        );
    };

    const handleOrderingToggle = React.useCallback((value: string) => {
        setSelectedOrdering((current) => (
            current.includes(value)
                ? current.filter((entry) => entry !== value)
                : [...current, value]
        ));
    }, []);

    const handleSubmit = React.useCallback(async () => {
        if (!matchCode || !currentRound?.number || submitting || alreadyAnswered || !currentQuestion) {
            return;
        }
        const isOrdering = currentQuestion.type === 'ordering';
        const orderingReady = selectedOrdering.length === currentQuestion.options.length;
        const canSubmit = isOrdering ? orderingReady : Boolean(selectedAnswer);
        if (!canSubmit) {
            return;
        }

        try {
            setSubmitting(true);
            await submitLilaAnswer(
                matchCode,
                currentRound.number,
                isOrdering
                    ? { ordering: selectedOrdering }
                    : { selectedOption: selectedAnswer || '' },
            );
        } catch (submitError: any) {
            setError(submitError?.response?.data?.error || submitError?.message || t('common.error'));
        } finally {
            setSubmitting(false);
        }
    }, [
        alreadyAnswered,
        currentQuestion,
        currentRound?.number,
        matchCode,
        selectedAnswer,
        selectedOrdering,
        submitting,
        t,
    ]);

    const handleSiddhi = React.useCallback(async (type: typeof siddhis[number]) => {
        if (!matchCode || !currentRound?.number || activeSiddhi || currentSnapshot?.phase === 'round_resolved') {
            return;
        }
        try {
            setActiveSiddhi(type);
            await activateLilaSiddhi(matchCode, currentRound.number, type);
        } catch (siddhiError: any) {
            setError(siddhiError?.response?.data?.error || siddhiError?.message || t('common.error'));
        } finally {
            setActiveSiddhi(null);
        }
    }, [activeSiddhi, currentRound?.number, currentSnapshot?.phase, matchCode, t]);

    const renderQuestionBody = () => {
        if (loading && !currentSnapshot) {
            return (
                <View style={styles.loadingRow}>
                    <ActivityIndicator color={LILA_COLORS.saffron} />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
            );
        }

        if (!currentQuestion) {
            return <Text style={styles.waitingText}>{t('portal.lila.match.waitingQuestion')}</Text>;
        }

        if (currentSnapshot?.phase === 'round_intro') {
            return (
                <View style={styles.phaseCenter}>
                    <Text style={styles.phaseTitle}>{t('portal.lila.match.phaseIntroTitle')}</Text>
                    <Text style={styles.phaseBody}>{t('portal.lila.match.phaseIntroBody', { count: remainingSeconds })}</Text>
                </View>
            );
        }

        if (currentQuestion.assetUrl && currentQuestion.type === 'image_choice') {
            return <Image source={{ uri: currentQuestion.assetUrl }} style={styles.questionImage} resizeMode="cover" />;
        }

        if (currentSnapshot?.phase === 'round_resolved') {
            return (
                <View style={styles.phaseCenter}>
                    <Text style={styles.phaseTitle}>{t('portal.lila.match.phaseResolvedTitle')}</Text>
                    <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
                    {currentSnapshot.resolution?.correctAnswer ? (
                        <Text style={styles.resolutionText}>
                            {t('portal.lila.match.correctAnswer', { answer: currentSnapshot.resolution.correctAnswer })}
                        </Text>
                    ) : null}
                    {currentQuestion.explanation ? (
                        <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
                    ) : null}
                </View>
            );
        }

        return (
            <>
                <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
                <View style={styles.answerList}>
                    {currentQuestion.options.map((answer) => {
                        const isSelected = currentQuestion.type === 'ordering'
                            ? selectedOrdering.includes(answer)
                            : selectedAnswer === answer;
                        const prefix = currentQuestion.type === 'ordering' && isSelected
                            ? `${selectedOrdering.indexOf(answer) + 1}. `
                            : '';
                        return (
                            <Pressable
                                key={answer}
                                onPress={() => {
                                    if (currentSnapshot?.phase !== 'question_open') {
                                        return;
                                    }
                                    if (currentQuestion.type === 'ordering') {
                                        handleOrderingToggle(answer);
                                        return;
                                    }
                                    setSelectedAnswer(answer);
                                }}
                                style={[styles.answerCard, isSelected ? styles.answerCardActive : null]}
                            >
                                <Text style={[styles.answerText, isSelected ? styles.answerTextActive : null]}>
                                    {`${prefix}${answer}`}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </>
        );
    };

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.match.title')}
            subtitle={t('portal.lila.match.subtitle')}
            headerRight={<LilaPill label={t(`portal.lila.modes.${mode}.title`)} tone="gold" />}
        >
            <LilaCard tone="gold">
                <View style={styles.topRow}>
                    <Text style={styles.scoreTitle}>{t('portal.lila.match.round', { round: currentRound?.number || 0 })}</Text>
                    <View style={styles.timerWrap}>
                        <TimerReset size={16} color={LILA_COLORS.parchment} />
                        <Text style={styles.timerText}>{remainingSeconds}s</Text>
                    </View>
                </View>
                <View style={styles.phaseMetaRow}>
                    <LilaPill label={t(`portal.lila.phases.${currentSnapshot?.phase || 'question_open'}`)} tone="night" />
                    <LilaPill label={connectionMeta.label} tone="surface" />
                </View>
                <View style={styles.connectionRow}>
                    <ConnectionIcon size={16} color={LILA_COLORS.parchment} />
                    <Text style={styles.connectionText}>{t('portal.lila.match.serverClock', { value: currentSnapshot?.serverTime || '—' })}</Text>
                </View>
                <View style={styles.scoreboard}>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{myEntry?.score ?? 0}</Text>
                        <Text style={styles.scoreLabel}>{t('portal.lila.match.you')}</Text>
                    </View>
                    {rivalEntries.map((entry) => (
                        <View key={entry.userId} style={styles.scoreItem}>
                            <Text style={styles.scoreValue}>{entry.score ?? 0}</Text>
                            <Text style={styles.scoreLabel}>{entry.teamKey || t('contacts.userFallback', { id: entry.userId })}</Text>
                        </View>
                    ))}
                </View>
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.match.questionTitle')} subtitle={t('portal.lila.match.questionSubtitle')} />
            <LilaCard>
                <View style={styles.metaRow}>
                    <LilaPill label={currentQuestion ? t(`portal.lila.categories.${currentQuestion.category}`) : t('common.loading')} tone="night" />
                    <LilaPill label={currentQuestion ? t(`portal.lila.difficulties.${currentQuestion.difficulty}`) : t('common.loading')} tone="surface" />
                </View>
                {renderQuestionBody()}
            </LilaCard>

            {currentSnapshot?.phase === 'answer_locked' || alreadyAnswered ? (
                <LilaCard tone="night">
                    <View style={styles.headerRow}>
                        <ShieldCheck size={16} color={LILA_COLORS.parchment} />
                        <Text style={styles.siddhiTitle}>{t('portal.lila.match.answerLockedTitle')}</Text>
                    </View>
                    <Text style={styles.lockedText}>
                        {answerPreview
                            ? t('portal.lila.match.answerLockedBody', { answer: answerPreview })
                            : t('portal.lila.match.answerLockedWaiting')}
                    </Text>
                </LilaCard>
            ) : null}

            <LilaCard tone="night">
                <View style={styles.siddhiHeader}>
                    <Sparkles size={16} color={LILA_COLORS.parchment} />
                    <Text style={styles.siddhiTitle}>{t('portal.lila.match.siddhiPanel')}</Text>
                </View>
                <View style={styles.metaRow}>
                    {siddhis.map((siddhi) => (
                            <Pressable key={siddhi} onPress={() => { handleSiddhi(siddhi).catch(() => undefined); }}>
                                <LilaPill label={t(`portal.lila.siddhis.${siddhi}`)} tone={activeSiddhi === siddhi ? 'surface' : 'gold'} />
                            </Pressable>
                        ))}
                </View>
            </LilaCard>

            {renderModeSummary()}

            <LilaCard>
                <Text style={styles.insightTitle}>{t('portal.lila.match.scoreboardTitle')}</Text>
                {(currentSnapshot?.scoreboard || []).map((entry) => (
                    <View key={entry.userId} style={styles.insightRow}>
                        <Text style={styles.insightLabel}>
                            {entry.userId === currentUserId ? t('portal.lila.match.you') : (entry.teamKey || t('contacts.userFallback', { id: entry.userId }))}
                        </Text>
                        <LilaProgressBar
                            progress={Math.max(0, Math.min((entry.score + 20) / 50, 1))}
                            accent={entry.isEliminated ? LILA_COLORS.crimson : LILA_COLORS.emerald}
                        />
                    </View>
                ))}
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => { recoverSnapshot().catch(() => undefined); }} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={alreadyAnswered || submitting || currentSnapshot?.phase !== 'question_open'
                    ? t('portal.lila.match.waitingResolve')
                    : t('portal.lila.actions.answer')}
                onPress={() => { handleSubmit().catch(() => undefined); }}
            />
        </LilaScreenLayout>
    );
};

const styles = StyleSheet.create({
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    scoreTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 22,
        fontWeight: '700',
    },
    timerWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timerText: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
        fontWeight: '700',
    },
    phaseMetaRow: {
        marginTop: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    connectionRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    connectionText: {
        color: 'rgba(255,244,224,0.8)',
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },
    scoreboard: {
        marginTop: 16,
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    scoreItem: {
        flex: 1,
        minWidth: 110,
        backgroundColor: 'rgba(255,244,224,0.12)',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    scoreValue: {
        color: LILA_COLORS.parchment,
        fontSize: 24,
        fontWeight: '800',
    },
    scoreLabel: {
        marginTop: 4,
        color: 'rgba(255,244,224,0.72)',
        fontSize: 12,
        fontWeight: '700',
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: LILA_COLORS.ink,
        fontSize: 14,
    },
    phaseCenter: {
        gap: 10,
    },
    phaseTitle: {
        color: LILA_COLORS.ink,
        fontSize: 20,
        fontWeight: '700',
    },
    phaseBody: {
        color: 'rgba(42,24,16,0.74)',
        fontSize: 14,
        lineHeight: 20,
    },
    questionImage: {
        width: '100%',
        height: 180,
        borderRadius: 18,
        marginBottom: 14,
        backgroundColor: 'rgba(42,24,16,0.08)',
    },
    questionText: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '700',
    },
    answerList: {
        marginTop: 16,
        gap: 10,
    },
    answerCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(42,24,16,0.12)',
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: 'rgba(255,250,238,0.9)',
    },
    answerCardActive: {
        borderColor: 'rgba(142,47,30,0.34)',
        backgroundColor: 'rgba(242,183,166,0.25)',
    },
    answerText: {
        color: LILA_COLORS.ink,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '600',
    },
    answerTextActive: {
        color: LILA_COLORS.crimson,
    },
    waitingText: {
        color: 'rgba(42,24,16,0.74)',
        fontSize: 14,
        lineHeight: 20,
    },
    resolutionText: {
        color: LILA_COLORS.crimson,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '700',
    },
    explanationText: {
        color: 'rgba(42,24,16,0.74)',
        fontSize: 14,
        lineHeight: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    lockedText: {
        marginTop: 10,
        color: 'rgba(255,244,224,0.78)',
        fontSize: 14,
        lineHeight: 20,
    },
    siddhiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    siddhiTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 16,
        fontWeight: '700',
    },
    insightTitle: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    insightRow: {
        marginBottom: 12,
        gap: 6,
    },
    modeSummaryBody: {
        color: 'rgba(42,24,16,0.72)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    teamSummaryList: {
        gap: 10,
    },
    teamSummaryCard: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,250,238,0.94)',
        borderWidth: 1,
        borderColor: 'rgba(199,148,47,0.18)',
    },
    teamSummaryTitle: {
        color: LILA_COLORS.ink,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    metricRowCompact: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    insightLabel: {
        color: LILA_COLORS.ink,
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

export default LilaMatchScreen;
