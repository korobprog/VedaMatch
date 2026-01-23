'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, MessageCircle, Phone, Sparkles,
    Coffee, ShoppingBag, Megaphone, Book,
    GraduationCap, Newspaper, Map as MapIcon,
    Search, Bell, Clock, User as UserIcon,
    Plus, Grid, LogOut, ChevronRight, Bookmark
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SERVICES = [
    { id: 'contacts', label: 'Контакты', icon: Users, color: 'bg-blue-600', path: '/contacts' },
    { id: 'chat', label: 'Чат', icon: MessageCircle, color: 'bg-[#4a3e36]', path: '/chat' },
    { id: 'calls', label: 'Звонки', icon: Phone, color: 'bg-emerald-600', path: '/calls' },
    { id: 'dating', label: 'Знакомства', icon: Sparkles, color: 'bg-pink-600', path: '/dating' },
    { id: 'cafe', label: 'Кафе', icon: Coffee, color: 'bg-orange-700', path: '/cafe' },
    { id: 'shops', label: 'Магазины', icon: ShoppingBag, color: 'bg-[#b8632c]', path: '/shops' },
    { id: 'ads', label: 'Объявления', icon: Megaphone, color: 'bg-red-600', path: '/ads' },
    { id: 'library', label: 'Библиотека', icon: Book, color: 'bg-green-700', path: '/library' },
    { id: 'bookmarks', label: 'Закладки', icon: Bookmark, color: 'bg-orange-600', path: '/library/bookmarks' },
    { id: 'education', label: 'Обучение', icon: GraduationCap, color: 'bg-violet-600', path: '/education' },
    { id: 'news', label: 'Новости', icon: Newspaper, color: 'bg-[#5c4d47]', path: '/news' },
    { id: 'map', label: 'Карта', icon: MapIcon, color: 'bg-indigo-700', path: '/map' },
    { id: 'ai-models', label: 'VedaMatch', icon: Sparkles, color: 'bg-gradient-to-br from-orange-500 to-red-600', path: '/ai-models' },
];

export default function UserDashboard() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const data = localStorage.getItem('admin_data');
        if (data) setUser(JSON.parse(data));
        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('admin_data');
        router.push('/login');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white overflow-hidden relative pb-12">
            {/* Animated Background Ornaments */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.15, 0.25, 0.15]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"
                />
            </div>

            {/* Main Portal Container */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 pt-8">
                {/* Top Header */}
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
                        <button className="p-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/10 hover:bg-white/10 transition-all text-white/70 hover:text-white">
                            <Search className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button className="p-3.5 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/10 hover:bg-white/10 transition-all text-white/70 hover:text-white relative">
                            <Bell className="w-5 h-5" strokeWidth={2.5} />
                            <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
                        </button>
                        <Link href="/profile" className="p-1 px-1.5 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/10 hover:bg-white/10 transition-all overflow-hidden flex items-center gap-4 pr-5 h-[52px]">
                            <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                                <UserIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs font-bold text-white/50 leading-none mb-1">Account</p>
                                <p className="text-sm font-black text-white leading-none">Профиль</p>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Widgets Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {/* Clock & Date Widget */}
                    <div className="col-span-1 bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[40px] border border-white/10 shadow-2xl flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">MAYAPUR TIME</span>
                                <div className="p-2 bg-orange-400/10 rounded-lg">
                                    <Clock className="w-4 h-4 text-orange-400" />
                                </div>
                            </div>
                            <h2 className="text-6xl font-black tabular-nums tracking-tighter text-white transition-all group-hover:scale-105 origin-left">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </h2>
                        </div>
                        <div className="relative z-10">
                            <p className="text-base font-bold text-white/80 capitalize mb-1">
                                {currentTime.toLocaleDateString('ru-RU', { weekday: 'long' })}
                            </p>
                            <p className="text-sm font-medium text-white/40">
                                {currentTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        {/* Ornamental decoration inside widget */}
                        <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                            <Clock className="w-32 h-32 text-white" />
                        </div>
                    </div>

                    {/* Community Greeting Widget */}
                    <div className="col-span-1 lg:col-span-2 bg-gradient-to-br from-[#1a1c24] to-[#0f1115] p-10 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="max-w-md">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 mb-4">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black tracking-widest text-orange-400 uppercase">Live Community</span>
                                </div>
                                <h3 className="text-3xl font-black text-white mb-3">Совместная джапа</h3>
                                <p className="text-white/60 text-base leading-relaxed">
                                    Завтра в 05:00 по местному времени приглашаем всех на утреннюю медитацию. Харе Кришна!
                                </p>
                            </div>
                            <div className="mt-8">
                                <button className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3">
                                    Подключиться <ChevronRight className="w-5 h-5" strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                        {/* Background Patterns for widget */}
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-15 transition-all duration-700 rotate-12 group-hover:rotate-0">
                            <Sparkles className="w-64 h-64 text-white" />
                        </div>
                    </div>
                </div>

                {/* Services Portal Grid */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <Grid className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">
                                Сервисы Портала
                            </h2>
                        </div>
                        <button className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-orange-400 transition-colors">Настроить</button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-10 gap-x-6 md:gap-x-10">
                        {SERVICES.map((service, i) => (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="group flex flex-col items-center"
                            >
                                <Link href={service.path} className="relative mb-4">
                                    <div className={`w-18 h-18 sm:w-20 sm:h-20 ${service.color} rounded-[28px] sm:rounded-[32px] flex items-center justify-center text-white shadow-2xl group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group-active:scale-90 transition-all duration-300 group-hover:-translate-y-2 relative z-10 border-t border-white/20`}>
                                        <service.icon className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-lg" strokeWidth={2} />
                                    </div>
                                    <div className={`absolute inset-0 ${service.color} rounded-[32px] opacity-0 blur-2xl group-hover:opacity-40 transition-opacity duration-300 scale-90`} />
                                </Link>
                                <span className="text-xs sm:text-sm font-bold text-center text-white/70 group-hover:text-white transition-colors line-clamp-1 truncate w-full px-1">
                                    {service.label}
                                </span>
                            </motion.div>
                        ))}

                        {/* Add Service Placeholder */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: SERVICES.length * 0.04 }}
                            className="group flex flex-col items-center"
                        >
                            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-[28px] sm:rounded-[32px] flex items-center justify-center text-white/20 hover:bg-white/10 hover:border-white/30 hover:text-white group-active:scale-90 transition-all duration-300 mb-4">
                                <Plus className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-center text-white/40">
                                Управление
                            </span>
                        </motion.button>
                    </div>
                </div>

                {/* Bottom Logout */}
                <div className="mt-24 pt-10 border-t border-white/5 flex justify-center">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-white/40 font-bold hover:text-red-500 px-8 py-3 rounded-2xl transition-all hover:bg-red-500/5 group"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
                        Выйти из системы
                    </button>
                </div>
            </div>
        </div>
    );
}
