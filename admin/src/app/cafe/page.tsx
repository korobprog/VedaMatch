'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coffee, MapPin, RefreshCw, Search, Star } from 'lucide-react';
import api from '@/lib/api';
import { PortalEmptyState, PortalErrorState, PortalLoadingState, PortalPageShell, normalizeImageUrl } from '@/components/user-portal/PortalPageShell';

type Cafe = { id: number; name: string; description: string; city: string; address: string; logoUrl: string; coverUrl: string; rating: number; reviewsCount: number; hasDelivery: boolean; hasTakeaway: boolean; };
const text = (value: unknown): string => String(value || '').trim();
const num = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

const normalizeCafe = (item: any): Cafe | null => {
    const id = Number.parseInt(String(item?.id || item?.ID || ''), 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { id, name: text(item.name) || 'Кафе VedaMatch', description: text(item.description), city: text(item.city), address: text(item.address), logoUrl: normalizeImageUrl(item.logoUrl || item.logo_url), coverUrl: normalizeImageUrl(item.coverUrl || item.cover_url), rating: num(item.rating), reviewsCount: num(item.reviewsCount || item.reviews_count), hasDelivery: Boolean(item.hasDelivery || item.has_delivery), hasTakeaway: item.hasTakeaway !== false };
};
const normalizeCafes = (payload: any): Cafe[] => {
    const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload?.cafes) ? payload.cafes : Array.isArray(payload?.items) ? payload.items : [];
    return rawItems.map((item: any) => normalizeCafe(item)).filter((item: Cafe | null): item is Cafe => Boolean(item));
};

export default function CafePage() {
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadCafes = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/cafes', { params: { limit: 48, search: search.trim() || undefined, sort: 'newest' } });
            setCafes(normalizeCafes(response.data));
        } catch (loadError) {
            console.error('[CafePage] load failed', loadError);
            setError('Не удалось загрузить кафе.');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { void loadCafes(); }, []);

    const filteredCafes = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return cafes;
        return cafes.filter((cafe) => [cafe.name, cafe.description, cafe.city, cafe.address].join(' ').toLowerCase().includes(query));
    }, [cafes, search]);

    return (
        <PortalPageShell eyebrow="Прасад" title="Кафе" description="Web-каталог кафе VedaMatch: описание, адреса, рейтинг и быстрые признаки доставки/самовывоза." actions={<form onSubmit={(event) => { event.preventDefault(); void loadCafes(); }} className="flex w-full gap-2 md:w-auto"><div className="relative flex-1 md:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти кафе..." className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-400/60" /></div><button type="submit" className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-400"><RefreshCw className="h-4 w-4" /></button></form>}>
            {loading ? <PortalLoadingState label="Загружаем кафе..." /> : error ? <PortalErrorState message={error} /> : filteredCafes.length === 0 ? <PortalEmptyState title="Кафе не найдены" description="Добавленные кафе появятся на этой странице после публикации." /> : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCafes.map((cafe) => (
                        <article key={cafe.id} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
                            <div className="h-36 bg-orange-900/30">{cafe.coverUrl ? <img src={cafe.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Coffee className="h-12 w-12 text-orange-300/60" /></div>}</div>
                            <div className="p-5">
                                <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-700">{cafe.logoUrl ? <img src={cafe.logoUrl} alt="" className="h-full w-full object-cover" /> : <Coffee className="h-6 w-6" />}</div><div className="min-w-0"><h2 className="truncate text-lg font-black text-white">{cafe.name}</h2><p className="flex items-center gap-1 text-sm text-white/45"><MapPin className="h-3.5 w-3.5 text-orange-400" />{[cafe.city, cafe.address].filter(Boolean).join(', ') || 'Адрес уточняется'}</p></div></div>
                                {cafe.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/50">{cafe.description}</p>}
                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-white/70"><span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-3 py-1"><Star className="h-3 w-3 text-orange-300" />{cafe.rating || '—'} · {cafe.reviewsCount}</span>{cafe.hasDelivery && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">Доставка</span>}{cafe.hasTakeaway && <span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-200">Самовывоз</span>}</div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </PortalPageShell>
    );
}
