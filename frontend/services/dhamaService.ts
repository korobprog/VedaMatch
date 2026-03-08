import apiClient from '../lib/apiClient';
import { HolyPlaceDetail, HolyPlaceFilters, HolyPlaceFiltersResponse, HolyPlaceListResponse, HolyPlaceMapResponse } from '../types/dhama';

class DhamaService {
  async getPlaces(filters: HolyPlaceFilters = {}): Promise<HolyPlaceListResponse> {
    const response = await apiClient.get('/dhama/places', { params: filters });
    return response.data;
  }

  async getPlace(slug: string): Promise<HolyPlaceDetail> {
    const response = await apiClient.get(`/dhama/places/${slug}`);
    return response.data;
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
