import apiClient from '../lib/apiClient';

export type CallFeedbackReason =
    | 'audio_quality'
    | 'video_quality'
    | 'connection_stability'
    | 'latency'
    | 'echo'
    | 'other';

export interface CallFeedbackCreateRequest {
    callSessionId: string;
    peerUserId?: number;
    direction?: 'incoming' | 'outgoing';
    startedAt?: string;
    endedAt?: string;
    durationSec?: number;
    rating: number;
    reasons?: CallFeedbackReason[];
    comment?: string;
    platform?: 'ios' | 'android' | 'web' | string;
    networkType?: string;
    appVersion?: string;
    deviceModel?: string;
}

export interface CallSupportTransferRequest {
    callSessionId: string;
    amount: number;
}

export interface CallFeedbackAdminItem {
    id: number;
    callSessionId: string;
    raterUserId: number;
    peerUserId: number;
    direction: 'incoming' | 'outgoing';
    durationSec: number;
    rating: number;
    reasons: CallFeedbackReason[];
    comment?: string;
    platform?: string;
    networkType?: string;
    appVersion?: string;
    deviceModel?: string;
    supportTransferAmount?: number;
    createdAt: string;
}

const trimOrUndefined = (value?: string) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim();
    return normalized ? normalized : undefined;
};

export const callFeedbackService = {
    async submitFeedback(payload: CallFeedbackCreateRequest) {
        const body = {
            ...payload,
            callSessionId: payload.callSessionId.trim(),
            comment: trimOrUndefined(payload.comment),
            networkType: trimOrUndefined(payload.networkType),
            appVersion: trimOrUndefined(payload.appVersion),
            deviceModel: trimOrUndefined(payload.deviceModel),
        };
        const { data } = await apiClient.post('/calls/feedback', body);
        return data;
    },

    async sendSupportTransfer(payload: CallSupportTransferRequest) {
        const body = {
            callSessionId: payload.callSessionId.trim(),
            amount: payload.amount,
        };
        const { data } = await apiClient.post('/calls/support-transfer', body);
        return data;
    },
};
