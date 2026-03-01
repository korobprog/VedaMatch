import apiClient from '../lib/apiClient';
import {
  Channel,
  ChannelBrandingUpdateRequest,
  ChannelCreateRequest,
  ChannelFeedResponse,
  ChannelListResponse,
  ChannelMember,
  ChannelMemberAddRequest,
  ChannelMemberRole,
  ChannelMemberResponse,
  ChannelLiveSession,
  ChannelLiveParticipantsResponse,
  ChannelLiveModerationAction,
  ChannelPost,
  ChannelPostComment,
  ChannelPostCreateRequest,
  ChannelPostMediaUploadResponse,
  ChannelPostUpdateRequest,
  ChannelSchedulePostRequest,
  ChannelShowcase,
  ChannelUpdateRequest,
} from '../types/channel';

export interface SadhuSangaPushPreference {
  userId: number;
  enabled: boolean;
  reminder1h: boolean;
  reminder10m: boolean;
  city: string;
  language: string;
  topics: string[];
  useTimeWindow: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface PreacherAnalyticsCity {
  city: string;
  registrations: number;
}

export interface PreacherAnalytics {
  channelId: number;
  totalLectureViews: number;
  seminarRegistrations: number;
  activeCities: PreacherAnalyticsCity[];
  liveSessionsTotal: number;
  liveUniqueViewersTotal: number;
  liveWatchMinutesTotal: number;
}

export interface ChannelLiveSessionUpsertPayload {
  title: string;
  description?: string;
  scheduledAt?: string;
  accessPolicy?: 'followers';
  maxParticipants?: number;
}

export interface ChannelLiveJoinResponse {
  liveId: number;
  roomId: number;
  roomName: string;
  participant: string;
  token: string;
  wsUrl: string;
  sessionState: ChannelLiveSession;
}

class ChannelService {
  async getFeed(params: { page?: number; limit?: number; search?: string; channelId?: number } = {}): Promise<ChannelFeedResponse> {
    const response = await apiClient.get('/feed', { params });
    return response.data;
  }

  async getChannels(params: { page?: number; limit?: number; search?: string; city?: string; language?: string; topic?: string } = {}): Promise<ChannelListResponse> {
    const response = await apiClient.get('/channels', { params });
    return response.data;
  }

  async getMyChannels(params: { page?: number; limit?: number; search?: string } = {}): Promise<ChannelListResponse> {
    const response = await apiClient.get('/channels/my', { params });
    return response.data;
  }

  async createChannel(payload: ChannelCreateRequest): Promise<Channel> {
    const response = await apiClient.post('/channels', payload);
    return response.data;
  }

  async getChannel(channelId: number): Promise<{ channel: Channel; viewerRole?: ChannelMemberRole }> {
    const response = await apiClient.get(`/channels/${channelId}`);
    return response.data;
  }

  async followChannel(channelId: number): Promise<{ ok: boolean; channelId: number }> {
    const response = await apiClient.post(`/channels/${channelId}/follow`, {});
    return response.data;
  }

  async unfollowChannel(channelId: number): Promise<{ ok: boolean; channelId: number }> {
    const response = await apiClient.delete(`/channels/${channelId}/follow`);
    return response.data;
  }

  async getFollowStatus(channelId: number): Promise<{ channelId: number; isFollowing: boolean; followersCount: number }> {
    const response = await apiClient.get(`/channels/${channelId}/follow-status`);
    return response.data;
  }

  async getPreacherAnalytics(channelId: number): Promise<PreacherAnalytics> {
    const response = await apiClient.get(`/channels/${channelId}/preacher-analytics`);
    return response.data;
  }

  async getChannelLive(channelId: number): Promise<{ session: ChannelLiveSession | null; liveStatus: 'none' | 'scheduled' | 'live' }> {
    const response = await apiClient.get(`/channels/${channelId}/live`);
    return response.data;
  }

  async createChannelLive(channelId: number, payload: ChannelLiveSessionUpsertPayload): Promise<ChannelLiveSession> {
    const response = await apiClient.post(`/channels/${channelId}/live`, payload);
    return response.data;
  }

  async updateChannelLive(channelId: number, liveId: number, payload: ChannelLiveSessionUpsertPayload): Promise<ChannelLiveSession> {
    const response = await apiClient.patch(`/channels/${channelId}/live/${liveId}`, payload);
    return response.data;
  }

