import type { ConnectEntryLevel, ConnectParticipationFormat, ConnectSourceLink } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';

export const CONNECT_ENTRY_LEVEL_OPTIONS: ConnectEntryLevel[] = ['intro', 'one_time', 'regular', 'team_based'];
export const CONNECT_FORMAT_OPTIONS: ConnectParticipationFormat[] = ['offline', 'online', 'hybrid'];

export const getConnectEntryLevelLabel = (value: ConnectEntryLevel): string => {
    switch (value) {
        case 'intro':
            return 'Easy start';
        case 'one_time':
            return 'One-time';
        case 'regular':
            return 'Regular';
        case 'team_based':
            return 'Team-based';
        default:
            return value;
    }
};

export const getConnectFormatLabel = (value: ConnectParticipationFormat): string => {
    switch (value) {
        case 'offline':
            return 'Offline';
        case 'online':
            return 'Online';
        case 'hybrid':
            return 'Hybrid';
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
            return { screen: 'SevaHub' };
        case 'service':
            return { screen: 'ServiceDetail', params: { serviceId: sourceLink.id } };
        default:
            return null;
    }
};
