import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import type { UserContact } from './contactService';

export type ChatConversationFilter = 'all' | 'unread' | 'pinned' | 'requests' | 'archived';
export type ChatConversationRelationship = 'friend' | 'incoming_request' | 'outgoing_request' | 'none';

export type ChatConversationPreview = {
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
    relationshipStatus?: ChatConversationRelationship;
    friendRequestId?: number;
};

const normalizeSearchQuery = (value?: string): string => String(value || '').trim().toLowerCase();

const INBOX_STORAGE_KEY = 'chat_inbox_v1';
const DRAFT_STORAGE_PREFIX = 'chat_draft_v1:';

const normalizePreview = (value: unknown): string => {
    if (typeof value === 'string') {
        return value.trim();
    }
    return '';
};

const normalizePeerUser = (value: any): UserContact | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const id = Number.parseInt(String(value.ID ?? value.id ?? ''), 10);
    if (!Number.isFinite(id) || id <= 0) {
        return null;
    }

    return {
        ID: id,
        karmicName: normalizePreview(value.karmicName ?? value.karmic_name),
        spiritualName: normalizePreview(value.spiritualName ?? value.spiritual_name),
        nickname: normalizePreview(value.nickname),
        nicknameDisplay: normalizePreview(value.nicknameDisplay ?? value.nickname_display),
        email: normalizePreview(value.email),
        avatarUrl: normalizePreview(value.avatarUrl ?? value.avatar_url),
        lastSeen: normalizePreview(value.lastSeen ?? value.last_seen),
        identity: normalizePreview(value.identity),
        city: normalizePreview(value.city),
        country: normalizePreview(value.country),
    };
};

const normalizeConversation = (item: any): ChatConversationPreview | null => {
    const peerUserId = Number.parseInt(String(item?.peerUserId ?? item?.peer_user_id ?? item?.userId ?? ''), 10);
    if (!Number.isFinite(peerUserId) || peerUserId <= 0) {
        return null;
    }

    const peerUser = normalizePeerUser(item?.peerUser || item?.peer_user || item?.contact || item?.peerUserPreview || item?.peer_user_preview);
    const peerUserPreviewValue = item?.peerUserPreview ?? item?.peer_user_preview;
    const lastMessagePayload = item?.lastMessage && typeof item.lastMessage === 'object' ? item.lastMessage : null;
    const lastMessageContent = normalizePreview(
        item?.lastMessagePreview
        ?? item?.last_message_preview
        ?? item?.lastMessage
        ?? item?.last_message
        ?? lastMessagePayload?.content,
    );
    const parsedLastMessageSenderId = typeof item?.lastMessageSenderId === 'number'
        ? item.lastMessageSenderId
        : Number.parseInt(String(item?.last_message_sender_id ?? lastMessagePayload?.senderId ?? ''), 10) || undefined;
    const parsedLastMessageId = typeof item?.lastMessageId === 'number'
        ? item.lastMessageId
        : Number.parseInt(String(item?.last_message_id ?? lastMessagePayload?.id ?? lastMessagePayload?.ID ?? ''), 10) || undefined;
    const parsedLastMessageSeen = item?.lastMessageSeen != null
        ? Boolean(item.lastMessageSeen)
        : item?.last_message_seen != null
            ? Boolean(item.last_message_seen)
            : lastMessagePayload?.readAt != null;
    const hasArchivedValue = item?.archived != null || item?.isArchived != null || item?.archivedAt != null || item?.archived_at != null;
    const parsedArchived = hasArchivedValue
        ? (item?.archived != null
            ? Boolean(item.archived)
            : item?.isArchived != null
                ? Boolean(item.isArchived)
                : item?.archived_at != null)
        : undefined;
    const relationshipStatus = String(item?.relationshipStatus ?? item?.relationship_status ?? '').trim();
    const parsedFriendRequestId = Number.parseInt(String(item?.friendRequestId ?? item?.friend_request_id ?? ''), 10);
    return {
        peerUserId,
        peerUser,
        peerUserPreview: normalizePreview(
            typeof peerUserPreviewValue === 'string'
                ? peerUserPreviewValue
                : peerUserPreviewValue?.displayName ?? peerUserPreviewValue?.spiritualName ?? peerUserPreviewValue?.karmicName ?? item?.preview ?? item?.title,
        ),
        lastMessage: lastMessageContent,
        lastMessageAt: normalizePreview(item?.lastMessageAt ?? item?.last_message_at ?? item?.updatedAt ?? item?.updated_at) || new Date().toISOString(),
        lastMessageType: normalizePreview(item?.lastMessageType ?? item?.last_message_type) || undefined,
        unreadCount: Number.parseInt(String(item?.unreadCount ?? item?.unread_count ?? 0), 10) || 0,
        muted: Boolean(item?.muted),
        pinned: Boolean(item?.pinned),
        pinnedAt: item?.pinnedAt ?? item?.pinned_at ?? null,
        lastMessageSenderId: parsedLastMessageSenderId,
        lastMessageId: parsedLastMessageId,
        lastMessageSeen: parsedLastMessageSeen,
        archived: parsedArchived,
        archivedAt: item?.archivedAt ?? item?.archived_at ?? null,
        relationshipStatus: relationshipStatus === 'friend'
            || relationshipStatus === 'incoming_request'
            || relationshipStatus === 'outgoing_request'
            || relationshipStatus === 'none'
            ? relationshipStatus
            : undefined,
        friendRequestId: Number.isFinite(parsedFriendRequestId) && parsedFriendRequestId > 0 ? parsedFriendRequestId : undefined,
    };
};

