'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, BookOpen, Edit3, Loader2, Plus, Search, Star, Trash2 } from 'lucide-react';

import api from '@/lib/api';
import { DhamaAdminTabs } from '@/components/DhamaAdminTabs';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type CollectionStatus = 'draft' | 'published' | 'archived';
type LocaleTab = 'ru' | 'en' | 'hi';

interface LinkedPlace {
  id: number;
  slug: string;
  title: string;
  city: string;
  state: string;
  heroImageUrl?: string;
  isFeatured?: boolean;
}

interface HolyPlaceOption {
  id: number;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  titleRu: string;
  titleEn?: string;
  titleHi?: string;
  city: string;
  state: string;
}

interface DhamaCollection {
  id: number;
  slug: string;
  status: CollectionStatus;
  sortOrder: number;
  isFeatured: boolean;
  titleRu: string;
  titleEn?: string;
  titleHi?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionHi?: string;
  heroImageUrl?: string;
  linkedPlaceIds: number[];
  linkedPlaces: LinkedPlace[];
}

interface CollectionImportItem {
  id: number;
  slug: string;
  action: 'created' | 'updated';
}

interface CollectionImportSummary {
  created: number;
  updated: number;
  items: CollectionImportItem[];
}

const emptyForm: DhamaCollection = {
  id: 0,
  slug: '',
  status: 'draft',
  sortOrder: 0,
  isFeatured: false,
  titleRu: '',
  titleEn: '',
  titleHi: '',
  descriptionRu: '',
  descriptionEn: '',
  descriptionHi: '',
  heroImageUrl: '',
  linkedPlaceIds: [],
  linkedPlaces: [],
};

const localeTabs = [
  { id: 'ru', label: 'RU' },
  { id: 'en', label: 'EN' },
  { id: 'hi', label: 'HI' },
] as const;

const normalizeText = (value?: string) => (value || '').trim();

const buildValidationErrors = (collection: DhamaCollection): string[] => {
  const errors: string[] = [];
  const hasAnyTitle = [collection.titleRu, collection.titleEn, collection.titleHi].some((value) => normalizeText(value));
  const hasAnyDescription = [collection.descriptionRu, collection.descriptionEn, collection.descriptionHi].some((value) => normalizeText(value));

  if (!hasAnyTitle) {
    errors.push('Add at least one localized collection title.');
  }
  if (collection.status === 'published') {
    if (!normalizeText(collection.titleEn)) {
      errors.push('Published collections must include an English title for locale fallback.');
    }
    if (!hasAnyDescription) {
      errors.push('Published collections must include at least one description.');
    }
    if (collection.linkedPlaceIds.length === 0) {
      errors.push('Published collections must include at least one sacred place.');
    }
  }

  return errors;
};

