'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, RefreshCw, Search, UserRound } from 'lucide-react';
import api from '@/lib/api';
import { PortalEmptyState, PortalErrorState, PortalLoadingState, PortalPageShell, normalizeImageUrl } from '@/components/user-portal/PortalPageShell';

type Conversation = {
    peerUserId: number;
    title: string;
    avatarUrl: string;
    preview: string;
    lastMessageAt: string;
    unreadCount: number;
    relationship: string;
};

const text = (value: unknown): string => String(value || '').trim();

const displayName = (user: any): string => text(user?.displayName) || text(user?.nicknameDisplay) || text(user?.spiritualName) || text(user?.karmicName) || text(user?.nickname) || text(user?.email) || 'Собеседник';

const normalizeConversation = (item: any): Conversation | null => {
    const peerUserId = Number.parseInt(String(item?.peerUserId || item?.peer_user_id || ''), 10);
    if (!Number.isFinite(peerUserId) || peerUserId <= 0) return null;
    const peer = item?.peerUser || item?.peer_user || item?.peerUserPreview || item?.peer_user_preview || {};
    const lastMessage = item?.lastMessage && typeof item.lastMessage === 'object' ? item.lastMessage : null;
    return {
        peerUserId,
        title: displayName(peer),
        avatarUrl: normalizeImageUrl(peer.avatarUrl || peer.avatar_url),
        preview: text(item?.lastMessagePreview || item?.last_message_preview || item?.lastMessage || item?.last_message || lastMessage?.content) || 'Диалог без сообщений',
        lastMessageAt: text(item?.lastMessageAt || item?.last_message_at || item?.updatedAt || item?.updated_at),
        unreadCount: Number(item?.unreadCount || item?.unread_count || 0),
        relationship: text(item?.relationshipStatus || item?.relationship_status),
    };
};

const normalizeConversations = (payload: any): Conversation[] => {
    const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.conversations) ? payload.conversations : [];
    return rawItems.map((item: any) => normalizeConversation(item)).filter((item: Conversation | null): item is Conversation => Boolean(item));
};

const formatDate = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function ChatPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadConversations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/messages/conversations', { params: { limit: 60 } });
            setConversations(normalizeConversations(response.data));
        } catch (loadError) {
            console.error('[ChatPage] load failed', loadError);
            setError('Не удалось загрузить диалоги.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    const filteredConversations = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return conversations;
        return conversations.filter((conversation) => [conversation.title, conversation.preview, conversation.relationship].join(' ').toLowerCase().includes(query));
    }, [conversations, search]);

    return (
        <PortalPageShell
            eyebrow="Сообщения"
            title="Чат"
            description="Входящие диалоги VedaMatch в web-портале. Здесь видны последние сообщения и непрочитанные диалоги."
            actions={
                <div className="flex w-full gap-2 md:w-auto">
                    <div className="relative flex-1 md:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по диалогам..." className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-400/60" /></div>
                    <button type="button" onClick={() => { void loadConversations(); }} className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-400"><RefreshCw className="h-4 w-4" /></button>
                </div>
            }
        >
            {loading ? <PortalLoadingState label="Загружаем диалоги..." /> : error ? <PortalErrorState message={error} /> : filteredConversations.length === 0 ? <PortalEmptyState title="Диалогов пока нет" description="Когда появятся личные сообщения, они будут доступны здесь." /> : (
                <div className="space-y-3">
                    {filteredConversations.map((conversation) => (
                        <article key={conversation.peerUserId} className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#4a3e36] text-white">
                                {conversation.avatarUrl ? <img src={conversation.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2"><h2 className="truncate text-lg font-black text-white">{conversation.title}</h2>{conversation.unreadCount > 0 && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-black text-white">{conversation.unreadCount}</span>}</div>
                                <p className="truncate text-sm text-white/50">{conversation.preview}</p>
                            </div>
                            <div className="hidden text-right text-xs font-bold text-white/35 sm:block">
                                <MessageCircle className="mb-1 ml-auto h-4 w-4 text-orange-400" />
                                {formatDate(conversation.lastMessageAt)}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </PortalPageShell>
    );
}
