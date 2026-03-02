import apiClient from '../lib/apiClient';

export type ProSource = 'role' | 'subscription' | 'none';

export interface ProPlan {
  code: 'pro_7d' | 'pro_30d' | 'pro_90d' | string;
  days: number;
  priceLkm: number;
  title: string;
  badge?: string;
  isPopular?: boolean;
}

export interface ProSubscription {
  id?: number;
  planCode?: string;
  status?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface ProStatus {
  isProEffective: boolean;
  source: ProSource;
  roleFree: boolean;
  currentSubscription?: ProSubscription | null;
  remainingDays: number;
}

export interface ProPurchaseResponse {
  status: ProStatus;
  wallet?: {
    balance?: number;
    bonusBalance?: number;
    pendingBalance?: number;
  };
}

const getErrorCode = (error: any): string | undefined => {
  const raw = error?.response?.data?.errorCode;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  return undefined;
};

const getErrorMessage = (error: any, fallback: string): string => {
  const message = error?.response?.data?.error;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
};

export const proService = {
  async getPlans(): Promise<ProPlan[]> {
    const response = await apiClient.get('/pro/plans');
    const plans = Array.isArray(response?.data?.plans) ? response.data.plans : [];
    return plans;
  },

  async getStatus(): Promise<ProStatus> {
    const response = await apiClient.get('/pro/status');
    return response.data;
  },

  async purchase(planCode: string): Promise<ProPurchaseResponse> {
    try {
      const response = await apiClient.post('/pro/purchase', { planCode });
      return response.data;
    } catch (error: any) {
      const code = getErrorCode(error);
      const message = getErrorMessage(error, 'Не удалось купить PRO');
      const e = new Error(code ? `${message} [${code}]` : message);
      (e as any).code = code;
      (e as any).status = error?.response?.status;
      throw e;
    }
  },
};
