import { InfiniteData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { NewsItem, NewsListResponse, newsService } from '../../services/newsService';

export interface NewsFeedFilters {
  lang: 'ru' | 'en';
  category?: string;
  madh?: string;
  personalized: boolean;
  limit?: number;
}

export const newsQueryKeys = {
  feed: (filters: NewsFeedFilters) => ['news-feed', filters] as const,
  preferences: () => ['news-preferences'] as const,
};

export function useNewsFeedQuery(filters: NewsFeedFilters) {
  return useInfiniteQuery({
    queryKey: newsQueryKeys.feed(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      newsService.getNews({
        page: pageParam,
        limit: filters.limit ?? 10,
        lang: filters.lang,
        category: filters.category || undefined,
        madh: filters.madh,
        personalized: filters.personalized,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function useNewsPreferencesQuery() {
  return useQuery({
    queryKey: newsQueryKeys.preferences(),
    queryFn: async () => {
      const [subscriptions, favorites] = await Promise.all([
        newsService.getSubscriptions(),
        newsService.getFavorites(),
      ]);

      return {
        subscriptions,
        favorites,
      };
    },
    staleTime: 30_000,
  });
}

export function flattenNewsPages(data?: InfiniteData<NewsListResponse>): NewsItem[] {
  if (!data) {
    return [];
  }

  const result: NewsItem[] = [];
  const seen = new Set<number>();

  for (const page of data.pages) {
    for (const item of page.news || []) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      result.push(item);
    }
  }

  return result;
}
