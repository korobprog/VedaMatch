'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, RefreshCw, Search, ShoppingBag, Star } from 'lucide-react';
import api from '@/lib/api';
import { PortalEmptyState, PortalErrorState, PortalLoadingState, PortalPageShell, normalizeImageUrl } from '@/components/user-portal/PortalPageShell';

type Shop = { id: number; name: string; description: string; category: string; city: string; address: string; logoUrl: string; coverUrl: string; rating: number; reviewsCount: number; productsCount: number; };
const text = (value: unknown): string => String(value || '').trim();
const num = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

const normalizeShop = (item: any): Shop | null => {
    const id = Number.parseInt(String(item?.id || item?.ID || ''), 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { id, name: text(item.name) || 'Магазин VedaMatch', description: text(item.description), category: text(item.category), city: text(item.city), address: text(item.address), logoUrl: normalizeImageUrl(item.logoUrl || item.logo_url), coverUrl: normalizeImageUrl(item.coverUrl || item.cover_url), rating: num(item.rating), reviewsCount: num(item.reviewsCount || item.reviews_count), productsCount: num(item.productsCount || item.products_count) };
};
const normalizeShops = (payload: any): Shop[] => {
    const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload?.shops) ? payload.shops : Array.isArray(payload?.items) ? payload.items : [];
    return rawItems.map((item: any) => normalizeShop(item)).filter((item: Shop | null): item is Shop => Boolean(item));
};

export default function ShopsPage() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadShops = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/shops', { params: { limit: 48, search: search.trim() || undefined, sort: 'newest' } });
            setShops(normalizeShops(response.data));
        } catch (loadError) {
            console.error('[ShopsPage] load failed', loadError);
            setError('Не удалось загрузить магазины.');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { void loadShops(); }, []);

    const filteredShops = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return shops;
        return shops.filter((shop) => [shop.name, shop.description, shop.category, shop.city, shop.address].join(' ').toLowerCase().includes(query));
    }, [shops, search]);

    return (
        <PortalPageShell eyebrow="Витрина" title="Магазины" description="Web-каталог магазинов сообщества: витрины, категории, адреса и количество товаров." actions={<form onSubmit={(event) => { event.preventDefault(); void loadShops(); }} className="flex w-full gap-2 md:w-auto"><div className="relative flex-1 md:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти магазин..." className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-400/60" /></div><button type="submit" className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-400"><RefreshCw className="h-4 w-4" /></button></form>}>
            {loading ? <PortalLoadingState label="Загружаем магазины..." /> : error ? <PortalErrorState message={error} /> : filteredShops.length === 0 ? <PortalEmptyState title="Магазины не найдены" description="Опубликованные магазины появятся здесь после модерации." /> : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredShops.map((shop) => (
                        <article key={shop.id} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
                            <div className="h-36 bg-[#3b2416]">{shop.coverUrl ? <img src={shop.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-12 w-12 text-orange-300/60" /></div>}</div>
                            <div className="p-5">
                                <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#b8632c]">{shop.logoUrl ? <img src={shop.logoUrl} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="h-6 w-6" />}</div><div className="min-w-0"><h2 className="truncate text-lg font-black text-white">{shop.name}</h2><p className="flex items-center gap-1 text-sm text-white/45"><MapPin className="h-3.5 w-3.5 text-orange-400" />{[shop.city, shop.address].filter(Boolean).join(', ') || 'Адрес уточняется'}</p></div></div>
                                {shop.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/50">{shop.description}</p>}
                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-white/70"><span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-3 py-1"><Star className="h-3 w-3 text-orange-300" />{shop.rating || '—'} · {shop.reviewsCount}</span>{shop.category && <span className="rounded-full bg-orange-500/15 px-3 py-1 text-orange-200">{shop.category}</span>}<span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-200">{shop.productsCount} товаров</span></div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </PortalPageShell>
    );
}
