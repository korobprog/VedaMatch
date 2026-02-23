import apiClient from '../lib/apiClient';

export interface RoomSfuTokenResponse {
  token: string;
  wsUrl: string;
  roomName: string;
  participantIdentity: string;
}

export interface RoomSfuConfigResponse {
  enabled: boolean;
  provider: string;
  maxParticipants: number;
  maxSubscriptions: number;
  videoPreset: string;
  dynacastEnabled: boolean;
  adaptiveStreamEnabled: boolean;
  simulcastEnabled: boolean;
}

export const roomCallService = {
  async getRoomSfuConfig(roomId: number): Promise<RoomSfuConfigResponse> {
    try {
      const response = await apiClient.get(`/rooms/${roomId}/sfu/config`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to load room SFU config (${error?.response?.status ?? 'unknown'})`);
    }
  },

  async getRoomSfuToken(
    roomId: number,
    payload?: { participantName?: string; metadata?: Record<string, unknown> },
  ): Promise<RoomSfuTokenResponse> {
    try {
      const response = await apiClient.post(`/rooms/${roomId}/sfu/token`, payload || {});
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to issue room SFU token (${error?.response?.status ?? 'unknown'})`);
    }
  },
};
