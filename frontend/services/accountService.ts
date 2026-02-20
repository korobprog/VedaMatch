import { API_PATH } from '../config/api.config';
import { authorizedFetch } from './authSessionService';

type AccountDeletionStatus = 'scheduled' | 'deleted';

export interface AccountDeletionResponse {
  success: boolean;
  status: AccountDeletionStatus;
  effectiveAt?: string;
}

async function parseApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = await response.json();
    const message = typeof payload?.error === 'string' && payload.error.trim() ? payload.error.trim() : fallback;
    const code = typeof payload?.code === 'string' ? payload.code : '';
    const decorated = code ? `${message} (${code})` : message;
    return new Error(decorated);
  } catch {
    return new Error(fallback);
  }
}

export const accountService = {
  async requestDeletion(): Promise<AccountDeletionResponse> {
    const response = await authorizedFetch(`${API_PATH}/account/deletion-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw await parseApiError(response, 'Failed to request account deletion');
    }
    return response.json();
  },

  async deleteAccountNow(): Promise<AccountDeletionResponse> {
    const response = await authorizedFetch(`${API_PATH}/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw await parseApiError(response, 'Failed to delete account');
    }
    return response.json();
  },
};
