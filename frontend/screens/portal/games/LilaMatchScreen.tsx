import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkles, TimerReset } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import {
    getLilaMatch,
    getLilaSiddhis,
    submitLilaAnswer,
    useLilaSiddhi,
} from '../../../services/lilaGameService';
import type { LilaMatchSnapshot } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaPill, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaMatch'>;

const LilaMatchScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { mode, matchCode } = route.params;
    const [snapshot, setSnapshot] = React.useState<LilaMatchSnapshot | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [activeSiddhi, setActiveSiddhi] = React.useState<string | null>(null);
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
            setSnapshot(next);
        } catch (loadError: any) {
            setError(loadError?.response?.data?.error || loadError?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [i18n.language, matchCode, t]);

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            void loadSnapshot();
        }, [loadSnapshot]),
    );

    React.useEffect(() => {
        if (!matchCode) {
            return undefined;
        }
        const timer = setInterval(() => {
            void loadSnapshot();
        }, 2200);
        return () => clearInterval(timer);
    }, [loadSnapshot, matchCode]);

    React.useEffect(() => {
        if (snapshot?.match.status === 'finished') {
            navigation.replace('LilaResults', { mode, matchCode });
        }
    }, [matchCode, mode, navigation, snapshot?.match.status]);

    React.useEffect(() => {
        setSelectedAnswer(null);
    }, [snapshot?.currentRound?.id]);

    const remainingSeconds = React.useMemo(() => {
        const endsAt = snapshot?.currentRound?.endsAt;
        if (!endsAt) {
            return 0;
        }
        const diffMs = new Date(endsAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(diffMs / 1000));
    }, [snapshot?.currentRound?.endsAt]);

    const scoreboard = snapshot?.scoreboard || [];
    const myEntry = scoreboard.find((entry) => entry.userId === currentUserId) || scoreboard[0];
    const rivalEntry = scoreboard.find((entry) => entry.userId !== currentUserId && !entry.isEliminated) || scoreboard[1] || scoreboard[0];
    const currentQuestion = snapshot?.currentQuestion;
    const currentRound = snapshot?.currentRound;
    const alreadyAnswered = Boolean(currentUserId && snapshot?.answeredUserIds.includes(currentUserId));

    const handleSubmit = React.useCallback(async () => {
        if (!matchCode || !currentRound?.number || !selectedAnswer || submitting) {
            return;
        }
        try {
            setSubmitting(true);
            await submitLilaAnswer(matchCode, currentRound.number, selectedAnswer);
            await loadSnapshot();
        } catch (submitError: any) {
            setError(submitError?.response?.data?.error || submitError?.message || t('common.error'));
        } finally {
            setSubmitting(false);
        }
    }, [currentRound?.number, loadSnapshot, matchCode, selectedAnswer, submitting, t]);

    const handleSiddhi = React.useCallback(async (type: typeof siddhis[number]) => {
        if (!matchCode || !currentRound?.number || activeSiddhi) {
            return;
        }
        try {
            setActiveSiddhi(type);
            await useLilaSiddhi(matchCode, currentRound.number, type);
            await loadSnapshot();
        } catch (siddhiError: any) {
            setError(siddhiError?.response?.data?.error || siddhiError?.message || t('common.error'));
        } finally {
            setActiveSiddhi(null);
        }
    }, [activeSiddhi, currentRound?.number, loadSnapshot, matchCode, siddhis, t]);

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
                <View style={styles.scoreboard}>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{myEntry?.score ?? 0}</Text>
                        <Text style={styles.scoreLabel}>{t('portal.lila.match.you')}</Text>
                    </View>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{rivalEntry?.score ?? 0}</Text>
                        <Text style={styles.scoreLabel}>{t('portal.lila.match.rival')}</Text>
                    </View>
                </View>
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.match.questionTitle')} subtitle={t('portal.lila.match.questionSubtitle')} />
            <LilaCard>
                <View style={styles.metaRow}>
                    <LilaPill label={currentQuestion ? t(`portal.lila.categories.${currentQuestion.category}`) : t('common.loading')} tone="night" />
                    <LilaPill label={currentQuestion ? t(`portal.lila.difficulties.${currentQuestion.difficulty}`) : t('common.loading')} tone="surface" />
                </View>
                {loading && !snapshot ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.saffron} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : currentQuestion ? (
                    <>
                        <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
                        <View style={styles.answerList}>
                            {currentQuestion.options.map((answer) => {
                                const isSelected = selectedAnswer === answer;
                                return (
                                    <Pressable
                                        key={answer}
                                        onPress={() => setSelectedAnswer(answer)}
                                        style={[styles.answerCard, isSelected ? styles.answerCardActive : null]}
                                    >
                                        <Text style={[styles.answerText, isSelected ? styles.answerTextActive : null]}>
                                            {answer}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </>
                ) : (
                    <Text style={styles.waitingText}>{t('common.loading')}</Text>
                )}
            </LilaCard>

            <LilaCard tone="night">
                <View style={styles.siddhiHeader}>
                    <Sparkles size={16} color={LILA_COLORS.parchment} />
                    <Text style={styles.siddhiTitle}>{t('portal.lila.match.siddhiPanel')}</Text>
                </View>
                <View style={styles.metaRow}>
                    {siddhis.map((siddhi) => (
                        <Pressable key={siddhi} onPress={() => void handleSiddhi(siddhi)}>
                            <LilaPill label={t(`portal.lila.siddhis.${siddhi}`)} tone={activeSiddhi === siddhi ? 'surface' : 'gold'} />
                        </Pressable>
                    ))}
                </View>
            </LilaCard>

            <LilaCard>
                <Text style={styles.insightTitle}>{t('portal.lila.match.scoreboardTitle')}</Text>
                {(snapshot?.scoreboard || []).map((entry) => (
                    <View key={entry.userId} style={styles.insightRow}>
                        <Text style={styles.insightLabel}>
                            {entry.userId === currentUserId ? t('portal.lila.match.you') : t('contacts.userFallback', { id: entry.userId })}
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
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => void loadSnapshot()} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={alreadyAnswered || submitting ? t('common.loading') : t('portal.lila.actions.answer')}
                onPress={() => void handleSubmit()}
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
    scoreboard: {
        marginTop: 16,
        flexDirection: 'row',
        gap: 12,
    },
    scoreItem: {
        flex: 1,
        backgroundColor: 'rgba(255,244,224,0.12)',
        borderRadius: 18,
        padding: 14,
    },
    scoreValue: {
        color: LILA_COLORS.parchment,
        fontSize: 28,
        fontWeight: '800',
    },
    scoreLabel: {
        marginTop: 4,
        color: 'rgba(255,244,224,0.78)',
        fontSize: 12,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    loadingRow: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: LILA_COLORS.ink,
        fontSize: 14,
    },
    questionText: {
        marginTop: 14,
        color: LILA_COLORS.ink,
        fontSize: 18,
        lineHeight: 28,
        fontWeight: '700',
    },
    answerList: {
        marginTop: 16,
        gap: 10,
    },
    answerCard: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(42,24,16,0.12)',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    answerCardActive: {
        backgroundColor: 'rgba(199,148,47,0.16)',
        borderColor: 'rgba(199,148,47,0.35)',
    },
    answerText: {
        color: LILA_COLORS.ink,
        fontSize: 15,
        fontWeight: '600',
    },
    answerTextActive: {
        color: LILA_COLORS.crimson,
    },
    waitingText: {
        marginTop: 16,
        color: 'rgba(42,24,16,0.72)',
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
        gap: 8,
        marginBottom: 12,
    },
    insightLabel: {
        color: 'rgba(42,24,16,0.72)',
        fontSize: 13,
        fontWeight: '700',
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaMatchScreen;
