import apiClient from '../lib/apiClient';
import {
  DhamaCollection,
  DhamaCollectionListResponse,
  DhamaCollectionPlacePreview,
  DhamaCollectionSummary,
  HolyPlaceDetail,
  HolyPlaceFilters,
  HolyPlaceFiltersResponse,
  HolyPlaceListResponse,
  HolyPlaceMapResponse,
} from '../types/dhama';

const normalizeDhamaCollectionSummary = (payload: Partial<DhamaCollectionSummary> | null | undefined): DhamaCollectionSummary => ({
  id: Number(payload?.id || 0),
  slug: String(payload?.slug || ''),
  status: payload?.status,
  sortOrder: Number(payload?.sortOrder || 0),
  isFeatured: Boolean(payload?.isFeatured),
  title: String(payload?.title || ''),
  description: String(payload?.description || ''),
  heroImageUrl: payload?.heroImageUrl ? String(payload.heroImageUrl) : undefined,
  locale: (payload?.locale || 'en') as 'ru' | 'en' | 'hi',
  availableLocales: Array.isArray(payload?.availableLocales) ? payload.availableLocales.filter(Boolean) : [],
  placesCount: Number(payload?.placesCount || 0),
});

const normalizeDhamaCollectionPlacePreview = (
  payload: Partial<DhamaCollectionPlacePreview> | null | undefined,
): DhamaCollectionPlacePreview => ({
  id: Number(payload?.id || 0),
  slug: String(payload?.slug || ''),
  title: String(payload?.title || ''),
  city: String(payload?.city || ''),
  state: String(payload?.state || ''),
  heroImageUrl: payload?.heroImageUrl ? String(payload.heroImageUrl) : undefined,
  isFeatured: Boolean(payload?.isFeatured),
});

const normalizeDhamaCollection = (payload: Partial<DhamaCollection> | null | undefined): DhamaCollection => ({
  ...normalizeDhamaCollectionSummary(payload),
  places: Array.isArray(payload?.places) ? payload.places.map((place) => normalizeDhamaCollectionPlacePreview(place)) : [],
});

const normalizeHolyPlaceDetail = (payload: Partial<HolyPlaceDetail> | null | undefined): HolyPlaceDetail => ({
  id: Number(payload?.id || 0),
  slug: String(payload?.slug || ''),
  status: payload?.status,
  sortOrder: Number(payload?.sortOrder || 0),
  isFeatured: Boolean(payload?.isFeatured),
  title: String(payload?.title || ''),
  shortDescription: String(payload?.shortDescription || ''),
  description: String(payload?.description || ''),
  visitRules: String(payload?.visitRules || ''),
  etiquette: String(payload?.etiquette || ''),
  pilgrimageTips: String(payload?.pilgrimageTips || ''),
  practices: String(payload?.practices || ''),
  faq: String(payload?.faq || ''),
  placeType: String(payload?.placeType || ''),
  tradition: payload?.tradition ? String(payload.tradition) : undefined,
  city: String(payload?.city || ''),
  state: String(payload?.state || ''),
  country: String(payload?.country || ''),
  latitude: Number(payload?.latitude || 0),
  longitude: Number(payload?.longitude || 0),
  bestSeason: payload?.bestSeason ? String(payload.bestSeason) : undefined,
  bestTime: payload?.bestTime ? String(payload.bestTime) : undefined,
  heroImageUrl: payload?.heroImageUrl ? String(payload.heroImageUrl) : undefined,
  gallery: Array.isArray(payload?.gallery) ? payload!.gallery.filter(Boolean) : [],
  locale: (payload?.locale || 'en') as 'ru' | 'en' | 'hi',
  availableLocales: Array.isArray(payload?.availableLocales) ? payload!.availableLocales.filter(Boolean) : [],
  linkedMedia: Array.isArray(payload?.linkedMedia) ? payload!.linkedMedia : [],
  linkedYatras: Array.isArray(payload?.linkedYatras) ? payload!.linkedYatras : [],
  collections: Array.isArray(payload?.collections) ? payload!.collections.map((collection) => normalizeDhamaCollectionSummary(collection)) : [],
});

class DhamaService {
  async getPlaces(filters: HolyPlaceFilters = {}): Promise<HolyPlaceListResponse> {
    const response = await apiClient.get('/dhama/places', { params: filters });
    return response.data;
  }

  async getPlace(slug: string): Promise<HolyPlaceDetail> {
    const response = await apiClient.get(`/dhama/places/${slug}`);
    return normalizeHolyPlaceDetail(response.data);
  }

  async getCollections(): Promise<DhamaCollectionListResponse> {
    const response = await apiClient.get('/dhama/collections', { params: { limit: 20 } });
    return {
      ...response.data,
      collections: Array.isArray(response.data?.collections)
        ? response.data.collections.map((collection: Partial<DhamaCollection>) => normalizeDhamaCollection(collection))
        : [],
    };
  }

  async getCollection(slug: string): Promise<DhamaCollection> {
    const response = await apiClient.get(`/dhama/collections/${slug}`);
    return normalizeDhamaCollection(response.data);
  }

  async getMapMarkers(filters: HolyPlaceFilters = {}): Promise<HolyPlaceMapResponse> {
    const response = await apiClient.get('/dhama/map/markers', { params: filters });
    return response.data;
  }

  async getFilters(): Promise<HolyPlaceFiltersResponse> {
    const response = await apiClient.get('/dhama/filters');
    return response.data;
  }
}

export const dhamaService = new DhamaService();
export { normalizeDhamaCollection, normalizeDhamaCollectionSummary, normalizeHolyPlaceDetail };
