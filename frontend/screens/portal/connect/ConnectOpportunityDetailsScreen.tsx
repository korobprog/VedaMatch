import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { ConnectFeedbackItem, ConnectOpportunityCard, ConnectTrustSummary, ConnectViewerApplication } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';
import { connectService } from '../../../services/connectService';
import { getConnectApplicationStatusLabel, getConnectEntryLevelLabel, getConnectFormatLabel, resolveConnectSourceRoute } from './connectUi';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectOpportunityDetails'>;

const ConnectOpportunityDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [message, setMessage] = useState('');
    const [opportunity, setOpportunity] = useState<ConnectOpportunityCard | null>(null);
    const [trustSummary, setTrustSummary] = useState<ConnectTrustSummary | null>(null);
    const [feedback, setFeedback] = useState<ConnectFeedbackItem[]>([]);
    const [canSubmitFeedback, setCanSubmitFeedback] = useState(false);
    const [canManageApplications, setCanManageApplications] = useState(false);
    const [viewerApplication, setViewerApplication] = useState<ConnectViewerApplication | null>(null);
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feltSafe, setFeltSafe] = useState(true);
    const [newcomerFriendly, setNewcomerFriendly] = useState(true);
    const [wouldReturn, setWouldReturn] = useState(true);

    useEffect(() => {
        setLoading(true);
        connectService.getOpportunity(route.params.opportunityId)
            .then((data) => {
                setOpportunity(data.opportunity);
                setTrustSummary(data.trustSummary || data.opportunity.trustSummary || null);
                setFeedback(Array.isArray(data.feedback) ? data.feedback : []);
                setCanSubmitFeedback(Boolean(data.canSubmitFeedback));
                setCanManageApplications(Boolean(data.canManageApplications));
                setViewerApplication(data.viewerApplication || null);
            })
            .catch((error) => {
                console.warn('[ConnectOpportunityDetails] load failed:', error);
                setOpportunity(null);
                setTrustSummary(null);
                setFeedback([]);
                setCanSubmitFeedback(false);
                setCanManageApplications(false);
                setViewerApplication(null);
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
            const data = await connectService.getOpportunity(opportunity.id);
            setOpportunity(data.opportunity);
            setTrustSummary(data.trustSummary || data.opportunity.trustSummary || null);
            setFeedback(Array.isArray(data.feedback) ? data.feedback : []);
            setCanSubmitFeedback(Boolean(data.canSubmitFeedback));
            setCanManageApplications(Boolean(data.canManageApplications));
            setViewerApplication(data.viewerApplication || null);
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

    const handleSubmitFeedback = async () => {
        if (!opportunity || feedbackRating < 1) {
            return;
        }
        setSubmittingFeedback(true);
        try {
            await connectService.submitFeedback(opportunity.id, {
                rating: feedbackRating,
                comment: feedbackComment,
                feltSafe,
                newcomerFriendly,
                wouldReturn,
                tags: [
                    feltSafe ? 'felt_safe' : '',
                    newcomerFriendly ? 'newcomer_friendly' : '',
                    wouldReturn ? 'would_return' : '',
                ].filter(Boolean),
            });
            const data = await connectService.getOpportunity(opportunity.id);
            setOpportunity(data.opportunity);
            setTrustSummary(data.trustSummary || data.opportunity.trustSummary || null);
            setFeedback(Array.isArray(data.feedback) ? data.feedback : []);
            setCanSubmitFeedback(Boolean(data.canSubmitFeedback));
            setCanManageApplications(Boolean(data.canManageApplications));
            setViewerApplication(data.viewerApplication || null);
            setFeedbackComment('');
            Alert.alert(
                t('portal.connect.feedback.successTitle', { defaultValue: 'Feedback saved' }),
                t('portal.connect.feedback.successBody', { defaultValue: 'Your feedback now helps future participants judge trust and fit.' }),
            );
        } catch (error: any) {
            Alert.alert(
                t('portal.connect.feedback.errorTitle', { defaultValue: 'Feedback failed' }),
                error?.message || t('portal.connect.feedback.errorBody', { defaultValue: 'Please try again.' }),
            );
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const openSource = () => {
        const resolved = resolveConnectSourceRoute(opportunity?.sourceLink);
        if (!resolved) {
            return;
        }
        navigation.navigate(resolved.screen as any, resolved.params as any);
    };

    const feedbackLockMessage = (() => {
        if (!viewerApplication) {
            return {
                title: t('portal.connect.feedback.lockedTitle', { defaultValue: 'Feedback opens after you join' }),
                body: t('portal.connect.feedback.lockedBody', {
                    defaultValue: 'Apply to this opportunity first. This keeps trust signals tied to real participation.',
                }),
            };
        }
        if (viewerApplication.status === 'pending') {
            return {
                title: t('portal.connect.feedback.pendingTitle', { defaultValue: 'Waiting for approval' }),
                body: t('portal.connect.feedback.pendingBody', {
                    defaultValue: 'Your request is pending. Feedback opens after the coordinator approves or records your participation.',
                }),
            };
        }
        if (viewerApplication.status === 'rejected') {
            return {
                title: t('portal.connect.feedback.rejectedTitle', { defaultValue: 'Application was not approved' }),
                body: t('portal.connect.feedback.rejectedBody', {
                    defaultValue: 'Feedback stays closed for rejected applications because there was no confirmed participation.',
                }),
            };
        }
        return {
            title: t('portal.connect.feedback.lockedTitle', { defaultValue: 'Feedback opens after you join' }),
            body: t('portal.connect.feedback.lockedBody', {
                defaultValue: 'Apply to this opportunity first. This keeps trust signals tied to real participation.',
            }),
        };
    })();

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
                {getConnectEntryLevelLabel(opportunity.entryLevel, t)} • {getConnectFormatLabel(opportunity.participationFormat, t)} • {opportunity.category}
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

            {trustSummary ? (
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{t('portal.connect.feedback.trustTitle', { defaultValue: 'Trust signals from recent participants' })}</Text>
                    <Text style={styles.infoText}>
                        {t('portal.connect.feedback.ratingLine', {
                            defaultValue: '{{rating}} / 5 based on {{count}} reviews',
                            rating: trustSummary.averageRating.toFixed(1),
                            count: trustSummary.reviewsCount,
                        })}
                    </Text>
                    <Text style={styles.detailText}>{t('portal.connect.feedback.feltSafe', { defaultValue: 'Felt safe' })}: {trustSummary.feltSafePercent}%</Text>
                    <Text style={styles.detailText}>{t('portal.connect.feedback.newcomerFriendly', { defaultValue: 'Friendly for newcomers' })}: {trustSummary.newcomerFriendlyPercent}%</Text>
                    <Text style={styles.detailText}>{t('portal.connect.feedback.wouldReturn', { defaultValue: 'Would join again' })}: {trustSummary.wouldReturnPercent}%</Text>
                </View>
            ) : null}

            {feedback.length > 0 ? (
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{t('portal.connect.feedback.recentTitle', { defaultValue: 'Recent feedback' })}</Text>
                    {feedback.map((item) => (
                        <View key={item.id} style={styles.feedbackCard}>
                            <Text style={styles.feedbackHeader}>{item.authorLabel} • {item.rating}/5</Text>
                            {item.comment ? <Text style={styles.feedbackBody}>{item.comment}</Text> : null}
                            <Text style={styles.feedbackMeta}>
                                {[
                                    item.feltSafe ? t('portal.connect.feedback.feltSafe', { defaultValue: 'Felt safe' }) : '',
                                    item.newcomerFriendly ? t('portal.connect.feedback.newcomerFriendly', { defaultValue: 'Friendly for newcomers' }) : '',
                                    item.wouldReturn ? t('portal.connect.feedback.wouldReturn', { defaultValue: 'Would join again' }) : '',
                                ].filter(Boolean).join(' • ')}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{t('portal.connect.apply.title', { defaultValue: 'Join this opportunity' })}</Text>
                {viewerApplication ? (
                    <View style={styles.applicationStatusCard}>
                        <Text style={styles.applicationStatusTitle}>
                            {t('portal.connect.apply.statusTitle', { defaultValue: 'Your application status' })}
                        </Text>
                        <Text style={styles.applicationStatusValue}>{getConnectApplicationStatusLabel(viewerApplication.status, t)}</Text>
                        {viewerApplication.reviewNote ? <Text style={styles.applicationStatusNote}>{viewerApplication.reviewNote}</Text> : null}
                    </View>
                ) : null}
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
                {canManageApplications ? (
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ConnectModeration', { opportunityId: opportunity.id })}>
                        <Text style={styles.secondaryButtonText}>{t('portal.connect.apply.manageApplications', { defaultValue: 'Manage participant applications' })}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{t('portal.connect.feedback.title', { defaultValue: 'Share feedback after participating' })}</Text>
                <Text style={styles.infoText}>{t('portal.connect.feedback.subtitle', { defaultValue: 'A quick review helps future participants understand trust, clarity and fit.' })}</Text>
                {canSubmitFeedback ? (
                    <>
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    style={[styles.ratingChip, feedbackRating === value && styles.ratingChipActive]}
                                    onPress={() => setFeedbackRating(value)}
                                >
                                    <Text style={[styles.ratingChipText, feedbackRating === value && styles.ratingChipTextActive]}>{value}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            value={feedbackComment}
                            onChangeText={setFeedbackComment}
                            multiline
                            placeholder={t('portal.connect.feedback.placeholder', { defaultValue: 'What felt clear, warm or difficult?' })}
                            style={styles.input}
                        />
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>{t('portal.connect.feedback.feltSafe', { defaultValue: 'Felt safe' })}</Text>
                            <Switch value={feltSafe} onValueChange={setFeltSafe} />
                        </View>
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>{t('portal.connect.feedback.newcomerFriendly', { defaultValue: 'Friendly for newcomers' })}</Text>
                            <Switch value={newcomerFriendly} onValueChange={setNewcomerFriendly} />
                        </View>
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>{t('portal.connect.feedback.wouldReturn', { defaultValue: 'Would join again' })}</Text>
                            <Switch value={wouldReturn} onValueChange={setWouldReturn} />
                        </View>
                        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitFeedback} disabled={submittingFeedback}>
                            <Text style={styles.primaryButtonText}>
                                {submittingFeedback
                                    ? t('portal.connect.feedback.submitting', { defaultValue: 'Saving...' })
                                    : t('portal.connect.feedback.submit', { defaultValue: 'Save feedback' })}
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.lockedCard}>
                        <Text style={styles.lockedTitle}>{feedbackLockMessage.title}</Text>
                        <Text style={styles.lockedText}>{feedbackLockMessage.body}</Text>
                    </View>
                )}
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
    ratingRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    ratingChip: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#FDBA74', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED' },
    ratingChipActive: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
    ratingChipText: { color: '#7C2D12', fontWeight: '700' },
    ratingChipTextActive: { color: '#FFF7ED' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 4 },
    switchLabel: { flex: 1, color: '#431407', fontWeight: '700' },
    feedbackCard: { padding: 12, borderRadius: 14, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', gap: 4 },
    feedbackHeader: { color: '#7C2D12', fontWeight: '800' },
    feedbackBody: { color: '#431407', lineHeight: 20 },
    feedbackMeta: { color: '#9A3412', lineHeight: 18 },
    applicationStatusCard: { padding: 12, borderRadius: 14, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', gap: 4 },
    applicationStatusTitle: { color: '#7C2D12', fontWeight: '800' },
    applicationStatusValue: { color: '#431407', fontWeight: '700' },
    applicationStatusNote: { color: '#7C2D12', lineHeight: 19 },
    lockedCard: { padding: 12, borderRadius: 14, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', gap: 6 },
    lockedTitle: { color: '#7C2D12', fontWeight: '800' },
    lockedText: { color: '#7C2D12', lineHeight: 20 },
    input: { minHeight: 92, textAlignVertical: 'top', backgroundColor: '#FFF7ED', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FDBA74' },
    primaryButton: { backgroundColor: '#C2410C', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    primaryButtonText: { color: '#FFF7ED', fontWeight: '800' },
    secondaryButton: { alignItems: 'center', paddingVertical: 12 },
    secondaryButtonText: { color: '#C2410C', fontWeight: '700' },
    emptyText: { color: '#7C2D12' },
});

export default ConnectOpportunityDetailsScreen;
