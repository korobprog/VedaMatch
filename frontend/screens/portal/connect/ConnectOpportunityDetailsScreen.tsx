import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { ConnectOpportunityCard } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';
import { connectService } from '../../../services/connectService';
import { getConnectEntryLevelLabel, getConnectFormatLabel, resolveConnectSourceRoute } from './connectUi';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectOpportunityDetails'>;

const ConnectOpportunityDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [message, setMessage] = useState('');
    const [opportunity, setOpportunity] = useState<ConnectOpportunityCard | null>(null);

    useEffect(() => {
        setLoading(true);
        connectService.getOpportunity(route.params.opportunityId)
            .then((data) => setOpportunity(data.opportunity))
            .catch((error) => {
                console.warn('[ConnectOpportunityDetails] load failed:', error);
                setOpportunity(null);
            })
            .finally(() => setLoading(false));
    }, [route.params.opportunityId]);

    const handleApply = async () => {
        if (!opportunity) {
            return;
        }
        setApplying(true);
        try {
            await connectService.apply(opportunity.id, { message });
            Alert.alert(
                t('portal.connect.apply.successTitle', { defaultValue: 'Applied' }),
                t('portal.connect.apply.successBody', { defaultValue: 'Your request was sent to the coordinator.' }),
            );
        } catch (error: any) {
            Alert.alert(
                t('portal.connect.apply.errorTitle', { defaultValue: 'Apply failed' }),
                error?.message || t('portal.connect.apply.errorBody', { defaultValue: 'Please try again.' }),
            );
        } finally {
            setApplying(false);
        }
    };

    const openSource = () => {
        const resolved = resolveConnectSourceRoute(opportunity?.sourceLink);
        if (!resolved) {
            return;
        }
        navigation.navigate(resolved.screen as any, resolved.params as any);
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color="#C2410C" /></View>;
    }
    if (!opportunity) {
        return <View style={styles.center}><Text style={styles.emptyText}>{t('portal.connect.details.missing', { defaultValue: 'Opportunity not found.' })}</Text></View>;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{opportunity.title}</Text>
            <Text style={styles.meta}>
                {getConnectEntryLevelLabel(opportunity.entryLevel)} • {getConnectFormatLabel(opportunity.participationFormat)} • {opportunity.category}
            </Text>
            <Text style={styles.description}>{opportunity.description}</Text>
            {opportunity.locationLabel ? <Text style={styles.detailText}>{opportunity.locationLabel}</Text> : null}
            {opportunity.community ? (
                <TouchableOpacity style={styles.communityCard} onPress={() => navigation.navigate('ConnectCommunityDetails', { communityId: opportunity.community!.id })}>
                    <Text style={styles.communityTitle}>{opportunity.community.name}</Text>
                    <Text style={styles.communityText}>{opportunity.community.description}</Text>
                </TouchableOpacity>
            ) : null}
            {opportunity.why.length > 0 ? (
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{t('portal.connect.details.why', { defaultValue: 'Why this matches' })}</Text>
                    <Text style={styles.infoText}>{opportunity.why.join('\n')}</Text>
                </View>
            ) : null}

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{t('portal.connect.apply.title', { defaultValue: 'Join this opportunity' })}</Text>
                <TextInput
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    placeholder={t('portal.connect.apply.placeholder', { defaultValue: 'Write a short note for the coordinator' })}
                    style={styles.input}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleApply} disabled={applying}>
                    <Text style={styles.primaryButtonText}>{applying ? t('portal.connect.apply.loading', { defaultValue: 'Sending...' }) : t('portal.connect.apply.submit', { defaultValue: 'Apply now' })}</Text>
                </TouchableOpacity>
                {opportunity.sourceLink ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={openSource}>
                        <Text style={styles.secondaryButtonText}>{t('portal.connect.details.source', { defaultValue: 'Open source module' })}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    content: { padding: 20, gap: 16, paddingBottom: 36 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED' },
    title: { fontSize: 28, fontWeight: '800', color: '#7C2D12' },
    meta: { color: '#9A3412', fontWeight: '700' },
    description: { color: '#431407', lineHeight: 22 },
    detailText: { color: '#9A3412' },
    communityCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#FED7AA' },
    communityTitle: { fontSize: 17, fontWeight: '800', color: '#431407' },
    communityText: { marginTop: 6, color: '#7C2D12', lineHeight: 20 },
    infoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: '#FED7AA' },
    infoTitle: { fontSize: 16, fontWeight: '800', color: '#7C2D12' },
    infoText: { color: '#7C2D12', lineHeight: 20 },
    input: { minHeight: 92, textAlignVertical: 'top', backgroundColor: '#FFF7ED', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FDBA74' },
    primaryButton: { backgroundColor: '#C2410C', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    primaryButtonText: { color: '#FFF7ED', fontWeight: '800' },
    secondaryButton: { alignItems: 'center', paddingVertical: 12 },
    secondaryButtonText: { color: '#C2410C', fontWeight: '700' },
    emptyText: { color: '#7C2D12' },
});

export default ConnectOpportunityDetailsScreen;
