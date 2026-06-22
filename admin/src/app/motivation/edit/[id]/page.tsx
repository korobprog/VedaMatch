'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle, Eye, EyeOff, Loader2, RefreshCw, Save } from 'lucide-react';
import api from '@/lib/api';

type Translation = {
  ID?: number;
  language: string;
  title?: string;
  text: string;
};

type MotivationPost = {
  ID: number;
  theme: string;
  imageUrl?: string;
  imagePrompt?: string;
  originalLanguage: string;
  status: string;
  error?: string;
  publishedAt?: string | null;
  translations?: Translation[];
};

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function MotivationEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: post, error, isLoading, mutate } = useSWR<MotivationPost>(
    id ? `/admin/motivation/posts/${id}` : null,
    fetcher,
    { refreshInterval: (data) => (data?.status === 'generating' ? 4000 : 0) },
  );

  const [imageUrl, setImageUrl] = useState('');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (post) {
      setImageUrl(post.imageUrl || '');
      setTranslations(post.translations ? [...post.translations].sort((a, b) => a.language.localeCompare(b.language)) : []);
    }
  }, [post]);

  const updateTranslation = (lang: string, field: 'title' | 'text', value: string) => {
    setTranslations((prev) =>
      prev.map((t) => (t.language === lang ? { ...t, [field]: value } : t)),
    );
  };

  const save = async (action?: 'publish' | 'unpublish') => {
    setSaving(true);
    try {
      await api.patch(`/admin/motivation/posts/${id}`, {
        imageUrl,
        action,
        translations: translations.map((t) => ({
          language: t.language,
          title: t.title || '',
          text: t.text,
        })),
      });
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/motivation/posts/${id}/regenerate`);
      await mutate();
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return <div className="p-6 text-red-400">Failed to load post.</div>;
  }
  if (isLoading || !post) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  const isPublished = post.status === 'published';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/motivation" className="flex items-center gap-2 text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            #{post.ID} · {post.status}
          </span>
          <button
            onClick={regenerate}
            disabled={busy || post.status === 'generating'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </button>
        </div>
      </div>

      <h1 className="text-xl font-bold text-white mb-1">{post.theme}</h1>
      {post.error ? <p className="text-red-400 text-sm mb-4">⚠ {post.error}</p> : null}

      {post.status === 'generating' ? (
        <div className="flex items-center gap-2 text-blue-300 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Generating… this page auto-refreshes.
        </div>
      ) : null}

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <div>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={post.theme} className="w-full rounded-xl border border-gray-700" />
          ) : (
            <div className="w-full aspect-square rounded-xl bg-gray-800 border border-gray-700" />
          )}
          <label className="block text-xs text-gray-400 mt-3 mb-1">Image URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-xs"
          />
          {post.imagePrompt ? (
            <p className="text-xs text-gray-500 mt-2">Prompt: {post.imagePrompt}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          {translations.length === 0 ? (
            <p className="text-gray-400">No translations yet.</p>
          ) : (
            translations.map((t) => (
              <div key={t.language} className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
                <div className="text-xs uppercase text-amber-400 font-semibold mb-2">
                  {t.language}
                  {t.language === post.originalLanguage ? ' (original)' : ''}
                </div>
                <input
                  value={t.title || ''}
                  onChange={(e) => updateTranslation(t.language, 'title', e.target.value)}
                  placeholder="Title"
                  className="w-full px-2 py-1.5 mb-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm"
                />
                <textarea
                  value={t.text}
                  onChange={(e) => updateTranslation(t.language, 'text', e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm"
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => save()}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
        {isPublished ? (
          <button
            onClick={() => save('unpublish')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50"
          >
            <EyeOff className="w-4 h-4" /> Unpublish
          </button>
        ) : (
          <button
            onClick={() => save('publish')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Save & Publish
          </button>
        )}
        {isPublished ? (
          <span className="flex items-center gap-1 text-emerald-400 text-sm">
            <Eye className="w-4 h-4" /> Live
          </span>
        ) : null}
      </div>
    </div>
  );
}
