import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';
import { authorizedFetch } from './authSessionService';

export type VideoCircleStatus = 'active' | 'expired' | 'deleted';
export type VideoInteractionType = 'like' | 'comment' | 'chat';
export type VideoInteractionAction = 'toggle' | 'add';
export type VideoBoostType = 'lkm' | 'city' | 'premium';

export interface VideoCircle {
  id: number;
  authorId: number;
  channelId?: number;
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

export interface CreateVideoCirclePayload {
  mediaUrl: string;
  thumbnailUrl?: string;
  channelId?: number;
  city?: string;
  matha?: string;
  category?: string;
  durationSec?: number;
  expiresAt?: string;
}

export interface UploadVideoCirclePayload {
  video: {
    uri: string;
    name: string;
    type: string;
  };
  thumbnail?: {
    uri: string;
    name: string;
    type: string;
  };
  channelId?: number;
  city?: string;
  matha?: string;
  category?: string;
  durationSec?: number;
}

export interface UpdateVideoCirclePayload {
  city?: string;
  matha?: string;
  category?: string;
  thumbnailUrl?: string;
}

export interface VideoTariff {
  id: number;
  code: 'lkm_boost' | 'city_boost' | 'premium_boost';
  priceLkm: number;
  durationMinutes: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UpsertVideoTariffPayload {
  code: 'lkm_boost' | 'city_boost' | 'premium_boost';
  priceLkm: number;
  durationMinutes: number;
  isActive?: boolean;
}

export interface VideoCircleFilters {
  channelId?: number;
  city?: string;
  matha?: string;
  category?: string;
  status?: VideoCircleStatus;
  scope?: 'all' | 'friends';
  roleScope?: Array<'user' | 'in_goodness' | 'yogi' | 'devotee'>;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'expires_soon';
}

class VideoCirclesService {
  private baseUrl = API_PATH;
  private readonly uploadTimeoutMs = 3 * 60 * 1000;

  async getVideoCircles(filters: VideoCircleFilters = {}): Promise<VideoCircleListResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    if (filters.channelId) params.append('channelId', String(filters.channelId));
    if (filters.city) params.append('city', filters.city);
    if (filters.matha) params.append('matha', filters.matha);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.scope) params.append('scope', filters.scope);
    if (filters.roleScope && filters.roleScope.length > 0) {
      params.append('role_scope', filters.roleScope.join(','));
    }
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sort) params.append('sort', filters.sort);

    const query = params.toString();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles${query ? `?${query}` : ''}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to fetch video circles');
    }
    return response.json();
  }

  async createVideoCircle(payload: CreateVideoCirclePayload): Promise<VideoCircle> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to create video circle');
    }
    return response.json();
  }

  async getMyVideoCircles(page = 1, limit = 30): Promise<VideoCircleListResponse> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles/my?page=${page}&limit=${limit}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to fetch my video circles');
    }
    return response.json();
  }

  async interact(circleId: number, type: VideoInteractionType, action: VideoInteractionAction): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles/${circleId}/interactions`, {
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
    const response = await authorizedFetch(`${this.baseUrl}/video-tariffs`);
    if (!response.ok) {
      throw new Error('Failed to fetch video tariffs');
    }
    const data = await response.json();
    // Normalize GORM fields (ID -> id, UpdatedAt -> updatedAt)
    return (data.tariffs || []).map((t: any) => ({
      id: t.ID || t.id,
      code: t.code,
      priceLkm: t.priceLkm,
      durationMinutes: t.durationMinutes,
      isActive: t.isActive,
      updatedAt: t.UpdatedAt || t.updatedAt,
    }));
  }

  async createVideoTariff(payload: UpsertVideoTariffPayload): Promise<VideoTariff> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/admin/video-tariffs`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to create tariff');
    }
    return response.json();
  }

  async updateVideoTariff(id: number, payload: Partial<UpsertVideoTariffPayload>): Promise<VideoTariff> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/admin/video-tariffs/${id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to update tariff');
    }
    return response.json();
  }

  async boostCircle(circleId: number, boostType: VideoBoostType): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles/${circleId}/boost`, {
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

  async uploadAndCreateCircle(payload: UploadVideoCirclePayload): Promise<VideoCircle> {
    const headers = await getAuthHeaders(false);
    const formData = new FormData();

    formData.append('video', {
      uri: payload.video.uri,
      name: payload.video.name,
      type: payload.video.type,
    } as any);

    if (payload.thumbnail) {
      formData.append('thumbnail', {
        uri: payload.thumbnail.uri,
        name: payload.thumbnail.name,
        type: payload.thumbnail.type,
      } as any);
    }

    if (payload.channelId) formData.append('channelId', String(payload.channelId));
    if (payload.city) formData.append('city', payload.city);
    if (payload.matha) formData.append('matha', payload.matha);
    if (payload.category) formData.append('category', payload.category);
    if (payload.durationSec) formData.append('durationSec', String(payload.durationSec));

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timeoutId: ReturnType<typeof setTimeout> | undefined = controller
      ? setTimeout(() => controller.abort(), this.uploadTimeoutMs)
      : undefined;

    try {
      const response = await authorizedFetch(`${this.baseUrl}/video-circles/upload`, {
        method: 'POST',
        headers: {
          ...headers,
          Accept: 'application/json',
        },
        body: formData,
        signal: controller?.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = text;
        if (text && text.startsWith('{')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed?.error && typeof parsed.error === 'string') {
              errorMessage = parsed.error;
            }
          } catch {
            // Keep raw text fallback.
          }
        }
        throw new Error(errorMessage || 'Failed to upload and create video circle');
      }

      return response.json();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('UPLOAD_TIMEOUT');
      }
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async deleteCircle(circleId: number): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles/${circleId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to delete video circle');
    }
  }

  async updateCircle(circleId: number, payload: UpdateVideoCirclePayload): Promise<VideoCircle> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles/${circleId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to update video circle');
    }
    return response.json();
  }

  async republishCircle(circleId: number, durationMinutes = 60): Promise<VideoCircle> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${this.baseUrl}/video-circles/${circleId}/republish`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationMinutes }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to republish video circle');
    }
    return response.json();
  }
}

export const videoCirclesService = new VideoCirclesService();
