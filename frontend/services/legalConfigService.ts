import { API_PATH } from '../config/api.config';
import {
  DEFAULT_LEGAL_RUNTIME_CONFIG,
  normalizeLegalRuntimeConfig,
  type LegalRuntimeConfig,
} from '../content/legalDocuments';
import { authorizedFetch } from './authSessionService';

const LEGAL_CONFIG_URL = `${API_PATH}/legal/config`;

const parseJsonSafe = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const legalConfigService = {
  async getPublicConfig(): Promise<LegalRuntimeConfig> {
    try {
      const response = await authorizedFetch(
        LEGAL_CONFIG_URL,
        { method: 'GET' },
        { retry401: false },
      );

      if (!response.ok) {
        return DEFAULT_LEGAL_RUNTIME_CONFIG;
      }

      const payload = await parseJsonSafe(response);
      return normalizeLegalRuntimeConfig(payload);
    } catch (error) {
      console.warn('[legalConfigService] failed to fetch legal config', error);
      return DEFAULT_LEGAL_RUNTIME_CONFIG;
    }
  },
};

