export const SUPPORTED_LANGUAGES = ["ru", "en", "hi"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export type RootDomain = "vedamatch.ru" | "vedamatch.com";

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  sessionId?: number;
}

export interface SessionUser {
  ID?: number;
  id?: number;
  email?: string;
  karmicName?: string;
  spiritualName?: string;
  nickname?: string;
  avatarUrl?: string;
  role?: string;
  identity?: string;
  city?: string;
  country?: string;
}

export interface UserMedia {
  ID?: number;
  id?: number;
  userId: number;
  url: string;
  isProfile?: boolean;
}

export interface DatingProfile extends SessionUser {
  gender?: string;
  dob?: string;
  birthTime?: string;
  birthPlaceLink?: string;
  maritalStatus?: string;
  madh?: string;
  yogaStyle?: string;
  guna?: string;
  skills?: string;
  industry?: string;
  bio?: string;
  interests?: string;
  lookingFor?: string;
  lookingForBusiness?: string;
  intentions?: string;
  childrenIntent?: string;
  loveLanguages?: string;
  elementalPrimary?: string;
  elementalSecondary?: string;
  meetingPreferences?: string;
  datingEnabled?: boolean;
  isProfileComplete?: boolean;
  datingPublicationStatus?: string;
  datingStatusReason?: string;
  photos?: UserMedia[];
}

/**
 * A browsable candidate returned by GET /dating/candidates. The backend serves
 * these as full user records, so the shape matches DatingProfile.
 */
export type DatingCandidate = DatingProfile;

export type DatingMode = "family" | "business" | "friendship" | "seva";

export interface DatingCandidateFilters {
  userId: number;
  mode?: DatingMode;
  isNew?: boolean;
  city?: string;
  minAge?: string;
  maxAge?: string;
  madh?: string;
  yogaStyle?: string;
  guna?: string;
  identity?: string;
  skills?: string;
  industry?: string;
}

export interface DatingFavorite {
  ID?: number;
  id?: number;
  userId: number;
  candidateId: number;
  candidate?: DatingProfile;
  compatibilityScore?: string;
  CreatedAt?: string;
}

export type DatingApprovalStatus = "pending" | "approved" | "rejected";

export interface DatingApproval {
  ID?: number;
  id?: number;
  userId: number;
  approverId: number;
  status: DatingApprovalStatus;
  note?: string;
  respondedAt?: string;
  user?: SessionUser;
  approver?: SessionUser;
  CreatedAt?: string;
}

export type DatingPublicationStatus =
  | "draft"
  | "pending_friend_approval"
  | "pending_admin_review"
  | "pending_ai_review"
  | "published"
  | "rejected"
  | "flagged_after_publish";

export interface DatingPublicationState {
  status: DatingPublicationStatus;
  reason?: string;
  requiredApprovals: number;
  approvedCount: number;
  pendingCount: number;
  friendsCount: number;
  needsAdminFallback: boolean;
}

export interface DatingApprovalsResponse {
  approvals: DatingApproval[];
  friends: SessionUser[];
  publication: DatingPublicationState;
}

export type DatingMeetingInviteStatus = "pending" | "accepted" | "rejected";

export interface DatingMeetingInvite {
  ID?: number;
  id?: number;
  inviterId: number;
  inviteeId: number;
  placeType: string;
  message: string;
  status: DatingMeetingInviteStatus;
  respondedAt?: string;
  CreatedAt?: string;
}

export interface DatingCompatibilityResult {
  compatibility: string;
}

export interface DatingLikesCountResult {
  count: number;
}

export interface DatingIsFavoritedResult {
  isFavorited: boolean;
}

export interface LoginResponse extends AuthTokens {
  token?: string;
  user?: SessionUser;
}

export interface AuthSession extends AuthTokens {
  user: SessionUser | null;
}

export interface SocialAuthConfigResponse {
  google?: {
    enabled?: boolean;
    clientId?: string;
  };
  vk?: {
    enabled?: boolean;
  };
}

export interface UserContact {
  ID: number;
  karmicName: string;
  spiritualName: string;
  nickname?: string;
  nicknameDisplay?: string;
  email: string;
  avatarUrl: string;
  lastSeen: string;
  identity: string;
  city: string;
  country: string;
}

