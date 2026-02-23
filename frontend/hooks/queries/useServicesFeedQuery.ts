import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import {
  Service,
  ServiceCategory,
  ServiceFilters,
  ServiceListResponse,
  getServices,
} from '../../services/serviceService';

export interface ServicesFeedFilters {
  category: ServiceCategory | 'all';
  search: string;
  limit?: number;
}

export const servicesQueryKeys = {
  feed: (filters: ServicesFeedFilters) => ['services-feed', filters] as const,
};

export function useServicesFeedQuery(filters: ServicesFeedFilters) {
  return useInfiniteQuery({
    queryKey: servicesQueryKeys.feed(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const nextFilters: ServiceFilters = {
        page: pageParam,
        limit: filters.limit ?? 20,
      };

      if (filters.category !== 'all') {
        nextFilters.category = filters.category;
      }

      const normalizedSearch = filters.search.trim();
      if (normalizedSearch) {
        nextFilters.search = normalizedSearch;
      }

      return getServices(nextFilters);
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function flattenServicesPages(data?: InfiniteData<ServiceListResponse>): Service[] {
  if (!data) {
    return [];
  }

  const result: Service[] = [];
  const seen = new Set<number>();

  for (const page of data.pages) {
    for (const service of page.services || []) {
      if (seen.has(service.id)) {
        continue;
      }
      seen.add(service.id);
      result.push(service);
    }
  }

  return result;
}
