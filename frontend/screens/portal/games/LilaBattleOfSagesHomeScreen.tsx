import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Crown, MapPinned, ScrollText, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getLilaBootstrap, getLilaModeConfig } from '../../../services/lilaGameService';
import type { LilaBootstrap, LilaMatchRecord, LilaMode } from '../../../types/lila';
import { RootStackParamList } from '../../../types/navigation';
import { LILA_COLORS, LilaCard, LilaMetric, LilaPill, LilaPrimaryButton, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

type Props = NativeStackScreenProps<RootStackParamList, 'LilaBattleOfSagesHome'>;

const LilaBattleOfSagesHomeScreen: React.FC<Props> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const loadBootstrap = React.useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
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
            void loadBootstrap();
        }, [loadBootstrap]),
    );

    const profile = bootstrap?.profile;
    const activeMatch = bootstrap?.openMatches[0] || null;

    const navigateToMatch = React.useCallback((mode: LilaMode, match: LilaMatchRecord) => {
        if (match.status === 'finished') {
            navigation.navigate('LilaResults', { mode, matchCode: match.code });
            return;
        }
        if (match.status === 'active') {
            navigation.navigate('LilaMatch', { mode, matchCode: match.code });
            return;
        }
        navigation.navigate('LilaLobby', { mode, matchCode: match.code });
    }, [navigation]);

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.home.title')}
            subtitle={t('portal.lila.home.subtitle')}
            showBack={false}
        >
            <LilaCard tone="gold">
                {loading && !bootstrap ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : profile ? (
                    <>
                        <View style={styles.profileHeader}>
                            <View style={styles.profileTitleWrap}>
                                <Crown size={18} color={LILA_COLORS.parchment} />
                                <Text style={styles.profileTitle}>{profile.title || t(`portal.lila.ranks.${profile.rank}`)}</Text>
                            </View>
                            <LilaPill label={t(`portal.lila.ranks.${profile.rank}`)} tone="night" />
                        </View>
                        <Text style={styles.profileBody}>{t('portal.lila.home.rankSummary')}</Text>
                        <View style={styles.metricRow}>
                            <LilaMetric label="LVL" value={String(profile.level)} tone="light" />
                            <LilaMetric label="XP" value={String(profile.experience)} tone="light" />
                            <LilaMetric label="W/L" value={`${profile.winCount}/${profile.loseCount}`} tone="light" />
                        </View>
                        <Text style={styles.progressLabel}>{t('portal.lila.home.rankProgress')}</Text>
                        <LilaProgressBar progress={profile.nextRankProgress} accent={LILA_COLORS.parchment} />
                        <View style={styles.balanceRow}>
                            <LilaPill label={`${t('portal.lila.economy.bonus')}: ${bootstrap?.bonusBalance || 0}`} tone="surface" />
                            <LilaPill label={t('portal.lila.economy.realBalance', { amount: bootstrap?.realBalance || 0 })} tone="surface" />
                        </View>
                    </>
                ) : (
                    <Text style={styles.loadingText}>{error || t('common.error')}</Text>
                )}
            </LilaCard>

            {activeMatch ? (
                <LilaCard tone="night" onPress={() => navigateToMatch(activeMatch.mode, activeMatch)}>
                    <View style={styles.liveMatchHeader}>
                        <Sparkles size={18} color={LILA_COLORS.parchment} />
                        <Text style={styles.liveMatchTitle}>{t('common.open')}</Text>
                    </View>
                    <Text style={styles.liveMatchBody}>
                        {t(`portal.lila.modes.${activeMatch.mode}.title`)} · {t(`portal.lila.locations.${getLilaModeConfig(activeMatch.mode).location}`)}
                    </Text>
                    <Text style={styles.liveMatchMeta}>{activeMatch.code}</Text>
                </LilaCard>
            ) : null}

            <LilaSectionTitle title={t('portal.lila.home.journeyTitle')} subtitle={t('portal.lila.home.journeySubtitle')} />
            <LilaCard>
                <View style={styles.journeyWrap}>
                    {bootstrap?.locations.map((location) => {
                        const isActive = profile?.locationSlug === location;
                        return (
                            <View key={location} style={[styles.journeyItem, isActive ? styles.journeyItemActive : null]}>
                                <MapPinned size={16} color={isActive ? LILA_COLORS.crimson : LILA_COLORS.saffron} />
                                <Text style={[styles.journeyText, isActive ? styles.journeyTextActive : null]}>
                                    {t(`portal.lila.locations.${location}`)}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.home.modesTitle')} subtitle={t('portal.lila.home.modesSubtitle')} />
            {bootstrap?.modes.map((modeConfig) => {
                const queued = bootstrap.openQueue.find((entry) => entry.mode === modeConfig.id && entry.status !== 'left');
                const liveMatch = bootstrap.openMatches.find((match) => match.mode === modeConfig.id);
                return (
                    <LilaCard key={modeConfig.id}>
                        <View style={styles.modeHeader}>
                            <View style={styles.modeTitleWrap}>
                                <Text style={styles.modeTitle}>{t(`portal.lila.modes.${modeConfig.id}.title`)}</Text>
                                <Text style={styles.modeSubtitle}>{t(`portal.lila.modes.${modeConfig.id}.detail`)}</Text>
                            </View>
                            <LilaPill label={t(`portal.lila.locations.${modeConfig.location}`)} tone="gold" />
                        </View>
                        <View style={styles.modeMetrics}>
                            <LilaMetric label={t('portal.lila.queue.players')} value={String(bootstrap.queueDepth[modeConfig.id] || 0)} />
                            <LilaMetric label={t('portal.lila.queue.rounds')} value={String(modeConfig.rounds)} />
                            <LilaMetric label={t('portal.lila.queue.estWait')} value={`${modeConfig.waitSeconds}s`} />
                        </View>
                        <LilaPrimaryButton
                            label={liveMatch ? t('common.open') : queued ? t('common.loading') : t('portal.lila.actions.join')}
                            onPress={() => {
                                if (liveMatch) {
                                    navigateToMatch(modeConfig.id, liveMatch);
                                    return;
                                }
                                navigation.navigate('LilaQueue', { mode: modeConfig.id, matchCode: queued?.matchCode });
                            }}
                        />
                    </LilaCard>
                );
            })}

            <LilaSectionTitle title={t('portal.lila.home.dailyTitle')} subtitle={t('portal.lila.home.dailySubtitle')} />
            <LilaCard tone="night">
                {bootstrap?.quests.length ? bootstrap.quests.map((quest) => (
                    <View key={quest.code} style={styles.questRow}>
                        <View style={styles.questHeader}>
                            <ScrollText size={16} color={LILA_COLORS.parchment} />
                            <Text style={styles.questTitle}>{quest.title}</Text>
                        </View>
                        <Text style={styles.questDescription}>{quest.description}</Text>
                        <Text style={styles.questReward}>{t('portal.lila.home.questReward', { amount: quest.rewardBonus })}</Text>
                    </View>
                )) : (
                    <Text style={styles.questDescription}>{t('common.loading')}</Text>
                )}
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => void loadBootstrap()} />
                </LilaCard>
            ) : null}

            <View style={styles.footerActions}>
                <LilaPrimaryButton label={t('portal.lila.actions.profile')} tone="night" onPress={() => navigation.navigate('LilaProfile')} />
                <LilaPrimaryButton label={t('portal.lila.actions.store')} onPress={() => navigation.navigate('LilaStore')} />
                <LilaPrimaryButton label={t('portal.lila.actions.pass')} tone="night" onPress={() => navigation.navigate('LilaPass')} />
            </View>
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
        lineHeight: 20,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    profileTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    profileTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 22,
        fontWeight: '700',
        flex: 1,
    },
    profileBody: {
        marginTop: 10,
        color: 'rgba(255,244,224,0.82)',
        fontSize: 14,
        lineHeight: 20,
    },
    metricRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
    progressLabel: {
        marginTop: 14,
        marginBottom: 8,
        color: 'rgba(255,244,224,0.82)',
        fontSize: 12,
        fontWeight: '700',
    },
    balanceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
    liveMatchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    liveMatchTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 18,
        fontWeight: '700',
    },
    liveMatchBody: {
        marginTop: 10,
        color: LILA_COLORS.parchment,
        fontSize: 15,
        lineHeight: 22,
    },
    liveMatchMeta: {
        marginTop: 8,
        color: 'rgba(255,244,224,0.72)',
        fontSize: 12,
        letterSpacing: 1,
    },
    journeyWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    journeyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.56)',
        borderWidth: 1,
        borderColor: 'rgba(42,24,16,0.08)',
    },
    journeyItemActive: {
        backgroundColor: 'rgba(224,108,79,0.12)',
        borderColor: 'rgba(224,108,79,0.28)',
    },
    journeyText: {
        color: LILA_COLORS.ink,
        fontSize: 14,
        fontWeight: '600',
    },
    journeyTextActive: {
        color: LILA_COLORS.crimson,
    },
    modeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modeTitleWrap: {
        flex: 1,
        gap: 6,
    },
    modeTitle: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        fontWeight: '700',
    },
    modeSubtitle: {
        color: 'rgba(42,24,16,0.72)',
        fontSize: 13,
        lineHeight: 20,
    },
    modeMetrics: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
        marginBottom: 14,
    },
    questRow: {
        gap: 6,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,244,224,0.12)',
    },
    questHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    questTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
    },
    questDescription: {
        color: 'rgba(255,244,224,0.78)',
        fontSize: 13,
        lineHeight: 18,
    },
    questReward: {
        color: LILA_COLORS.lotusSoft,
        fontSize: 12,
        fontWeight: '700',
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    footerActions: {
        gap: 10,
    },
});

export default LilaBattleOfSagesHomeScreen;
