export type ChannelMemberRole = 'owner' | 'admin' | 'editor' | 'subscriber';

export type ChannelPostType = 'text' | 'media' | 'showcase';

export type ChannelPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type ChannelPostCTAType = 'none' | 'order_products' | 'book_service';
export type ChannelLiveStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type ChannelLiveModerationAction = 'mute' | 'unmute' | 'block' | 'unblock' | 'kick';

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
  followersCount?: number;
  isFollowing?: boolean;
  liveStatus?: 'none' | ChannelLiveStatus;
  currentLiveSession?: ChannelLiveSession;
  CreatedAt: string;
  UpdatedAt: string;
  owner?: ChannelOwnerInfo;
}

export interface ChannelLiveSession {
  id: number;
  channelId: number;
  roomId: number;
  title: string;
  description: string;
  broadcastLanguage: string;
  status: ChannelLiveStatus;
  accessPolicy: 'followers';
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  maxParticipants?: number;
}

export interface ChannelLiveParticipant {
  userId: number;
  spiritualName?: string;
  karmicName?: string;
  avatarUrl?: string;
  isActive: boolean;
  isMuted: boolean;
  isBlocked: boolean;
  joinCount: number;
  accumulatedWatchSecs: number;
  joinedAt?: string;
}

export interface ChannelLiveParticipantsResponse {
  liveId: number;
  sessionState: ChannelLiveSession;
  participants: ChannelLiveParticipant[];
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
  nickname?: string;
  nicknameDisplay?: string;
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
  deliverPersonally?: boolean;
  status: ChannelPostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  isPinned: boolean;
  pinnedAt?: string;
  viewCount?: number;
  reactionCount?: number;
  commentCount?: number;
  shareCount?: number;
  stats?: {
    views: number;
    reactions: number;
    comments: number;
    shares: number;
  };
  myReaction?: string;
  CreatedAt: string;
  UpdatedAt: string;
  author?: any;
  channel?: Channel;
}

export interface ChannelPostMediaImage {
  url: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ChannelPostMediaCircle {
  id: number;
  mediaUrl: string;
  thumbnailUrl?: string;
  durationSec?: number;
  expiresAt?: string;
}

export interface ChannelPostMedia {
  images?: ChannelPostMediaImage[];
  circles?: ChannelPostMediaCircle[];
}

export interface ChannelPostMediaUploadResponse {
  url: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
}

export interface ChannelPostComment {
  ID: number;
  postId: number;
  userId: number;
  body: string;
  isDeleted: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  user?: {
    id: number;
    spiritualName?: string;
    karmicName?: string;
    avatarUrl?: string;
  };
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
  userId?: number;
  nickname?: string;
  role?: ChannelMemberRole;
}

export interface ChannelPostCreateRequest {
  type?: ChannelPostType;
  content?: string;
  mediaJson?: string;
  ctaType?: ChannelPostCTAType;
  ctaPayloadJson?: string;
  deliverPersonally?: boolean;
}

export interface ChannelPostUpdateRequest {
  type?: ChannelPostType;
  content?: string;
  mediaJson?: string;
  ctaType?: ChannelPostCTAType;
  ctaPayloadJson?: string;
  deliverPersonally?: boolean;
}

export interface ChannelSchedulePostRequest {
  scheduledAt: string;
}

export interface ChannelPromotedAd {
  id: number;
  title: string;
  description: string;
  city: string;
  price?: number;
  currency: string;
  isFree: boolean;
  userId: number;
  photoUrl?: string;
  createdAt: string;
}

export interface ChannelFeedResponse {
  posts: ChannelPost[];
  promotedAds?: ChannelPromotedAd[];
  promotedInsertEvery?: number;
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

export interface ChannelRecommendationItem {
  channel: Channel;
  score: number;
  reason: string;
}

export interface ChannelRecommendationsResponse {
  items: ChannelRecommendationItem[];
  total: number;
}
