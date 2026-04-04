import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Crown, Flame, MapPinned, ScrollText, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
    getCachedLilaBootstrap,
    getLilaBootstrap,
    getLilaModeConfig,
    getLilaModePlayerCount,
    isLilaActiveQueueStatus,
} from '../../../services/lilaGameService';
import type { LilaBootstrap, LilaMatchRecord, LilaMode } from '../../../types/lila';
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

type Props = NativeStackScreenProps<RootStackParamList, 'LilaBattleOfSagesHome'>;

const LilaBattleOfSagesHomeScreen: React.FC<Props> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(() => getCachedLilaBootstrap(i18n.language));
    const [loading, setLoading] = React.useState(!getCachedLilaBootstrap(i18n.language));
    const [error, setError] = React.useState<string | null>(null);
    const allowExitRef = React.useRef(false);

    const loadBootstrap = React.useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
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
            loadBootstrap().catch(() => undefined);
        }, [loadBootstrap]),
    );

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (event) => {
            const actionType = event.data.action.type;
            const isBackNavigation = actionType === 'GO_BACK' || actionType === 'POP' || actionType === 'POP_TO_TOP';
            if (!isBackNavigation) {
                return;
            }
            if (allowExitRef.current) {
                allowExitRef.current = false;
                return;
            }
            event.preventDefault();
        });
        return unsubscribe;
    }, [navigation]);

    const profile = bootstrap?.profile;
    const activeMatch = bootstrap?.openMatches[0] || null;
    const quests = bootstrap?.quests || [];
    const isQuestSectionLoading = loading && !bootstrap;
    const recommendedMode = bootstrap?.recommendedMode || 'duel';
    const recommendedModeConfig = getLilaModeConfig(recommendedMode);
    const tutorialState = bootstrap?.tutorialState;
    const latestReward = bootstrap?.recentRewards[0] || null;
    const activeQueue = bootstrap?.openQueue.find((entry) => isLilaActiveQueueStatus(entry.status)) || null;

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

    const handleExit = React.useCallback(() => {
        allowExitRef.current = true;
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Portal');
    }, [navigation]);

    const handlePlayNow = React.useCallback(() => {
        if (activeMatch) {
            navigateToMatch(activeMatch.mode, activeMatch);
            return;
        }
        if (activeQueue) {
            navigation.navigate('LilaQueue', { mode: activeQueue.mode, matchCode: activeQueue.matchCode });
            return;
        }
        navigation.navigate('LilaQueue', { mode: recommendedMode });
    }, [activeMatch, activeQueue, navigateToMatch, navigation, recommendedMode]);

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.home.title')}
            subtitle={t('portal.lila.home.subtitle')}
            showBack={false}
            headerRight={(
                <Pressable onPress={handleExit} style={styles.exitButton}>
                    <Text style={styles.exitButtonLabel}>{t('portal.lila.actions.exit')}</Text>
                </Pressable>
            )}
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
                            <LilaMetric label={t('portal.lila.home.streakLabel')} value={String(bootstrap?.activeStreak || 0)} tone="light" />
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

            <LilaCard tone="night">
                <View style={styles.recommendedHeader}>
                    <View style={styles.modeTitleWrap}>
                        <Text style={styles.liveMatchTitle}>{t('portal.lila.home.playNowTitle')}</Text>
                        <Text style={styles.recommendedText}>
                            {tutorialState?.completed
                                ? t('portal.lila.home.recommendedMode', { mode: t(`portal.lila.modes.${recommendedMode}.title`) })
                                : t('portal.lila.home.firstMatchBody')}
                        </Text>
                    </View>
                    <LilaPill label={t(`portal.lila.locations.${recommendedModeConfig.location}`)} tone="gold" />
                </View>
                <View style={styles.metricRow}>
                    <LilaMetric label={t('portal.lila.queue.players')} value={String(getLilaModePlayerCount(bootstrap, recommendedMode))} tone="light" />
                    <LilaMetric label={t('portal.lila.queue.rounds')} value={String(recommendedModeConfig.rounds)} tone="light" />
                    <LilaMetric label={t('portal.lila.queue.estWait')} value={`${recommendedModeConfig.waitSeconds}s`} tone="light" />
                </View>
                <View style={styles.primaryActions}>
                    <LilaPrimaryButton
                        label={activeMatch ? t('common.open') : activeQueue ? t('portal.lila.actions.resumeQueue') : t('portal.lila.actions.playNow')}
                        onPress={handlePlayNow}
                    />
                </View>
            </LilaCard>

            {!tutorialState?.completed ? (
                <LilaCard>
                    <View style={styles.headerRow}>
                        <Sparkles size={16} color={LILA_COLORS.saffron} />
                        <Text style={styles.sectionTitle}>{t('portal.lila.home.onboardingTitle')}</Text>
                    </View>
                    <Text style={styles.sectionBody}>{t('portal.lila.home.onboardingBody')}</Text>
                    <View style={styles.onboardingList}>
                        <Text style={styles.onboardingItem}>{t('portal.lila.home.onboardingStep1')}</Text>
                        <Text style={styles.onboardingItem}>{t('portal.lila.home.onboardingStep2')}</Text>
                        <Text style={styles.onboardingItem}>{t('portal.lila.home.onboardingStep3')}</Text>
                    </View>
                </LilaCard>
            ) : null}

            {latestReward ? (
                <LilaCard>
                    <View style={styles.headerRow}>
                        <Flame size={16} color={LILA_COLORS.saffron} />
                        <Text style={styles.sectionTitle}>{t('portal.lila.home.latestRewardTitle')}</Text>
                    </View>
                    <Text style={styles.sectionBody}>{latestReward.title}</Text>
                    <Text style={styles.rewardMeta}>
                        {latestReward.amount > 0 ? `+${latestReward.amount}` : latestReward.amount} {latestReward.currency}
                    </Text>
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
                const queued = bootstrap.openQueue.find((entry) => entry.mode === modeConfig.id && isLilaActiveQueueStatus(entry.status));
                const liveMatch = bootstrap.openMatches.find((match) => match.mode === modeConfig.id);
                return (
                    <LilaCard key={modeConfig.id}>
                        <View style={styles.modeHeader}>
                            <View style={styles.modeTitleWrap}>
                                <Text style={styles.modeTitle}>{t(`portal.lila.modes.${modeConfig.id}.title`)}</Text>
                                <Text style={styles.modeSubtitle}>{t(`portal.lila.modes.${modeConfig.id}.detail`)}</Text>
                                <View style={styles.modeLocationRow}>
                                    <LilaPill label={t(`portal.lila.locations.${modeConfig.location}`)} tone="night" />
                                </View>
                            </View>
                        </View>
                        <View style={styles.modeMetrics}>
                            <LilaMetric label={t('portal.lila.queue.players')} value={String(getLilaModePlayerCount(bootstrap, modeConfig.id))} />
                            <LilaMetric label={t('portal.lila.queue.rounds')} value={String(modeConfig.rounds)} />
                            <LilaMetric label={t('portal.lila.queue.estWait')} value={`${modeConfig.waitSeconds}s`} />
                        </View>
                        <LilaPrimaryButton
                            label={liveMatch ? t('common.open') : queued ? t('portal.lila.actions.inQueue') : t('portal.lila.actions.join')}
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
                {isQuestSectionLoading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.questDescription}>{t('common.loading')}</Text>
                    </View>
                ) : quests.length ? (
                    quests.map((quest) => {
                        const progress = bootstrap?.dailyQuestProgress.find((entry) => entry.code === quest.code)
                            || bootstrap?.weeklyQuestProgress.find((entry) => entry.code === quest.code);
                        const ratio = progress ? Math.max(0, Math.min(progress.current / Math.max(progress.target, 1), 1)) : 0;
                        return (
                            <View key={quest.code} style={styles.questRow}>
                                <View style={styles.questHeader}>
                                    <ScrollText size={16} color={LILA_COLORS.parchment} />
                                    <Text style={styles.questTitle}>{quest.title}</Text>
                                </View>
                                <Text style={styles.questDescription}>{quest.description}</Text>
                                <LilaProgressBar progress={ratio} accent={LILA_COLORS.lotus} />
                                <Text style={styles.questReward}>{t('portal.lila.home.questReward', { amount: quest.rewardBonus })}</Text>
                            </View>
                        );
                    })
                ) : (
                    <Text style={styles.questDescription}>{t('portal.lila.home.dailyEmpty')}</Text>
                )}
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                    <LilaPrimaryButton label={t('common.retry')} tone="night" onPress={() => { loadBootstrap().catch(() => undefined); }} />
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
        color: 'rgba(255,244,224,0.84)',
        fontSize: 14,
        lineHeight: 20,
    },
    metricRow: {
        marginTop: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    progressLabel: {
        marginTop: 12,
        marginBottom: 8,
        color: 'rgba(255,244,224,0.84)',
        fontSize: 12,
        fontWeight: '700',
    },
    balanceRow: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    recommendedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    recommendedText: {
        marginTop: 8,
        color: 'rgba(255,244,224,0.82)',
        fontSize: 14,
        lineHeight: 20,
    },
    primaryActions: {
        marginTop: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        color: LILA_COLORS.ink,
        fontSize: 17,
        fontWeight: '700',
    },
    sectionBody: {
        marginTop: 8,
        color: 'rgba(42,24,16,0.76)',
        fontSize: 14,
        lineHeight: 20,
    },
    onboardingList: {
        marginTop: 10,
        gap: 6,
    },
    onboardingItem: {
        color: 'rgba(42,24,16,0.76)',
        fontSize: 13,
        lineHeight: 18,
    },
    rewardMeta: {
        marginTop: 6,
        color: LILA_COLORS.saffron,
        fontSize: 14,
        fontWeight: '700',
    },
    exitButton: {
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,244,224,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,244,224,0.18)',
    },
    exitButtonLabel: {
        color: LILA_COLORS.parchment,
        fontSize: 13,
        fontWeight: '700',
    },
    liveMatchTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 20,
        fontWeight: '700',
    },
    journeyWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    journeyItem: {
        minWidth: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,250,238,0.9)',
        borderWidth: 1,
        borderColor: 'rgba(199,148,47,0.18)',
    },
    journeyItemActive: {
        borderColor: 'rgba(142,47,30,0.32)',
        backgroundColor: 'rgba(242,183,166,0.22)',
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
        gap: 12,
    },
    modeTitleWrap: {
        gap: 6,
    },
    modeTitle: {
        color: LILA_COLORS.ink,
        fontSize: 20,
        fontWeight: '700',
    },
    modeSubtitle: {
        color: 'rgba(42,24,16,0.76)',
        fontSize: 14,
        lineHeight: 20,
    },
    modeLocationRow: {
        marginTop: 4,
        alignItems: 'flex-start',
    },
    modeMetrics: {
        marginTop: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    questRow: {
        gap: 10,
        marginBottom: 14,
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
        color: LILA_COLORS.parchment,
        fontSize: 13,
        fontWeight: '700',
    },
    footerActions: {
        gap: 10,
    },
    errorText: {
        color: LILA_COLORS.crimson,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
});

export default LilaBattleOfSagesHomeScreen;
