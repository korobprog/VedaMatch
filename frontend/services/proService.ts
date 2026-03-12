import apiClient from '../lib/apiClient';

export type ProSource = 'role' | 'subscription' | 'none';

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


export const proService = {
  async getStatus(): Promise<ProStatus> {
    const response = await apiClient.get('/pro/status');
    return response.data;
  },
};
