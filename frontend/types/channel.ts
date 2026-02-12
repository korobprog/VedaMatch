export type ChannelMemberRole = 'owner' | 'admin' | 'editor';

export type ChannelPostType = 'text' | 'media' | 'showcase';

export type ChannelPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type ChannelPostCTAType = 'none' | 'order_products' | 'book_service';

export interface ChannelOwnerInfo {
  ID: number;
  spiritualName?: string;
  karmicName?: string;
  avatarUrl?: string;
}

export interface Channel {
  ID: number;
  ownerId: number;
  title: string;
  slug: string;
  description: string;
  avatarUrl: string;
  coverUrl: string;
  timezone: string;
  isPublic: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  owner?: ChannelOwnerInfo;
}

export interface ChannelMember {
  ID: number;
  channelId: number;
  userId: number;
  role: ChannelMemberRole;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ChannelMemberUserInfo {
  id: number;
  spiritualName: string;
  karmicName: string;
  avatarUrl: string;
}

export interface ChannelMemberResponse {
  id: number;
  channelId: number;
  userId: number;
  role: ChannelMemberRole;
  createdAt: string;
  updatedAt: string;
  userInfo?: ChannelMemberUserInfo;
}

export interface ChannelPost {
  ID: number;
  channelId: number;
  authorId: number;
  type: ChannelPostType;
  content: string;
  mediaJson: string;
  ctaType: ChannelPostCTAType;
  ctaPayloadJson: string;
  status: ChannelPostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  isPinned: boolean;
  pinnedAt?: string;
  CreatedAt: string;
  UpdatedAt: string;
  author?: any;
  channel?: Channel;
}

export interface ChannelShowcase {
  ID: number;
  channelId: number;
  title: string;
  kind: string;
  filterJson: string;
  position: number;
  isActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ChannelCreateRequest {
  title: string;
  slug?: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  timezone?: string;
  isPublic?: boolean;
}

export interface ChannelUpdateRequest {
  title?: string;
  description?: string;
  isPublic?: boolean;
  timezone?: string;
}

export interface ChannelBrandingUpdateRequest {
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

export interface ChannelMemberAddRequest {
  userId: number;
  role?: ChannelMemberRole;
}

export interface ChannelPostCreateRequest {
  type?: ChannelPostType;
  content?: string;
  mediaJson?: string;
  ctaType?: ChannelPostCTAType;
  ctaPayloadJson?: string;
}

export interface ChannelPostUpdateRequest {
  type?: ChannelPostType;
  content?: string;
  mediaJson?: string;
  ctaType?: ChannelPostCTAType;
  ctaPayloadJson?: string;
}

export interface ChannelSchedulePostRequest {
  scheduledAt: string;
}

export interface ChannelFeedResponse {
  posts: ChannelPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChannelListResponse {
  channels: Channel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
