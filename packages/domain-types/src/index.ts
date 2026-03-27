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
