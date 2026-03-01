import apiClient from '../lib/apiClient';

type AccountDeletionStatus = 'scheduled' | 'deleted';

export interface AccountDeletionResponse {
  success: boolean;
  status: AccountDeletionStatus;
  effectiveAt?: string;
}

export interface AccountNicknameUpdateResponse {
  message: string;
  user: any;
}

const getApiError = (error: any, fallback: string): Error => {
  const payload = error?.response?.data;
  const message = typeof payload?.error === 'string' && payload.error.trim() ? payload.error.trim() : fallback;
  const code = typeof payload?.code === 'string' ? payload.code : '';
  const decorated = code ? `${message} (${code})` : message;
  return new Error(decorated);
};

export const accountService = {
  async requestDeletion(): Promise<AccountDeletionResponse> {
    try {
      const response = await apiClient.post('/account/deletion-request', {});
      return response.data;
    } catch (error) {
      throw getApiError(error, 'Failed to request account deletion');
    }
  },

  async deleteAccountNow(): Promise<AccountDeletionResponse> {
    try {
      const response = await apiClient.delete('/account');
      return response.data;
    } catch (error) {
      throw getApiError(error, 'Failed to delete account');
    }
  },

  async updateNickname(nickname: string): Promise<AccountNicknameUpdateResponse> {
    try {
      const response = await apiClient.patch('/profile/nickname', { nickname });
      return response.data;
    } catch (error) {
      throw getApiError(error, 'Failed to update nickname');
    }
  },
};
