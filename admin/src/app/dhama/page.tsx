'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, Compass, Edit3, ImagePlus, Loader2, MapPin, Plus, Search, Star, Trash2, Upload } from 'lucide-react';
import api from '@/lib/api';
import { DhamaAdminTabs } from '@/components/DhamaAdminTabs';

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

interface DhamaFilters {
  placeTypes: string[];
  traditions: string[];
  states: string[];
  cities: string[];
}

interface DhamaFiltersPayload {
  placeTypes?: string[];
  types?: string[];
  traditions?: string[];
  states?: string[];
  cities?: string[];
}

interface HolyPlaceImportItem {
  id: number;
  slug: string;
  action: 'created' | 'updated';
}

interface HolyPlaceImportSummary {
  created: number;
  updated: number;
  items: HolyPlaceImportItem[];
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

const emptyFilters: DhamaFilters = {
  placeTypes: [],
  traditions: [],
  states: [],
  cities: [],
};

const normalizeStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
);

const normalizeDhamaFilters = (payload: DhamaFiltersPayload | null | undefined): DhamaFilters => ({
  placeTypes: normalizeStringArray(payload?.placeTypes).length > 0
    ? normalizeStringArray(payload?.placeTypes)
    : normalizeStringArray(payload?.types),
  traditions: normalizeStringArray(payload?.traditions),
  states: normalizeStringArray(payload?.states),
  cities: normalizeStringArray(payload?.cities),
});

const normalizeText = (value?: string) => (value || '').trim();

const buildValidationErrors = (place: HolyPlace): string[] => {
  const errors: string[] = [];
  const hasAnyTitle = [place.titleRu, place.titleEn, place.titleHi].some((value) => normalizeText(value));
  const hasAnyDescription = [place.descriptionRu, place.descriptionEn, place.descriptionHi].some((value) => normalizeText(value));

  if (!hasAnyTitle) {
    errors.push('Add at least one localized title.');
  }
  if (!normalizeText(place.placeType)) {
    errors.push('Place type is required.');
  }
  if (!normalizeText(place.city)) {
    errors.push('City is required.');
  }
  if (!normalizeText(place.state)) {
    errors.push('State is required.');
  }
  if (!normalizeText(place.country) || normalizeText(place.country).toLowerCase() !== 'india') {
    errors.push('Country must stay set to India for Dhama v1.');
  }
  if (!Number.isFinite(Number(place.latitude)) || Number(place.latitude) < -90 || Number(place.latitude) > 90) {
    errors.push('Latitude must be a valid number between -90 and 90.');
  }
  if (!Number.isFinite(Number(place.longitude)) || Number(place.longitude) < -180 || Number(place.longitude) > 180) {
    errors.push('Longitude must be a valid number between -180 and 180.');
  }
  if (place.status === 'published') {
    if (!normalizeText(place.titleEn)) {
      errors.push('Published places must include an English title for locale fallback.');
    }
    if (!hasAnyDescription) {
      errors.push('Published places must include at least one full description.');
    }
    if (!normalizeText(place.heroImageUrl) && place.gallery.length === 0) {
      errors.push('Published places need a hero image or at least one gallery image.');
    }
  }

  return errors;
};

