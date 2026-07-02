'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Globe2, RefreshCw, Search, Sparkles, Star } from 'lucide-react';
import api from '@/lib/api';
import { PortalEmptyState, PortalErrorState, PortalLoadingState, PortalPageShell, normalizeImageUrl } from '@/components/user-portal/PortalPageShell';

type ServiceItem = { id: number; title: string; description: string; category: string; language: string; channel: string; scheduleType: string; coverImageUrl: string; rating: number; reviewsCount: number; bookingsCount: number; };
const text = (value: unknown): string => String(value || '').trim();
const num = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

const normalizeService = (item: any): ServiceItem | null => {
    const id = Number.parseInt(String(item?.id || item?.ID || ''), 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { id, title: text(item.title) || 'Сервис VedaMatch', description: text(item.description), category: text(item.category), language: text(item.language), channel: text(item.channel), scheduleType: text(item.scheduleType || item.schedule_type), coverImageUrl: normalizeImageUrl(item.coverImageUrl || item.cover_image_url), rating: num(item.rating), reviewsCount: num(item.reviewsCount || item.reviews_count), bookingsCount: num(item.bookingsCount || item.bookings_count) };
};
const normalizeServices = (payload: any): ServiceItem[] => {
    const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload?.services) ? payload.services : Array.isArray(payload?.items) ? payload.items : [];
    return rawItems.map((item: any) => normalizeService(item)).filter((item: ServiceItem | null): item is ServiceItem => Boolean(item));
};

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadServices = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/services', { params: { limit: 48, search: search.trim() || undefined } });
            setServices(normalizeServices(response.data));
        } catch (loadError) {
            console.error('[ServicesPage] load failed', loadError);
            setError('Не удалось загрузить сервисы.');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { void loadServices(); }, []);

    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return services;
        return services.filter((service) => [service.title, service.description, service.category, service.language, service.channel].join(' ').toLowerCase().includes(query));
    }, [services, search]);

    return (
        <PortalPageShell eyebrow="Каталог" title="Сервисы" description="Пользовательский web-каталог сервисов VedaMatch без админского dashboard/layout." actions={<form onSubmit={(event) => { event.preventDefault(); void loadServices(); }} className="flex w-full gap-2 md:w-auto"><div className="relative flex-1 md:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти сервис..." className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-orange-400/60" /></div><button type="submit" className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:bg-orange-400"><RefreshCw className="h-4 w-4" /></button></form>}>
            {loading ? <PortalLoadingState label="Загружаем сервисы..." /> : error ? <PortalErrorState message={error} /> : filteredServices.length === 0 ? <PortalEmptyState title="Сервисы не найдены" description="Опубликованные услуги и события появятся здесь после добавления." /> : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredServices.map((service) => (
                        <article key={service.id} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
                            <div className="h-36 bg-gradient-to-br from-orange-500/20 to-red-500/20">{service.coverImageUrl ? <img src={service.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-12 w-12 text-orange-300/70" /></div>}</div>
                            <div className="p-5">
                                <h2 className="line-clamp-2 text-lg font-black text-white">{service.title}</h2>
                                {service.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/50">{service.description}</p>}
                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-white/70"><span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-3 py-1"><Star className="h-3 w-3 text-orange-300" />{service.rating || '—'} · {service.reviewsCount}</span>{service.category && <span className="rounded-full bg-orange-500/15 px-3 py-1 text-orange-200">{service.category}</span>}{service.channel && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1 text-blue-200"><Globe2 className="h-3 w-3" />{service.channel}</span>}{service.scheduleType && <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-3 py-1 text-violet-200"><CalendarDays className="h-3 w-3" />{service.scheduleType}</span>}</div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </PortalPageShell>
    );
}
