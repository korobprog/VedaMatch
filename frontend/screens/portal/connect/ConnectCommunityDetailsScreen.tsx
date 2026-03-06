import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { ConnectCommunityDetailResponse } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';
import { connectService } from '../../../services/connectService';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectCommunityDetails'>;

const ConnectCommunityDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ConnectCommunityDetailResponse | null>(null);

    useEffect(() => {
        setLoading(true);
        connectService.getCommunity(route.params.communityId)
            .then(setData)
            .catch((error) => {
                console.warn('[ConnectCommunityDetails] load failed:', error);
                setData(null);
            })
            .finally(() => setLoading(false));
    }, [route.params.communityId]);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color="#C2410C" /></View>;
    }
    if (!data) {
        return <View style={styles.center}><Text style={styles.emptyText}>{t('portal.connect.community.missing', { defaultValue: 'Community not found.' })}</Text></View>;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{data.community.name}</Text>
            <Text style={styles.meta}>{data.community.communityType} • {data.community.city || t('portal.connect.labels.online', { defaultValue: 'Online' })}</Text>
            <Text style={styles.description}>{data.community.description}</Text>
            <View style={styles.badges}>
                {data.community.newcomerFriendly ? <Text style={styles.badge}>{t('portal.connect.labels.newcomerFriendly', { defaultValue: 'Newcomer-friendly' })}</Text> : null}
                {data.community.mentorAvailable ? <Text style={styles.badge}>{t('portal.connect.labels.mentor', { defaultValue: 'Mentor available' })}</Text> : null}
                <Text style={styles.badge}>{data.community.verificationStatus}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('portal.connect.community.related', { defaultValue: 'Related opportunities' })}</Text>
            {data.opportunities.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => navigation.navigate('ConnectOpportunityDetails', { opportunityId: item.id })}
                >
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMeta}>{item.entryLevel} • {item.participationFormat}</Text>
                    <Text numberOfLines={2} style={styles.cardText}>{item.description}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    content: { padding: 20, gap: 14, paddingBottom: 36 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF7ED' },
    title: { fontSize: 28, fontWeight: '800', color: '#7C2D12' },
    meta: { color: '#9A3412', fontWeight: '700' },
    description: { color: '#431407', lineHeight: 22 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: { backgroundColor: '#FFEDD5', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, color: '#7C2D12', fontWeight: '700' },
    sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: '800', color: '#431407' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#FED7AA' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#431407' },
    cardMeta: { marginTop: 6, color: '#9A3412', fontWeight: '600' },
    cardText: { marginTop: 6, color: '#7C2D12', lineHeight: 20 },
    emptyText: { color: '#7C2D12' },
});

export default ConnectCommunityDetailsScreen;
