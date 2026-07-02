'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Bell,
    Book,
    Bookmark,
    CheckCircle2,
    ChevronRight,
    Clock,
    Coffee,
    Eye,
    EyeOff,
    GraduationCap,
    Grid,
    Loader2,
    LogOut,
    Map as MapIcon,
    Megaphone,
    MessageCircle,
    Newspaper,
    Phone,
    Plus,
    Save,
    Search,
    Settings2,
    ShoppingBag,
    Sparkles,
    User as UserIcon,
    Users,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '@/lib/api';
import { clearPortalAuthData, syncSharedSessionFromAdminStorage } from '@/lib/shared-session';
import {
    DEFAULT_USER_PORTAL_LAYOUT,
    USER_PORTAL_SERVICES,
    getOrderedPortalServices,
    normalizePortalLayout,
    validateUserPortalServiceLinks,
    type PortalServiceId,
    type UserPortalLayout,
} from '@/lib/user-portal-services';

const LOCAL_LAYOUT_KEY = 'vedamatch_user_portal_layout_v1';

const SERVICE_ICON_MAP: Record<PortalServiceId, LucideIcon> = {
    contacts: Users,
    chat: MessageCircle,
    calls: Phone,
    services: Sparkles,
    dating: Sparkles,
    cafe: Coffee,
    shops: ShoppingBag,
    ads: Megaphone,
    library: Book,
    bookmarks: Bookmark,
    education: GraduationCap,
    news: Newspaper,
    map: MapIcon,
    'ai-models': Sparkles,
};

type ModalName = 'search' | 'notifications' | 'editor' | null;

type PortalNotification = {
    id: string;
    title: string;
    body: string;
    tone: 'orange' | 'blue' | 'green' | 'red';
    createdAt: string;
};

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const serviceTileClassName = (color: string) => joinClasses('w-18 h-18 sm:w-20 sm:h-20 rounded-[28px] sm:rounded-[32px] flex items-center justify-center text-white shadow-2xl group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group-active:scale-90 transition-all duration-300 group-hover:-translate-y-2 relative z-10 border-t border-white/20', color);
const serviceGlowClassName = (color: string) => joinClasses('absolute inset-0 rounded-[32px] opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-300 scale-90', color);
const serviceIconClassName = (color: string, size = 'h-12 w-12') => joinClasses('flex shrink-0 items-center justify-center rounded-2xl', size, color);

const readLocalLayout = (): UserPortalLayout => {
    if (typeof window === 'undefined') return DEFAULT_USER_PORTAL_LAYOUT;
    try {
        const raw = window.localStorage.getItem(LOCAL_LAYOUT_KEY);
        return raw ? normalizePortalLayout(JSON.parse(raw)) : DEFAULT_USER_PORTAL_LAYOUT;
    } catch (error) {
        console.warn('[PortalLayout] Could not parse local layout', error);
        return DEFAULT_USER_PORTAL_LAYOUT;
    }
};

const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'сейчас';
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

