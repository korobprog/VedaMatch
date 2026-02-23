import apiClient from '../lib/apiClient';
import {
  DEFAULT_LEGAL_RUNTIME_CONFIG,
  normalizeLegalRuntimeConfig,
  type LegalRuntimeConfig,
} from '../content/legalDocuments';

const LEGAL_CONFIG_URL = '/legal/config';

export const legalConfigService = {
  async getPublicConfig(): Promise<LegalRuntimeConfig> {
    try {
      const response = await apiClient.get(LEGAL_CONFIG_URL, {
        __skipAuthRetry: true,
      } as any);
      if (!response?.data) {
        return DEFAULT_LEGAL_RUNTIME_CONFIG;
      }
      return normalizeLegalRuntimeConfig(response.data);
    } catch (error) {
      console.warn('[legalConfigService] failed to fetch legal config', error);
      return DEFAULT_LEGAL_RUNTIME_CONFIG;
    }
  },
};
