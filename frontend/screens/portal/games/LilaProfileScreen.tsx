import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Crown, HeartHandshake, ScrollText, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getLilaBootstrap, getLilaStoreSections } from '../../../services/lilaGameService';
import type { LilaBootstrap } from '../../../types/lila';
import { LILA_COLORS, LilaCard, LilaPill, LilaProgressBar, LilaScreenLayout, LilaSectionTitle } from './LilaUi';

const LilaProfileScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [bootstrap, setBootstrap] = React.useState<LilaBootstrap | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

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

    const profile = bootstrap?.profile;
    const storePreview = bootstrap ? getLilaStoreSections(bootstrap.storeItems).flatMap((section) => section.items.slice(0, 1)) : [];

    return (
        <LilaScreenLayout
            badge={t('portal.lila.badge')}
            title={t('portal.lila.profile.title')}
            subtitle={t('portal.lila.profile.subtitle')}
        >
            <LilaCard tone="gold">
                {loading && !profile ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={LILA_COLORS.parchment} />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : profile ? (
                    <>
                        <View style={styles.header}>
                            <Crown size={18} color={LILA_COLORS.parchment} />
                            <Text style={styles.rankTitle}>{profile.title || t(`portal.lila.ranks.${profile.rank}`)}</Text>
                        </View>
                        <Text style={styles.rankBody}>{t('portal.lila.profile.rankStory')}</Text>
                        <View style={styles.statWrap}>
                            <LilaPill label={`LVL ${profile.level}`} tone="surface" />
                            <LilaPill label={`XP ${profile.experience}`} tone="surface" />
                            <LilaPill label={`W ${profile.winCount}`} tone="surface" />
                            <LilaPill label={`L ${profile.loseCount}`} tone="surface" />
                        </View>
                        <Text style={styles.progressLabel}>{t('portal.lila.results.rankProgress')}</Text>
                        <LilaProgressBar progress={profile.nextRankProgress} accent={LILA_COLORS.parchment} />
                    </>
                ) : (
                    <Text style={styles.rankBody}>{t('common.error')}</Text>
                )}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.mentorTitle')} subtitle={t('portal.lila.profile.mentorSubtitle')} />
            <LilaCard>
                <View style={styles.header}>
                    <HeartHandshake size={18} color={LILA_COLORS.saffron} />
                    <Text style={styles.sectionTitle}>
                        {bootstrap?.subscription?.status === 'active' ? 'Bhakti Premium' : t('portal.lila.profile.guildTitle')}
                    </Text>
                </View>
                <Text style={styles.sectionBody}>
                    {bootstrap?.subscription?.status === 'active'
                        ? `${bootstrap.subscription.packageCode} · ${bootstrap.subscription.endsAt || ''}`
                        : t('portal.lila.profile.guruBody')}
                </Text>
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.questsTitle')} subtitle={t('portal.lila.profile.questsSubtitle')} />
            <LilaCard tone="night">
                {(bootstrap?.quests || []).map((quest) => (
                    <View key={quest.code} style={styles.questRow}>
                        <View style={styles.header}>
                            <ScrollText size={16} color={LILA_COLORS.parchment} />
                            <Text style={styles.questTitle}>{quest.title}</Text>
                        </View>
                        <Text style={styles.questDescription}>{quest.description}</Text>
                        <LilaProgressBar progress={quest.isDaily ? 1 : 0.5} accent={LILA_COLORS.lotus} />
                    </View>
                ))}
            </LilaCard>

            <LilaSectionTitle title={t('portal.lila.profile.inventoryTitle')} subtitle={t('portal.lila.profile.inventorySubtitle')} />
            <LilaCard>
                <View style={styles.pillWrap}>
                    {storePreview.map((item) => (
                        <LilaPill key={item.code} label={item.name} tone="surface" />
                    ))}
                </View>
            </LilaCard>

            <LilaCard tone="gold">
                <View style={styles.header}>
                    <Sparkles size={18} color={LILA_COLORS.parchment} />
                    <Text style={styles.rankTitle}>{t('portal.lila.profile.guildTitle')}</Text>
                </View>
                <Text style={styles.rankBody}>{t('portal.lila.profile.guildBody')}</Text>
            </LilaCard>

            {error ? (
                <LilaCard>
                    <Text style={styles.errorText}>{error}</Text>
                </LilaCard>
            ) : null}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rankTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 20,
        fontWeight: '700',
    },
    rankBody: {
        marginTop: 8,
        color: 'rgba(255,244,224,0.82)',
        fontSize: 14,
        lineHeight: 20,
    },
    statWrap: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    progressLabel: {
        marginTop: 14,
        marginBottom: 8,
        color: 'rgba(255,244,224,0.82)',
        fontSize: 12,
        fontWeight: '700',
    },
    sectionTitle: {
        color: LILA_COLORS.ink,
        fontSize: 18,
        fontWeight: '700',
    },
    sectionBody: {
        marginTop: 8,
        color: 'rgba(42,24,16,0.72)',
        fontSize: 14,
        lineHeight: 20,
    },
    questRow: {
        gap: 10,
        marginBottom: 12,
    },
    questTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 15,
        fontWeight: '700',
    },
    questDescription: {
        color: 'rgba(255,244,224,0.78)',
        fontSize: 13,
        lineHeight: 18,
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
    },
});

export default LilaProfileScreen;
