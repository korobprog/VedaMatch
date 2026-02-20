import { API_PATH } from '../config/api.config';
import { authorizedFetch } from './authSessionService';
import { charityService } from './charityService';
import { supportAttributionService } from './supportAttributionService';

export interface RoomSupportConfig {
  enabled: boolean;
  projectId: number;
  defaultAmount: number;
  cooldownHours: number;
  platformContributionEnabled?: boolean;
  platformContributionDefault?: number;
  configSource?: 'db' | 'env' | 'none' | string;
  titleKey?: string;
  descriptionKey?: string;
}

export const roomSupportService = {
  async getSupportConfig(): Promise<RoomSupportConfig> {
    const response = await authorizedFetch(`${API_PATH}/support/config?service=rooms`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to load rooms support config (${response.status})`);
    }

    const data = await response.json();
    return {
      enabled: Boolean(data?.enabled),
      projectId: Number(data?.projectId ?? 0),
      defaultAmount: Number(data?.defaultAmount ?? 20),
      cooldownHours: Number(data?.cooldownHours ?? 24),
      platformContributionEnabled: Boolean(data?.platformContributionEnabled ?? true),
      platformContributionDefault: Number(data?.platformContributionDefault ?? 5),
      configSource: data?.configSource,
      titleKey: data?.titleKey,
      descriptionKey: data?.descriptionKey,
    };
  },

  async donateToRooms(
    projectId: number,
    amount: number,
    includeTips: boolean,
    message?: string,
    roomId?: number,
  ) {
    const attribution = supportAttributionService.build('rooms', 'support_prompt', {
      roomId,
      screen: 'RoomChat',
      feature: 'rooms_support_prompt',
    });
    return charityService.donate(undefined, {
      projectId,
      amount,
      includeTips,
      karmaMessage: message,
      isAnonymous: false,
      wantsCertificate: false,
      sourceService: attribution.sourceService,
      sourceTrigger: attribution.sourceTrigger,
      sourceRoomId: roomId,
      sourceContext: supportAttributionService.serializeContext(attribution.sourceContext),
      platformContributionEnabled: includeTips,
    });
  },
};
