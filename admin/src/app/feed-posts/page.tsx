'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Pin, Rss } from 'lucide-react';
import api from '@/lib/api';

type FeedAuthor = {
  spiritualName?: string;
  karmicName?: string;
};

type FeedChannel = {
  title?: string;
};

type FeedPost = {
  ID?: number;
  id?: number;
  content?: string;
  isPinned?: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
  CreatedAt?: string | null;
  channel?: FeedChannel | null;
  author?: FeedAuthor | null;
};

type FeedResponse = {
  posts?: FeedPost[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const formatDate = (value?: string | null): string => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
};

export default function FeedPostsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return `/feed?${params.toString()}`;
  }, [page, limit]);

  const { data, error, mutate, isLoading } = useSWR<FeedResponse>(query, fetcher);

  const posts = Array.isArray(data?.posts) ? data?.posts : [];
  const total = Number.isFinite(data?.total) ? Number(data?.total) : 0;
  const totalPagesRaw = Number(data?.totalPages);
  const totalPages = Number.isFinite(totalPagesRaw) && totalPagesRaw > 0 ? totalPagesRaw : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Rss className="w-8 h-8 text-[var(--primary)]" />
            Feed Posts
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">Лента постов</p>
        </div>
        <div className="text-sm text-[var(--muted-foreground)]">Total: {total}</div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-red-200 bg-red-50 text-red-600">
          <AlertCircle className="w-10 h-10 mb-3" />
          <p className="font-semibold">Не удалось загрузить посты</p>
          <button onClick={() => mutate()} className="mt-3 text-sm underline">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 rounded-3xl border border-[var(--border)] bg-[var(--card)] text-center text-[var(--muted-foreground)]">
          Нет постов
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, idx) => {
            const postId = post.id ?? post.ID ?? idx;
            const content = post.content?.trim() ? post.content.trim() : 'Контент отсутствует';
            const channelTitle = post.channel?.title?.trim() || 'Unknown channel';
            const authorName =
              post.author?.spiritualName?.trim() ||
              post.author?.karmicName?.trim() ||
              'Unknown author';
            const publishedAt = post.publishedAt || post.createdAt || post.CreatedAt || null;

            return (
              <article
                key={postId}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
                  <span className="font-semibold text-[var(--foreground)]">#{postId}</span>
                  <span>{channelTitle}</span>
                  <span>{authorName}</span>
                  <span>{formatDate(publishedAt)}</span>
                  {post.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </span>
                  )}
                </div>
                <p className="text-sm leading-6 whitespace-pre-wrap">{content}</p>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
        <button
          onClick={() => canPrev && setPage((prev) => prev - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--secondary)]"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>

        <div className="text-sm text-[var(--muted-foreground)]">
          Page {page} / {totalPages}
        </div>

        <button
          onClick={() => canNext && setPage((prev) => prev + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--secondary)]"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
