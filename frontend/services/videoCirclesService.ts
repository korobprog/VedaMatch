import { AxiosError } from 'axios';
import apiClient from '../lib/apiClient';

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

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<any>;
  const payload = axiosError?.response?.data;

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const message = payload.error || payload.message;
    if (message && typeof message === 'string') {
      return message;
    }
  }
  if (axiosError?.message) {
    return axiosError.message;
  }
  return fallback;
};

const isUploadAbort = (error: unknown): boolean => {
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  const axiosError = error as AxiosError;
  return axiosError?.code === 'ERR_CANCELED' || axiosError?.code === 'ECONNABORTED';
};

const isLikelyNonCdnUrl = (value: string): boolean => {
  const raw = (value || '').trim();
  if (!raw) {
    return true;
  }
  if (raw.startsWith('/uploads/')) {
    return true;
  }
  try {
    const parsed = new URL(raw);
    const host = (parsed.hostname || '').toLowerCase();
    return !host.includes('cdn.');
  } catch {
    return true;
  }
};

class VideoCirclesService {
  private readonly uploadTimeoutMs = 3 * 60 * 1000;

  async getVideoCircles(filters: VideoCircleFilters = {}): Promise<VideoCircleListResponse> {
    const params: Record<string, string | number> = {};
    if (filters.channelId) params.channelId = filters.channelId;
    if (filters.city) params.city = filters.city;
    if (filters.matha) params.matha = filters.matha;
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;
    if (filters.scope) params.scope = filters.scope;
    if (filters.roleScope?.length) params.role_scope = filters.roleScope.join(',');
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sort) params.sort = filters.sort;

    try {
      const response = await apiClient.get<VideoCircleListResponse>('/video-circles', { params });
      const data = response.data;
      const circles = Array.isArray(data?.circles) ? data.circles : [];
      const nonCdnCount = circles.filter((item) => isLikelyNonCdnUrl(item?.mediaUrl || '')).length;
      if (nonCdnCount > 0) {
        console.warn(`[VideoCircles] Detected ${nonCdnCount} non-CDN mediaUrl item(s) in feed response`);
      }
      return data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to fetch video circles'));
    }
  }

  async createVideoCircle(payload: CreateVideoCirclePayload): Promise<VideoCircle> {
    try {
      const response = await apiClient.post<VideoCircle>('/video-circles', payload);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to create video circle'));
    }
  }

  async getMyVideoCircles(page = 1, limit = 30): Promise<VideoCircleListResponse> {
    try {
      const response = await apiClient.get<VideoCircleListResponse>('/video-circles/my', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to fetch my video circles'));
    }
  }

  async interact(circleId: number, type: VideoInteractionType, action: VideoInteractionAction): Promise<any> {
    try {
      const response = await apiClient.post(`/video-circles/${circleId}/interactions`, { type, action });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update interaction'));
    }
  }

  async getVideoTariffs(): Promise<VideoTariff[]> {
    try {
      const response = await apiClient.get<{ tariffs?: any[] }>('/video-tariffs');
      const data = response.data;
      return (data.tariffs || []).map((t: any) => ({
        id: t.ID || t.id,
        code: t.code,
        priceLkm: t.priceLkm,
        durationMinutes: t.durationMinutes,
        isActive: t.isActive,
        updatedAt: t.UpdatedAt || t.updatedAt,
      }));
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to fetch video tariffs'));
    }
  }

  async createVideoTariff(payload: UpsertVideoTariffPayload): Promise<VideoTariff> {
    try {
      const response = await apiClient.post<VideoTariff>('/admin/video-tariffs', payload);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to create tariff'));
    }
  }

  async updateVideoTariff(id: number, payload: Partial<UpsertVideoTariffPayload>): Promise<VideoTariff> {
    try {
      const response = await apiClient.put<VideoTariff>(`/admin/video-tariffs/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update tariff'));
    }
  }

  async boostCircle(circleId: number, boostType: VideoBoostType): Promise<any> {
    try {
      const response = await apiClient.post(`/video-circles/${circleId}/boost`, { boostType });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to boost circle'));
    }
  }

  async uploadAndCreateCircle(payload: UploadVideoCirclePayload): Promise<VideoCircle> {
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
      const response = await apiClient.post<VideoCircle>('/video-circles/upload', formData, {
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
        timeout: this.uploadTimeoutMs,
      });

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<any>;
      const serverCode = axiosError?.response?.data?.code;
      if (serverCode === 'MEDIA_URL_NOT_ALLOWED') {
        throw new Error('MEDIA_URL_NOT_ALLOWED');
      }
      if (serverCode === 'CDN_NOT_CONFIGURED') {
        throw new Error('MEDIA_SERVICE_UNAVAILABLE');
      }
      if (isUploadAbort(error)) {
        throw new Error('UPLOAD_TIMEOUT');
      }
      throw new Error(getApiErrorMessage(error, 'Failed to upload and create video circle'));
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async deleteCircle(circleId: number): Promise<void> {
    try {
      await apiClient.delete(`/video-circles/${circleId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to delete video circle'));
    }
  }

  async updateCircle(circleId: number, payload: UpdateVideoCirclePayload): Promise<VideoCircle> {
    try {
      const response = await apiClient.patch<VideoCircle>(`/video-circles/${circleId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update video circle'));
    }
  }

  async republishCircle(circleId: number, durationMinutes = 60): Promise<VideoCircle> {
    try {
      const response = await apiClient.post<VideoCircle>(`/video-circles/${circleId}/republish`, {
        durationMinutes,
      });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to republish video circle'));
    }
  }
}

export const videoCirclesService = new VideoCirclesService();
