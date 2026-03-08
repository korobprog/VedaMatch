'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Compass, Edit3, Loader2, MapPin, Plus, Search, Star, Trash2 } from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type HolyPlaceStatus = 'draft' | 'published' | 'archived';

interface HolyPlace {
  id: number;
  slug: string;
  status: HolyPlaceStatus;
  isFeatured: boolean;
  sortOrder: number;
  titleRu: string;
  titleEn: string;
  titleHi: string;
  shortDescriptionRu?: string;
  shortDescriptionEn?: string;
  shortDescriptionHi?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionHi?: string;
  visitRulesRu?: string;
  visitRulesEn?: string;
  visitRulesHi?: string;
  etiquetteRu?: string;
  etiquetteEn?: string;
  etiquetteHi?: string;
  pilgrimageTipsRu?: string;
  pilgrimageTipsEn?: string;
  pilgrimageTipsHi?: string;
  practicesRu?: string;
  practicesEn?: string;
  practicesHi?: string;
  faqRu?: string;
  faqEn?: string;
  faqHi?: string;
  placeType: string;
  tradition?: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  bestSeason?: string;
  bestTime?: string;
  heroImageUrl?: string;
  gallery: string[];
  linkedMediaTrackIds: number[];
  linkedYatraIds: number[];
}

interface MediaTrack {
  ID: number;
  title: string;
  artist?: string;
}

interface YatraItem {
  id: number;
  title: string;
  startDate?: string;
}

const emptyForm: HolyPlace = {
  id: 0,
  slug: '',
  status: 'draft',
  isFeatured: false,
  sortOrder: 0,
  titleRu: '',
  titleEn: '',
  titleHi: '',
  shortDescriptionRu: '',
  shortDescriptionEn: '',
  shortDescriptionHi: '',
  descriptionRu: '',
  descriptionEn: '',
  descriptionHi: '',
  visitRulesRu: '',
  visitRulesEn: '',
  visitRulesHi: '',
  etiquetteRu: '',
  etiquetteEn: '',
  etiquetteHi: '',
  pilgrimageTipsRu: '',
  pilgrimageTipsEn: '',
  pilgrimageTipsHi: '',
  practicesRu: '',
  practicesEn: '',
  practicesHi: '',
  faqRu: '',
  faqEn: '',
  faqHi: '',
  placeType: '',
  tradition: '',
  city: '',
  state: '',
  country: 'India',
  latitude: 0,
  longitude: 0,
  bestSeason: '',
  bestTime: '',
  heroImageUrl: '',
  gallery: [],
  linkedMediaTrackIds: [],
  linkedYatraIds: [],
};

const localeTabs = [
  { id: 'ru', label: 'RU' },
  { id: 'en', label: 'EN' },
  { id: 'hi', label: 'HI' },
] as const;

