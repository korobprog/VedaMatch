import apiClient from '../lib/apiClient';

export interface CallDiagnosticsStats {
    durationSec?: number;
    localCandidates?: number;
    remoteCandidates?: number;
    iceConnectionState?: string;
    peerConnectionState?: string;
}

export interface CallDiagnosticsCreateRequest {
    callSessionId: string;
    peerUserId?: number;
    roomId?: number;
    direction?: 'incoming' | 'outgoing' | 'unknown' | string;
    mode?: 'p2p' | 'room' | 'sfu' | 'unknown' | string;
    event: string;
    result?: string;
    severity?: 'info' | 'warning' | 'error' | 'critical' | string;
    platform?: 'ios' | 'android' | 'web' | 'server' | string;
    networkType?: string;
    appVersion?: string;
    deviceModel?: string;
    message?: string;
    stats?: CallDiagnosticsStats;
    metadata?: Record<string, string | number | boolean | null | undefined>;
}

const trimOrUndefined = (value?: string) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim();
    return normalized ? normalized : undefined;
};

const sanitizeMetadata = (metadata?: Record<string, string | number | boolean | null | undefined>) => {
    if (!metadata) {
        return undefined;
    }

    const entries = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null);
    if (entries.length === 0) {
        return undefined;
    }

    return Object.fromEntries(entries);
};

export const callDiagnosticsService = {
    async submitReport(payload: CallDiagnosticsCreateRequest) {
        const body = {
            ...payload,
            callSessionId: payload.callSessionId.trim(),
            message: trimOrUndefined(payload.message),
            networkType: trimOrUndefined(payload.networkType),
            appVersion: trimOrUndefined(payload.appVersion),
            deviceModel: trimOrUndefined(payload.deviceModel),
            metadata: sanitizeMetadata(payload.metadata),
        };
        const { data } = await apiClient.post('/calls/diagnostics', body);
        return data;
    },
};