export default function DhamaPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HolyPlaceStatus>('all');
  const [placeTypeFilter, setPlaceTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localeTab, setLocaleTab] = useState<'ru' | 'en' | 'hi'>('ru');
  const [mediaSearch, setMediaSearch] = useState('');
  const [yatraSearch, setYatraSearch] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState<HolyPlaceImportSummary | null>(null);
  const [form, setForm] = useState<HolyPlace>(emptyForm);

  const placesQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (placeTypeFilter !== 'all') params.set('type', placeTypeFilter);
    if (stateFilter !== 'all') params.set('state', stateFilter);
    if (search.trim()) params.set('search', search.trim());
    if (featuredFilter === 'featured') params.set('featured', 'true');
    if (featuredFilter === 'regular') params.set('featured', 'false');
    return `/admin/dhama/places?${params.toString()}`;
  }, [featuredFilter, placeTypeFilter, search, stateFilter, statusFilter]);

  const { data: placesData, mutate: mutatePlaces } = useSWR(placesQuery, fetcher);
  const { data: filtersData } = useSWR('/dhama/filters', fetcher);
  const { data: tracksData } = useSWR('/multimedia/tracks?type=audio&limit=100', fetcher);
  const { data: yatrasData } = useSWR('/yatra?limit=100', fetcher);

  const places: HolyPlace[] = placesData?.places || [];
  const filters: DhamaFilters = normalizeDhamaFilters(filtersData || emptyFilters);
  const tracks: MediaTrack[] = tracksData?.tracks || [];
  const yatras: YatraItem[] = yatrasData?.yatras || [];

  const filteredTracks = useMemo(() => {
    const normalized = mediaSearch.trim().toLowerCase();
    if (!normalized) {
      return tracks;
    }
    return tracks.filter((track) => [track.title, track.artist].join(' ').toLowerCase().includes(normalized));
  }, [mediaSearch, tracks]);

  const filteredYatras = useMemo(() => {
    const normalized = yatraSearch.trim().toLowerCase();
    if (!normalized) {
      return yatras;
    }
    return yatras.filter((yatra) => yatra.title.toLowerCase().includes(normalized));
  }, [yatras, yatraSearch]);

  const openCreate = () => {
    setForm(emptyForm);
    setLocaleTab('ru');
    setMediaSearch('');
    setYatraSearch('');
    setFormErrors([]);
    setUploadingField(null);
    setUploadProgress(0);
    setShowModal(true);
  };

  const openImport = () => {
    setImportError('');
    setImportSummary(null);
    setImportText('');
    setShowImportModal(true);
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
    setMediaSearch('');
    setYatraSearch('');
    setFormErrors([]);
    setUploadingField(null);
    setUploadProgress(0);
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

  const parseImportPayload = (raw: string) => {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.places)) {
      return parsed;
    }
    throw new Error('JSON must be either an array of places or an object with a "places" array.');
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
      const { data } = await api.post('/admin/dhama/places/import', payload);
      setImportSummary(data);
      await mutatePlaces();
    } catch (error) {
      console.error('[DhamaAdmin] import failed', error);
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

  const addGalleryItem = () => {
    setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ''] }));
  };

  const uploadImageFile = async (file: File, applyUrl: (url: string) => void, fieldKey: string) => {
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const PRESIGN_THRESHOLD = 10 * 1024 * 1024;

    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image is too large. Max size is 10MB.');
      return;
    }

    setUploadingField(fieldKey);
    setUploadProgress(0);

    try {
      if (file.size > PRESIGN_THRESHOLD) {
        const presignRes = await api.post('/admin/multimedia/presign', {
          filename: file.name,
          folder: 'images',
          contentType: file.type || 'application/octet-stream',
        });

        const { uploadUrl, finalUrl } = presignRes.data;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded * 100) / event.total);
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`S3 upload failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during image upload'));
          xhr.send(file);
        });

        applyUrl(finalUrl);
        setUploadProgress(100);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'images');

      const response = await api.post('/admin/multimedia/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const percent = event.total ? Math.round((event.loaded * 100) / event.total) : 0;
          setUploadProgress(percent);
        },
      });

      applyUrl(response.data.url);
      setUploadProgress(100);
    } catch (error) {
      console.error('[DhamaAdmin] image upload failed', error);
      alert('Image upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploadingField(null);
    }
  };

  const handleHeroUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file, (url) => updateField('heroImageUrl', url), 'hero');
    event.target.value = '';
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (typeof index === 'number') {
      await uploadImageFile(file, (url) => updateGalleryItem(index, url), `gallery-${index}`);
    } else {
      await uploadImageFile(file, (url) => {
        setForm((prev) => ({ ...prev, gallery: [...prev.gallery, url] }));
      }, 'gallery-new');
    }
    event.target.value = '';
  };

  const updateGalleryItem = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const removeGalleryItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addHeroToGallery = () => {
    const hero = normalizeText(form.heroImageUrl);
    if (!hero || form.gallery.includes(hero)) {
      return;
    }
    setForm((prev) => ({ ...prev, gallery: [...prev.gallery, hero] }));
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
      <DhamaAdminTabs />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dhama</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Holy places catalog, editorial content, media links and yatra links.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openImport}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add place
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr,180px]">
        <label className="relative block md:col-span-2">
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
        <select
          value={placeTypeFilter}
          onChange={(e) => setPlaceTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="all">All place types</option>
          {filters.placeTypes.map((placeType) => (
            <option key={placeType} value={placeType}>{placeType}</option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="all">All states</option>
          {filters.states.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Place</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Geo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {places.map((place) => (
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
            {places.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
                  No holy places match the current filters.
                </td>
              </tr>
            )}
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
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="block text-sm font-medium text-gray-700 dark:text-slate-200">Hero image URL</span>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                      <Upload className={`h-4 w-4 ${uploadingField === 'hero' ? 'animate-bounce' : ''}`} />
                      {uploadingField === 'hero' ? `Uploading ${uploadProgress}%` : 'Upload hero'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleHeroUpload} />
                    </label>
                  </div>
                  <input value={form.heroImageUrl || ''} onChange={(e) => updateField('heroImageUrl', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </label>
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Gallery</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Manage image URLs individually, upload files, and preview the current set.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addHeroToGallery}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Use hero in gallery
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                        <Upload className={`h-4 w-4 ${uploadingField === 'gallery-new' ? 'animate-bounce' : ''}`} />
                        {uploadingField === 'gallery-new' ? `Uploading ${uploadProgress}%` : 'Upload image'}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleGalleryUpload(e)} />
                      </label>
                      <button
                        type="button"
                        onClick={addGalleryItem}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Add URL slot
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {form.gallery.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">No gallery images yet.</p>
                    )}
                    {form.gallery.map((item, index) => (
                      <div key={`${index}-${item}`} className="rounded-2xl border border-gray-100 p-3 dark:border-slate-800">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Image {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100">
                              <Upload className={`h-3.5 w-3.5 ${uploadingField === `gallery-${index}` ? 'animate-bounce' : ''}`} />
                              {uploadingField === `gallery-${index}` ? `${uploadProgress}%` : 'Upload'}
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleGalleryUpload(e, index)} />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeGalleryItem(index)}
                              className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-300"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <input
                          value={item}
                          onChange={(e) => updateGalleryItem(index, e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        {normalizeText(item) ? (
                          <img
                            src={item}
                            alt={`Gallery ${index + 1}`}
                            className="mt-3 h-28 w-full rounded-xl object-cover"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {normalizeText(form.heroImageUrl) ? (
                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Hero preview</h3>
                    <img src={form.heroImageUrl} alt="Hero preview" className="h-40 w-full rounded-2xl object-cover" />
                  </div>
                ) : null}

                <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Linked audio</h3>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{form.linkedMediaTrackIds.length} selected</span>
                  </div>
                  <input
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder="Search audio by title or artist..."
                    className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="max-h-56 space-y-2 overflow-auto">
                    {filteredTracks.map((track) => (
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
                    {filteredTracks.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">No audio tracks match the current search.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Linked yatras</h3>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{form.linkedYatraIds.length} selected</span>
                  </div>
                  <input
                    value={yatraSearch}
                    onChange={(e) => setYatraSearch(e.target.value)}
                    placeholder="Search yatras by title..."
                    className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="max-h-56 space-y-2 overflow-auto">
                    {filteredYatras.map((yatra) => (
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
                    {filteredYatras.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">No yatras match the current search.</p>
                    )}
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import holy places</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Supports a raw JSON array or an object with a <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">places</code> array. Existing records are updated by slug.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-semibold">Required per place</p>
                <p className="mt-1">At minimum send <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">titleRu</code>, <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">placeType</code>, <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">city</code>, <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">state</code>, <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">country</code>, <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">latitude</code>, <code className="rounded bg-white/80 px-1 py-0.5 dark:bg-slate-900">longitude</code>.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  <Upload className="h-4 w-4" />
                  Load file
                  <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
                </label>
                <button
                  onClick={submitImport}
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import places
                </button>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`[\n  {\n    "titleRu": "Вриндаван",\n    "titleEn": "Vrindavan",\n    "placeType": "sacred-city",\n    "city": "Vrindavan",\n    "state": "Uttar Pradesh",\n    "country": "India",\n    "latitude": 27.58,\n    "longitude": 77.7\n  }\n]`}
                className="min-h-[320px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
