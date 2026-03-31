import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MessageCircleMore, ShieldCheck, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getLilaMatch, readyLilaLobby } from '../../../services/lilaGameService';
import type { LilaMatchSnapshot } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaPill, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaLobby'>;

const LilaLobbyScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { mode, matchCode } = route.params;
    const [snapshot, setSnapshot] = React.useState<LilaMatchSnapshot | null>(null);
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
        }, 2500);
        return () => clearInterval(timer);
    }, [loadSnapshot, matchCode]);

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
            await loadSnapshot();
        } catch (readyError: any) {
            setError(readyError?.response?.data?.error || readyError?.message || t('common.error'));
        } finally {
            setReadying(false);
        }
    }, [loadSnapshot, matchCode, t]);

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
                    </>
                )}
            </LilaCard>

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
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => void loadSnapshot()} />
                </LilaCard>
            ) : null}

            <LilaPrimaryButton
                label={readying ? t('common.loading') : t('portal.lila.actions.ready')}
                onPress={() => void handleReady()}
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