const readLocalConversations = async (): Promise<ChatConversationPreview[]> => {
    try {
        const raw = await AsyncStorage.getItem(INBOX_STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.map(normalizeConversation).filter(Boolean) as ChatConversationPreview[];
    } catch (error) {
        console.warn('[chatInboxService] failed to read local inbox cache', error);
        return [];
    }
};

const writeLocalConversations = async (conversations: ChatConversationPreview[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
        console.warn('[chatInboxService] failed to persist local inbox cache', error);
    }
};

const mergeConversation = (
    existing: ChatConversationPreview[],
    next: ChatConversationPreview,
): ChatConversationPreview[] => {
    const cleaned = existing.filter((item) => item.peerUserId !== next.peerUserId);
    return [next, ...cleaned];
};

const sortConversations = (items: ChatConversationPreview[]): ChatConversationPreview[] => {
    return [...items].sort((a, b) => {
        if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1;
        }
        const timeA = new Date(a.lastMessageAt || 0).getTime();
        const timeB = new Date(b.lastMessageAt || 0).getTime();
        return timeB - timeA;
    });
};

export const filterConversationItems = (items: ChatConversationPreview[], filter: ChatConversationFilter): ChatConversationPreview[] => {
    if (filter === 'archived') {
        return items.filter((item) => item.archived);
    }

    const activeItems = items.filter((item) => !item.archived);
    if (filter === 'unread') {
        return activeItems.filter((item) => item.unreadCount > 0);
    }
    if (filter === 'pinned') {
        return activeItems.filter((item) => item.pinned);
    }
    if (filter === 'requests') {
        return activeItems.filter((item) => (
            item.relationshipStatus === 'incoming_request'
            || item.relationshipStatus === 'outgoing_request'
            || item.relationshipStatus === 'none'
        ));
    }
    return activeItems;
};

export const searchConversationItems = (items: ChatConversationPreview[], query?: string): ChatConversationPreview[] => {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery) {
        return items;
    }

    return items.filter((item) => {
        const peer = item.peerUser;
        return [
            item.peerUserPreview,
            item.lastMessage,
            peer?.spiritualName,
            peer?.karmicName,
            peer?.nicknameDisplay,
            peer?.nickname,
            peer?.email,
        ].some((value) => normalizeSearchQuery(String(value || '')).includes(normalizedQuery));
    });
};

