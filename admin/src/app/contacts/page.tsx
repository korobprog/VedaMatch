'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, RefreshCw, Search, UserRound } from 'lucide-react';
import api from '@/lib/api';
import { PortalEmptyState, PortalErrorState, PortalLoadingState, PortalPageShell, normalizeImageUrl } from '@/components/user-portal/PortalPageShell';

type Contact = {
    id: number;
    displayName: string;
    subtitle: string;
    city: string;
    country: string;
    email: string;
    avatarUrl: string;
    bio: string;
};

const getText = (value: unknown): string => String(value || '').trim();

const getDisplayName = (item: any): string => {
    return getText(item.displayName) || getText(item.nicknameDisplay) || getText(item.spiritualName) || getText(item.karmicName) || getText(item.nickname) || getText(item.email) || 'Участник VedaMatch';
};

const normalizeContact = (item: any): Contact | null => {
    const id = Number.parseInt(String(item?.ID || item?.id || ''), 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
        id,
        displayName: getDisplayName(item),
        subtitle: getText(item.identity) || getText(item.madh) || getText(item.mentor),
        city: getText(item.city || item.location?.city),
        country: getText(item.country || item.location?.country),
        email: getText(item.email),
        avatarUrl: normalizeImageUrl(item.avatarUrl || item.avatar_url),
        bio: getText(item.bio || item.about),
    };
};

const normalizeContacts = (payload: any): Contact[] => {
    const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.contacts) ? payload.contacts : [];
    return rawItems.map((item: any) => normalizeContact(item)).filter((item: Contact | null): item is Contact => Boolean(item));
};

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadContacts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/contacts', { params: { limit: 80, q: search.trim() || undefined } });
            setContacts(normalizeContacts(response.data));
        } catch (loadError) {
            console.error('[ContactsPage] load failed', loadError);
            setError('Не удалось загрузить контакты портала.');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        void loadContacts();
    }, []);

    const filteredContacts = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return contacts;
        return contacts.filter((contact) => [contact.displayName, contact.subtitle, contact.city, contact.country, contact.email, contact.bio].join(' ').toLowerCase().includes(query));
    }, [contacts, search]);

    return (
        <PortalPageShell
            eyebrow="Люди"
            title="Контакты"
            description="Web-страница контактов портала: быстрый поиск по участникам, городу и духовному профилю."
            actions={
                <form onSubmit={(event) => { event.preventDefault(); void loadContacts(); }} className="flex w-full gap-2 md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, город, email..." className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-400/60" />
                    </div>
                    <button type="submit" className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-400"><RefreshCw className="h-4 w-4" /></button>
                </form>
            }
        >
            {loading ? <PortalLoadingState label="Загружаем контакты..." /> : error ? <PortalErrorState message={error} /> : filteredContacts.length === 0 ? <PortalEmptyState title="Контакты не найдены" description="Попробуйте изменить поисковый запрос или вернуться позже." /> : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredContacts.map((contact) => (
                        <article key={contact.id} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-white">
                                    {contact.avatarUrl ? <img src={contact.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-lg font-black text-white">{contact.displayName}</h2>
                                    <p className="min-h-5 text-sm text-white/45">{contact.subtitle || 'Участник портала'}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-white/55">
                                {(contact.city || contact.country) && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-orange-400" />{[contact.city, contact.country].filter(Boolean).join(', ')}</p>}
                                {contact.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-orange-400" />{contact.email}</p>}
                                {contact.bio && <p className="line-clamp-3 leading-6 text-white/45">{contact.bio}</p>}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </PortalPageShell>
    );
}
