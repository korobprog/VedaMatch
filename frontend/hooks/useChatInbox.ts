import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { chatInboxService, ChatConversationFilter, ChatConversationPreview, filterConversationItems } from '../services/chatInboxService';
import { useUser } from '../context/UserContext';
import { useWebSocket } from '../context/WebSocketContext';

const runAsync = (task: Promise<unknown>) => {
    task.catch(() => {
        // Inbox state refresh failures are non-fatal for UI updates.
    });
};

type ChatInboxCounts = {
    unread: number;
    requests: number;
};

export const useChatInbox = (filter: ChatConversationFilter = 'all', query = '') => {
    const { user } = useUser();
    const { addListener } = useWebSocket();
    const currentUserId = user?.ID || 0;
    const [items, setItems] = useState<ChatConversationPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [counts, setCounts] = useState<ChatInboxCounts>({ unread: 0, requests: 0 });
    const normalizedQuery = query.trim();

    const refreshCounts = useCallback(async () => {
        const [unreadItems, requestItems] = await Promise.all([
            chatInboxService.readLocalSnapshot('unread'),
            chatInboxService.readLocalSnapshot('requests'),
        ]);
        setCounts({
            unread: unreadItems.length,
            requests: requestItems.length,
        });
    }, []);

    const mergePaginatedItems = useCallback((prev: ChatConversationPreview[], nextItems: ChatConversationPreview[]) => {
        const merged = new Map<number, ChatConversationPreview>();
        [...prev, ...nextItems].forEach((item) => {
            merged.set(item.peerUserId, item);
        });

        return Array.from(merged.values()).sort((a, b) => {
            if (a.pinned !== b.pinned) {
                return a.pinned ? -1 : 1;
            }
            return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });
    }, []);

    const load = useCallback(async (mode: 'initial' | 'refresh' | 'more' = 'initial') => {
        if (!currentUserId) {
            setItems([]);
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
            setHasMore(false);
            setNextCursor(null);
            setCounts({ unread: 0, requests: 0 });
            return;
        }

        if (mode === 'refresh') {
            setRefreshing(true);
        } else if (mode === 'more') {
            if (loadingMore || !hasMore || nextCursor == null) {
                return;
            }
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await chatInboxService.listConversations({
                filter,
                limit: 50,
                ...(mode === 'more' && nextCursor != null ? { cursor: nextCursor } : {}),
                ...(normalizedQuery ? { q: normalizedQuery } : {}),
            });

            setItems((prev) => (
                mode === 'more'
                    ? mergePaginatedItems(prev, response.items)
                    : response.items
            ));
            setHasMore(Boolean(response.hasMore));
            setNextCursor(typeof response.nextCursor === 'string' ? response.nextCursor : null);
            await refreshCounts();
        } finally {
            if (mode === 'refresh') {
                setRefreshing(false);
            } else if (mode === 'more') {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    }, [currentUserId, filter, hasMore, loadingMore, mergePaginatedItems, nextCursor, normalizedQuery, refreshCounts]);

    useFocusEffect(
        useCallback(() => {
            runAsync(load('initial'));
        }, [load]),
    );

    useEffect(() => {
        if (!currentUserId) {
            setItems([]);
            setHasMore(false);
            setNextCursor(null);
            setCounts({ unread: 0, requests: 0 });
        }
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) {
            return undefined;
        }

        const removeListener = addListener((msg: Record<string, any>) => {
            if (msg.type === 'conversation_updated') {
                const peerUserId = Number.parseInt(String(msg.peerUserId || msg.senderId || msg.recipientId || ''), 10);
                if (!Number.isFinite(peerUserId) || peerUserId <= 0) {
                    return;
                }

                runAsync(chatInboxService.upsertConversationFromMessage({
                    currentUserId,
                    peerUserId,
                    content: String(msg.lastMessage || '').trim(),
                    type: msg.lastMessageType || 'text',
                    senderId: Number.parseInt(String(msg.senderId || peerUserId), 10) || peerUserId,
                    messageId: typeof msg.messageId === 'number' ? msg.messageId : undefined,
                    createdAt: msg.lastMessageAt || new Date().toISOString(),
                    muted: typeof msg.muted === 'boolean' ? msg.muted : undefined,
                    pinned: typeof msg.pinned === 'boolean' ? msg.pinned : undefined,
                    pinnedAt: msg.pinnedAt ?? undefined,
                    markUnread: typeof msg.unreadCount === 'number' ? msg.unreadCount > 0 : undefined,
                    seen: msg.readAt != null,
                    archived: typeof msg.archived === 'boolean' ? msg.archived : undefined,
                    archivedAt: msg.archivedAt ?? undefined,
                    relationshipStatus: msg.relationshipStatus,
                    friendRequestId: typeof msg.friendRequestId === 'number' ? msg.friendRequestId : undefined,
                }));
                runAsync(refreshCounts());

                setItems((prev) => {
                    const existing = prev.find((item) => item.peerUserId === peerUserId);
                    const nextItem: ChatConversationPreview = existing
                        ? {
                            ...existing,
                            lastMessage: String(msg.lastMessage || existing.lastMessage || '').trim(),
                            lastMessageAt: msg.lastMessageAt || existing.lastMessageAt || new Date().toISOString(),
                            lastMessageType: msg.lastMessageType || existing.lastMessageType,
                            unreadCount: typeof msg.unreadCount === 'number' ? msg.unreadCount : existing.unreadCount,
                            pinned: typeof msg.pinned === 'boolean' ? msg.pinned : existing.pinned,
                            muted: typeof msg.muted === 'boolean' ? msg.muted : existing.muted,
                            pinnedAt: msg.pinnedAt ?? existing.pinnedAt ?? null,
                            lastMessageSenderId: typeof msg.senderId === 'number' ? msg.senderId : existing.lastMessageSenderId,
                            lastMessageId: typeof msg.messageId === 'number' ? msg.messageId : existing.lastMessageId,
                            lastMessageSeen: msg.readAt != null ? true : existing.lastMessageSeen,
                            archived: typeof msg.archived === 'boolean' ? msg.archived : existing.archived,
                            archivedAt: msg.archivedAt ?? existing.archivedAt ?? null,
                            relationshipStatus: msg.relationshipStatus || existing.relationshipStatus,
                            friendRequestId: typeof msg.friendRequestId === 'number' ? msg.friendRequestId : existing.friendRequestId,
                        }
                        : {
                            peerUserId,
                            peerUser: null,
                            peerUserPreview: `User #${peerUserId}`,
                            lastMessage: String(msg.lastMessage || '').trim(),
                            lastMessageAt: msg.lastMessageAt || new Date().toISOString(),
                            lastMessageType: msg.lastMessageType || 'text',
                            unreadCount: typeof msg.unreadCount === 'number' ? msg.unreadCount : 0,
                            pinned: Boolean(msg.pinned),
                            muted: Boolean(msg.muted),
                            pinnedAt: msg.pinnedAt ?? null,
                            lastMessageSenderId: typeof msg.senderId === 'number' ? msg.senderId : undefined,
                            lastMessageId: typeof msg.messageId === 'number' ? msg.messageId : undefined,
                            lastMessageSeen: msg.readAt != null ? true : undefined,
                            archived: typeof msg.archived === 'boolean' ? msg.archived : undefined,
                            archivedAt: msg.archivedAt ?? null,
                            relationshipStatus: msg.relationshipStatus || 'none',
                            friendRequestId: typeof msg.friendRequestId === 'number' ? msg.friendRequestId : undefined,
                        };

                    const cleaned = prev.filter((item) => item.peerUserId !== peerUserId);
                    const next = [nextItem, ...cleaned].sort((a, b) => {
                        if (a.pinned !== b.pinned) {
                            return a.pinned ? -1 : 1;
                        }
                        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                    });
                    return filterConversationItems(next, filter);
                });
                return;
            }

            if (msg.type === 'message_read') {
                const peerUserId = Number.parseInt(String(msg.peerUserId || msg.senderId || msg.recipientId || ''), 10);
                if (!Number.isFinite(peerUserId) || peerUserId <= 0) {
                    return;
                }
                runAsync(chatInboxService.markConversationRead(peerUserId));
                runAsync(refreshCounts());
                setItems((prev) => filterConversationItems(prev.map((item) => (
                    item.peerUserId === peerUserId ? { ...item, unreadCount: 0, lastMessageSeen: true } : item
                )), filter));
            }
        });

        return () => {
            removeListener();
        };
    }, [addListener, currentUserId, filter, refreshCounts]);

    const unreadCount = useMemo(() => items.reduce((sum, item) => sum + (item.unreadCount || 0), 0), [items]);

    const refresh = useCallback(async () => {
        await load('refresh');
    }, [load]);

    const loadMore = useCallback(async () => {
        await load('more');
    }, [load]);

    const markRead = useCallback(async (peerUserId: number) => {
        await chatInboxService.markConversationRead(peerUserId);
        await refreshCounts();
        setItems((prev) => filterConversationItems(prev.map((item) => (
            item.peerUserId === peerUserId ? { ...item, unreadCount: 0, lastMessageSeen: true } : item
        )), filter));
    }, [filter, refreshCounts]);

    const updateLocalConversation = useCallback(async (peerUserId: number, patch: Partial<ChatConversationPreview>) => {
        await chatInboxService.updateConversationPatch(peerUserId, patch);
        await refreshCounts();
        setItems((prev) => filterConversationItems(prev.map((item) => (
            item.peerUserId === peerUserId ? { ...item, ...patch } : item
        )), filter));
    }, [filter, refreshCounts]);

    return {
        items,
        loading,
        refreshing,
        loadingMore,
        hasMore,
        unreadCount,
        counts,
        refresh,
        loadMore,
        markRead,
        updateLocalConversation,
        setItems,
    };
};
