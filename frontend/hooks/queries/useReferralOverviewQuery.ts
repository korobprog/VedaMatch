import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';

export interface ReferralStats {
  totalInvited: number;
  activeInvited: number;
  totalEarned: number;
}

export interface ReferralInfo {
  id: number;
  name: string;
  avatarUrl: string;
  status: 'pending' | 'active';
  joinedAt: string;
}

export interface InviteData {
  inviteCode: string;
  deepLink: string;
  webLink: string;
  shareText: string;
}

export interface ReferralOverviewResponse {
  invite: InviteData | null;
  stats: ReferralStats | null;
  referrals: ReferralInfo[];
}

export const referralQueryKeys = {
  overview: (limit: number) => ['referral-overview', limit] as const,
};

export function useReferralOverviewQuery(limit = 50) {
  return useQuery<ReferralOverviewResponse>({
    queryKey: referralQueryKeys.overview(limit),
    queryFn: async () => {
      const { data } = await apiClient.get('/referral/overview', { params: { limit } });
      return {
        invite: data?.invite || null,
        stats: data?.stats || null,
        referrals: Array.isArray(data?.referrals) ? data.referrals : [],
      };
    },
  });
}
