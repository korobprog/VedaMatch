import apiClient from '../lib/apiClient';
import i18n from '../i18n';

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

const getAccountFallback = (
  key: 'requestDeletion' | 'deleteNow' | 'updateNickname'
): string => {
  const language = String(i18n.language || '').trim().toLowerCase();
  const copy = language.startsWith('ru')
    ? {
        requestDeletion: 'Не удалось запросить удаление аккаунта',
        deleteNow: 'Не удалось удалить аккаунт',
        updateNickname: 'Не удалось обновить никнейм',
      }
    : language.startsWith('hi')
      ? {
          requestDeletion: 'खाता हटाने का अनुरोध भेजा नहीं जा सका',
          deleteNow: 'खाता हटाया नहीं जा सका',
          updateNickname: 'निकनेम अपडेट नहीं हो सका',
        }
      : {
          requestDeletion: 'Failed to request account deletion',
          deleteNow: 'Failed to delete account',
          updateNickname: 'Failed to update nickname',
        };
  return copy[key];
};

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
      throw getApiError(error, getAccountFallback('requestDeletion'));
    }
  },

  async deleteAccountNow(): Promise<AccountDeletionResponse> {
    try {
      const response = await apiClient.delete('/account');
      return response.data;
    } catch (error) {
      throw getApiError(error, getAccountFallback('deleteNow'));
    }
  },

  async updateNickname(nickname: string): Promise<AccountNicknameUpdateResponse> {
    try {
      const response = await apiClient.patch('/profile/nickname', { nickname });
      return response.data;
    } catch (error) {
      throw getApiError(error, getAccountFallback('updateNickname'));
    }
  },
};
