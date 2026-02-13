import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PATH } from '../config/api.config';
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
  ChannelPost,
  ChannelPostCreateRequest,
  ChannelPostUpdateRequest,
  ChannelSchedulePostRequest,
  ChannelShowcase,
  ChannelUpdateRequest,
} from '../types/channel';

class ChannelService {
  private async getHeaders() {
    let token = await AsyncStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      token = await AsyncStorage.getItem('userToken');
    }

    const authHeader = token && token !== 'undefined' && token !== 'null' ? `Bearer ${token}` : '';

    return {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    };
  }

  async getFeed(params: { page?: number; limit?: number; search?: string; channelId?: number } = {}): Promise<ChannelFeedResponse> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_PATH}/feed`, { params, headers });
    return response.data;
  }

  async getChannels(params: { page?: number; limit?: number; search?: string } = {}): Promise<ChannelListResponse> {
    const response = await axios.get(`${API_PATH}/channels`, { params });
    return response.data;
  }

  async getMyChannels(params: { page?: number; limit?: number; search?: string } = {}): Promise<ChannelListResponse> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_PATH}/channels/my`, { headers, params });
    return response.data;
  }

  async createChannel(payload: ChannelCreateRequest): Promise<Channel> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_PATH}/channels`, payload, { headers });
    return response.data;
  }

  async getChannel(channelId: number): Promise<{ channel: Channel; viewerRole?: ChannelMemberRole }> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_PATH}/channels/${channelId}`, { headers });
    return response.data;
  }

  async updateChannel(channelId: number, payload: ChannelUpdateRequest): Promise<Channel> {
    const headers = await this.getHeaders();
    const response = await axios.patch(`${API_PATH}/channels/${channelId}`, payload, { headers });
    return response.data;
  }

  async updateBranding(channelId: number, payload: ChannelBrandingUpdateRequest): Promise<Channel> {
    const headers = await this.getHeaders();
    const response = await axios.patch(`${API_PATH}/channels/${channelId}/branding`, payload, { headers });
    return response.data;
  }

  async addMember(channelId: number, payload: ChannelMemberAddRequest): Promise<ChannelMember> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_PATH}/channels/${channelId}/members`, payload, { headers });
    return response.data;
  }

  async listMembers(channelId: number): Promise<{ members: ChannelMemberResponse[] }> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_PATH}/channels/${channelId}/members`, { headers });
    return response.data;
  }

  async updateMemberRole(channelId: number, userId: number, role: ChannelMemberRole): Promise<ChannelMember> {
    const headers = await this.getHeaders();
    const response = await axios.patch(`${API_PATH}/channels/${channelId}/members/${userId}`, { role }, { headers });
    return response.data;
  }

  async removeMember(channelId: number, userId: number): Promise<void> {
    const headers = await this.getHeaders();
    await axios.delete(`${API_PATH}/channels/${channelId}/members/${userId}`, { headers });
  }

  async createPost(channelId: number, payload: ChannelPostCreateRequest): Promise<ChannelPost> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_PATH}/channels/${channelId}/posts`, payload, { headers });
    return response.data;
  }

  async listPosts(
    channelId: number,
    params: { page?: number; limit?: number; includeDraft?: boolean } = {}
  ): Promise<{ posts: ChannelPost[]; total: number; page: number; limit: number; totalPages: number; viewerRole?: ChannelMemberRole }> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_PATH}/channels/${channelId}/posts`, { headers, params });
    return response.data;
  }

  async updatePost(channelId: number, postId: number, payload: ChannelPostUpdateRequest): Promise<ChannelPost> {
    const headers = await this.getHeaders();
    const response = await axios.patch(`${API_PATH}/channels/${channelId}/posts/${postId}`, payload, { headers });
    return response.data;
  }

  async pinPost(channelId: number, postId: number): Promise<ChannelPost> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_PATH}/channels/${channelId}/posts/${postId}/pin`, {}, { headers });
    return response.data;
  }

  async unpinPost(channelId: number, postId: number): Promise<ChannelPost> {
    const headers = await this.getHeaders();
    const response = await axios.delete(`${API_PATH}/channels/${channelId}/posts/${postId}/pin`, { headers });
    return response.data;
  }

  async publishPost(channelId: number, postId: number): Promise<ChannelPost> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_PATH}/channels/${channelId}/posts/${postId}/publish`, {}, { headers });
    return response.data;
  }

  async schedulePost(channelId: number, postId: number, payload: ChannelSchedulePostRequest): Promise<ChannelPost> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_PATH}/channels/${channelId}/posts/${postId}/schedule`, payload, { headers });
    return response.data;
  }

  async trackPostCtaClick(channelId: number, postId: number): Promise<void> {
    const headers = await this.getHeaders();
    await axios.post(`${API_PATH}/channels/${channelId}/posts/${postId}/cta-click`, {}, { headers });
  }

  async getPromptStatus(keys: string[]): Promise<Record<string, boolean>> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_PATH}/channels/prompts/status`, {
      headers,
      params: { keys: keys.join(',') },
    });
    return response.data?.status || {};
  }

  async dismissPrompt(promptKey: string, payload: { postId?: number } = {}): Promise<void> {
    const headers = await this.getHeaders();
    await axios.post(`${API_PATH}/channels/prompts/${encodeURIComponent(promptKey)}/dismiss`, payload, { headers });
  }

  async trackPromotedAdClick(adId: number): Promise<void> {
    const headers = await this.getHeaders();
    await axios.post(`${API_PATH}/channels/promoted-ads/${adId}/click`, {}, { headers });
  }

  async listShowcases(channelId: number): Promise<{ showcases: ChannelShowcase[] }> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_PATH}/channels/${channelId}/showcases`, { headers });
    return response.data;
  }

  async createShowcase(
    channelId: number,
    payload: { title: string; kind: string; filterJson?: string; position?: number; isActive?: boolean }
  ): Promise<ChannelShowcase> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_PATH}/channels/${channelId}/showcases`, payload, { headers });
    return response.data;
  }

  async updateShowcase(
    channelId: number,
    showcaseId: number,
    payload: { title?: string; kind?: string; filterJson?: string; position?: number; isActive?: boolean }
  ): Promise<ChannelShowcase> {
    const headers = await this.getHeaders();
    const response = await axios.patch(`${API_PATH}/channels/${channelId}/showcases/${showcaseId}`, payload, { headers });
    return response.data;
  }

  async deleteShowcase(channelId: number, showcaseId: number): Promise<void> {
    const headers = await this.getHeaders();
    await axios.delete(`${API_PATH}/channels/${channelId}/showcases/${showcaseId}`, { headers });
  }
}

export const channelService = new ChannelService();
