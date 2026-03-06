import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Check, ShieldCheck, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import { connectService } from '../../../services/connectService';
import type { ConnectApplicationStatus, ConnectModerationApplication, ConnectModerationOpportunity, ConnectOpportunityCard } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';
import { getConnectApplicationStatusLabel, getConnectEntryLevelLabel, getConnectFormatLabel, getConnectStatusLabel } from './connectUi';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectModeration'>;
type ModerationFilter = 'moderation' | 'active' | 'paused';
type PendingModerationAction = { item: ConnectModerationOpportunity; approve: boolean } | null;
type PendingApplicationAction = { application: ConnectModerationApplication; targetStatus: ConnectApplicationStatus } | null;

const FILTERS: ModerationFilter[] = ['moderation', 'active', 'paused'];

const ConnectModerationScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { user } = useUser();
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const scopedOpportunityId = route.params?.opportunityId;
    const isScopedMode = typeof scopedOpportunityId === 'number' && scopedOpportunityId > 0;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<ModerationFilter>('moderation');
    const [items, setItems] = useState<ConnectModerationOpportunity[]>([]);
    const [scopedOpportunity, setScopedOpportunity] = useState<ConnectOpportunityCard | null>(null);
    const [expandedOpportunityId, setExpandedOpportunityId] = useState<number | null>(null);
    const [applicationsByOpportunity, setApplicationsByOpportunity] = useState<Record<number, ConnectModerationApplication[]>>({});
    const [applicationsLoadingId, setApplicationsLoadingId] = useState<number | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingModerationAction>(null);
    const [pendingApplicationAction, setPendingApplicationAction] = useState<PendingApplicationAction>(null);
    const [moderationReason, setModerationReason] = useState('');
    const [applicationReason, setApplicationReason] = useState('');
    const [applicationBusyId, setApplicationBusyId] = useState<number | null>(null);

    const reasonPresets = useMemo(
        () => ({
            approve: [
                t('portal.connect.moderation.presets.approve.goodFirstStep', { defaultValue: 'Good first step for newcomers' }),
                t('portal.connect.moderation.presets.approve.clearLogistics', { defaultValue: 'Clear logistics and expectations' }),
                t('portal.connect.moderation.presets.approve.verifiedCoordinator', { defaultValue: 'Coordinator context is clear enough' }),
            ],
            reject: [
                t('portal.connect.moderation.presets.reject.needLocation', { defaultValue: 'Needs clearer location details' }),
                t('portal.connect.moderation.presets.reject.needExpectations', { defaultValue: 'Needs clearer participant expectations' }),
                t('portal.connect.moderation.presets.reject.needVerification', { defaultValue: 'Needs coordinator verification' }),
            ],
        }),
        [t],
    );

    const locale = useMemo(() => {
        if (i18n.language === 'ru') {
            return 'ru-RU';
        }
        if (i18n.language === 'hi') {
            return 'hi-IN';
        }
        return 'en-US';
    }, [i18n.language]);

    const loadQueue = useCallback(async (status: ModerationFilter) => {
        const data = await connectService.getModerationQueue(status);
        setItems(data);
    }, []);

    const loadScopedOpportunity = useCallback(async (opportunityId: number) => {
        const data = await connectService.getOpportunity(opportunityId);
        setScopedOpportunity(data.opportunity);
        setExpandedOpportunityId(opportunityId);
        setItems([
            {
                id: data.opportunity.id,
                title: data.opportunity.title,
                description: data.opportunity.description,
                city: data.opportunity.city,
                district: data.opportunity.district,
                locationLabel: data.opportunity.locationLabel,
                category: data.opportunity.category,
                entryLevel: data.opportunity.entryLevel,
                participationFormat: data.opportunity.participationFormat,
                participationModes: data.opportunity.participationModes,
                newcomerFriendly: data.opportunity.newcomerFriendly,
                mentorAvailable: data.opportunity.mentorAvailable,
                requiresApproval: data.opportunity.requiresApproval,
                status: data.opportunity.status,
                startsAt: data.opportunity.startsAt,
            },
        ]);
    }, []);

    const loadApplications = useCallback(async (opportunityId: number) => {
        setApplicationsLoadingId(opportunityId);
        try {
            const data = await connectService.getApplications(opportunityId);
            setApplicationsByOpportunity((current) => ({ ...current, [opportunityId]: data }));
        } finally {
            setApplicationsLoadingId((current) => (current === opportunityId ? null : current));
        }
    }, []);

    useEffect(() => {
        if (!isAdmin && !isScopedMode) {
            setLoading(false);
            setItems([]);
            return;
        }
        setLoading(true);
        const loader = isScopedMode && scopedOpportunityId
            ? loadScopedOpportunity(scopedOpportunityId)
            : loadQueue(statusFilter);
        loader
            .then(async () => {
                if (isScopedMode && scopedOpportunityId) {
                    await loadApplications(scopedOpportunityId);
                }
            })
            .catch((error) => {
                console.warn('[ConnectModeration] failed to load queue:', error);
                Alert.alert(
                    t('portal.connect.moderation.errorTitle', { defaultValue: 'Moderation error' }),
                    isScopedMode
                        ? t('portal.connect.moderation.scopedLoadError', { defaultValue: 'Failed to load this opportunity for application management.' })
                        : t('portal.connect.moderation.loadError', { defaultValue: 'Failed to load moderation queue.' }),
                );
            })
            .finally(() => setLoading(false));
    }, [isAdmin, isScopedMode, loadApplications, loadQueue, loadScopedOpportunity, scopedOpportunityId, statusFilter, t]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (isScopedMode && scopedOpportunityId) {
                await loadScopedOpportunity(scopedOpportunityId);
            } else {
                await loadQueue(statusFilter);
            }
            if (expandedOpportunityId) {
                await loadApplications(expandedOpportunityId);
            }
        } catch (error) {
            console.warn('[ConnectModeration] refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [expandedOpportunityId, isScopedMode, loadApplications, loadQueue, loadScopedOpportunity, scopedOpportunityId, statusFilter]);

    const closeReasonModal = useCallback(() => {
        if (busyId !== null) {
            return;
        }
        setPendingAction(null);
        setModerationReason('');
    }, [busyId]);

    const closeApplicationModal = useCallback(() => {
        if (applicationBusyId !== null) {
            return;
        }
        setPendingApplicationAction(null);
        setApplicationReason('');
    }, [applicationBusyId]);

    const openReasonModal = useCallback((item: ConnectModerationOpportunity, approve: boolean) => {
        setPendingAction({ item, approve });
        setModerationReason(item.moderationNote || '');
    }, []);

    const openApplicationModal = useCallback((application: ConnectModerationApplication, targetStatus: ConnectApplicationStatus) => {
        setPendingApplicationAction({ application, targetStatus });
        setApplicationReason(application.reviewNote || '');
    }, []);

    const applyPreset = useCallback((preset: string) => {
        setModerationReason((current) => {
            const normalizedCurrent = current.trim();
            if (!normalizedCurrent) {
                return preset;
            }
            if (normalizedCurrent.includes(preset)) {
                return current;
            }
            return `${normalizedCurrent}\n${preset}`;
        });
    }, []);

    const moderate = useCallback(async (item: ConnectModerationOpportunity, approve: boolean, reason: string) => {
        if (busyId !== null) {
            return;
        }
        setBusyId(item.id);
        try {
            if (approve) {
                await connectService.approveOpportunity(item.id, { reason });
                Alert.alert(
                    t('portal.connect.moderation.approveSuccessTitle', { defaultValue: 'Approved' }),
                    t('portal.connect.moderation.approveSuccessBody', { defaultValue: 'The opportunity is now visible in Connect.' }),
                );
            } else {
                await connectService.rejectOpportunity(item.id, { reason });
                Alert.alert(
                    t('portal.connect.moderation.rejectSuccessTitle', { defaultValue: 'Rejected' }),
                    t('portal.connect.moderation.rejectSuccessBody', { defaultValue: 'The opportunity was removed from the public queue.' }),
                );
            }
            await loadQueue(statusFilter);
            setPendingAction(null);
            setModerationReason('');
        } catch (error) {
            console.warn('[ConnectModeration] action failed:', error);
            Alert.alert(
                t('portal.connect.moderation.errorTitle', { defaultValue: 'Moderation error' }),
                t('portal.connect.moderation.actionError', { defaultValue: 'Failed to update moderation status.' }),
            );
        } finally {
            setBusyId(null);
        }
    }, [busyId, loadQueue, statusFilter, t]);

    const submitModeration = useCallback(() => {
        if (!pendingAction) {
            return;
        }
        moderate(pendingAction.item, pendingAction.approve, moderationReason.trim()).catch(() => undefined);
    }, [moderate, moderationReason, pendingAction]);

    const toggleApplications = useCallback((opportunityId: number) => {
        setExpandedOpportunityId((current) => {
            if (current === opportunityId) {
                return null;
            }
            return opportunityId;
        });
        if (!applicationsByOpportunity[opportunityId]) {
            loadApplications(opportunityId).catch((error) => {
                console.warn('[ConnectModeration] applications load failed:', error);
                Alert.alert(
                    t('portal.connect.moderation.errorTitle', { defaultValue: 'Moderation error' }),
                    t('portal.connect.moderation.applicationsLoadError', { defaultValue: 'Failed to load applications.' }),
                );
            });
        }
    }, [applicationsByOpportunity, loadApplications, t]);

    const updateApplicationStatus = useCallback(async (application: ConnectModerationApplication, targetStatus: ConnectApplicationStatus, note: string) => {
        if (applicationBusyId !== null) {
            return;
        }
        setApplicationBusyId(application.id);
        try {
            await connectService.updateApplicationStatus(application.id, { status: targetStatus, note });
            await loadApplications(application.opportunityId);
            setPendingApplicationAction(null);
            setApplicationReason('');
            Alert.alert(
                t('portal.connect.moderation.applicationSuccessTitle', { defaultValue: 'Application updated' }),
                t('portal.connect.moderation.applicationSuccessBody', { defaultValue: 'Participant status was updated.' }),
            );
        } catch (error) {
            console.warn('[ConnectModeration] application action failed:', error);
            Alert.alert(
                t('portal.connect.moderation.errorTitle', { defaultValue: 'Moderation error' }),
                t('portal.connect.moderation.applicationActionError', { defaultValue: 'Failed to update application status.' }),
            );
        } finally {
            setApplicationBusyId(null);
        }
    }, [applicationBusyId, loadApplications, t]);

    const submitApplicationAction = useCallback(() => {
        if (!pendingApplicationAction) {
            return;
        }
        updateApplicationStatus(
            pendingApplicationAction.application,
            pendingApplicationAction.targetStatus,
            applicationReason.trim(),
        ).catch(() => undefined);
    }, [applicationReason, pendingApplicationAction, updateApplicationStatus]);

    const formatDateTime = useCallback((value?: string) => {
        if (!value) {
            return '';
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return '';
        }
        return new Intl.DateTimeFormat(locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(parsed);
    }, [locale]);

    const getApplicationActions = useCallback((application: ConnectModerationApplication): ConnectApplicationStatus[] => {
        switch (application.status) {
            case 'pending':
                return ['approved', 'rejected'];
            case 'approved':
                return ['attended', 'completed', 'rejected'];
            case 'attended':
                return ['completed'];
            default:
                return [];
        }
    }, []);

    if (!isAdmin && !isScopedMode) {
        return (
            <View style={styles.centered}>
                <Text style={styles.deniedTitle}>{t('portal.connect.moderation.deniedTitle', { defaultValue: 'Admin access required' })}</Text>
                <Text style={styles.deniedText}>{t('portal.connect.moderation.deniedBody', { defaultValue: 'This queue is only available to admins and moderators.' })}</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowLeft size={20} color="#431407" />
                </TouchableOpacity>
                <View style={styles.headerCopy}>
                    <Text style={styles.title}>
                        {isScopedMode
                            ? t('portal.connect.moderation.scopedTitle', { defaultValue: 'Participant applications' })
                            : t('portal.connect.moderation.title', { defaultValue: 'Connect moderation' })}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isScopedMode
                            ? scopedOpportunity?.title || t('portal.connect.moderation.scopedSubtitle', { defaultValue: 'Manage applications for this opportunity.' })
                            : t('portal.connect.moderation.subtitle', { defaultValue: 'Review native opportunities before they enter the public Connect feed.' })}
                    </Text>
                </View>
            </View>

            {!isScopedMode ? (
                <View style={styles.filterRow}>
                    {FILTERS.map((filter) => {
                        const active = statusFilter === filter;
                        return (
                            <TouchableOpacity
                                key={filter}
                                style={[styles.filterPill, active ? styles.filterPillActive : null]}
                                onPress={() => setStatusFilter(filter)}
                            >
                                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                                    {t(`portal.connect.moderation.filters.${filter}`, { defaultValue: getConnectStatusLabel(filter, t) })}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ) : null}

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#C2410C" />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.emptyCard}>
                    <ShieldCheck size={20} color="#9A3412" />
                    <Text style={styles.emptyTitle}>{t('portal.connect.moderation.emptyTitle', { defaultValue: 'Queue is empty' })}</Text>
                    <Text style={styles.emptyText}>{t('portal.connect.moderation.emptyBody', { defaultValue: 'There are no opportunities in this moderation state right now.' })}</Text>
                </View>
            ) : (
                items.map((item) => {
                    const busy = busyId === item.id;
                    const author = item.createdByUser?.spiritualName || item.createdByUser?.karmicName || item.createdByUser?.email || `#${item.id}`;
                    const createdAt = formatDateTime(item.createdAt);
                    const startsAt = formatDateTime(item.startsAt);
                    const moderatedAt = formatDateTime(item.moderatedAt);
                    return (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.statusChip}>{getConnectStatusLabel(item.status, t)}</Text>
                            </View>
                            <Text style={styles.cardMeta}>
                                {getConnectEntryLevelLabel(item.entryLevel, t)} • {getConnectFormatLabel(item.participationFormat, t)} • {item.category}
                            </Text>
                            {item.locationLabel ? <Text style={styles.location}>{item.locationLabel}</Text> : null}
                            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                            <View style={styles.infoStack}>
                                <Text style={styles.infoLine}>
                                    {t('portal.connect.moderation.createdBy', { defaultValue: 'Created by' })}: {author}
                                </Text>
                                {createdAt ? (
                                    <Text style={styles.infoLine}>
                                        {t('portal.connect.moderation.createdAt', { defaultValue: 'Created' })}: {createdAt}
                                    </Text>
                                ) : null}
                                {startsAt ? (
                                    <Text style={styles.infoLine}>
                                        {t('portal.connect.moderation.startsAt', { defaultValue: 'Starts' })}: {startsAt}
                                    </Text>
                                ) : null}
                                {item.moderationNote ? (
                                    <Text style={styles.infoLine}>
                                        {t('portal.connect.moderation.note', { defaultValue: 'Note' })}: {item.moderationNote}
                                    </Text>
                                ) : null}
                                {item.moderatedAt ? (
                                    <View style={styles.historyCard}>
                                        <Text style={styles.historyTitle}>
                                            {t('portal.connect.moderation.historyTitle', { defaultValue: 'Review history' })}
                                        </Text>
                                        <Text style={styles.historyText}>
                                            {t('portal.connect.moderation.historyStatus', {
                                                defaultValue: 'Last status: {{status}}',
                                                status: getConnectStatusLabel(item.status, t),
                                            })}
                                        </Text>
                                        {moderatedAt ? (
                                            <Text style={styles.historyText}>
                                                {t('portal.connect.moderation.historyDate', {
                                                    defaultValue: 'Reviewed: {{date}}',
                                                    date: moderatedAt,
                                                })}
                                            </Text>
                                        ) : null}
                                        {item.moderatedByUserId ? (
                                            <Text style={styles.historyText}>
                                                {t('portal.connect.moderation.historyReviewer', {
                                                    defaultValue: 'Reviewer ID: {{id}}',
                                                    id: item.moderatedByUserId,
                                                })}
                                            </Text>
                                        ) : null}
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.openButton}
                                    onPress={() => navigation.navigate('ConnectOpportunityDetails', { opportunityId: item.id })}
                                >
                                    <Text style={styles.openButtonText}>{t('portal.connect.actions.open', { defaultValue: 'Open details' })}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.openButton}
                                    onPress={() => toggleApplications(item.id)}
                                    testID={`connect-moderation-applications-toggle-${item.id}`}
                                >
                                    <Text style={styles.openButtonText}>
                                        {expandedOpportunityId === item.id
                                            ? t('portal.connect.moderation.hideApplications', { defaultValue: 'Hide applications' })
                                            : t('portal.connect.moderation.showApplications', { defaultValue: 'Manage applications' })}
                                    </Text>
                                </TouchableOpacity>
                                {item.status === 'moderation' ? (
                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.rejectButton]}
                                            disabled={busy}
                                            onPress={() => openReasonModal(item, false)}
                                        >
                                            <X size={16} color="#9F1239" />
                                            <Text style={styles.rejectText}>
                                                {busy ? t('portal.connect.moderation.working', { defaultValue: 'Saving...' }) : t('portal.connect.moderation.reject', { defaultValue: 'Reject' })}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.approveButton]}
                                            disabled={busy}
                                            onPress={() => openReasonModal(item, true)}
                                        >
                                            <Check size={16} color="#166534" />
                                            <Text style={styles.approveText}>
                                                {busy ? t('portal.connect.moderation.working', { defaultValue: 'Saving...' }) : t('portal.connect.moderation.approve', { defaultValue: 'Approve' })}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}
                            </View>
                            {expandedOpportunityId === item.id ? (
                                <View style={styles.applicationsCard}>
                                    <Text style={styles.applicationsTitle}>
                                        {t('portal.connect.moderation.applicationsTitle', { defaultValue: 'Participant applications' })}
                                    </Text>
                                    {applicationsLoadingId === item.id ? (
                                        <ActivityIndicator color="#C2410C" />
                                    ) : (applicationsByOpportunity[item.id] || []).length === 0 ? (
                                        <Text style={styles.applicationsEmpty}>
                                            {t('portal.connect.moderation.applicationsEmpty', { defaultValue: 'No applications yet for this opportunity.' })}
                                        </Text>
                                    ) : (
                                        (applicationsByOpportunity[item.id] || []).map((application) => {
                                            const applicant = application.user?.spiritualName || application.user?.karmicName || application.user?.email || `#${application.userId}`;
                                            const applicationActions = getApplicationActions(application);
                                            return (
                                                <View key={application.id} style={styles.applicationRow}>
                                                    <View style={styles.applicationHeader}>
                                                        <Text style={styles.applicationName}>{applicant}</Text>
                                                        <Text style={styles.applicationStatus}>{getConnectApplicationStatusLabel(application.status, t)}</Text>
                                                    </View>
                                                    {application.message ? <Text style={styles.applicationText}>{application.message}</Text> : null}
                                                    {application.reviewNote ? <Text style={styles.applicationNote}>{application.reviewNote}</Text> : null}
                                                    <View style={styles.applicationButtons}>
                                                        {applicationActions.map((actionStatus) => (
                                                            <TouchableOpacity
                                                                key={actionStatus}
                                                                style={styles.applicationButton}
                                                                onPress={() => openApplicationModal(application, actionStatus)}
                                                                testID={`connect-moderation-application-${application.id}-${actionStatus}`}
                                                            >
                                                                <Text style={styles.applicationButtonText}>
                                                                    {getConnectApplicationStatusLabel(actionStatus, t)}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>
                            ) : null}
                        </View>
                    );
                })
            )}
            <Modal
                visible={pendingAction !== null}
                transparent
                animationType="slide"
                onRequestClose={closeReasonModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            {pendingAction?.approve
                                ? t('portal.connect.moderation.reasonApproveTitle', { defaultValue: 'Approve with note' })
                                : t('portal.connect.moderation.reasonRejectTitle', { defaultValue: 'Reject with note' })}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            {t('portal.connect.moderation.reasonHint', { defaultValue: 'A short note helps other moderators understand this decision.' })}
                        </Text>
                        <View style={styles.presetWrap}>
                            {(pendingAction?.approve ? reasonPresets.approve : reasonPresets.reject).map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    style={styles.presetChip}
                                    onPress={() => applyPreset(preset)}
                                >
                                    <Text style={styles.presetChipText}>{preset}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            value={moderationReason}
                            onChangeText={setModerationReason}
                            placeholder={t('portal.connect.moderation.reasonPlaceholder', { defaultValue: 'Optional reason or reviewer note' })}
                            placeholderTextColor="#9A3412"
                            multiline
                            style={styles.reasonInput}
                            testID="connect-moderation-reason-input"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalSecondaryButton}
                                onPress={closeReasonModal}
                                disabled={busyId !== null}
                            >
                                <Text style={styles.modalSecondaryText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalPrimaryButton,
                                    pendingAction?.approve ? styles.approveButton : styles.rejectButton,
                                ]}
                                onPress={submitModeration}
                                disabled={busyId !== null}
                                testID="connect-moderation-submit"
                            >
                                <Text style={pendingAction?.approve ? styles.approveText : styles.rejectText}>
                                    {busyId !== null
                                        ? t('portal.connect.moderation.working', { defaultValue: 'Saving...' })
                                        : pendingAction?.approve
                                            ? t('portal.connect.moderation.approve', { defaultValue: 'Approve' })
                                            : t('portal.connect.moderation.reject', { defaultValue: 'Reject' })}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={pendingApplicationAction !== null}
                transparent
                animationType="slide"
                onRequestClose={closeApplicationModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            {t('portal.connect.moderation.applicationModalTitle', { defaultValue: 'Update application status' })}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            {pendingApplicationAction
                                ? t('portal.connect.moderation.applicationModalSubtitle', {
                                    defaultValue: 'Move this participant to {{status}} and leave a short note if needed.',
                                    status: getConnectApplicationStatusLabel(pendingApplicationAction.targetStatus, t),
                                })
                                : ''}
                        </Text>
                        <TextInput
                            value={applicationReason}
                            onChangeText={setApplicationReason}
                            placeholder={t('portal.connect.moderation.applicationReasonPlaceholder', { defaultValue: 'Optional note for the participant status update' })}
                            placeholderTextColor="#9A3412"
                            multiline
                            style={styles.reasonInput}
                            testID="connect-moderation-application-reason-input"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalSecondaryButton}
                                onPress={closeApplicationModal}
                                disabled={applicationBusyId !== null}
                            >
                                <Text style={styles.modalSecondaryText}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalPrimaryButton}
                                onPress={submitApplicationAction}
                                disabled={applicationBusyId !== null}
                                testID="connect-moderation-application-submit"
                            >
                                <Text style={styles.modalPrimaryActionText}>
                                    {applicationBusyId !== null
                                        ? t('portal.connect.moderation.working', { defaultValue: 'Saving...' })
                                        : pendingApplicationAction
                                            ? getConnectApplicationStatusLabel(pendingApplicationAction.targetStatus, t)
                                            : t('common.save', { defaultValue: 'Save' })}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    content: { padding: 20, paddingBottom: 40, gap: 16 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFF7ED' },
    deniedTitle: { fontSize: 20, fontWeight: '800', color: '#431407', textAlign: 'center' },
    deniedText: { marginTop: 8, color: '#7C2D12', textAlign: 'center', lineHeight: 21 },
    header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEDD5' },
    headerCopy: { flex: 1, gap: 4 },
    title: { fontSize: 26, fontWeight: '800', color: '#431407' },
    subtitle: { color: '#7C2D12', lineHeight: 21 },
    filterRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    filterPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FFEDD5', borderWidth: 1, borderColor: '#FDBA74' },
    filterPillActive: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
    filterText: { color: '#7C2D12', fontWeight: '700' },
    filterTextActive: { color: '#FFF7ED' },
    loadingWrap: { paddingVertical: 48 },
    emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FED7AA', alignItems: 'flex-start', gap: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#431407' },
    emptyText: { color: '#7C2D12', lineHeight: 21 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, gap: 10, borderWidth: 1, borderColor: '#FED7AA' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#431407' },
    statusChip: { color: '#C2410C', fontWeight: '800' },
    cardMeta: { color: '#9A3412', fontWeight: '600' },
    location: { color: '#C2410C' },
    description: { color: '#7C2D12', lineHeight: 21 },
    infoStack: { gap: 4 },
    infoLine: { color: '#9A3412', lineHeight: 20 },
    historyCard: { marginTop: 4, padding: 12, borderRadius: 14, backgroundColor: '#FFF1E6', borderWidth: 1, borderColor: '#FED7AA', gap: 4 },
    historyTitle: { color: '#7C2D12', fontWeight: '800' },
    historyText: { color: '#9A3412', lineHeight: 19 },
    cardActions: { gap: 12 },
    openButton: { alignSelf: 'flex-start' },
    openButtonText: { color: '#C2410C', fontWeight: '700' },
    applicationsCard: { marginTop: 4, padding: 12, borderRadius: 16, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', gap: 10 },
    applicationsTitle: { color: '#7C2D12', fontWeight: '800' },
    applicationsEmpty: { color: '#9A3412', lineHeight: 19 },
    applicationRow: { padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FDBA74', gap: 6 },
    applicationHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
    applicationName: { flex: 1, color: '#431407', fontWeight: '800' },
    applicationStatus: { color: '#C2410C', fontWeight: '700' },
    applicationText: { color: '#7C2D12', lineHeight: 19 },
    applicationNote: { color: '#9A3412', lineHeight: 19 },
    applicationButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    applicationButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#FFEDD5', borderWidth: 1, borderColor: '#FDBA74' },
    applicationButtonText: { color: '#7C2D12', fontWeight: '700', fontSize: 12 },
    actionButtons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
    rejectButton: { backgroundColor: '#FFF1F2', borderColor: '#FDA4AF' },
    approveButton: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
    rejectText: { color: '#9F1239', fontWeight: '700' },
    approveText: { color: '#166534', fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(67, 20, 7, 0.35)', justifyContent: 'flex-end', padding: 16 },
    modalCard: { backgroundColor: '#FFF7ED', borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: '#FED7AA' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#431407' },
    modalSubtitle: { color: '#7C2D12', lineHeight: 20 },
    presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    presetChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#FFEDD5', borderWidth: 1, borderColor: '#FDBA74' },
    presetChipText: { color: '#7C2D12', fontWeight: '700', fontSize: 12 },
    reasonInput: {
        minHeight: 108,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FDBA74',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#431407',
        textAlignVertical: 'top',
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalSecondaryButton: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FDBA74',
        backgroundColor: '#FFEDD5',
    },
    modalPrimaryButton: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#C2410C',
        backgroundColor: '#C2410C',
    },
    modalSecondaryText: { color: '#7C2D12', fontWeight: '700' },
    modalPrimaryActionText: { color: '#FFF7ED', fontWeight: '700' },
});

export default ConnectModerationScreen;
