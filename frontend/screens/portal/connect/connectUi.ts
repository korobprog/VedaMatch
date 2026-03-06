import type { ConnectApplicationStatus, ConnectEntryLevel, ConnectParticipationFormat, ConnectSourceLink } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';

type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

export const CONNECT_ENTRY_LEVEL_OPTIONS: ConnectEntryLevel[] = ['intro', 'one_time', 'regular', 'team_based'];
export const CONNECT_FORMAT_OPTIONS: ConnectParticipationFormat[] = ['offline', 'online', 'hybrid'];

export const getConnectEntryLevelLabel = (value: ConnectEntryLevel, t?: TranslateFn): string => {
    switch (value) {
        case 'intro':
            return t?.('portal.connect.entryLevels.intro', { defaultValue: 'Easy start' }) ?? 'Easy start';
        case 'one_time':
            return t?.('portal.connect.entryLevels.one_time', { defaultValue: 'One-time' }) ?? 'One-time';
        case 'regular':
            return t?.('portal.connect.entryLevels.regular', { defaultValue: 'Regular' }) ?? 'Regular';
        case 'team_based':
            return t?.('portal.connect.entryLevels.team_based', { defaultValue: 'Team-based' }) ?? 'Team-based';
        default:
            return value;
    }
};

export const getConnectFormatLabel = (value: ConnectParticipationFormat, t?: TranslateFn): string => {
    switch (value) {
        case 'offline':
            return t?.('portal.connect.formats.offline', { defaultValue: 'Offline' }) ?? 'Offline';
        case 'online':
            return t?.('portal.connect.formats.online', { defaultValue: 'Online' }) ?? 'Online';
        case 'hybrid':
            return t?.('portal.connect.formats.hybrid', { defaultValue: 'Hybrid' }) ?? 'Hybrid';
        default:
            return value;
    }
};

export const getConnectStatusLabel = (value: 'moderation' | 'active' | 'filled' | 'completed' | 'paused', t?: TranslateFn): string => {
    switch (value) {
        case 'moderation':
            return t?.('portal.connect.statuses.moderation', { defaultValue: 'Moderation' }) ?? 'Moderation';
        case 'active':
            return t?.('portal.connect.statuses.active', { defaultValue: 'Active' }) ?? 'Active';
        case 'filled':
            return t?.('portal.connect.statuses.filled', { defaultValue: 'Filled' }) ?? 'Filled';
        case 'completed':
            return t?.('portal.connect.statuses.completed', { defaultValue: 'Completed' }) ?? 'Completed';
        case 'paused':
            return t?.('portal.connect.statuses.paused', { defaultValue: 'Paused' }) ?? 'Paused';
        default:
            return value;
    }
};

export const getConnectApplicationStatusLabel = (value: ConnectApplicationStatus, t?: TranslateFn): string => {
    switch (value) {
        case 'pending':
            return t?.('portal.connect.applicationStatuses.pending', { defaultValue: 'Pending approval' }) ?? 'Pending approval';
        case 'approved':
            return t?.('portal.connect.applicationStatuses.approved', { defaultValue: 'Approved' }) ?? 'Approved';
        case 'attended':
            return t?.('portal.connect.applicationStatuses.attended', { defaultValue: 'Attended' }) ?? 'Attended';
        case 'completed':
            return t?.('portal.connect.applicationStatuses.completed', { defaultValue: 'Completed' }) ?? 'Completed';
        case 'rejected':
            return t?.('portal.connect.applicationStatuses.rejected', { defaultValue: 'Rejected' }) ?? 'Rejected';
        default:
            return value;
    }
};

export const resolveConnectSourceRoute = (
    sourceLink?: ConnectSourceLink | null,
): { screen: keyof RootStackParamList; params?: Record<string, unknown> } | null => {
    if (!sourceLink) {
        return null;
    }
    switch (sourceLink.type) {
        case 'yatra':
            return { screen: 'YatraDetail', params: { yatraId: sourceLink.id } };
        case 'seva':
            return { screen: 'SevaProjectDetails', params: { projectId: sourceLink.id } };
        case 'service':
            return { screen: 'ServiceDetail', params: { serviceId: sourceLink.id } };
        default:
            return null;
    }
};
