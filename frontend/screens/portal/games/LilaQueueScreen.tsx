import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Clock3, ScrollText, Sparkles, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
    getLilaBootstrap,
    getLilaModeConfig,
    getLilaSiddhis,
    joinLilaQueue,
    leaveLilaQueue,
} from '../../../services/lilaGameService';
import type { LilaBootstrap } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaMetric, LilaPill, LilaPrimaryButton, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaQueue'>;

const LilaQueueScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const mode = route.params?.mode || 'duel';
    const config = getLilaModeConfig(mode);
    const siddhis = getLilaSiddhis();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [joining, setJoining] = React.useState(false);
    const [leaving, setLeaving] = React.useState(false);

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

    const queueEntry = bootstrap?.openQueue.find((entry) => entry.mode === mode && entry.status !== 'left') || null;
    const liveMatch = bootstrap?.openMatches.find((match) => match.mode === mode) || null;
    const queueStatusLabel = queueEntry
        ? t(`portal.lila.queue.statuses.${queueEntry.status}`, { defaultValue: queueEntry.status })
        : null;

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
            void loadBootstrap();
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
                    <LilaMetric label={t('portal.lila.queue.players')} value={String(bootstrap?.queueDepth[mode] || 0)} />
                </View>
            </LilaCard>

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
                    </>
                )}
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
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => void loadBootstrap()} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={queueEntry ? t('common.cancel') : t('portal.lila.actions.join')}
                onPress={queueEntry ? () => void handleLeave() : () => void handleJoin()}
                tone={queueEntry ? 'night' : 'gold'}
            />
            <LilaPrimaryButton
                label={joining || leaving ? t('common.loading') : t('portal.lila.actions.store')}
                tone="night"
                onPress={() => navigation.navigate('LilaStore')}
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
    pillWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaQueueScreen;