export default function DhamaCollectionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CollectionStatus>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [localeTab, setLocaleTab] = useState<LocaleTab>('ru');
  const [placeSearch, setPlaceSearch] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState<CollectionImportSummary | null>(null);
  const [form, setForm] = useState<DhamaCollection>(emptyForm);

  const collectionsQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    if (featuredFilter === 'featured') params.set('featured', 'true');
    if (featuredFilter === 'regular') params.set('featured', 'false');
    return `/admin/dhama/collections?${params.toString()}`;
  }, [featuredFilter, search, statusFilter]);

  const { data: collectionsData, mutate: mutateCollections } = useSWR(collectionsQuery, fetcher);
  const { data: placeOptionsData } = useSWR('/admin/dhama/places?limit=200', fetcher);

  const collections: DhamaCollection[] = collectionsData?.collections || [];
  const placeOptions: HolyPlaceOption[] = placeOptionsData?.places || [];

  const filteredPlaces = useMemo(() => {
    const normalized = placeSearch.trim().toLowerCase();
    if (!normalized) {
      return placeOptions;
    }
    return placeOptions.filter((place) =>
      [place.titleRu, place.titleEn, place.titleHi, place.city, place.state, place.slug]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [placeOptions, placeSearch]);

  const openCreate = () => {
    setForm(emptyForm);
    setLocaleTab('ru');
    setPlaceSearch('');
    setFormErrors([]);
    setShowModal(true);
  };

  const openImport = () => {
    setImportText('');
    setImportError('');
    setImportSummary(null);
    setShowImportModal(true);
  };

  const openEdit = async (id: number) => {
    const { data } = await api.get(`/admin/dhama/collections/${id}`);
    setForm({
      ...emptyForm,
      ...data,
      linkedPlaceIds: Array.isArray(data.linkedPlaceIds) ? data.linkedPlaceIds : [],
      linkedPlaces: Array.isArray(data.linkedPlaces) ? data.linkedPlaces : [],
    });
    setLocaleTab('ru');
    setPlaceSearch('');
    setFormErrors([]);
    setShowModal(true);
  };

  const submit = async () => {
    const nextErrors = buildValidationErrors(form);
    setFormErrors(nextErrors);
    if (nextErrors.length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        heroImageUrl: normalizeText(form.heroImageUrl),
      };
      if (form.id) {
        await api.put(`/admin/dhama/collections/${form.id}`, payload);
      } else {
        await api.post('/admin/dhama/collections', payload);
      }
      setShowModal(false);
      await mutateCollections();
    } finally {
      setSaving(false);
    }
  };

  const publish = async (id: number) => {
    await api.post(`/admin/dhama/collections/${id}/publish`);
    await mutateCollections();
  };

  const archive = async (id: number) => {
    await api.post(`/admin/dhama/collections/${id}/archive`);
    await mutateCollections();
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this collection?')) return;
    await api.delete(`/admin/dhama/collections/${id}`);
    await mutateCollections();
  };

  const parseImportPayload = (raw: string) => {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.collections)) {
      return parsed;
    }
    throw new Error('JSON must be either an array of collections or an object with a "collections" array.');
  };

  const submitImport = async () => {
    const normalized = importText.trim();
    if (!normalized) {
      setImportError('Paste JSON before importing.');
      return;
    }

    try {
      const payload = parseImportPayload(normalized);
      setImporting(true);
      setImportError('');
      const { data } = await api.post('/admin/dhama/collections/import', payload);
      setImportSummary(data);
      await mutateCollections();
    } catch (error) {
      console.error('[DhamaCollectionsAdmin] import failed', error);
      if (error instanceof SyntaxError) {
        setImportError('JSON is invalid. Fix syntax and try again.');
      } else if (typeof error === 'object' && error && 'response' in error) {
        const apiError = error as { response?: { data?: { error?: string } } };
        setImportError(apiError.response?.data?.error || 'Import failed.');
      } else if (error instanceof Error) {
        setImportError(error.message);
      } else {
        setImportError('Import failed.');
      }
    } finally {
      setImporting(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      setImportError('');
      setImportSummary(null);
    } finally {
      event.target.value = '';
    }
  };

  const togglePlace = (id: number) => {
    setForm((prev) => {
      const has = prev.linkedPlaceIds.includes(id);
      return {
        ...prev,
        linkedPlaceIds: has ? prev.linkedPlaceIds.filter((placeId) => placeId !== id) : [...prev.linkedPlaceIds, id],
      };
    });
  };

  const updateField = (field: keyof DhamaCollection, value: string | number | boolean | number[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderLocaleField = (base: 'title' | 'description', label: string, multiline = false) => {
    const fieldName = `${base}${localeTab.charAt(0).toUpperCase()}${localeTab.slice(1)}` as keyof DhamaCollection;
    const value = String(form[fieldName] || '');
    return (
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{label} ({localeTab.toUpperCase()})</span>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => updateField(fieldName, e.target.value)}
            className="min-h-[110px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => updateField(fieldName, e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        )}
      </label>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <DhamaAdminTabs />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dhama Collections</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Curated thematic sets of sacred places for richer Dhama discovery flows.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openImport}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Import JSON
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add collection
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr,180px,180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or slug..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | CollectionStatus)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value as 'all' | 'featured' | 'regular')}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="all">All feature flags</option>
          <option value="featured">Featured only</option>
          <option value="regular">Non-featured</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Collection</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Places</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {collections.map((collection) => (
              <tr key={collection.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{collection.titleRu || collection.titleEn}</p>
                        {collection.isFeatured && <Star className="h-4 w-4 text-amber-500" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{collection.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-300">{collection.linkedPlaces?.length || 0}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    {collection.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {collection.status !== 'published' && (
                      <button onClick={() => publish(collection.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        Publish
                      </button>
                    )}
                    {collection.status === 'published' && (
                      <button onClick={() => archive(collection.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                        Archive
                      </button>
                    )}
                    <button onClick={() => openEdit(collection.id)} className="rounded-lg bg-slate-200 p-2 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(collection.id)} className="rounded-lg bg-rose-100 p-2 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
                  No collections match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{form.id ? 'Edit collection' : 'Create collection'}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Localized thematic grouping for Dhama discovery and curated pilgrim journeys.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                Close
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
              <div className="space-y-4">
                {formErrors.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      Fix these issues before saving
                    </div>
                    <ul className="space-y-1">
                      {formErrors.map((error) => (
                        <li key={error}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Slug</span>
                    <input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Status</span>
                    <select value={form.status} onChange={(e) => updateField('status', e.target.value as CollectionStatus)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Sort order</span>
                    <input type="number" value={form.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} />
                    Featured collection
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Hero image URL</span>
                    <input value={form.heroImageUrl || ''} onChange={(e) => updateField('heroImageUrl', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                </div>

                {normalizeText(form.heroImageUrl) ? (
                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Hero preview</h3>
                    <img src={form.heroImageUrl} alt="Hero preview" className="h-44 w-full rounded-2xl object-cover" />
                  </div>
                ) : null}

                <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex gap-2">
                    {localeTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setLocaleTab(tab.id)}
                        className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${localeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4">
                    {renderLocaleField('title', 'Title')}
                    {renderLocaleField('description', 'Description', true)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Linked sacred places</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Pick the holy places that belong to this collection.</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{form.linkedPlaceIds.length} selected</span>
                </div>
                <input
                  value={placeSearch}
                  onChange={(e) => setPlaceSearch(e.target.value)}
                  placeholder="Search places by title, city, state..."
                  className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <div className="max-h-[28rem] space-y-2 overflow-auto">
                  {filteredPlaces.map((place) => {
                    const label = place.titleRu || place.titleEn || place.titleHi || place.slug;
                    return (
                      <label key={place.id} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2 text-sm dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={form.linkedPlaceIds.includes(place.id)}
                          onChange={() => togglePlace(place.id)}
                        />
                        <span className="text-gray-700 dark:text-slate-200">
                          <strong>{label}</strong>
                          <span className="block text-xs text-gray-500 dark:text-slate-400">
                            {place.city}, {place.state} · {place.status}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {filteredPlaces.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">No sacred places match the current search.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                Cancel
              </button>
              <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save collection
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import collections</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Supports a raw JSON array or an object with a <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">collections</code> array. Linked places are resolved by <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">linkedPlaceSlugs</code>.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-semibold">Required per collection</p>
                <p className="mt-1">At minimum send <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">titleRu</code>. To link places, pass their slugs in <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">linkedPlaceSlugs</code>.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  <Plus className="h-4 w-4" />
                  Load file
                  <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
                </label>
                <button
                  onClick={submitImport}
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Import collections
                </button>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`[\n  {\n    "titleRu": "Брадж-мандал",\n    "titleEn": "Braj Mandal",\n    "linkedPlaceSlugs": ["vrindavan", "govardhan"]\n  }\n]`}
                className="min-h-[300px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              {importError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {importError}
                </div>
              )}

              {importSummary && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                  <p className="font-semibold">Import complete</p>
                  <p className="mt-1">Created: {importSummary.created}. Updated: {importSummary.updated}.</p>
                  <div className="mt-3 max-h-40 overflow-auto rounded-xl bg-white/70 p-3 dark:bg-slate-950/60">
                    <ul className="space-y-1">
                      {importSummary.items.map((item) => (
                        <li key={`${item.action}-${item.slug}`} className="font-mono text-xs">
                          {item.action} - {item.slug}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