const mergeWithLocalState = (
    remote: ChatConversationPreview[],
    local: ChatConversationPreview[],
    options: { includeLocalOnly?: boolean } = {},
): ChatConversationPreview[] => {
    const merged = new Map<number, ChatConversationPreview>();

    if (options.includeLocalOnly !== false) {
        local.forEach((item) => {
            merged.set(item.peerUserId, item);
        });
    }

    remote.forEach((item) => {
        const existing = merged.get(item.peerUserId);
        merged.set(item.peerUserId, {
            ...existing,
            ...item,
            archived: item.archived ?? existing?.archived ?? false,
            archivedAt: item.archivedAt ?? existing?.archivedAt ?? null,
        });
    });

    return sortConversations(Array.from(merged.values()));
};

export const chatInboxService = {
    async listConversations(params: { limit?: number; cursor?: number | string; filter?: ChatConversationFilter; q?: string } = {}): Promise<{ items: ChatConversationPreview[]; hasMore: boolean; nextCursor?: string | null }> {
        const normalizedQuery = normalizeSearchQuery(params.q);
        try {
            const local = await readLocalConversations();
            const response = await apiClient.get('/messages/conversations', {
                params: {
                    limit: params.limit ?? 50,
                    ...(params.cursor ? { cursor: params.cursor } : {}),
                    filter: params.filter ?? 'all',
                    ...(normalizedQuery ? { q: normalizedQuery } : {}),
                },
            });
            const data = response.data;
            const items = Array.isArray(data?.items) ? data.items.map(normalizeConversation).filter(Boolean) as ChatConversationPreview[] : [];
            const mergedItems = mergeWithLocalState(items, local, {
                includeLocalOnly: !params.cursor,
            });
            const snapshot = mergeWithLocalState(items, local);
            await writeLocalConversations(snapshot);
            return {
                items: filterConversationItems(mergedItems, params.filter ?? 'all'),
                hasMore: Boolean(data?.hasMore),
                nextCursor: data?.nextCursor ?? null,
            };
        } catch {
            const local = await readLocalConversations();
            const fallbackItems = searchConversationItems(
                sortConversations(filterConversationItems(local, params.filter ?? 'all')),
                normalizedQuery,
            );
            return {
                items: fallbackItems,
                hasMore: false,
                nextCursor: null,
            };
        }
    },

    async markConversationRead(peerUserId: number): Promise<void> {
        try {
            await apiClient.post(`/messages/conversations/${peerUserId}/read`, {});
        } catch {
            // Backend endpoint may not be live yet. Local cache still updates.
        }

        const local = await readLocalConversations();
        const updated = local.map((item) => (
            item.peerUserId === peerUserId
                ? { ...item, unreadCount: 0, lastMessageSeen: true }
                : item
        ));
        await writeLocalConversations(updated);
    },

    async upsertConversationFromMessage(payload: {
        currentUserId: number;
        peerUserId: number;
        content: string;
        type?: string;
        senderId: number;
        messageId?: number;
        createdAt?: string;
        peerUser?: UserContact | null;
        muted?: boolean;
        pinned?: boolean;
        pinnedAt?: string | null;
        markUnread?: boolean;
        seen?: boolean;
        archived?: boolean;
        archivedAt?: string | null;
        relationshipStatus?: ChatConversationRelationship;
        friendRequestId?: number;
    }): Promise<ChatConversationPreview> {
        const local = await readLocalConversations();
        const current = local.find((item) => item.peerUserId === payload.peerUserId);
        const next: ChatConversationPreview = {
            peerUserId: payload.peerUserId,
            peerUser: payload.peerUser ?? current?.peerUser ?? null,
            peerUserPreview: current?.peerUserPreview || payload.peerUser?.spiritualName || payload.peerUser?.karmicName || payload.peerUser?.nicknameDisplay || payload.peerUser?.nickname || `User #${payload.peerUserId}`,
            lastMessage: payload.content || '',
            lastMessageAt: payload.createdAt || new Date().toISOString(),
            lastMessageType: payload.type || current?.lastMessageType || 'text',
            unreadCount: payload.senderId === payload.currentUserId
                ? current?.unreadCount ?? 0
                : (payload.markUnread === false ? 0 : (current?.unreadCount ?? 0) + 1),
            muted: payload.muted ?? current?.muted ?? false,
            pinned: payload.pinned ?? current?.pinned ?? false,
            pinnedAt: payload.pinnedAt ?? current?.pinnedAt ?? null,
            lastMessageSenderId: payload.senderId,
            lastMessageId: payload.messageId ?? current?.lastMessageId,
            lastMessageSeen: payload.senderId === payload.currentUserId ? Boolean(payload.seen) : current?.lastMessageSeen ?? false,
            archived: payload.archived ?? false,
            archivedAt: payload.archivedAt ?? null,
            relationshipStatus: payload.relationshipStatus ?? current?.relationshipStatus ?? 'none',
            friendRequestId: payload.friendRequestId ?? current?.friendRequestId,
        };

        const merged = sortConversations(mergeConversation(local, next));
        await writeLocalConversations(merged);
        return next;
    },

    async updateConversationPatch(peerUserId: number, patch: Partial<ChatConversationPreview>): Promise<void> {
        const local = await readLocalConversations();
        const existing = local.find((item) => item.peerUserId === peerUserId);
        const updated = existing
            ? local.map((item) => (
                item.peerUserId === peerUserId
                    ? { ...item, ...patch }
                    : item
            ))
            : mergeConversation(local, {
                peerUserId,
                peerUser: null,
                peerUserPreview: normalizePreview((patch as any)?.peerUserPreview) || `User #${peerUserId}`,
                lastMessage: normalizePreview(patch.lastMessage),
                lastMessageAt: normalizePreview(patch.lastMessageAt) || new Date().toISOString(),
                lastMessageType: patch.lastMessageType || 'text',
                unreadCount: patch.unreadCount || 0,
                muted: Boolean(patch.muted),
                pinned: Boolean(patch.pinned),
                pinnedAt: patch.pinnedAt ?? null,
                lastMessageSenderId: patch.lastMessageSenderId,
                lastMessageId: patch.lastMessageId,
                lastMessageSeen: patch.lastMessageSeen,
                archived: Boolean(patch.archived),
                archivedAt: patch.archivedAt ?? null,
                relationshipStatus: patch.relationshipStatus ?? 'none',
                friendRequestId: patch.friendRequestId,
            });
        await writeLocalConversations(sortConversations(updated));
    },

    async loadDraft(currentUserId: number, peerUserId: number): Promise<string> {
        try {
            const raw = await AsyncStorage.getItem(`${DRAFT_STORAGE_PREFIX}${currentUserId}:${peerUserId}`);
            return raw || '';
        } catch {
            return '';
        }
    },

    async saveDraft(currentUserId: number, peerUserId: number, value: string): Promise<void> {
        const key = `${DRAFT_STORAGE_PREFIX}${currentUserId}:${peerUserId}`;
        const next = value.trim() ? value : '';
        try {
            if (!next) {
                await AsyncStorage.removeItem(key);
                return;
            }
            await AsyncStorage.setItem(key, next);
        } catch (error) {
            console.warn('[chatInboxService] failed to persist draft', error);
        }
    },

    async clearDraft(currentUserId: number, peerUserId: number): Promise<void> {
        try {
            await AsyncStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${currentUserId}:${peerUserId}`);
        } catch {
            // ignore
        }
    },

    async readLocalSnapshot(filter: ChatConversationFilter = 'all'): Promise<ChatConversationPreview[]> {
        const local = await readLocalConversations();
        return sortConversations(filterConversationItems(local, filter));
    },
};
