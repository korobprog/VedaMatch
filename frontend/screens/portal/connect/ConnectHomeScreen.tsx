import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowRight, Filter, HeartHandshake, MapPin, Plus, Settings2, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ConnectCommunityCard, ConnectFeedFilters, ConnectOpportunityCard } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';
import { connectService } from '../../../services/connectService';
import { getConnectEntryLevelLabel, getConnectFormatLabel, resolveConnectSourceRoute } from './connectUi';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectHome'>;

const ConnectHomeScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState<ConnectFeedFilters>(route.params?.filters || {});
    const [opportunities, setOpportunities] = useState<ConnectOpportunityCard[]>([]);
    const [communities, setCommunities] = useState<ConnectCommunityCard[]>([]);
    const [cityLabel, setCityLabel] = useState('');

    const loadFeed = useCallback(async (nextFilters: ConnectFeedFilters) => {
        const data = await connectService.getFeed(nextFilters);
        setOpportunities(Array.isArray(data.opportunities) ? data.opportunities : []);
        setCommunities(Array.isArray(data.communities) ? data.communities : []);
        setCityLabel(nextFilters.city || data.profile?.city || '');
    }, []);

    useEffect(() => {
        const nextFilters = route.params?.filters || {};
        setFilters(nextFilters);
        setLoading(true);
        loadFeed(nextFilters)
            .catch((error) => {
                console.warn('[ConnectHome] failed to load feed:', error);
                setOpportunities([]);
                setCommunities([]);
            })
            .finally(() => setLoading(false));
    }, [loadFeed, route.params?.filters]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadFeed(filters);
        } catch (error) {
            console.warn('[ConnectHome] refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [filters, loadFeed]);

    const openSource = useCallback((opportunity: ConnectOpportunityCard) => {
        const resolved = resolveConnectSourceRoute(opportunity.sourceLink);
        if (!resolved) {
            return;
        }
        navigation.navigate(resolved.screen as any, resolved.params as any);
    }, [navigation]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.hero}>
                <View style={styles.heroBadge}>
                    <HeartHandshake size={16} color="#7C2D12" />
                    <Text style={styles.heroBadgeText}>{t('portal.connect.hero.badge', { defaultValue: 'Connect MVP' })}</Text>
                </View>
                <Text style={styles.title}>{t('portal.connect.hero.title', { defaultValue: 'Find the right service and community nearby' })}</Text>
                <Text style={styles.subtitle}>
                    {t('portal.connect.hero.subtitle', {
                        defaultValue: 'Connect matches people with local service, circles of service, and friendly teams without forcing a hard first step.',
                    })}
                </Text>
                <View style={styles.heroActions}>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('ConnectFilters', { filters })}>
                        <Filter size={16} color="#FFF7ED" />
                        <Text style={styles.primaryButtonText}>{t('portal.connect.actions.filters', { defaultValue: 'Filters' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ConnectProfileSetup')}>
                        <Settings2 size={16} color="#7C2D12" />
                        <Text style={styles.secondaryButtonText}>{t('portal.connect.actions.profile', { defaultValue: 'My preferences' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ConnectCreateOpportunity')}>
                        <Plus size={16} color="#7C2D12" />
                        <Text style={styles.secondaryButtonText}>{t('portal.connect.actions.create', { defaultValue: 'Add opportunity' })}</Text>
                    </TouchableOpacity>
                </View>
                {cityLabel ? (
                    <View style={styles.cityRow}>
                        <MapPin size={14} color="#9A3412" />
                        <Text style={styles.cityText}>{cityLabel}</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('portal.connect.sections.opportunities', { defaultValue: 'Recommended opportunities' })}</Text>
                <Text style={styles.sectionCount}>{opportunities.length}</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#C2410C" />
            ) : opportunities.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>{t('portal.connect.empty.title', { defaultValue: 'No matches yet' })}</Text>
                    <Text style={styles.emptyText}>
                        {t('portal.connect.empty.subtitle', { defaultValue: 'Adjust your filters or profile so Connect can find a softer entry point.' })}
                    </Text>
                </View>
            ) : (
                opportunities.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.card}
                        onPress={() => navigation.navigate('ConnectOpportunityDetails', { opportunityId: item.id })}
                    >
                        <View style={styles.cardTop}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.scoreText}>{item.score}%</Text>
                        </View>
                        <Text style={styles.cardMeta}>
                            {getConnectEntryLevelLabel(item.entryLevel)} • {getConnectFormatLabel(item.participationFormat)} • {item.category}
                        </Text>
                        {item.locationLabel ? <Text style={styles.cardLocation}>{item.locationLabel}</Text> : null}
                        <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
                        {item.why.length > 0 ? <Text style={styles.cardWhy}>{item.why.join(' • ')}</Text> : null}
                        <View style={styles.cardActions}>
                            <TouchableOpacity onPress={() => navigation.navigate('ConnectOpportunityDetails', { opportunityId: item.id })}>
                                <Text style={styles.linkText}>{t('portal.connect.actions.open', { defaultValue: 'Open details' })}</Text>
                            </TouchableOpacity>
                            {item.sourceLink ? (
                                <TouchableOpacity style={styles.inlineAction} onPress={() => openSource(item)}>
                                    <Text style={styles.linkText}>{item.sourceLink.label}</Text>
                                    <ArrowRight size={14} color="#C2410C" />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </TouchableOpacity>
                ))
            )}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('portal.connect.sections.communities', { defaultValue: 'Communities and circles of service' })}</Text>
                <Users size={16} color="#7C2D12" />
            </View>
            {communities.map((community) => (
                <TouchableOpacity
                    key={community.id}
                    style={styles.communityCard}
                    onPress={() => navigation.navigate('ConnectCommunityDetails', { communityId: community.id })}
                >
                    <Text style={styles.communityTitle}>{community.name}</Text>
                    <Text style={styles.communityMeta}>{community.communityType} • {community.city || t('portal.connect.labels.online', { defaultValue: 'Online' })}</Text>
                    <Text style={styles.communityDescription} numberOfLines={2}>{community.description}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    content: { padding: 20, paddingBottom: 40, gap: 18 },
    hero: { backgroundColor: '#FED7AA', borderRadius: 24, padding: 20, gap: 12 },
    heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroBadgeText: { color: '#7C2D12', fontSize: 13, fontWeight: '700' },
    title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#7C2D12' },
    subtitle: { fontSize: 15, lineHeight: 22, color: '#9A3412' },
    heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#C2410C', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999 },
    primaryButtonText: { color: '#FFF7ED', fontWeight: '700' },
    secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEDD5', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, borderWidth: 1, borderColor: '#FDBA74' },
    secondaryButtonText: { color: '#7C2D12', fontWeight: '700' },
    cityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cityText: { color: '#9A3412', fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: '#431407' },
    sectionCount: { color: '#9A3412', fontWeight: '700' },
    emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#FED7AA' },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: '#7C2D12' },
    emptyText: { marginTop: 8, color: '#9A3412', lineHeight: 21 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, gap: 8, borderWidth: 1, borderColor: '#FED7AA' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#431407' },
    scoreText: { color: '#C2410C', fontWeight: '800' },
    cardMeta: { color: '#9A3412', fontWeight: '600' },
    cardLocation: { color: '#C2410C' },
    cardDescription: { color: '#7C2D12', lineHeight: 21 },
    cardWhy: { color: '#9A3412', fontStyle: 'italic' },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    linkText: { color: '#C2410C', fontWeight: '700' },
    inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    communityCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#FED7AA', gap: 5 },
    communityTitle: { fontSize: 16, fontWeight: '800', color: '#431407' },
    communityMeta: { color: '#9A3412', fontWeight: '600' },
    communityDescription: { color: '#7C2D12', lineHeight: 20 },
});

export default ConnectHomeScreen;
