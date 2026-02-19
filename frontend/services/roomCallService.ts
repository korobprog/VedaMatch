import { API_PATH } from '../config/api.config';
import { authorizedFetch } from './authSessionService';

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
    const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}/sfu/config`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(`Failed to load room SFU config (${response.status})`);
    }
    return response.json();
  },

  async getRoomSfuToken(
    roomId: number,
    payload?: { participantName?: string; metadata?: Record<string, unknown> },
  ): Promise<RoomSfuTokenResponse> {
    const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}/sfu/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    if (!response.ok) {
      throw new Error(`Failed to issue room SFU token (${response.status})`);
    }
    return response.json();
  },
};