export interface PaginatedContactsResponse {
  items: UserContact[];
  hasMore: boolean;
  nextCursor?: number;
  total: number;
}

export type ChatConversationFilter = "all" | "unread" | "pinned" | "requests" | "archived";

export interface ChatConversationPreview {
  peerUserId: number;
  peerUser?: UserContact | null;
  peerUserPreview?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageType?: string;
  unreadCount: number;
  muted: boolean;
  pinned: boolean;
  pinnedAt?: string | null;
  lastMessageSenderId?: number;
  lastMessageId?: number;
  lastMessageSeen?: boolean;
  archived?: boolean;
  archivedAt?: string | null;
  relationshipStatus?: string;
}

export interface ChatConversationsResponse {
  items: ChatConversationPreview[];
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface P2PMessage {
  id?: number;
  ID?: number;
  createdAt?: string;
  CreatedAt?: string;
  senderId: number;
  recipientId?: number;
  senderName?: string;
  content: string;
  type: "text" | "image" | "audio" | "video" | "file" | "document" | "video_circle" | "contact_card";
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
}

export interface PaginatedMessagesResponse {
  items: P2PMessage[];
  hasMore: boolean;
  nextBeforeId?: number | null;
}

export interface ScriptureBook {
  id?: number;
  ID?: number;
  code?: string;
  slug?: string;
  title?: string;
  title_ru?: string;
  title_en?: string;
  title_hi?: string;
  description?: string;
}

export interface ChapterInfo {
  id?: number;
  number?: number;
  chapter?: number;
  title?: string;
}

export interface ScriptureVerse {
  id?: number;
  verse?: string;
  text?: string;
  translation?: string;
  commentary?: string;
}

export interface NewsItem {
  id: number;
  sourceId: number;
  sourceName?: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  tags: string;
  category: string;
  status: string;
  isImportant: boolean;
  publishedAt: string | null;
  viewsCount: number;
  originalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsListResponse {
  news: NewsItem[];
  total: number;
  page: number;
  totalPages: number;
}

export type TransactionType =
  | "credit"
  | "debit"
  | "bonus"
  | "refund"
  | "hold"
  | "release"
  | "admin_charge"
  | "admin_seize";

export interface WalletResponse {
  id: number;
  userId: number;
  balance: number;
  bonusBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  frozenBonusBalance: number;
  currency: string;
  currencyName: string;
  totalEarned: number;
  totalSpent: number;
}

export interface WalletTransaction {
  id: number;
  createdAt: string;
  walletId: number;
  type: TransactionType;
  amount: number;
  bonusAmount?: number;
  description: string;
  balanceAfter: number;
}

export interface TransactionListResponse {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServiceListItem {
  id: number;
  title?: string;
  description?: string;
  city?: string;
  category?: string;
  coverUrl?: string;
  priceFrom?: number;
}

export interface ServiceListResponse {
  services?: ServiceListItem[];
  items?: ServiceListItem[];
  total?: number;
}

export interface YatraListItem {
  id: number;
  title?: string;
  description?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  coverImageUrl?: string;
}

export interface YatraListResponse {
  yatras?: YatraListItem[];
  items?: YatraListItem[];
  total?: number;
}

export type SupportConversationStatus = "open" | "resolved";
export type SupportConversationChannel = "telegram" | "in_app";

export interface SupportConfig {
  appEntryEnabled: boolean;
  appEntryRolloutPercent: number;
  appEntryEligible: boolean;
  telegramBotUrl: string;
  channelUrl: string;
  slaTextRu: string;
  slaTextEn: string;
  slaTextHi?: string;
  languages: string[];
  channels: {
    telegram: boolean;
    inAppTicket: boolean;
  };
}

export interface SupportConversation {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  channel: SupportConversationChannel;
  status: SupportConversationStatus;
  ticketNumber?: string;
  subject?: string;
  requesterName?: string;
  requesterContact?: string;
  entryPoint?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
}

export interface SupportMessage {
  ID: number;
  CreatedAt: string;
  direction: "inbound" | "outbound";
  source: "user" | "bot" | "operator";
  type: "text" | "image";
  text?: string;
  caption?: string;
  mediaUrl?: string;
  mimeType?: string;
}