export default function DhamaPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HolyPlaceStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localeTab, setLocaleTab] = useState<'ru' | 'en' | 'hi'>('ru');
  const [form, setForm] = useState<HolyPlace>(emptyForm);

  const placesQuery = statusFilter === 'all'
    ? '/admin/dhama/places?limit=100'
    : `/admin/dhama/places?limit=100&status=${statusFilter}`;

  const { data: placesData, mutate: mutatePlaces } = useSWR(placesQuery, fetcher);
  const { data: tracksData } = useSWR('/multimedia/tracks?type=audio&limit=100', fetcher);
  const { data: yatrasData } = useSWR('/yatra?limit=100', fetcher);

  const places: HolyPlace[] = placesData?.places || [];
  const tracks: MediaTrack[] = tracksData?.tracks || [];
  const yatras: YatraItem[] = yatrasData?.yatras || [];

  const filteredPlaces = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return places;
    }
    return places.filter((place) =>
      [place.titleRu, place.titleEn, place.titleHi, place.city, place.state, place.slug, place.placeType]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [places, search]);

  const openCreate = () => {
    setForm(emptyForm);
    setLocaleTab('ru');
    setShowModal(true);
  };

  const openEdit = async (id: number) => {
    const { data } = await api.get(`/admin/dhama/places/${id}`);
    setForm({
      ...emptyForm,
      ...data,
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      linkedMediaTrackIds: Array.isArray(data.linkedMediaTrackIds) ? data.linkedMediaTrackIds : [],
      linkedYatraIds: Array.isArray(data.linkedYatraIds) ? data.linkedYatraIds : [],
    });
    setLocaleTab('ru');
    setShowModal(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        gallery: form.gallery.filter(Boolean),
      };
      if (form.id) {
        await api.put(`/admin/dhama/places/${form.id}`, payload);
      } else {
        await api.post('/admin/dhama/places', payload);
      }
      setShowModal(false);
      await mutatePlaces();
    } finally {
      setSaving(false);
    }
  };

  const publish = async (id: number) => {
    await api.post(`/admin/dhama/places/${id}/publish`);
    await mutatePlaces();
  };

  const archive = async (id: number) => {
    await api.post(`/admin/dhama/places/${id}/archive`);
    await mutatePlaces();
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this holy place?')) return;
    await api.delete(`/admin/dhama/places/${id}`);
    await mutatePlaces();
  };

  const toggleSelection = (field: 'linkedMediaTrackIds' | 'linkedYatraIds', id: number) => {
    setForm((prev) => {
      const has = prev[field].includes(id);
      return {
        ...prev,
        [field]: has ? prev[field].filter((itemId) => itemId !== id) : [...prev[field], id],
      };
    });
  };

  const updateField = (field: keyof HolyPlace, value: string | number | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderLocaleField = (base: string, label: string, multiline = false) => {
    const fieldName = `${base}${localeTab.charAt(0).toUpperCase()}${localeTab.slice(1)}` as keyof HolyPlace;
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dhama</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Holy places catalog, editorial content, media links and yatra links.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add place
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr,180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, city, state, slug..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | HolyPlaceStatus)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Place</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Geo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredPlaces.map((place) => (
              <tr key={place.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{place.titleRu || place.titleEn}</p>
                        {place.isFeatured && <Star className="h-4 w-4 text-amber-500" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{place.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {place.city}, {place.state}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-slate-300">{place.placeType}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                    {place.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {place.status !== 'published' && (
                      <button onClick={() => publish(place.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        Publish
                      </button>
                    )}
                    {place.status === 'published' && (
                      <button onClick={() => archive(place.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                        Archive
                      </button>
                    )}
                    <button onClick={() => openEdit(place.id)} className="rounded-lg bg-slate-200 p-2 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(place.id)} className="rounded-lg bg-rose-100 p-2 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{form.id ? 'Edit holy place' : 'Create holy place'}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Structured content with localized fields and linked media/yatras.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                Close
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Slug</span>
                    <input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Status</span>
                    <select value={form.status} onChange={(e) => updateField('status', e.target.value as HolyPlaceStatus)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Place type</span>
                    <input value={form.placeType} onChange={(e) => updateField('placeType', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Tradition</span>
                    <input value={form.tradition || ''} onChange={(e) => updateField('tradition', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">City</span>
                    <input value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">State</span>
                    <input value={form.state} onChange={(e) => updateField('state', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Country</span>
                    <input value={form.country} onChange={(e) => updateField('country', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} />
                    Featured
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Latitude</span>
                    <input type="number" value={form.latitude} onChange={(e) => updateField('latitude', Number(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Longitude</span>
                    <input type="number" value={form.longitude} onChange={(e) => updateField('longitude', Number(e.target.value))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Best season</span>
                    <input value={form.bestSeason || ''} onChange={(e) => updateField('bestSeason', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Best time</span>
                    <input value={form.bestTime || ''} onChange={(e) => updateField('bestTime', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                </div>

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
                    {renderLocaleField('shortDescription', 'Short description', true)}
                    {renderLocaleField('description', 'Full description', true)}
                    {renderLocaleField('visitRules', 'Visit rules', true)}
                    {renderLocaleField('etiquette', 'Etiquette', true)}
                    {renderLocaleField('pilgrimageTips', 'Pilgrimage tips', true)}
                    {renderLocaleField('practices', 'Recommended practices', true)}
                    {renderLocaleField('faq', 'FAQ', true)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Hero image URL</span>
                  <input value={form.heroImageUrl || ''} onChange={(e) => updateField('heroImageUrl', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Gallery URLs (one per line)</span>
                  <textarea
                    value={form.gallery.join('\n')}
                    onChange={(e) => updateField('gallery', e.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
                    className="min-h-[120px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Linked audio</h3>
                  <div className="max-h-56 space-y-2 overflow-auto">
                    {tracks.map((track) => (
                      <label key={track.ID} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2 text-sm dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={form.linkedMediaTrackIds.includes(track.ID)}
                          onChange={() => toggleSelection('linkedMediaTrackIds', track.ID)}
                        />
                        <span className="text-gray-700 dark:text-slate-200">
                          <strong>{track.title}</strong>
                          {track.artist ? ` — ${track.artist}` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Linked yatras</h3>
                  <div className="max-h-56 space-y-2 overflow-auto">
                    {yatras.map((yatra) => (
                      <label key={yatra.id} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2 text-sm dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={form.linkedYatraIds.includes(yatra.id)}
                          onChange={() => toggleSelection('linkedYatraIds', yatra.id)}
                        />
                        <span className="text-gray-700 dark:text-slate-200">
                          <strong>{yatra.title}</strong>
                          {yatra.startDate ? ` — ${new Date(yatra.startDate).toLocaleDateString()}` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                Cancel
              </button>
              <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save place
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
