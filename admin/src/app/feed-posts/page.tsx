'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen bg-[#faf9f6] text-[#2c1810]">
      <nav className="sticky top-0 z-30 border-b border-[#e7e5e4] bg-[#faf9f6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-400 to-red-600 text-xl font-black text-white shadow-lg">
              V
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold leading-none">VedaMatch</span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-orange-600">Ecosystem Agent</span>
            </div>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/feed-posts" className="font-bold text-[#2c1810]">
              Лента
            </Link>
            <Link href="/login" className="font-bold text-[#5c4d47] transition-colors hover:text-[#2c1810]">
              Вход
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02]"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 md:pt-14">
        <div className="mb-8 rounded-[2rem] border border-[#e7e5e4] bg-white/70 p-6 shadow-[0_20px_50px_-35px_rgba(44,24,16,0.5)]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2c3d5a] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-orange-700">
            <Rss className="h-4 w-4" />
            Лента VedaMatch
          </div>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">Публикации сообщества</h1>
          <p className="mt-3 text-lg text-[#5c4d47]">Актуальные посты, закрепы каналов и живые обновления.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#5c4d47]">
            <span className="rounded-xl border border-[#e7e5e4] bg-white px-3 py-1.5">Всего постов: {total}</span>
            <span className="rounded-xl border border-[#e7e5e4] bg-white px-3 py-1.5">
              Страница: {page} / {totalPages}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-600">
              <AlertCircle className="mx-auto mb-3 h-10 w-10" />
              <p className="font-semibold">Не удалось загрузить посты</p>
              <button onClick={() => mutate()} className="mt-3 text-sm underline">
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center p-24">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-3xl border border-[#e7e5e4] bg-white p-12 text-center text-[#5c4d47]">Нет постов</div>
          ) : (
            posts.map((post, idx) => {
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
                  className="rounded-[1.8rem] border border-[#e7e5e4] bg-white p-6 shadow-[0_16px_40px_-32px_rgba(44,24,16,0.55)]"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#7a6b63]">
                    <span className="rounded-full border border-[#e7e5e4] px-2.5 py-1 font-semibold text-[#2c1810]">#{postId}</span>
                    <span>{channelTitle}</span>
                    <span>•</span>
                    <span>{authorName}</span>
                    <span>•</span>
                    <span>{formatDate(publishedAt)}</span>
                    {post.isPinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                        <Pin className="h-3 w-3" />
                        Закреп
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-base leading-7 text-[#2c1810]">{content}</p>
                </article>
              );
            })
          )}
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-[#e7e5e4] bg-white p-3">
          <button
            onClick={() => canPrev && setPage((prev) => prev - 1)}
            disabled={!canPrev}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8d4d1] px-4 py-2 text-sm font-semibold text-[#2c1810] transition-colors hover:bg-[#f5f2ee] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </button>
          <div className="text-sm font-medium text-[#5c4d47]">
            Страница {page} / {totalPages}
          </div>
          <button
            onClick={() => canNext && setPage((prev) => prev + 1)}
            disabled={!canNext}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8d4d1] px-4 py-2 text-sm font-semibold text-[#2c1810] transition-colors hover:bg-[#f5f2ee] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Далее
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