  async startChannelLive(channelId: number, liveId: number): Promise<ChannelLiveSession> {
    const response = await apiClient.post(`/channels/${channelId}/live/${liveId}/start`, {});
    return response.data;
  }

  async endChannelLive(channelId: number, liveId: number): Promise<ChannelLiveSession> {
    const response = await apiClient.post(`/channels/${channelId}/live/${liveId}/end`, {});
    return response.data;
  }

  async cancelChannelLive(channelId: number, liveId: number): Promise<ChannelLiveSession> {
    const response = await apiClient.post(`/channels/${channelId}/live/${liveId}/cancel`, {});
    return response.data;
  }

  async joinChannelLive(channelId: number, liveId: number, payload: { participantName?: string; metadata?: Record<string, unknown> } = {}): Promise<ChannelLiveJoinResponse> {
    const response = await apiClient.post(`/channels/${channelId}/live/${liveId}/join`, payload);
    return response.data;
  }

  async leaveChannelLive(channelId: number, liveId: number): Promise<void> {
    await apiClient.post(`/channels/${channelId}/live/${liveId}/leave`, {});
  }

  async listChannelLiveParticipants(channelId: number, liveId: number): Promise<ChannelLiveParticipantsResponse> {
    const response = await apiClient.get(`/channels/${channelId}/live/${liveId}/participants`);
    return response.data;
  }

  async moderateChannelLiveParticipant(
    channelId: number,
    liveId: number,
    payload: { targetUserId: number; action: ChannelLiveModerationAction; reason?: string }
  ): Promise<ChannelLiveParticipantsResponse> {
    const response = await apiClient.post(`/channels/${channelId}/live/${liveId}/moderation`, payload);
    return response.data;
  }

  async getSadhuSangaPushPreference(): Promise<SadhuSangaPushPreference> {
    const response = await apiClient.get('/channels/sadhu-sanga/push-preferences');
    return response.data;
  }

  async updateSadhuSangaPushPreference(payload: Omit<SadhuSangaPushPreference, 'userId'>): Promise<SadhuSangaPushPreference> {
    const response = await apiClient.put('/channels/sadhu-sanga/push-preferences', payload);
    return response.data;
  }

  async updateChannel(channelId: number, payload: ChannelUpdateRequest): Promise<Channel> {
    const response = await apiClient.patch(`/channels/${channelId}`, payload);
    return response.data;
  }

  async updateBranding(channelId: number, payload: ChannelBrandingUpdateRequest): Promise<Channel> {
    const response = await apiClient.patch(`/channels/${channelId}/branding`, payload);
    return response.data;
  }

