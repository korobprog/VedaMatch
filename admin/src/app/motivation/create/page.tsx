'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import api from '@/lib/api';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];

type MotivationCategory = {
  ID: number;
  name: string;
};

type CategoryResponse = { categories?: MotivationCategory[] };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function MotivationCreatePage() {
  const router = useRouter();
  const { data: categoryData } = useSWR<CategoryResponse>('/admin/motivation/categories', fetcher);
  const [theme, setTheme] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sourceLinks, setSourceLinks] = useState('');
  const [charLimit, setCharLimit] = useState(280);
  const [originalLanguage, setOriginalLanguage] = useState('ru');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const categories = categoryData?.categories ?? [];

  const submit = async () => {
    if (!theme.trim()) {
      setErrorMsg('Theme is required');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/admin/motivation/posts', {
        theme: theme.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
        sourceLinks: sourceLinks.trim(),
        charLimit: Number(charLimit) || 0,
        originalLanguage,
      });
      const id = res.data?.ID || res.data?.id;
      router.push(id ? `/motivation/edit/${id}` : '/motivation');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setErrorMsg(e.response?.data?.error || 'Failed to create post');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/motivation" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-amber-400" /> New Motivation Post
      </h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Theme *</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Overcoming fear and finding inner peace"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.ID} value={category.ID}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Reference links (optional, one per line)
          </label>
          <textarea
            value={sourceLinks}
            onChange={(e) => setSourceLinks(e.target.value)}
            rows={4}
            placeholder="https://example.com/article"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Character limit</label>
            <input
              type="number"
              value={charLimit}
              onChange={(e) => setCharLimit(Number(e.target.value))}
              min={50}
              max={2000}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Original language</label>
            <select
              value={originalLanguage}
              onChange={(e) => setOriginalLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMsg ? <p className="text-red-400 text-sm">{errorMsg}</p> : null}

        <button
          onClick={submit}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate
        </button>
        <p className="text-xs text-gray-500">
          The AI generates the text, an image and translations into the top-10 languages in the
          background. You can edit and publish on the next screen.
        </p>
      </div>
    </div>
  );
}
