import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MessageCircleMore, ShieldCheck, Users, Wifi, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLilaMatchSession } from '../../../hooks/useLilaMatchSession';
import { getLilaMatch, readyLilaLobby } from '../../../services/lilaGameService';
import type { LilaRealtimeConnectionState } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaMetric, LilaPill, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaLobby'>;

const getConnectionMeta = (state: LilaRealtimeConnectionState, t: (key: string, options?: any) => string) => {
    switch (state) {
    case 'live':
        return { label: t('portal.lila.realtime.live'), icon: Wifi };
    case 'fallback_polling':
        return { label: t('portal.lila.realtime.fallbackPolling'), icon: WifiOff };
    default:
        return { label: t('portal.lila.realtime.reconnecting'), icon: WifiOff };
    }
};

const LilaLobbyScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { mode, matchCode } = route.params;
    const { snapshot, connectionState, recoverSnapshot, setInitialSnapshot } = useLilaMatchSession(matchCode, i18n.language);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [readying, setReadying] = React.useState(false);

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
        if (connectionState !== 'fallback_polling' || !matchCode) {
            return undefined;
        }
        const timer = setInterval(() => {
            recoverSnapshot().catch(() => undefined);
        }, 2500);
        return () => clearInterval(timer);
    }, [connectionState, matchCode, recoverSnapshot]);

    React.useEffect(() => {
        if (snapshot?.match.status === 'active') {
            navigation.replace('LilaMatch', { mode, matchCode });
        } else if (snapshot?.match.status === 'finished') {
            navigation.replace('LilaResults', { mode, matchCode });
        }
    }, [matchCode, mode, navigation, snapshot?.match.status]);

    const handleReady = React.useCallback(async () => {
        if (!matchCode) {
            return;
        }
        try {
            setReadying(true);
            await readyLilaLobby(matchCode);
        } catch (readyError: any) {
            setError(readyError?.response?.data?.error || readyError?.message || t('common.error'));
        } finally {
            setReadying(false);
        }
    }, [matchCode, t]);

    const queueEntries = snapshot?.queueEntries || [];
    const teams = mode === 'sabha'
        ? Object.entries(
            queueEntries.reduce<Record<string, typeof queueEntries>>((accumulator, entry) => {
                const key = entry.teamKey || 'team_1';
                accumulator[key] = accumulator[key] || [];
                accumulator[key].push(entry);
                return accumulator;
            }, {}),
        )
        : [];
    const survivalAlive = queueEntries.filter((entry) => entry.status !== 'eliminated').length || snapshot?.players.length || 0;
    const survivalReady = queueEntries.filter((entry) => entry.status === 'ready').length || snapshot?.readyUserIds.length || 0;
    const connectionMeta = getConnectionMeta(connectionState, t);
    const ConnectionIcon = connectionMeta.icon;
    const renderModePrep = () => {
        if (mode === 'sabha') {
            return (
                <LilaCard>
                    <Text style={styles.modeTitle}>{t('portal.lila.lobby.modePrep.sabhaTitle')}</Text>
                    <Text style={styles.modeBody}>{t('portal.lila.lobby.modePrep.sabhaBody')}</Text>
                    <View style={styles.metricWrap}>
                        <LilaMetric label={t('portal.lila.match.teamScore')} value={String(snapshot?.scoreboard.length || teams.length || 2)} />
                        <LilaMetric label={t('portal.lila.match.teamReady')} value={`${snapshot?.readyUserIds.length || 0}/${snapshot?.players.length || 0}`} />
                    </View>
                </LilaCard>
            );
        }
        if (mode === 'survival') {
            return (
                <LilaCard>
                    <Text style={styles.modeTitle}>{t('portal.lila.lobby.modePrep.survivalTitle')}</Text>
                    <Text style={styles.modeBody}>{t('portal.lila.lobby.modePrep.survivalBody')}</Text>
                    <View style={styles.metricWrap}>
                        <LilaMetric label={t('portal.lila.match.teamAlive')} value={String(survivalAlive)} />
                        <LilaMetric label={t('portal.lila.match.teamReady')} value={String(survivalReady)} />
                    </View>
                </LilaCard>
            );
        }
        return (
            <LilaCard>
                <Text style={styles.modeTitle}>{t('portal.lila.lobby.modePrep.duelTitle')}</Text>
                <Text style={styles.modeBody}>{t('portal.lila.lobby.modePrep.duelBody')}</Text>
                <View style={styles.metricWrap}>
                    <LilaMetric label={t('portal.lila.match.teamReady')} value={`${snapshot?.readyUserIds.length || 0}/${snapshot?.players.length || 0}`} />
                    <LilaMetric label={t('portal.lila.queue.estWait')} value={`${mode === 'duel' ? 12 : 18}s`} />
                </View>
            </LilaCard>
        );
    };

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.lobby.title')}
            subtitle={t('portal.lila.lobby.subtitle')}
            headerRight={<LilaPill label={t(`portal.lila.modes.${mode}.title`)} tone="gold" />}
        >
            <LilaCard tone="gold">
                <Text style={styles.readyTitle}>{t('portal.lila.lobby.readyCheck')}</Text>
                {loading && !snapshot ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.readyValue}>{snapshot?.readyUserIds.length || 0}/{snapshot?.players.length || 0}</Text>
                        <LilaProgressBar
                            progress={snapshot?.players.length ? (snapshot.readyUserIds.length / snapshot.players.length) : 0}
                            accent={LILA_COLORS.parchment}
                        />
                        <View style={styles.metaRow}>
                            <LilaPill label={t(`portal.lila.phases.${snapshot?.phase || 'lobby'}`)} tone="night" />
                            <LilaPill label={connectionMeta.label} tone="surface" />
                        </View>
                        <View style={styles.connectionRow}>
                            <ConnectionIcon size={16} color={LILA_COLORS.parchment} />
                            <Text style={styles.connectionText}>{t('portal.lila.lobby.connectionHint')}</Text>
                        </View>
                    </>
                )}
            </LilaCard>

            {renderModePrep()}

            {teams.length ? (
                <>
                    <LilaSectionTitle title={t('portal.lila.lobby.teamPanels')} subtitle={t('portal.lila.lobby.consultWindow')} />
                    {teams.map(([teamKey, roster], index) => (
                        <LilaCard key={teamKey}>
                            <View style={styles.teamHeader}>
                                <View style={styles.teamTitleWrap}>
                                    <Users size={16} color={LILA_COLORS.saffron} />
                                    <Text style={styles.teamTitle}>
                                        {t(index === 0 ? 'portal.lila.lobby.sampradaya_sun' : 'portal.lila.lobby.sampradaya_moon')}
                                    </Text>
                                </View>
                                <LilaPill label={t('portal.lila.lobby.consultBadge')} tone="night" />
                            </View>
                            {roster.map((player) => (
                                <View key={`${teamKey}-${player.userId}`} style={styles.playerRow}>
                                    <Text style={styles.playerName}>#{player.userId}</Text>
                                    <ShieldCheck size={16} color={player.status === 'ready' ? LILA_COLORS.emerald : LILA_COLORS.saffron} />
                                </View>
                            ))}
                        </LilaCard>
                    ))}
                </>
            ) : (
                <LilaCard>
                    {(queueEntries.length ? queueEntries : snapshot?.players.map((playerId) => ({ userId: playerId, status: 'matched' })) || []).map((player) => (
                        <View key={player.userId} style={styles.playerRow}>
                            <Text style={styles.playerName}>#{player.userId}</Text>
                            <ShieldCheck size={16} color={player.status === 'ready' ? LILA_COLORS.emerald : LILA_COLORS.saffron} />
                        </View>
                    ))}
                </LilaCard>
            )}

            <LilaCard tone="night">
                <View style={styles.consultRow}>
                    <MessageCircleMore size={16} color={LILA_COLORS.parchment} />
                    <Text style={styles.consultText}>
                        {t(mode === 'sabha' ? 'portal.lila.lobby.consultHint' : 'portal.lila.lobby.instantHint')}
                    </Text>
                </View>
                {matchCode ? <Text style={styles.matchCode}>{matchCode}</Text> : null}
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => { recoverSnapshot().catch(() => undefined); }} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={readying ? t('common.loading') : t('portal.lila.actions.ready')}
                onPress={() => { handleReady().catch(() => undefined); }}
            />
            <LilaPrimaryButton
                label={t('portal.lila.actions.backHome')}
                tone="night"
                onPress={() => navigation.navigate('LilaBattleOfSagesHome')}
            />
        </LilaScreenLayout>
    );
};

const styles = StyleSheet.create({
    readyTitle: {
        color: 'rgba(255,244,224,0.82)',
        fontSize: 14,
        fontWeight: '700',
    },
    readyValue: {
        marginVertical: 10,
        color: LILA_COLORS.parchment,
        fontSize: 32,
        fontWeight: '800',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 12,
    },
    loadingText: {
        color: LILA_COLORS.parchment,
        fontSize: 14,
    },
    metaRow: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    connectionRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    connectionText: {
        color: 'rgba(255,244,224,0.78)',
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },
    teamHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 10,
    },
    teamTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    teamTitle: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        fontWeight: '700',
    },
    modeTitle: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    modeBody: {
        color: 'rgba(42,24,16,0.72)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    metricWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(42,24,16,0.1)',
    },
    playerName: {
        color: LILA_COLORS.ink,
        fontSize: 14,
        fontWeight: '600',
    },
    consultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    consultText: {
        flex: 1,
        color: LILA_COLORS.parchment,
        fontSize: 14,
        lineHeight: 20,
    },
    matchCode: {
        marginTop: 10,
        color: 'rgba(255,244,224,0.72)',
        fontSize: 12,
        letterSpacing: 1,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaLobbyScreen;
