import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';
import { getGodModeQueryParams } from './godModeService';

export type VideoCircleStatus = 'active' | 'expired' | 'deleted';
export type VideoInteractionType = 'like' | 'comment' | 'chat';
export type VideoInteractionAction = 'toggle' | 'add';
export type VideoBoostType = 'lkm' | 'city' | 'premium';

export interface VideoCircle {
  id: number;
  authorId: number;
  mediaUrl: string;
  thumbnailUrl?: string;
  city?: string;
  matha?: string;
  category?: string;
  status: VideoCircleStatus;
  durationSec: number;
  expiresAt: string;
  remainingSec: number;
  premiumBoostActive: boolean;
  likeCount: number;
  commentCount: number;
  chatCount: number;
  createdAt: string;
}

export interface VideoCircleListResponse {
  circles: VideoCircle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VideoTariff {
  id: number;
  code: 'lkm_boost' | 'city_boost' | 'premium_boost';
  priceLkm: number;
  durationMinutes: number;
  isActive: boolean;
  updatedAt: string;
}

export interface VideoCircleFilters {
  city?: string;
  matha?: string;
  category?: string;
  status?: VideoCircleStatus;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'expires_soon';
}

class VideoCirclesService {
  private baseUrl = API_PATH;

  async getVideoCircles(filters: VideoCircleFilters = {}): Promise<VideoCircleListResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    if (filters.city) params.append('city', filters.city);
    if (filters.matha) params.append('matha', filters.matha);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sort) params.append('sort', filters.sort);

    const godModeParams = await getGodModeQueryParams();
    if (!filters.matha && godModeParams.math) {
      params.append('matha', godModeParams.math);
    }

    const query = params.toString();
    const response = await fetch(`${this.baseUrl}/video-circles${query ? `?${query}` : ''}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to fetch video circles');
    }
    return response.json();
  }

  async interact(circleId: number, type: VideoInteractionType, action: VideoInteractionAction): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/video-circles/${circleId}/interactions`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to update interaction');
    }

    return response.json();
  }

  async getVideoTariffs(): Promise<VideoTariff[]> {
    const response = await fetch(`${this.baseUrl}/video-tariffs`);
    if (!response.ok) {
      throw new Error('Failed to fetch video tariffs');
    }
    const data = await response.json();
    return data.tariffs || [];
  }

  async boostCircle(circleId: number, boostType: VideoBoostType): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/video-circles/${circleId}/boost`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ boostType }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || 'Failed to boost circle');
    }

    return response.json();
  }
}

export const videoCirclesService = new VideoCirclesService();
