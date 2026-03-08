export type HolyPlaceStatus = 'draft' | 'published' | 'archived';

export interface HolyPlaceSummary {
  id: number;
  slug: string;
  status?: HolyPlaceStatus;
  sortOrder: number;
  isFeatured: boolean;
  title: string;
  shortDescription: string;
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
  locale: 'ru' | 'en' | 'hi';
  availableLocales: string[];
}

export interface HolyPlaceLinkedMedia {
  id: number;
  title: string;
  artist?: string;
  description?: string;
  duration?: number;
  mediaType: 'audio' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface HolyPlaceLinkedYatra {
  id: number;
  title: string;
  theme?: string;
  status?: string;
  startDate: string;
  endDate: string;
  startCity?: string;
  endCity?: string;
  coverImageUrl?: string;
}

export interface DhamaCollectionSummary {
  id: number;
  slug: string;
  status?: HolyPlaceStatus;
  sortOrder: number;
  isFeatured: boolean;
  title: string;
  description: string;
  heroImageUrl?: string;
  locale: 'ru' | 'en' | 'hi';
  availableLocales: string[];
  placesCount: number;
}

export interface DhamaCollectionPlacePreview {
  id: number;
  slug: string;
  title: string;
  city: string;
  state: string;
  heroImageUrl?: string;
  isFeatured: boolean;
}

export interface DhamaCollection extends DhamaCollectionSummary {
  places: DhamaCollectionPlacePreview[];
}

export interface HolyPlaceDetail extends HolyPlaceSummary {
  description: string;
  visitRules: string;
  etiquette: string;
  pilgrimageTips: string;
  practices: string;
  faq: string;
  linkedMedia: HolyPlaceLinkedMedia[];
  linkedYatras: HolyPlaceLinkedYatra[];
  collections: DhamaCollectionSummary[];
}

export interface HolyPlaceListResponse {
  places: HolyPlaceSummary[];
  total: number;
  page: number;
  limit: number;
  locale: 'ru' | 'en' | 'hi';
}

export interface HolyPlaceFiltersResponse {
  placeTypes: string[];
  states: string[];
  cities: string[];
  traditions: string[];
  types: string[];
}

export interface HolyPlaceMapMarker {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  placeType: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  heroImageUrl?: string;
  isFeatured: boolean;
}

export interface HolyPlaceMapResponse {
  markers: HolyPlaceMapMarker[];
  locale: 'ru' | 'en' | 'hi';
}

export interface HolyPlaceFilters {
  search?: string;
  type?: string;
  state?: string;
  city?: string;
  tradition?: string;
  collection?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface DhamaCollectionListResponse {
  collections: DhamaCollection[];
  total: number;
  page: number;
  limit: number;
  locale: 'ru' | 'en' | 'hi';
}
