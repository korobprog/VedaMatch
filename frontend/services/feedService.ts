import apiClient from '../lib/apiClient';

export interface FeedV2Item {
  id: string;
  type: 'post' | 'video_circle';
  itemId: number;
  createdAt: string;
  preview?: {
    text?: string;
    image?: string;
    video?: string;
    thumbnail?: string;
  };
  counts?: {
    likes?: number;
    comments?: number;
  };
}

export interface FeedV2Response {
  items: FeedV2Item[];
  nextCursor?: string;
  hasMore: boolean;
}

class FeedService {
  async getFeedV2(params: {
    cursor?: string;
    limit?: number;
    mode?: 'auto' | 'all' | 'matched';
    include?: string;
  } = {}): Promise<FeedV2Response> {
    const response = await apiClient.get<FeedV2Response>('/v2/feed', { params });
    return response.data;
  }
}

export const feedService = new FeedService();
