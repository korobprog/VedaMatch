'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, Loader2, Plus, Quote, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

type Translation = {
  ID?: number;
  language: string;
  title?: string;
  text: string;
};

type MotivationPost = {
  ID: number;
  categoryId?: number | null;
  category?: MotivationCategory | null;
  theme: string;
  imageUrl?: string;
  originalLanguage: string;
  status: string;
  source: string;
  error?: string;
  publishedAt?: string | null;
  CreatedAt?: string | null;
  translations?: Translation[];
};

type ListResponse = { posts?: MotivationPost[] };
type CategoryResponse = { categories?: MotivationCategory[] };

type MotivationCategory = {
  ID: number;
  name: string;
  slug: string;
  color?: string;
  description?: string;
};

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const STATUSES = ['', 'draft', 'generating', 'ready', 'published', 'failed'];

const statusColor: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-300',
  generating: 'bg-blue-500/20 text-blue-300',
  ready: 'bg-amber-500/20 text-amber-300',
  published: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-red-500/20 text-red-300',
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function MotivationListPage() {
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#f59e0b');
  const [categoryError, setCategoryError] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const queryParams = new URLSearchParams();
  if (status) queryParams.set('status', status);
  if (categoryId) queryParams.set('categoryId', categoryId);
  const querySuffix = queryParams.toString();
  const query = `/admin/motivation/posts${querySuffix ? `?${querySuffix}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR<ListResponse>(query, fetcher, {
    refreshInterval: 5000,
  });
  const { data: categoryData, mutate: mutateCategories } = useSWR<CategoryResponse>(
    '/admin/motivation/categories',
    fetcher,
  );

  const posts = data?.posts ?? [];
  const categories = categoryData?.categories ?? [];

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryError('Category name is required');
      return;
    }
    setCreatingCategory(true);
    setCategoryError('');
    try {
      await api.post('/admin/motivation/categories', {
        name: newCategoryName.trim(),
        color: newCategoryColor.trim(),
      });
      setNewCategoryName('');
      await mutateCategories();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setCategoryError(e.response?.data?.error || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Quote className="w-6 h-6 text-amber-400" /> Motivation Posts
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/motivation/create"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            <Plus className="w-4 h-4" /> Create
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-full text-sm border ${
              status === s
                ? 'bg-amber-500 text-black border-amber-500'
                : 'bg-gray-800 text-gray-300 border-gray-700'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-xl bg-gray-800/60 border border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex-1">
            <label className="block text-sm text-gray-300 mb-1">Post category filter</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.ID} value={category.ID}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-[2]">
            <label className="block text-sm text-gray-300 mb-1">Create category</label>
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
              />
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="h-10 w-12 rounded-lg bg-gray-900 border border-gray-700"
                title="Category color"
              />
              <button
                onClick={createCategory}
                disabled={creatingCategory}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
              >
                {creatingCategory ? 'Creating...' : 'Add'}
              </button>
            </div>
            {categoryError ? <p className="text-xs text-red-400 mt-1">{categoryError}</p> : null}
          </div>
        </div>
        {categories.length > 0 ? (
          <div className="flex gap-2 mt-3 flex-wrap">
            {categories.map((category) => (
              <span
                key={category.ID}
                className="text-xs px-2 py-1 rounded-full border border-gray-700 text-white"
                style={{ backgroundColor: category.color || '#4b5563' }}
              >
                {category.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" /> Failed to load posts
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <p className="text-gray-400">No posts yet.</p>
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => (
            <Link
              key={post.ID}
              href={`/motivation/edit/${post.ID}`}
              className="flex gap-4 p-4 rounded-xl bg-gray-800/60 border border-gray-700 hover:border-amber-500 transition"
            >
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.imageUrl}
                  alt={post.theme}
                  className="w-20 h-20 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-700 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">#{post.ID}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      statusColor[post.status] || 'bg-gray-600/30 text-gray-300'
                    }`}
                  >
                    {post.status}
                  </span>
                  <span className="text-xs text-gray-500 uppercase">{post.originalLanguage}</span>
                  <span className="text-xs text-gray-600">{post.source}</span>
                  <span className="text-xs text-gray-600">
                    · {post.translations?.length ?? 0} langs
                  </span>

                  {post.category ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: post.category.color || '#4b5563' }}
                    >
                      {post.category.name}
                    </span>
                  ) : null}
                </div>
                <p className="text-white font-medium truncate">{post.theme}</p>
                {post.error ? (
                  <p className="text-xs text-red-400 mt-1 truncate">⚠ {post.error}</p>
                ) : null}
                <p className="text-xs text-gray-500 mt-1">Created: {formatDate(post.CreatedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
