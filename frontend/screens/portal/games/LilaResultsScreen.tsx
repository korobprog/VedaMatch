import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Sparkles, Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import { getLilaBootstrap, getLilaMatch, getLilaModeConfig } from '../../../services/lilaGameService';
import type { LilaBootstrap, LilaMatchSnapshot } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaMetric, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout } from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaResults'>;

const LilaResultsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const { mode, matchCode } = route.params;
    const [snapshot, setSnapshot] = React.useState<LilaMatchSnapshot | null>(null);
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(null);
    const [loading, setLoading] = React.useState(true);
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
                getLilaBootstrap(i18n.language),
            ]);
            setSnapshot(nextMatch);
            setBootstrap(nextBootstrap);
        } catch (loadError: any) {
            setError(loadError?.response?.data?.error || loadError?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [i18n.language, matchCode, t]);

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            void loadData();
        }, [loadData]),
    );

    React.useEffect(() => {
        if (!matchCode || snapshot?.match.status === 'finished') {
            return undefined;
        }
        const timer = setInterval(() => {
            void loadData();
        }, 2500);
        return () => clearInterval(timer);
    }, [loadData, matchCode, snapshot?.match.status]);

    const scoreboard = snapshot?.scoreboard || [];
    const winnerUserId = snapshot?.match.winnerUserId || scoreboard[0]?.userId || 0;
    const winnerLabel = winnerUserId === currentUserId
        ? t('common.me')
        : t('contacts.userFallback', { id: winnerUserId });
    const myEntry = scoreboard.find((entry) => entry.userId === currentUserId) || scoreboard[0];
    const bonusEarned = winnerUserId === currentUserId ? getLilaModeConfig(mode).rewardBonus : 0;

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

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => void loadData()} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton label={t('portal.lila.actions.replay')} onPress={() => navigation.replace('LilaQueue', { mode })} />
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
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaResultsScreen;