export default function UserDashboard() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [user, setUser] = useState<any>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<ModalName>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [layout, setLayout] = useState<UserPortalLayout>(DEFAULT_USER_PORTAL_LAYOUT);
    const [draftLayout, setDraftLayout] = useState<UserPortalLayout>(DEFAULT_USER_PORTAL_LAYOUT);
    const [layoutSaving, setLayoutSaving] = useState(false);
    const [layoutSavedAt, setLayoutSavedAt] = useState<string | null>(null);
    const [conversationUnread, setConversationUnread] = useState(0);
    const [linkWarnings, setLinkWarnings] = useState<string[]>([]);
    const router = useRouter();

    const showNotice = useCallback((message: string) => setNotice(message), []);
    const visibleServices = useMemo(() => getOrderedPortalServices(layout), [layout]);

    const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return USER_PORTAL_SERVICES;
        return USER_PORTAL_SERVICES.filter((service) => [service.label, service.description, service.path, ...service.keywords].join(' ').toLowerCase().includes(query));
    }, [searchQuery]);

    const notifications = useMemo<PortalNotification[]>(() => {
        const now = new Date().toISOString();
        const items: PortalNotification[] = [];
        if (conversationUnread > 0) {
            items.push({ id: 'chat-unread', title: String(conversationUnread) + ' непрочитанных сообщений', body: 'Откройте чат, чтобы продолжить диалоги с участниками портала.', tone: 'blue', createdAt: now });
        }
        if (layoutSavedAt) {
            items.push({ id: 'layout-saved', title: 'Порядок иконок сохранён', body: 'Настройки портала синхронизированы с portal-layout и продублированы локально.', tone: 'green', createdAt: layoutSavedAt });
        }
        if (linkWarnings.length > 0) {
            items.push({ id: 'link-warning', title: 'Найдены проблемы со ссылками', body: linkWarnings.join(', '), tone: 'red', createdAt: now });
        }
        items.push({ id: 'portal-ready', title: 'Web-портал расширен', body: 'Контакты, чат, кафе, магазины и сервисы теперь открываются как обычные страницы.', tone: 'orange', createdAt: now });
        return items;
    }, [conversationUnread, layoutSavedAt, linkWarnings]);

    const loadLayout = useCallback(async () => {
        const localLayout = readLocalLayout();
        setLayout(localLayout);
        setDraftLayout(localLayout);
        try {
            const response = await api.get<{ layout?: unknown; lastModified?: number }>('/user/portal-layout');
            const serverLayout = normalizePortalLayout(response.data?.layout);
            setLayout(serverLayout);
            setDraftLayout(serverLayout);
            window.localStorage.setItem(LOCAL_LAYOUT_KEY, JSON.stringify(serverLayout));
            if (response.data?.lastModified) setLayoutSavedAt(new Date(response.data.lastModified).toISOString());
        } catch (error) {
            console.warn('[PortalLayout] Server layout is unavailable, using local layout', error);
        }
    }, []);

    const saveLayout = useCallback(async (nextLayout: UserPortalLayout) => {
        const normalized = normalizePortalLayout(nextLayout);
        setLayoutSaving(true);
        setLayout(normalized);
        setDraftLayout(normalized);
        window.localStorage.setItem(LOCAL_LAYOUT_KEY, JSON.stringify(normalized));
        try {
            await api.put('/user/portal-layout', { layout: normalized });
            const savedAt = new Date().toISOString();
            setLayoutSavedAt(savedAt);
            showNotice('Порядок и набор иконок сохранены в portal-layout.');
        } catch (error) {
            console.warn('[PortalLayout] Could not save to server', error);
            showNotice('Иконки сохранены локально. Серверное сохранение portal-layout временно недоступно.');
        } finally {
            setLayoutSaving(false);
        }
    }, [showNotice]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const data = localStorage.getItem('admin_data');
        if (data) {
            setUser(JSON.parse(data));
            syncSharedSessionFromAdminStorage();
            void loadLayout();
        } else {
            router.replace('/login');
        }
        return () => clearInterval(timer);
    }, [loadLayout, router]);

    useEffect(() => {
        const missing = validateUserPortalServiceLinks();
        setLinkWarnings(missing);
        if (missing.length > 0) console.error('[PortalLinks] Dashboard services point to unknown routes:', missing);
    }, []);

    useEffect(() => {
        const loadUnread = async () => {
            try {
                const response = await api.get<{ items?: Array<{ unreadCount?: number }> }>('/messages/conversations', { params: { filter: 'unread', limit: 20 } });
                const total = (response.data?.items || []).reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
                setConversationUnread(total);
            } catch (error) {
                console.warn('[PortalNotifications] Could not load conversations', error);
            }
        };
        if (user) void loadUnread();
    }, [user]);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(null), 3600);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const handleLogout = () => {
        clearPortalAuthData();
        router.push('/login');
    };

    const openEditor = () => {
        setDraftLayout(layout);
        setActiveModal('editor');
    };

    const navigateToService = (path: string) => {
        setActiveModal(null);
        setSearchQuery('');
        router.push(path);
    };

    const moveDraftService = (id: PortalServiceId, direction: -1 | 1) => {
        setDraftLayout((current) => {
            const index = current.order.indexOf(id);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= current.order.length) return current;
            const nextOrder = [...current.order];
            [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
            return { ...current, order: nextOrder };
        });
    };

    const toggleDraftService = (id: PortalServiceId) => {
        setDraftLayout((current) => ({
            ...current,
            hidden: current.hidden.includes(id) ? current.hidden.filter((hiddenId) => hiddenId !== id) : [...current.hidden, id],
        }));
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white overflow-hidden relative pb-12">
            <div className="absolute inset-0 pointer-events-none">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px]" />
                <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 pt-8">
                <AnimatePresence>
                    {notice && (
                        <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }} className="fixed left-1/2 top-5 z-50 w-[min(calc(100%_-_32px),520px)] -translate-x-1/2 rounded-2xl border border-orange-400/25 bg-[#16171d]/95 px-5 py-4 text-sm font-bold text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
                            {notice}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/10">
                            <img src="/logo_tilak.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white mb-0.5">VedaMatch</h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-[#D67D3E] opacity-80">Portal System</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" aria-label="Поиск по порталу" onClick={() => setActiveModal('search')} className="p-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/10 hover:bg-white/10 transition-all text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400/60"><Search className="w-5 h-5" strokeWidth={2.5} /></button>
                        <button type="button" aria-label="Уведомления" onClick={() => setActiveModal('notifications')} className="p-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/10 hover:bg-white/10 transition-all text-white/70 hover:text-white relative focus:outline-none focus:ring-2 focus:ring-orange-400/60">
                            <Bell className="w-5 h-5" strokeWidth={2.5} />
                            {notifications.length > 0 && <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />}
                        </button>
                        <Link href="/profile" className="p-1 px-1.5 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/10 hover:bg-white/10 transition-all overflow-hidden flex items-center gap-4 pr-5 h-[52px]">
                            <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg"><UserIcon className="w-5 h-5 text-white" strokeWidth={2.5} /></div>
                            <div className="hidden sm:block"><p className="text-xs font-bold text-white/50 leading-none mb-1">Account</p><p className="text-sm font-black text-white leading-none">Профиль</p></div>
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <div className="col-span-1 bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[40px] border border-white/10 shadow-2xl flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
                        <div className="relative z-10"><div className="flex items-center justify-between mb-6"><span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">MAYAPUR TIME</span><div className="p-2 bg-orange-400/10 rounded-lg"><Clock className="w-4 h-4 text-orange-400" /></div></div><h2 className="text-6xl font-black tabular-nums tracking-tighter text-white transition-all group-hover:scale-105 origin-left">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2></div>
                        <div className="relative z-10"><p className="text-base font-bold text-white/80 capitalize mb-1">{currentTime.toLocaleDateString('ru-RU', { weekday: 'long' })}</p><p className="text-sm font-medium text-white/40">{currentTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><Clock className="w-32 h-32 text-white" /></div>
                    </div>
                    <div className="col-span-1 lg:col-span-2 bg-gradient-to-br from-[#1a1c24] to-[#0f1115] p-10 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between"><div className="max-w-md"><div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 mb-4"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" /><span className="text-[10px] font-black tracking-widest text-orange-400 uppercase">Live Community</span></div><h3 className="text-3xl font-black text-white mb-3">Совместная джапа</h3><p className="text-white/60 text-base leading-relaxed">Завтра в 05:00 по местному времени приглашаем всех на утреннюю медитацию. Харе Кришна!</p></div><div className="mt-8"><button type="button" onClick={() => navigateToService('/chat')} className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-orange-200/80">Подключиться <ChevronRight className="w-5 h-5" strokeWidth={3} /></button></div></div>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-15 transition-all duration-700 rotate-12 group-hover:rotate-0"><Sparkles className="w-64 h-64 text-white" /></div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-xl"><Grid className="w-5 h-5 text-blue-400" /></div><h2 className="text-xl font-black text-white tracking-tight">Сервисы Портала</h2></div><button type="button" onClick={openEditor} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/40 hover:text-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400/60 rounded-lg px-2 py-1"><Settings2 className="w-4 h-4" />Настроить</button></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-10 gap-x-6 md:gap-x-10">
                        {visibleServices.map((service, i) => {
                            const Icon = SERVICE_ICON_MAP[service.id];
                            return <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="group flex flex-col items-center"><Link aria-label={'Открыть ' + service.label} href={service.path} prefetch={false} className="relative mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:ring-offset-4 focus:ring-offset-[#0a0a0c] rounded-[32px]"><div className={serviceTileClassName(service.color)}><Icon className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-lg" strokeWidth={2} /></div><div className={serviceGlowClassName(service.color)} /></Link><span className="text-xs sm:text-sm font-bold text-center text-white/70 group-hover:text-white transition-colors line-clamp-1 truncate w-full px-1">{service.label}</span></motion.div>;
                        })}
                        <motion.button type="button" onClick={openEditor} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: visibleServices.length * 0.04 }} className="group flex flex-col items-center focus:outline-none"><div className="w-18 h-18 sm:w-20 sm:h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-[28px] sm:rounded-[32px] flex items-center justify-center text-white/20 hover:bg-white/10 hover:border-white/30 hover:text-white group-active:scale-90 transition-all duration-300 mb-4 group-focus:ring-2 group-focus:ring-orange-400/60 group-focus:ring-offset-4 group-focus:ring-offset-[#0a0a0c]"><Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} /></div><span className="text-xs sm:text-sm font-bold text-center text-white/40">Управление</span></motion.button>
                    </div>
                </div>

                <div className="mt-24 pt-10 border-t border-white/5 flex justify-center"><button onClick={handleLogout} className="flex items-center gap-3 text-white/40 font-bold hover:text-red-500 px-8 py-3 rounded-2xl transition-all hover:bg-red-500/5 group"><LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />Выйти из системы</button></div>
            </div>

            <AnimatePresence>
                {activeModal === 'search' && <PortalModal title="Поиск по порталу" subtitle="Поиск" onClose={() => setActiveModal(null)}><div className="relative mb-5"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} autoFocus placeholder="Например: чат, кафе, книги, карта..." className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white outline-none placeholder:text-white/30 focus:border-orange-400/60" /></div><div className="max-h-[55vh] space-y-3 overflow-auto pr-1">{searchResults.map((service) => { const Icon = SERVICE_ICON_MAP[service.id]; return <button key={service.id} type="button" onClick={() => navigateToService(service.path)} className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition hover:border-orange-400/30 hover:bg-white/[0.06]"><span className={serviceIconClassName(service.color)}><Icon className="h-6 w-6 text-white" /></span><span className="min-w-0 flex-1"><span className="block font-black text-white">{service.label}</span><span className="line-clamp-2 text-sm text-white/50">{service.description}</span></span><ChevronRight className="h-5 w-5 text-white/30" /></button>; })}{searchResults.length === 0 && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-center text-white/50">Ничего не найдено. Попробуйте другой запрос.</div>}</div></PortalModal>}

                {activeModal === 'notifications' && <PortalModal title="Уведомления" subtitle="Центр" onClose={() => setActiveModal(null)}><div className="space-y-3">{notifications.map((item) => <div key={item.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"><div className="mb-2 flex items-start justify-between gap-3"><div className="flex items-center gap-2">{item.tone === 'green' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : item.tone === 'red' ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <Bell className="h-5 w-5 text-orange-400" />}<h4 className="font-black text-white">{item.title}</h4></div><span className="shrink-0 text-xs font-bold text-white/30">{formatNotificationTime(item.createdAt)}</span></div><p className="text-sm leading-relaxed text-white/55">{item.body}</p></div>)}</div></PortalModal>}

                {activeModal === 'editor' && <PortalModal title="Иконки портала" subtitle="Portal layout" description="Меняйте порядок и скрывайте разделы. Сохранение идёт в portal-layout." onClose={() => setActiveModal(null)}><div className="max-h-[58vh] space-y-2 overflow-auto pr-1">{draftLayout.order.map((id, index) => { const service = USER_PORTAL_SERVICES.find((item) => item.id === id); if (!service) return null; const Icon = SERVICE_ICON_MAP[service.id]; const hidden = draftLayout.hidden.includes(service.id); return <div key={service.id} className={joinClasses('flex items-center gap-3 rounded-2xl border p-3', hidden ? 'border-white/5 bg-white/[0.02] opacity-50' : 'border-white/10 bg-white/[0.04]')}><span className={serviceIconClassName(service.color, 'h-11 w-11')}><Icon className="h-5 w-5 text-white" /></span><div className="min-w-0 flex-1"><p className="font-black text-white">{service.label}</p><p className="truncate text-xs text-white/40">{service.path}</p></div><button type="button" onClick={() => moveDraftService(service.id, -1)} disabled={index === 0} className="rounded-xl bg-white/5 p-2 text-white/60 disabled:opacity-25 hover:bg-white/10 hover:text-white"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => moveDraftService(service.id, 1)} disabled={index === draftLayout.order.length - 1} className="rounded-xl bg-white/5 p-2 text-white/60 disabled:opacity-25 hover:bg-white/10 hover:text-white"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => toggleDraftService(service.id)} className="rounded-xl bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white">{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>; })}</div><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => setDraftLayout(DEFAULT_USER_PORTAL_LAYOUT)} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white/60 hover:bg-white/5 hover:text-white">Сбросить</button><button type="button" onClick={() => { void saveLayout(draftLayout); setActiveModal(null); }} disabled={layoutSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-xl shadow-orange-500/20 hover:bg-orange-400 disabled:opacity-60">{layoutSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Сохранить</button></div></PortalModal>}
            </AnimatePresence>
        </div>
    );
}

function PortalModal({ title, subtitle, description, children, onClose }: { title: string; subtitle: string; description?: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mx-auto mt-6 max-w-2xl rounded-[32px] border border-white/10 bg-[#121319] p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">{subtitle}</p>
                        <h3 className="text-2xl font-black text-white">{title}</h3>
                        {description && <p className="text-sm text-white/45">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="rounded-2xl bg-white/5 p-3 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                {children}
            </div>
        </motion.div>
    );
}
