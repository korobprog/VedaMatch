import { useQuery } from '@tanstack/react-query';
import { ShelterListResponse, YatraListResponse } from '../../types/yatra';
import { yatraService } from '../../services/yatraService';

export interface TravelListFilters {
  search: string;
  limit?: number;
}

export const travelQueryKeys = {
  yatras: (filters: TravelListFilters) => ['travel-yatras', filters] as const,
  shelters: (filters: TravelListFilters) => ['travel-shelters', filters] as const,
};

export function useYatrasQuery(filters: TravelListFilters) {
  return useQuery<YatraListResponse>({
    queryKey: travelQueryKeys.yatras(filters),
    queryFn: () =>
      yatraService.getYatras({
        search: filters.search.trim() || undefined,
        status: 'open',
        page: 1,
        limit: filters.limit ?? 20,
      }),
  });
}

export function useSheltersQuery(filters: TravelListFilters) {
  return useQuery<ShelterListResponse>({
    queryKey: travelQueryKeys.shelters(filters),
    queryFn: () =>
      yatraService.getShelters({
        search: filters.search.trim() || undefined,
        page: 1,
        limit: filters.limit ?? 20,
      }),
  });
}
