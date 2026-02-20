import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PATH } from '../config/api.config';
import { authorizedFetch } from './authSessionService';
import { charityService } from './charityService';
import { supportAttributionService } from './supportAttributionService';

export interface MultimediaSupportConfig {
  enabled: boolean;
  projectId: number;
  defaultAmount: number;
  cooldownHours: number;
  platformContributionEnabled?: boolean;
  platformContributionDefault?: number;
  configSource?: 'db' | 'env' | 'none' | string;
}

const PROMPT_KEY_PREFIX = 'multimedia_support_prompt';
const INTERACTIONS_KEY_PREFIX = 'multimedia_support_interactions';

export const multimediaSupportService = {
  async getSupportConfig(): Promise<MultimediaSupportConfig> {
    const response = await authorizedFetch(`${API_PATH}/support/config?service=multimedia`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to load multimedia support config (${response.status})`);
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
    };
  },

  async donateToMultimedia(
    projectId: number,
    amount: number,
    includeTips: boolean,
    message?: string,
    trigger: 'support_prompt' | 'manual' = 'support_prompt',
    screen?: string,
  ) {
    const attribution = supportAttributionService.build('multimedia', trigger, {
      screen: screen || 'MultimediaHub',
      feature: 'multimedia_support_prompt',
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
      sourceContext: supportAttributionService.serializeContext(attribution.sourceContext),
      platformContributionEnabled: includeTips,
    });
  },

  async getPromptCooldown(userId: number): Promise<number> {
    const key = `${PROMPT_KEY_PREFIX}:${userId}`;
    const raw = await AsyncStorage.getItem(key);
    const ts = Number.parseInt(raw || '0', 10);
    return Number.isFinite(ts) ? ts : 0;
  },

  async setPromptCooldown(userId: number): Promise<void> {
    const key = `${PROMPT_KEY_PREFIX}:${userId}`;
    await AsyncStorage.setItem(key, String(Date.now()));
  },

  async incrementInteractions(userId: number): Promise<number> {
    const key = `${INTERACTIONS_KEY_PREFIX}:${userId}`;
    const raw = await AsyncStorage.getItem(key);
    const current = Number.parseInt(raw || '0', 10);
    const next = (Number.isFinite(current) ? current : 0) + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  },

  async resetInteractions(userId: number): Promise<void> {
    const key = `${INTERACTIONS_KEY_PREFIX}:${userId}`;
    await AsyncStorage.setItem(key, '0');
  },
};