  async uploadCover(channelId: number, file: { uri: string; name?: string; type?: string }): Promise<Channel> {
    const form = new FormData();
    form.append('cover', {
      uri: file.uri,
      name: file.name || `channel-cover-${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
    } as any);
    const response = await apiClient.post(`/channels/${channelId}/cover/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async uploadPostImage(
    channelId: number,
    file: { uri: string; name?: string; type?: string }
  ): Promise<ChannelPostMediaUploadResponse> {
    const form = new FormData();
    form.append('media', {
      uri: file.uri,
      name: file.name || `channel-post-${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
    } as any);

    const response = await apiClient.post(`/channels/${channelId}/posts/media/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async addMember(channelId: number, payload: ChannelMemberAddRequest): Promise<ChannelMember> {
    const response = await apiClient.post(`/channels/${channelId}/members`, payload);
    return response.data;
  }

  async listMembers(channelId: number): Promise<{ members: ChannelMemberResponse[] }> {
    const response = await apiClient.get(`/channels/${channelId}/members`);
    return response.data;
  }

  async updateMemberRole(channelId: number, userId: number, role: ChannelMemberRole): Promise<ChannelMember> {
    const response = await apiClient.patch(`/channels/${channelId}/members/${userId}`, { role });
    return response.data;
  }

  async removeMember(channelId: number, userId: number): Promise<void> {
    await apiClient.delete(`/channels/${channelId}/members/${userId}`);
  }

  async createPost(channelId: number, payload: ChannelPostCreateRequest): Promise<ChannelPost> {
    const response = await apiClient.post(`/channels/${channelId}/posts`, payload);
    return response.data;
  }

  async listPosts(
    channelId: number,
    params: { page?: number; limit?: number; includeDraft?: boolean } = {}
  ): Promise<{ posts: ChannelPost[]; total: number; page: number; limit: number; totalPages: number; viewerRole?: ChannelMemberRole }> {
    const response = await apiClient.get(`/channels/${channelId}/posts`, { params });
    return response.data;
  }

  async updatePost(channelId: number, postId: number, payload: ChannelPostUpdateRequest): Promise<ChannelPost> {
    const response = await apiClient.patch(`/channels/${channelId}/posts/${postId}`, payload);
    return response.data;
  }

  async pinPost(channelId: number, postId: number): Promise<ChannelPost> {
    const response = await apiClient.post(`/channels/${channelId}/posts/${postId}/pin`, {});
    return response.data;
  }

  async unpinPost(channelId: number, postId: number): Promise<ChannelPost> {
    const response = await apiClient.delete(`/channels/${channelId}/posts/${postId}/pin`);
    return response.data;
  }

  async publishPost(channelId: number, postId: number): Promise<ChannelPost> {
    const response = await apiClient.post(`/channels/${channelId}/posts/${postId}/publish`, {});
    return response.data;
  }

  async schedulePost(channelId: number, postId: number, payload: ChannelSchedulePostRequest): Promise<ChannelPost> {
    const response = await apiClient.post(`/channels/${channelId}/posts/${postId}/schedule`, payload);
    return response.data;
  }

  async trackPostCtaClick(channelId: number, postId: number): Promise<void> {
    await apiClient.post(`/channels/${channelId}/posts/${postId}/cta-click`, {});
  }

  async trackView(channelId: number, postId: number): Promise<void> {
    await apiClient.post(`/channels/${channelId}/posts/${postId}/view`, {});
  }

  async setReaction(channelId: number, postId: number, emoji: string): Promise<ChannelPost> {
    const response = await apiClient.post(`/channels/${channelId}/posts/${postId}/reactions`, { emoji });
    return response.data;
  }

  async removeReaction(channelId: number, postId: number): Promise<ChannelPost> {
    const response = await apiClient.delete(`/channels/${channelId}/posts/${postId}/reactions`);
    return response.data;
  }

  async listComments(channelId: number, postId: number, params: { limit?: number; cursor?: number } = {}): Promise<{ comments: ChannelPostComment[]; nextCursor?: number }> {
    const response = await apiClient.get(`/channels/${channelId}/posts/${postId}/comments`, { params });
    return response.data;
  }

  async addComment(channelId: number, postId: number, body: string): Promise<ChannelPostComment> {
    const response = await apiClient.post(`/channels/${channelId}/posts/${postId}/comments`, { body });
    return response.data;
  }

  async trackShare(channelId: number, postId: number): Promise<void> {
    await apiClient.post(`/channels/${channelId}/posts/${postId}/share`, {});
  }

  async getPromptStatus(keys: string[]): Promise<Record<string, boolean>> {
    const response = await apiClient.get('/channels/prompts/status', {
      params: { keys: keys.join(',') },
    });
    return response.data?.status || {};
  }

  async dismissPrompt(promptKey: string, payload: { postId?: number } = {}): Promise<void> {
    await apiClient.post(`/channels/prompts/${encodeURIComponent(promptKey)}/dismiss`, payload);
  }

  async trackPromotedAdClick(adId: number): Promise<void> {
    await apiClient.post(`/channels/promoted-ads/${adId}/click`, {});
  }

  async listShowcases(channelId: number): Promise<{ showcases: ChannelShowcase[] }> {
    const response = await apiClient.get(`/channels/${channelId}/showcases`);
    return response.data;
  }

  async createShowcase(
    channelId: number,
    payload: { title: string; kind: string; filterJson?: string; position?: number; isActive?: boolean }
  ): Promise<ChannelShowcase> {
    const response = await apiClient.post(`/channels/${channelId}/showcases`, payload);
    return response.data;
  }

  async updateShowcase(
    channelId: number,
    showcaseId: number,
    payload: { title?: string; kind?: string; filterJson?: string; position?: number; isActive?: boolean }
  ): Promise<ChannelShowcase> {
    const response = await apiClient.patch(`/channels/${channelId}/showcases/${showcaseId}`, payload);
    return response.data;
  }

  async deleteShowcase(channelId: number, showcaseId: number): Promise<void> {
    await apiClient.delete(`/channels/${channelId}/showcases/${showcaseId}`);
  }
}

export const channelService = new ChannelService();
